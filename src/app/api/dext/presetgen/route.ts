import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { NextRequest } from "next/server";
import { auth } from "@/lib/auth/server";
import { DEFAULT_TEXTSORTEN } from "@/lib/textsorten";
import { GER_LEVEL_ORDER, LEVEL_LIMITS, type GerLevel } from "@/lib/ger-level-specs";

type ModelProvider = "anthropic" | "openai";

const MODEL_PROVIDERS: Record<string, ModelProvider> = {
  "claude-opus-4-5": "anthropic",
  "claude-sonnet-4-5": "anthropic",
  "gpt-4.1": "openai",
  "gpt-4o": "openai",
  "gpt-4o-mini": "openai",
};

const ENABLED_TEXTSORTEN = DEFAULT_TEXTSORTEN.filter((entry) => entry.enabled).map((entry) => entry.name);
const MAX_SOURCE_CHARS = 12000;
const MIN_SOURCE_WORDS = 70;
const STORAGE_KEY = "dext:presetgen:handoff";
const OVERLAP_RETRY_THRESHOLD = 0.14;
const OVERLAP_REJECT_THRESHOLD = 0.22;

const GERMAN_STOPWORDS = new Set([
  "a", "ab", "aber", "als", "am", "an", "auch", "auf", "aus", "bei", "bin", "bis", "bist", "da", "dann",
  "das", "dass", "dein", "dem", "den", "der", "des", "die", "dir", "doch", "du", "ein", "eine", "einem",
  "einen", "einer", "eines", "er", "es", "euch", "für", "hat", "habe", "haben", "hier", "ich", "ihr", "ihn",
  "ihm", "im", "in", "ist", "ja", "kein", "keine", "mit", "muss", "nach", "nicht", "noch", "nur", "oder",
  "sein", "seine", "sich", "sie", "so", "um", "und", "uns", "von", "vor", "war", "warst", "waren", "was",
  "wenn", "wer", "wie", "wir", "wird", "wo", "zu", "zum", "zur",
]);

type PresetGenRequest = {
  sourceText?: string;
  niveau?: string;
  model?: string;
};

type PresetFormValues = {
  niveau: string;
  thema: string;
  textsorte: string;
  themendetails: string;
  zielgruppe: string;
  setting: string;
  tonalitaet: string;
  erzaehlperspektive: string;
  leseransprache: string;
  lernschwerpunkt: string;
  pflichtwortschatz: string;
  tabuwortschatz: string;
  personen: string;
  wortzahl: string;
  absatzzahl: string;
  glossar: "ja" | "nein" | "nur schwierige Wörter";
  kulturraum: string;
};

type PresetGenResponse = {
  preset: PresetFormValues;
  warnings: string[];
  privacy: {
    persistedSourceText: false;
    abstractionMode: "medium";
    handoffStorageKey: string;
  };
};

function countWords(value: string): number {
  return value.trim().split(/\s+/).filter(Boolean).length;
}

function tokenize(value: string): string[] {
  return (value.toLowerCase().match(/[a-zäöüß]+/g) ?? [])
    .filter((token) => token.length >= 3)
    .filter((token) => !GERMAN_STOPWORDS.has(token));
}

function toTrigrams(tokens: string[]): string[] {
  if (tokens.length < 3) {
    return [];
  }

  const trigrams: string[] = [];
  for (let index = 0; index < tokens.length - 2; index += 1) {
    trigrams.push(`${tokens[index]} ${tokens[index + 1]} ${tokens[index + 2]}`);
  }
  return trigrams;
}

function lexicalOverlapRatio(sourceText: string, candidateText: string): number {
  const sourceSet = new Set(toTrigrams(tokenize(sourceText)));
  const candidateSet = new Set(toTrigrams(tokenize(candidateText)));

  if (sourceSet.size === 0 || candidateSet.size === 0) {
    return 0;
  }

  let overlap = 0;
  for (const trigram of candidateSet) {
    if (sourceSet.has(trigram)) {
      overlap += 1;
    }
  }

  return overlap / candidateSet.size;
}

function removeDirectFragments(value: string, sourceText: string): string {
  const normalized = value
    .replace(/["“”„«»]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!normalized) {
    return "";
  }

  // Keep semantic intent, but remove highly identifying markers.
  const deIdentified = normalized
    .replace(/\b\d{4,}\b/g, "")
    .replace(/\b[A-ZÄÖÜ][a-zäöüß]{2,}\s+[A-ZÄÖÜ][a-zäöüß]{2,}\b/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();

  if (!deIdentified) {
    return "";
  }

  if (sourceText.toLowerCase().includes(deIdentified.toLowerCase()) && deIdentified.length >= 24) {
    return "";
  }

  return deIdentified;
}

function sanitizeListField(value: string, sourceText: string): string {
  return value
    .split(/\n|,|;/)
    .map((entry) => removeDirectFragments(entry.trim(), sourceText).toLowerCase())
    .filter(Boolean)
    .slice(0, 8)
    .join("\n");
}

function normalizeGlossary(value: string): "ja" | "nein" | "nur schwierige Wörter" {
  if (value === "nein" || value === "nur schwierige Wörter") {
    return value;
  }
  return "ja";
}

function getDefaultWordCount(niveau: GerLevel): number {
  const limits = LEVEL_LIMITS[niveau];
  return Math.round((limits.minWords + limits.maxWords) / 2);
}

function getDefaultParagraphCount(niveau: GerLevel): number {
  const limits = LEVEL_LIMITS[niveau];
  if (limits.minParagraphs === limits.maxParagraphs) {
    return limits.minParagraphs;
  }
  return limits.minParagraphs;
}

function parseJsonResponse(raw: string): PresetFormValues {
  const cleaned = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  const jsonText = start >= 0 && end >= 0 ? cleaned.slice(start, end + 1) : cleaned;

  const parsed = JSON.parse(jsonText) as Partial<PresetFormValues>;

  return {
    niveau: typeof parsed.niveau === "string" ? parsed.niveau : "A2.1",
    thema: typeof parsed.thema === "string" ? parsed.thema.trim() : "",
    textsorte: typeof parsed.textsorte === "string" ? parsed.textsorte.trim() : "Sachtext",
    themendetails: typeof parsed.themendetails === "string" ? parsed.themendetails.trim() : "",
    zielgruppe: typeof parsed.zielgruppe === "string" ? parsed.zielgruppe.trim() : "allgemein erwachsen",
    setting: typeof parsed.setting === "string" ? parsed.setting.trim() : "Schweiz, neutral",
    tonalitaet: typeof parsed.tonalitaet === "string" ? parsed.tonalitaet.trim() : "textsortennatürlich",
    erzaehlperspektive: typeof parsed.erzaehlperspektive === "string" ? parsed.erzaehlperspektive.trim() : "textsortennatürlich",
    leseransprache: typeof parsed.leseransprache === "string" ? parsed.leseransprache.trim() : "textsortennatürlich",
    lernschwerpunkt: typeof parsed.lernschwerpunkt === "string" ? parsed.lernschwerpunkt.trim() : "",
    pflichtwortschatz: typeof parsed.pflichtwortschatz === "string" ? parsed.pflichtwortschatz.trim() : "",
    tabuwortschatz: typeof parsed.tabuwortschatz === "string" ? parsed.tabuwortschatz.trim() : "",
    personen: typeof parsed.personen === "string" ? parsed.personen.trim() : "",
    wortzahl: typeof parsed.wortzahl === "string" ? parsed.wortzahl.trim() : "",
    absatzzahl: typeof parsed.absatzzahl === "string" ? parsed.absatzzahl.trim() : "",
    glossar: normalizeGlossary(typeof parsed.glossar === "string" ? parsed.glossar : "ja"),
    kulturraum: typeof parsed.kulturraum === "string" ? parsed.kulturraum.trim() : "CH",
  };
}

function buildSystemPrompt(): string {
  return `Du bist dext:presetgen. Deine Aufgabe ist Reverse-Abstraktion fuer DaZ-Prompts.

Sicherheitsregeln (streng):
- Niemals woertliche Formulierungen aus dem Quelltext uebernehmen.
- Keine Namen, Orte, Daten, Zahlenfolgen, Titel oder eindeutige Ereignisse aus dem Quelltext uebernehmen.
- Keine Zitate, keine Satzfragmente, keine markanten Kollokationen aus dem Quelltext.
- Thema nur auf mittlerem Abstraktionsniveau ausgeben (breite Kategorie erlaubt, konkrete Identifikatoren verboten).
- Ziel: Preset fuer vergleichbare Texte, aber nicht rueckverfolgbar auf die Vorlage.

Gib ausschliesslich valides JSON zurueck, exakt mit diesen Feldern und nur als Strings:
{
  "niveau": "A1.1|A1.2|A2.1|A2.2|B1.1|B1.2",
  "thema": "...",
  "textsorte": "Sachtext|Nachricht|Bericht|Portraet|Interview|Kommentar|Blog|Erzaehlung|Dialog|Anleitung|Brief / Mail",
  "themendetails": "...",
  "zielgruppe": "...",
  "setting": "...",
  "tonalitaet": "textsortennatuerlich|sachlich-neutral|persoenlich-warm|jugendlich-locker|formell|augenzwinkernd|kontrovers|nuechtern|einfuehlsam",
  "erzaehlperspektive": "textsortennatuerlich|dritte-person|ich|wir|figuren-wechselnd",
  "leseransprache": "textsortennatuerlich|keine|sie-formell|du-vertraut|wir-inklusiv",
  "lernschwerpunkt": "...",
  "pflichtwortschatz": "ein Wort pro Zeile, allgemein, keine Eigennamen",
  "tabuwortschatz": "ein Wort pro Zeile, optional",
  "personen": "leer lassen ausser fuer generische Rollen",
  "wortzahl": "numerischer String passend zum Niveau",
  "absatzzahl": "numerischer String passend zum Niveau",
  "glossar": "ja|nein|nur schwierige Woerter",
  "kulturraum": "CH|DE|AT|neutral-DACH"
}

Keine Markdown-Ausgabe. Keine Zusatzfelder.`;
}

function buildUserPrompt(sourceText: string, niveau: GerLevel): string {
  return `Zielniveau: ${niveau}

Erzeuge ein nicht-rueckverfolgbares Preset auf Basis des folgenden Quelltexts.
Die Rueckgabe muss stark abstrahiert sein, dabei weiterhin fuer vergleichbare Texte funktionieren.

Quelltext (sensibel, nicht zitieren):
${sourceText}`;
}

async function generateWithAnthropic(client: Anthropic, model: string, system: string, prompt: string): Promise<PresetFormValues> {
  const response = await client.messages.create({
    model,
    max_tokens: 1400,
    temperature: 0.3,
    system,
    messages: [{ role: "user", content: prompt }],
  });

  const text = response.content.map((block) => (block.type === "text" ? block.text : "")).join("\n").trim();
  return parseJsonResponse(text);
}

async function generateWithOpenAI(client: OpenAI, model: string, system: string, prompt: string): Promise<PresetFormValues> {
  const response = await client.chat.completions.create({
    model,
    max_tokens: 1400,
    temperature: 0.3,
    messages: [
      { role: "system", content: system },
      { role: "user", content: prompt },
    ],
  });

  const text = response.choices[0]?.message?.content ?? "";
  return parseJsonResponse(text);
}

function sanitizePreset(candidate: PresetFormValues, sourceText: string, niveau: GerLevel): { preset: PresetFormValues; overlap: number; warnings: string[] } {
  const warnings: string[] = [];

  const safeTextsorte = ENABLED_TEXTSORTEN.includes(candidate.textsorte) ? candidate.textsorte : "Sachtext";
  if (safeTextsorte !== candidate.textsorte) {
    warnings.push("Textsorte wurde auf eine gueltige Option normalisiert.");
  }

  const limits = LEVEL_LIMITS[niveau];
  const fallbackWords = String(getDefaultWordCount(niveau));
  const fallbackParagraphs = String(getDefaultParagraphCount(niveau));

  const cleaned: PresetFormValues = {
    niveau,
    thema: removeDirectFragments(candidate.thema, sourceText) || "Alltagsnahe Situation im Berufs- oder Lebenskontext",
    textsorte: safeTextsorte,
    themendetails: removeDirectFragments(candidate.themendetails, sourceText),
    zielgruppe: removeDirectFragments(candidate.zielgruppe, sourceText) || "allgemein erwachsen",
    setting: removeDirectFragments(candidate.setting, sourceText) || "Schweiz, neutral",
    tonalitaet: candidate.tonalitaet || "textsortennatürlich",
    erzaehlperspektive: candidate.erzaehlperspektive || "textsortennatürlich",
    leseransprache: candidate.leseransprache || "textsortennatürlich",
    lernschwerpunkt: removeDirectFragments(candidate.lernschwerpunkt, sourceText),
    pflichtwortschatz: sanitizeListField(candidate.pflichtwortschatz, sourceText),
    tabuwortschatz: sanitizeListField(candidate.tabuwortschatz, sourceText),
    personen: sanitizeListField(candidate.personen, sourceText),
    wortzahl: /^\d+$/.test(candidate.wortzahl) ? candidate.wortzahl : fallbackWords,
    absatzzahl: /^\d+$/.test(candidate.absatzzahl) ? candidate.absatzzahl : fallbackParagraphs,
    glossar: normalizeGlossary(candidate.glossar),
    kulturraum: ["CH", "DE", "AT", "neutral-DACH"].includes(candidate.kulturraum) ? candidate.kulturraum : "CH",
  };

  const words = Number(cleaned.wortzahl);
  if (Number.isNaN(words) || words < limits.minWords || words > limits.maxWords) {
    cleaned.wortzahl = fallbackWords;
    warnings.push("Wortzahl wurde auf den Niveau-Standard gesetzt.");
  }

  const paragraphs = Number(cleaned.absatzzahl);
  if (Number.isNaN(paragraphs) || paragraphs < limits.minParagraphs || paragraphs > limits.maxParagraphs) {
    cleaned.absatzzahl = fallbackParagraphs;
    warnings.push("Absatzzahl wurde auf den Niveau-Standard gesetzt.");
  }

  const overlapText = [
    cleaned.thema,
    cleaned.themendetails,
    cleaned.setting,
    cleaned.lernschwerpunkt,
    cleaned.pflichtwortschatz,
    cleaned.personen,
  ].join(" ");
  const overlap = lexicalOverlapRatio(sourceText, overlapText);

  if (overlap > OVERLAP_RETRY_THRESHOLD) {
    warnings.push("Preset wurde stark abstrahiert, um Rueckverfolgbarkeit zu reduzieren.");
  }

  return { preset: cleaned, overlap, warnings };
}

export async function POST(request: NextRequest) {
  try {
    const { data: session } = await auth.getSession();
    if (!session?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const body = (await request.json()) as PresetGenRequest;
    const sourceText = (body.sourceText ?? "").trim();
    const niveau = (body.niveau ?? "A2.1").trim() as GerLevel;
    const model = (body.model ?? "gpt-4.1").trim();

    if (!GER_LEVEL_ORDER.includes(niveau)) {
      return new Response(JSON.stringify({ error: "Ungültiges Niveau." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!sourceText || countWords(sourceText) < MIN_SOURCE_WORDS) {
      return new Response(JSON.stringify({ error: `Quelltext muss mindestens ${MIN_SOURCE_WORDS} Wörter enthalten.` }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (sourceText.length > MAX_SOURCE_CHARS) {
      return new Response(JSON.stringify({ error: `Quelltext ist zu lang (max. ${MAX_SOURCE_CHARS} Zeichen).` }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const provider = MODEL_PROVIDERS[model] ?? "openai";
    const systemPrompt = buildSystemPrompt();
    const userPrompt = buildUserPrompt(sourceText, niveau);

    let candidate: PresetFormValues;

    if (provider === "anthropic") {
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        return new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY nicht konfiguriert" }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }
      const client = new Anthropic({ apiKey });
      candidate = await generateWithAnthropic(client, model, systemPrompt, userPrompt);
    } else {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        return new Response(JSON.stringify({ error: "OPENAI_API_KEY nicht konfiguriert" }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }
      const client = new OpenAI({ apiKey });
      candidate = await generateWithOpenAI(client, model, systemPrompt, userPrompt);
    }

    let { preset, overlap, warnings } = sanitizePreset(candidate, sourceText, niveau);

    if (overlap > OVERLAP_RETRY_THRESHOLD) {
      const stricterPrompt = `${userPrompt}\n\nUeberarbeite dein Preset jetzt strenger: maximal abstrahieren, keine konkreten Details, keine speziellen Substantive aus der Vorlage.`;
      const retryCandidate = provider === "anthropic"
        ? await generateWithAnthropic(new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! }), model, systemPrompt, stricterPrompt)
        : await generateWithOpenAI(new OpenAI({ apiKey: process.env.OPENAI_API_KEY! }), model, systemPrompt, stricterPrompt);

      const retry = sanitizePreset(retryCandidate, sourceText, niveau);
      if (retry.overlap < overlap) {
        preset = retry.preset;
        overlap = retry.overlap;
        warnings = [...warnings, ...retry.warnings];
      }
    }

    if (overlap > OVERLAP_REJECT_THRESHOLD) {
      return new Response(JSON.stringify({ error: "Preset konnte nicht sicher genug abstrahiert werden. Bitte Eingabetext verallgemeinern." }), {
        status: 422,
        headers: { "Content-Type": "application/json" },
      });
    }

    const responseBody: PresetGenResponse = {
      preset,
      warnings,
      privacy: {
        persistedSourceText: false,
        abstractionMode: "medium",
        handoffStorageKey: STORAGE_KEY,
      },
    };

    return new Response(JSON.stringify(responseBody), {
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    return new Response(JSON.stringify({ error: "Fehler bei der Preset-Generierung." }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
