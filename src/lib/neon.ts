import { neon } from "@neondatabase/serverless";
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
  var __texgeneratorNeonSchemaReady: boolean | undefined;
  // eslint-disable-next-line no-var
  var __texgeneratorTextsortenSeeded: boolean | undefined;
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
  if (!sql || globalThis.__texgeneratorNeonSchemaReady) {
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

  globalThis.__texgeneratorNeonSchemaReady = true;
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
    console.error("Neon read generated_texts for library failed:", error);
    return [];
  }
}
