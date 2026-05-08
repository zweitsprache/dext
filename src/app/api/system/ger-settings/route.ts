import { NextRequest } from "next/server";
import { GER_LEVEL_ORDER, LEVEL_PROMPT_BLOCKS, buildNiveauMerkmalListe, type GerLevel, type GerLevelPromptSettings } from "@/lib/ger-level-specs";
import { getGerLevelSettings, isNeonConfigured, updateGerLevelSettings } from "@/lib/neon";

function isGerLevel(value: string): value is GerLevel {
  return GER_LEVEL_ORDER.includes(value as GerLevel);
}

function normalizeSettings(input: unknown): GerLevelPromptSettings {
  if (!input || typeof input !== "object") {
    throw new Error("Ungültige GER-Einstellungen.");
  }

  const settings = {} as GerLevelPromptSettings;

  for (const level of GER_LEVEL_ORDER) {
    const value = (input as Record<string, unknown>)[level];
    if (typeof value !== "string") {
      throw new Error(`Fehlender Prompt-Block für ${level}.`);
    }

    const promptBlock = value.trim();
    if (!promptBlock) {
      throw new Error(`Der Prompt-Block für ${level} darf nicht leer sein.`);
    }

    settings[level] = promptBlock;
  }

  return settings;
}

export async function GET() {
  const settings = await getGerLevelSettings();

  return new Response(
    JSON.stringify({
      settings,
      defaults: LEVEL_PROMPT_BLOCKS,
      niveauMerkmalListe: buildNiveauMerkmalListe(settings),
      persistenceEnabled: isNeonConfigured(),
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    },
  );
}

export async function POST(request: NextRequest) {
  if (!isNeonConfigured()) {
    return new Response(JSON.stringify({ error: "DATABASE_URL nicht konfiguriert" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const body = await request.json();
    const rawSettings = body && typeof body === "object" && "settings" in body ? (body as { settings?: unknown }).settings : body;
    const settings = normalizeSettings(rawSettings);
    const updated = await updateGerLevelSettings(settings);

    return new Response(
      JSON.stringify({
        settings: updated,
        defaults: LEVEL_PROMPT_BLOCKS,
        niveauMerkmalListe: buildNiveauMerkmalListe(updated),
        persistenceEnabled: true,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Speichern fehlgeschlagen.";
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
}