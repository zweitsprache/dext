import { neon } from "@neondatabase/serverless";
import { buildNiveauMerkmalListe, GER_LEVEL_ORDER, LEVEL_PROMPT_BLOCKS, type GerLevel, type GerLevelPromptSettings } from "@/lib/ger-level-specs";
import { DEFAULT_TEXTSORTEN, type TextsorteOption } from "@/lib/textsorten";

type StoredTextParams = {
  model: string;
  provider: string;
  niveau: string;
  textsorte: string;
  zielgruppe: string;
  textOrigin: string;
  requestPayload: unknown;
  responsePayload: unknown;
};

type StoredTasksParams = {
  model: string;
  provider: string;
  niveau: string;
  textsorte: string;
  zielgruppe: string;
  selectedFormats: string[];
  sourceWordCount: number;
  requestPayload: unknown;
  responsePayload: unknown;
};

type DbHealth = {
  connected: boolean;
  now?: string;
  error?: string;
};

export type LibraryTextItem = {
  id: string;
  title: string;
  summary: string;
  linguisticSummary: string;
  teaser: string;
  paragraphs: string[];
  glossary: Array<{ lemma: string; explanation: string }>;
  niveau: string;
  textsorte: string;
  zielgruppe: string;
  tags: string[];
  updatedAt: string;
};

declare global {
  // eslint-disable-next-line no-var
  var __texgeneratorNeonSchemaVersion: number | undefined;
  // eslint-disable-next-line no-var
  var __texgeneratorTextsortenSeeded: boolean | undefined;
  // eslint-disable-next-line no-var
  var __texgeneratorGerSettingsSeeded: boolean | undefined;
}

const NEON_SCHEMA_VERSION = 3;

function getDefaultGerLevelSettings(): GerLevelPromptSettings {
  return { ...LEVEL_PROMPT_BLOCKS };
}

function getSqlClient() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    return null;
  }

  return neon(databaseUrl);
}

async function ensureSchema() {
  const sql = getSqlClient();
  if (!sql || globalThis.__texgeneratorNeonSchemaVersion === NEON_SCHEMA_VERSION) {
    return;
  }

  await sql`
    CREATE TABLE IF NOT EXISTS textsorten (
      id BIGSERIAL PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      enabled BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS generated_texts (
      id BIGSERIAL PRIMARY KEY,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      model TEXT NOT NULL,
      provider TEXT NOT NULL,
      niveau TEXT NOT NULL,
      textsorte TEXT NOT NULL,
      zielgruppe TEXT NOT NULL,
      text_origin TEXT NOT NULL DEFAULT 'system',
      request_payload JSONB NOT NULL,
      response_payload JSONB NOT NULL
    )
  `;

  await sql`
    ALTER TABLE generated_texts
    ADD COLUMN IF NOT EXISTS text_origin TEXT NOT NULL DEFAULT 'system'
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS generated_tasks (
      id BIGSERIAL PRIMARY KEY,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      model TEXT NOT NULL,
      provider TEXT NOT NULL,
      niveau TEXT NOT NULL,
      textsorte TEXT NOT NULL,
      zielgruppe TEXT NOT NULL,
      selected_formats TEXT[] NOT NULL,
      source_word_count INTEGER NOT NULL,
      request_payload JSONB NOT NULL,
      response_payload JSONB NOT NULL
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS ger_level_settings (
      level TEXT PRIMARY KEY,
      prompt_block TEXT NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

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

  await sql`
    CREATE INDEX IF NOT EXISTS level_phrases_level_idx
    ON level_phrases (level)
  `;

  globalThis.__texgeneratorNeonSchemaVersion = NEON_SCHEMA_VERSION;
}

async function ensureGerLevelSettingsSeeded() {
  const sql = getSqlClient();
  if (!sql || globalThis.__texgeneratorGerSettingsSeeded) {
    return;
  }

  await ensureSchema();

  for (const level of GER_LEVEL_ORDER) {
    await sql`
      INSERT INTO ger_level_settings (level, prompt_block, updated_at)
      VALUES (${level}, ${LEVEL_PROMPT_BLOCKS[level]}, NOW())
      ON CONFLICT (level) DO NOTHING
    `;
  }

  globalThis.__texgeneratorGerSettingsSeeded = true;
}

async function ensureTextsortenSeeded() {
  const sql = getSqlClient();
  if (!sql || globalThis.__texgeneratorTextsortenSeeded) {
    return;
  }

  await ensureSchema();

  for (const option of DEFAULT_TEXTSORTEN) {
    await sql`
      INSERT INTO textsorten (name, enabled, updated_at)
      VALUES (${option.name}, ${option.enabled}, NOW())
      ON CONFLICT (name)
      DO UPDATE SET
        enabled = EXCLUDED.enabled,
        updated_at = NOW()
    `;
  }

  globalThis.__texgeneratorTextsortenSeeded = true;
}

export function isNeonConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

export async function getNeonHealth(): Promise<DbHealth> {
  const sql = getSqlClient();
  if (!sql) {
    return {
      connected: false,
      error: "DATABASE_URL is not configured.",
    };
  }

  try {
    const rows = await sql`SELECT NOW()::text AS now`;
    const now = Array.isArray(rows) && rows[0] && typeof rows[0] === "object" && "now" in rows[0] ? String(rows[0].now) : undefined;
    return {
      connected: true,
      now,
    };
  } catch (error) {
    return {
      connected: false,
      error: error instanceof Error ? error.message : "Unknown Neon connection error.",
    };
  }
}

export async function getTextsorten(): Promise<TextsorteOption[]> {
  const sql = getSqlClient();
  if (!sql) {
    return DEFAULT_TEXTSORTEN;
  }

  try {
    await ensureTextsortenSeeded();
    const rows = await sql`SELECT name, enabled FROM textsorten ORDER BY name ASC`;

    return rows
      .filter((row) => row && typeof row === "object" && "name" in row && "enabled" in row)
      .map((row) => ({
        name: String(row.name),
        enabled: Boolean(row.enabled),
      }));
  } catch (error) {
    console.error("Neon read textsorten failed:", error);
    return DEFAULT_TEXTSORTEN;
  }
}

export async function getGerLevelSettings(): Promise<GerLevelPromptSettings> {
  const sql = getSqlClient();
  if (!sql) {
    return getDefaultGerLevelSettings();
  }

  try {
    await ensureGerLevelSettingsSeeded();
    const rows = await sql`SELECT level, prompt_block FROM ger_level_settings ORDER BY level ASC`;
    const settings = getDefaultGerLevelSettings();

    for (const row of rows) {
      if (!row || typeof row !== "object" || !("level" in row) || !("prompt_block" in row)) {
        continue;
      }

      const level = String(row.level) as GerLevel;
      if (!GER_LEVEL_ORDER.includes(level)) {
        continue;
      }

      const promptBlock = String(row.prompt_block).trim();
      settings[level] = promptBlock || LEVEL_PROMPT_BLOCKS[level];
    }

    return settings;
  } catch (error) {
    console.error("Neon read ger_level_settings failed:", error);
    return getDefaultGerLevelSettings();
  }
}

export async function updateGerLevelSettings(settings: GerLevelPromptSettings): Promise<GerLevelPromptSettings> {
  const sql = getSqlClient();
  if (!sql) {
    throw new Error("DATABASE_URL is not configured.");
  }

  await ensureGerLevelSettingsSeeded();

  for (const level of GER_LEVEL_ORDER) {
    const promptBlock = settings[level].trim();
    await sql`
      INSERT INTO ger_level_settings (level, prompt_block, updated_at)
      VALUES (${level}, ${promptBlock}, NOW())
      ON CONFLICT (level)
      DO UPDATE SET
        prompt_block = EXCLUDED.prompt_block,
        updated_at = NOW()
    `;
  }

  return getGerLevelSettings();
}

export async function getStoredNiveauMerkmalListe(): Promise<string> {
  return buildNiveauMerkmalListe(await getGerLevelSettings());
}

export async function storeGeneratedText(params: StoredTextParams): Promise<void> {
  const sql = getSqlClient();
  if (!sql) {
    return;
  }

  try {
    await ensureSchema();

    await sql`
      INSERT INTO generated_texts (
        model,
        provider,
        niveau,
        textsorte,
        zielgruppe,
        text_origin,
        request_payload,
        response_payload
      )
      VALUES (
        ${params.model},
        ${params.provider},
        ${params.niveau},
        ${params.textsorte},
        ${params.zielgruppe},
        ${params.textOrigin},
        ${JSON.stringify(params.requestPayload)}::jsonb,
        ${JSON.stringify(params.responsePayload)}::jsonb
      )
    `;
  } catch (error) {
    console.error("Neon persist generated_texts failed:", error);
  }
}

export async function storeGeneratedTasks(params: StoredTasksParams): Promise<void> {
  const sql = getSqlClient();
  if (!sql) {
    return;
  }

  try {
    await ensureSchema();

    await sql`
      INSERT INTO generated_tasks (
        model,
        provider,
        niveau,
        textsorte,
        zielgruppe,
        selected_formats,
        source_word_count,
        request_payload,
        response_payload
      )
      VALUES (
        ${params.model},
        ${params.provider},
        ${params.niveau},
        ${params.textsorte},
        ${params.zielgruppe},
        ${params.selectedFormats},
        ${params.sourceWordCount},
        ${JSON.stringify(params.requestPayload)}::jsonb,
        ${JSON.stringify(params.responsePayload)}::jsonb
      )
    `;
  } catch (error) {
    console.error("Neon persist generated_tasks failed:", error);
  }
}

function buildLinguisticSummary(params: {
  niveau: string;
  lernschwerpunkt: string;
  wordCount?: number;
  paragraphCount?: number;
  mandatoryWordsTotal: number;
  missingMandatoryWords: number;
  riskFlagsCount: number;
}): string {
  const parts: string[] = [];

  if (params.lernschwerpunkt) {
    parts.push(`Fokus: ${params.lernschwerpunkt}`);
  }

  if (typeof params.wordCount === "number" && typeof params.paragraphCount === "number") {
    parts.push(`${params.wordCount} Woerter / ${params.paragraphCount} Absaetze`);
  }

  if (params.mandatoryWordsTotal > 0) {
    if (params.missingMandatoryWords === 0) {
      parts.push("Pflichtwortschatz erfuellt");
    } else {
      parts.push(`${params.missingMandatoryWords} Pflichtwort(er) fehlen`);
    }
  }

  if (params.riskFlagsCount > 0) {
    parts.push(`QA-Hinweise: ${params.riskFlagsCount}`);
  }

  if (parts.length === 0) {
    return `Niveau ${params.niveau}`;
  }

  return parts.join(" | ");
}

export async function getLibraryTexts(limit = 120): Promise<LibraryTextItem[]> {
  const sql = getSqlClient();
  if (!sql) {
    return [];
  }

  try {
    await ensureSchema();

    const rows = await sql`
      SELECT
        id,
        created_at,
        niveau,
        textsorte,
        zielgruppe,
        text_origin,
        request_payload,
        response_payload
      FROM generated_texts
      ORDER BY created_at DESC
      LIMIT ${limit}
    `;

    const parsed = rows
      .filter((row) => row && typeof row === "object")
      .map((row) => {
        const requestPayload = (row.request_payload && typeof row.request_payload === "object" ? row.request_payload : {}) as {
          lernschwerpunkt?: unknown;
          kulturraum?: unknown;
          pflichtwortschatz?: unknown;
        };
        const responsePayload = (row.response_payload && typeof row.response_payload === "object" ? row.response_payload : {}) as {
          title?: unknown;
          teaser?: unknown;
          paragraphs?: unknown;
          glossary?: unknown;
          qa?: unknown;
          linguisticSummary?: unknown;
        };

        const qa = (responsePayload.qa && typeof responsePayload.qa === "object" ? responsePayload.qa : {}) as {
          wordCount?: unknown;
          paragraphCount?: unknown;
          missingMandatoryWords?: unknown;
          riskFlags?: unknown;
        };

        const mandatoryWords = Array.isArray(requestPayload.pflichtwortschatz) ? requestPayload.pflichtwortschatz : [];
        const missingMandatoryWords = Array.isArray(qa.missingMandatoryWords) ? qa.missingMandatoryWords : [];
        const riskFlags = Array.isArray(qa.riskFlags) ? qa.riskFlags : [];
        const linguisticSummary =
          typeof responsePayload.linguisticSummary === "string" && responsePayload.linguisticSummary.trim()
            ? responsePayload.linguisticSummary.trim().replace(/"([^"]+)"/g, "«$1»").replace(/\u201C([^\u201D]*)\u201D/g, "«$1»").replace(/\u201C/g, "«").replace(/\u201D/g, "»")
            : buildLinguisticSummary({
                niveau: typeof row.niveau === "string" ? row.niveau : "",
                lernschwerpunkt: typeof requestPayload.lernschwerpunkt === "string" ? requestPayload.lernschwerpunkt.trim() : "",
                wordCount: typeof qa.wordCount === "number" ? qa.wordCount : undefined,
                paragraphCount: typeof qa.paragraphCount === "number" ? qa.paragraphCount : undefined,
                mandatoryWordsTotal: mandatoryWords.length,
                missingMandatoryWords: missingMandatoryWords.length,
                riskFlagsCount: riskFlags.length,
              });

        const tags: string[] = [];
        const textOrigin = typeof row.text_origin === "string" ? row.text_origin : "";
        if (textOrigin) {
          tags.push(textOrigin);
        }
        if (typeof requestPayload.kulturraum === "string" && requestPayload.kulturraum.trim()) {
          tags.push(requestPayload.kulturraum.trim());
        }
        if (typeof requestPayload.lernschwerpunkt === "string" && requestPayload.lernschwerpunkt.trim()) {
          tags.push(requestPayload.lernschwerpunkt.trim());
        }

        const createdAt = row.created_at ? new Date(String(row.created_at)) : new Date();
        const updatedAt = Number.isNaN(createdAt.getTime())
          ? new Date().toISOString().slice(0, 10)
          : createdAt.toISOString().slice(0, 10);

        return {
          id: String(row.id),
          title: typeof responsePayload.title === "string" && responsePayload.title.trim() ? responsePayload.title.trim() : "Ohne Titel",
          summary: typeof responsePayload.teaser === "string" && responsePayload.teaser.trim() ? responsePayload.teaser.trim() : "Kein Teaser verfügbar.",
          linguisticSummary,
          teaser: typeof responsePayload.teaser === "string" ? responsePayload.teaser.trim() : "",
          paragraphs: Array.isArray(responsePayload.paragraphs)
            ? responsePayload.paragraphs.map((paragraph) => String(paragraph).trim()).filter(Boolean)
            : [],
          glossary: Array.isArray(responsePayload.glossary)
            ? responsePayload.glossary
                .map((entry) => {
                  const lemma =
                    entry && typeof entry === "object" && "lemma" in entry ? String(entry.lemma ?? "").trim() : "";
                  const explanation =
                    entry && typeof entry === "object" && "explanation" in entry ? String(entry.explanation ?? "").trim() : "";
                  return { lemma, explanation };
                })
                .filter((entry) => entry.lemma && entry.explanation)
            : [],
          niveau: typeof row.niveau === "string" ? row.niveau : "",
          textsorte: typeof row.textsorte === "string" ? row.textsorte : "",
          zielgruppe: typeof row.zielgruppe === "string" ? row.zielgruppe : "",
          tags,
          updatedAt,
        } satisfies LibraryTextItem;
      });

    const deduped = new Map<string, LibraryTextItem>();
    for (const item of parsed) {
      const key = `${item.niveau.toLowerCase()}|${item.textsorte.toLowerCase()}|${item.title.toLowerCase()}`;
      if (!deduped.has(key)) {
        deduped.set(key, item);
      }
    }

    return Array.from(deduped.values());
  } catch (error) {
    console.error("Neon read library texts failed:", error);
    return [];
  }
}

export type DashboardStats = {
  totalTexts: number;
  niveauCounts: Record<string, number>;
  textsorteCounts: Record<string, number>;
  recent: Array<{ id: string; title: string; niveau: string; textsorte: string; updatedAt: string }>;
};

export async function getDashboardStats(): Promise<DashboardStats> {
  const sql = getSqlClient();
  if (!sql) {
    return { totalTexts: 0, niveauCounts: {}, textsorteCounts: {}, recent: [] };
  }

  try {
    await ensureSchema();

    const [countRows, niveauRows, textsorteRows, recentRows] = await Promise.all([
      sql`SELECT COUNT(*)::int AS total FROM generated_texts`,
      sql`SELECT niveau, COUNT(*)::int AS cnt FROM generated_texts GROUP BY niveau ORDER BY niveau`,
      sql`SELECT textsorte, COUNT(*)::int AS cnt FROM generated_texts GROUP BY textsorte ORDER BY cnt DESC`,
      sql`SELECT id, niveau, textsorte, response_payload, created_at FROM generated_texts ORDER BY created_at DESC LIMIT 5`,
    ]);

    const totalTexts = Number((countRows[0] as { total: number }).total ?? 0);

    const niveauCounts: Record<string, number> = {};
    for (const row of niveauRows) {
      niveauCounts[String(row.niveau)] = Number(row.cnt);
    }

    const textsorteCounts: Record<string, number> = {};
    for (const row of textsorteRows) {
      textsorteCounts[String(row.textsorte)] = Number(row.cnt);
    }

    const recent = recentRows.map((row) => {
      const rp = row.response_payload && typeof row.response_payload === "object" ? (row.response_payload as { title?: unknown }) : {};
      const createdAt = row.created_at ? new Date(String(row.created_at)) : new Date();
      return {
        id: String(row.id),
        title: typeof rp.title === "string" && rp.title.trim() ? rp.title.trim() : "Ohne Titel",
        niveau: String(row.niveau),
        textsorte: String(row.textsorte),
        updatedAt: Number.isNaN(createdAt.getTime()) ? new Date().toISOString().slice(0, 10) : createdAt.toISOString().slice(0, 10),
      };
    });

    return { totalTexts, niveauCounts, textsorteCounts, recent };
  } catch (error) {
    console.error("getDashboardStats failed:", error);
    return { totalTexts: 0, niveauCounts: {}, textsorteCounts: {}, recent: [] };
  }
}

export type LevelPhrase = {
  content: string;
  level: string;
  topic: string;
};

export async function getSimilarPhrases(
  niveau: string,
  queryText: string,
  limit = 8,
): Promise<LevelPhrase[]> {
  const sql = getSqlClient();
  if (!sql) return [];

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return [];

  try {
    await ensureSchema();

    // Check if any phrases exist for this level
    const countRows = await sql`
      SELECT COUNT(*)::int AS cnt FROM level_phrases WHERE level = ${niveau} AND embedding IS NOT NULL
    `;
    const count = Array.isArray(countRows) && countRows[0] ? Number(countRows[0].cnt) : 0;
    if (count === 0) return [];

    // Embed the query text
    const embeddingRes = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ model: "text-embedding-3-small", input: queryText }),
    });

    if (!embeddingRes.ok) {
      console.error("Embedding request failed:", await embeddingRes.text());
      return [];
    }

    const embeddingJson = (await embeddingRes.json()) as { data: Array<{ embedding: number[] }> };
    const vector = embeddingJson.data[0].embedding;
    const vectorStr = `[${vector.join(",")}]`;

    const rows = await sql`
      SELECT content, level, topic
      FROM level_phrases
      WHERE level = ${niveau}
        AND embedding IS NOT NULL
      ORDER BY embedding <=> ${vectorStr}::vector
      LIMIT ${limit}
    `;

    return rows
      .filter((r) => r && typeof r === "object" && "content" in r)
      .map((r) => ({
        content: String(r.content),
        level: String(r.level),
        topic: String(r.topic),
      }));
  } catch (error) {
    console.error("getSimilarPhrases failed:", error);
    return [];
  }
}
