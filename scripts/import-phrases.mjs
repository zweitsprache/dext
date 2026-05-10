/**
 * One-time import script: reads public/vector/Level_Vektor_A1_B1.csv,
 * embeds each phrase with OpenAI text-embedding-3-small,
 * and upserts into the level_phrases table in Neon.
 *
 * Run once:  node scripts/import-phrases.mjs
 */

import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { neon } from "@neondatabase/serverless";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

// Load .env.local manually (no dotenv dependency needed)
const envPath = resolve(ROOT, ".env.local");
const envLines = readFileSync(envPath, "utf8").split("\n");
for (const line of envLines) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const eqIdx = trimmed.indexOf("=");
  if (eqIdx === -1) continue;
  const key = trimmed.slice(0, eqIdx).trim();
  const value = trimmed.slice(eqIdx + 1).trim();
  if (!process.env[key]) process.env[key] = value;
}

const DATABASE_URL = process.env.DATABASE_URL;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!DATABASE_URL) throw new Error("DATABASE_URL not set");
if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY not set");

const sql = neon(DATABASE_URL);

// ── Schema setup ─────────────────────────────────────────────────────────────

await sql`CREATE EXTENSION IF NOT EXISTS vector`;

await sql`
  CREATE TABLE IF NOT EXISTS level_phrases (
    id BIGSERIAL PRIMARY KEY,
    content TEXT NOT NULL,
    level TEXT NOT NULL,
    topic TEXT NOT NULL,
    embedding vector(1536),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )
`;

await sql`CREATE INDEX IF NOT EXISTS level_phrases_level_idx ON level_phrases (level)`;

// Unique constraint so we can upsert without duplication on re-runs
await sql`
  CREATE UNIQUE INDEX IF NOT EXISTS level_phrases_content_level_uidx
  ON level_phrases (content, level)
`.catch(() => {
  // Index may already exist with a different name – ignore
});

// ── Parse CSV ─────────────────────────────────────────────────────────────────

const csvPath = resolve(ROOT, "public/vector/Level_Vektor_A1_B1.csv");
const csvText = readFileSync(csvPath, "utf8");
const lines = csvText.split("\n").map((l) => l.trim()).filter(Boolean);

// header: content;level;topic;
const phrases = [];
for (const line of lines.slice(1)) {
  const parts = line.split(";");
  const content = parts[0]?.trim();
  const level = parts[1]?.trim();
  const topic = parts[2]?.trim();
  if (content && level && topic) {
    phrases.push({ content, level, topic });
  }
}

console.log(`Parsed ${phrases.length} phrases from CSV.`);

// Skip phrases that already have embeddings
const existingRows = await sql`SELECT content, level FROM level_phrases WHERE embedding IS NOT NULL`;
const existingSet = new Set(existingRows.map((r) => `${r.content}::${r.level}`));
const toEmbed = phrases.filter((p) => !existingSet.has(`${p.content}::${p.level}`));
console.log(`${existingSet.size} already embedded. ${toEmbed.length} to process.`);

if (toEmbed.length === 0) {
  console.log("Nothing to do.");
  process.exit(0);
}

// ── Embed + upsert in batches ─────────────────────────────────────────────────

const BATCH_SIZE = 100; // OpenAI allows up to 2048 per request

async function embedBatch(texts) {
  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({ model: "text-embedding-3-small", input: texts }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI embedding error: ${err}`);
  }
  const json = await res.json();
  return json.data.map((d) => d.embedding);
}

let processed = 0;
for (let i = 0; i < toEmbed.length; i += BATCH_SIZE) {
  const batch = toEmbed.slice(i, i + BATCH_SIZE);
  const texts = batch.map((p) => p.content);

  const embeddings = await embedBatch(texts);

  for (let j = 0; j < batch.length; j++) {
    const { content, level, topic } = batch[j];
    const vectorStr = `[${embeddings[j].join(",")}]`;
    await sql`
      INSERT INTO level_phrases (content, level, topic, embedding)
      VALUES (${content}, ${level}, ${topic}, ${vectorStr}::vector)
      ON CONFLICT (content, level) DO UPDATE SET
        topic = EXCLUDED.topic,
        embedding = EXCLUDED.embedding
    `;
  }

  processed += batch.length;
  console.log(`${processed}/${toEmbed.length} phrases embedded and stored.`);
}

console.log("Import complete.");
