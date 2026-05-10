import OpenAI from "openai";
import { NextRequest } from "next/server";

const GPT_MODEL = "gpt-4.1";

type AnalysisField = {
  value: string;
  reasoning: string;
  fromKnownOptions?: boolean;
};

type AnalysisResult = {
  niveau: AnalysisField;
  thema: AnalysisField;
  textsorte: AnalysisField;
  themendetails: AnalysisField;
  zielgruppe: AnalysisField;
  setting: AnalysisField;
  tonalitaet: AnalysisField;
  erzaehlperspektive: AnalysisField;
  leseransprache: AnalysisField;
  lernschwerpunkt: AnalysisField;
  pflichtwortschatz: AnalysisField;
  tabuwortschatz: AnalysisField;
  personen: AnalysisField;
  wortzahl: AnalysisField;
  absatzzahl: AnalysisField;
  glossar: AnalysisField;
  kulturraum: AnalysisField;
};

type AnalysisRequest = {
  text?: string;
};

const TRACEBACK_FRAGMENT_MIN_LENGTH = 16;
const SENSITIVE_FIELDS = ["thema", "themendetails", "setting", "pflichtwortschatz", "tabuwortschatz", "personen"] as const;

type SensitiveFieldKey = (typeof SENSITIVE_FIELDS)[number];

function getFallbackForSensitiveField(field: keyof AnalysisResult): string {
  switch (field) {
    case "thema":
      return "alltagsbezogenes Thema";
    case "themendetails":
      return "allgemeiner Kontext ohne identifizierende Details";
    case "setting":
      return "alltagsnahes Umfeld im deutschsprachigen Raum";
    case "personen":
      return "Person A, Person B";
    case "pflichtwortschatz":
      return "alltag, kommunikation, situation";
    case "tabuwortschatz":
      return "";
    default:
      return "";
  }
}

function hasDirectIdentifierPattern(value: string): boolean {
  return (
    /\b[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}\b/.test(value)
    || /https?:\/\//i.test(value)
    || /\+?\d[\d\s()./-]{6,}\d/.test(value)
    || /\b\d{1,2}[./-]\d{1,2}[./-]\d{2,4}\b/.test(value)
    || /\b\d{4,}\b/.test(value)
  );
}

function hasEntityLikePattern(value: string): boolean {
  return /\b[A-ZÄÖÜ][a-zäöüß]+(?:\s+[A-ZÄÖÜ][a-zäöüß]+){0,2}\b/.test(value);
}

function includesSourceFragment(value: string, sourceText: string): boolean {
  const normalizedValue = value.trim().replace(/\s+/g, " ").toLowerCase();
  const normalizedSource = sourceText.trim().replace(/\s+/g, " ").toLowerCase();
  if (!normalizedValue || normalizedValue.length < TRACEBACK_FRAGMENT_MIN_LENGTH) {
    return false;
  }
  return normalizedSource.includes(normalizedValue);
}

function needsSensitiveRewrite(field: SensitiveFieldKey, value: string, sourceText: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) {
    return false;
  }

  if (field === "personen") {
    return true;
  }

  return hasDirectIdentifierPattern(trimmed) || hasEntityLikePattern(trimmed) || includesSourceFragment(trimmed, sourceText);
}

function sanitizeSensitiveFieldFallback(field: SensitiveFieldKey, rawValue: string, sourceText: string): string {
  const value = rawValue.trim();
  if (!value) {
    return value;
  }

  if (field === "personen") {
    return "Person A, Person B";
  }

  if (hasDirectIdentifierPattern(value) || includesSourceFragment(value, sourceText)) {
    return getFallbackForSensitiveField(field);
  }

  if (field === "pflichtwortschatz" || field === "tabuwortschatz") {
    const entries = value
      .split(/[,;\n]/)
      .map((entry) => entry.trim().toLowerCase())
      .filter(Boolean)
      .filter((entry) => !hasDirectIdentifierPattern(entry))
      .filter((entry) => !includesSourceFragment(entry, sourceText));

    return entries.join(", ");
  }

  return value;
}

type SensitiveReplacementMap = Partial<Record<SensitiveFieldKey, string>>;

async function generateSensitiveAlternatives(
  client: OpenAI,
  model: string,
  values: SensitiveReplacementMap,
  context: Pick<AnalysisResult, "niveau" | "textsorte" | "zielgruppe" | "kulturraum">,
): Promise<SensitiveReplacementMap> {
  const prompt = `Erzeuge alternative, plausible Ersatzwerte fuer sensible Generator-Felder.

Orthografie: DE-CH – schreibe "ss" statt "ß" in allen Werten.

Regeln:
- Alle Werte muessen klar von den Eingabewerten verschieden sein.
- Keine Rueckschluesse auf Originaltext: keine Originalnamen, Originalorte, Originalinstitutionen, Originalereignisse.
- Ersetze sensible Details durch neue, plausible Varianten (z. B. neue Namen, andere Orte, andere Berufe, andere Nationalitaeten).
- Geschlechterkonsistenz ist Pflicht: Wenn eine Person als weiblich markiert ist, muessen Name, Rolle und Pronomen zusammenpassen (analog fuer maennlich). Bevorzuge neutrale Rollenformen, falls unklar.
- Stil soll fuer DaZ-Material brauchbar bleiben.
- Fuer pflichtwortschatz und tabuwortschatz: komma-separierte Listen.
- Fuer personen: komma-separierte Personenangaben, z. B. "Lea (Pflegefachfrau), Jonas (Bauleiter)" oder neutral "Lea (Pflegekraft), Jonas (Bauleitung)".
- Gib NUR JSON zurueck mit denselben Schluesseln wie im Input.

Kontext:
- niveau: ${context.niveau.value || ""}
- textsorte: ${context.textsorte.value || ""}
- zielgruppe: ${context.zielgruppe.value || ""}
- kulturraum: ${context.kulturraum.value || ""}

Zu ersetzen:
${JSON.stringify(values)}`;

  const completion = await client.chat.completions.create({
    model,
    temperature: 0.7,
    messages: [
      { role: "system", content: "Du gibst ausschliesslich valides JSON zurueck." },
      { role: "user", content: prompt },
    ],
  });

  const raw = completion.choices[0]?.message?.content;
  if (!raw) {
    return {};
  }

  const parsed = JSON.parse(extractJsonObject(raw)) as Record<string, unknown>;
  const out: SensitiveReplacementMap = {};

  for (const field of SENSITIVE_FIELDS) {
    const value = parsed[field];
    if (typeof value === "string" && value.trim()) {
      out[field] = value.trim();
    }
  }

  return out;
}

async function sanitizeAnalysisForPrivacy(analysis: AnalysisResult, sourceText: string, client: OpenAI): Promise<AnalysisResult> {
  const replacementsRequested: SensitiveReplacementMap = {};

  for (const field of SENSITIVE_FIELDS) {
    const current = analysis[field];
    if (needsSensitiveRewrite(field, current.value, sourceText)) {
      replacementsRequested[field] = current.value;
    }
  }

  const aiAlternatives = Object.keys(replacementsRequested).length > 0
    ? await generateSensitiveAlternatives(client, GPT_MODEL, replacementsRequested, {
      niveau: analysis.niveau,
      textsorte: analysis.textsorte,
      zielgruppe: analysis.zielgruppe,
      kulturraum: analysis.kulturraum,
    })
    : {};

  const sanitized: AnalysisResult = {
    ...analysis,
    niveau: { ...analysis.niveau },
    thema: { ...analysis.thema },
    textsorte: { ...analysis.textsorte },
    themendetails: { ...analysis.themendetails },
    zielgruppe: { ...analysis.zielgruppe },
    setting: { ...analysis.setting },
    tonalitaet: { ...analysis.tonalitaet },
    erzaehlperspektive: { ...analysis.erzaehlperspektive },
    leseransprache: { ...analysis.leseransprache },
    lernschwerpunkt: { ...analysis.lernschwerpunkt },
    pflichtwortschatz: { ...analysis.pflichtwortschatz },
    tabuwortschatz: { ...analysis.tabuwortschatz },
    personen: { ...analysis.personen },
    wortzahl: { ...analysis.wortzahl },
    absatzzahl: { ...analysis.absatzzahl },
    glossar: { ...analysis.glossar },
    kulturraum: { ...analysis.kulturraum },
  };

  for (const field of SENSITIVE_FIELDS) {
    const current = sanitized[field];
    const alternative = aiAlternatives[field]?.trim() ?? "";

    if (alternative && !includesSourceFragment(alternative, sourceText) && !hasDirectIdentifierPattern(alternative)) {
      current.value = alternative;
    } else {
      current.value = sanitizeSensitiveFieldFallback(field, current.value, sourceText);
    }
  }

  return sanitized;
}

function extractJsonObject(raw: string): string {
  const cleaned = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start >= 0 && end >= 0 && end > start) {
    return cleaned.slice(start, end + 1);
  }
  return cleaned;
}

function normalizeField(input: unknown): AnalysisField {
  if (!input || typeof input !== "object") {
    return { value: "", reasoning: "" };
  }

  const value = input as Record<string, unknown>;
  return {
    value: typeof value.value === "string" ? value.value.trim() : "",
    reasoning: typeof value.reasoning === "string" ? value.reasoning.trim() : "",
    fromKnownOptions: typeof value.fromKnownOptions === "boolean" ? value.fromKnownOptions : undefined,
  };
}

function normalizeResult(input: unknown): AnalysisResult {
  const value = input as Record<string, unknown>;

  return {
    niveau: normalizeField(value.niveau),
    thema: normalizeField(value.thema),
    textsorte: normalizeField(value.textsorte),
    themendetails: normalizeField(value.themendetails),
    zielgruppe: normalizeField(value.zielgruppe),
    setting: normalizeField(value.setting),
    tonalitaet: normalizeField(value.tonalitaet),
    erzaehlperspektive: normalizeField(value.erzaehlperspektive),
    leseransprache: normalizeField(value.leseransprache),
    lernschwerpunkt: normalizeField(value.lernschwerpunkt),
    pflichtwortschatz: normalizeField(value.pflichtwortschatz),
    tabuwortschatz: normalizeField(value.tabuwortschatz),
    personen: normalizeField(value.personen),
    wortzahl: normalizeField(value.wortzahl),
    absatzzahl: normalizeField(value.absatzzahl),
    glossar: normalizeField(value.glossar),
    kulturraum: normalizeField(value.kulturraum),
  };
}

function buildSystemPrompt(): string {
  return `Du analysierst einen gegebenen deutschen Text und extrahierst Generator-Felder fuer ein DaZ-Textformular.

Orthografie: Verwende DE-CH-Rechtschreibung. Schreibe "ss" statt "ß" in allen generierten Werten und Begruendungen.

Wichtige Regel:
- Wenn ein Wert NICHT in den bekannten Generator-Optionen liegt, uebernimm den besten freien Wert trotzdem.
- Erfinde keine Werte, wenn der Text nichts hergibt. Dann gib eine sinnvolle Default-Schaetzung.
- De-identifiziere streng: keine Namen, Orte, Firmen, Schulen, Institutionen, exakten Daten, Uhrzeiten, IDs, URLs, E-Mails, Telefonnummern oder einmaligen Ereignisse.
- Kein direktes oder nahes Copy-Paste aus der Vorlage. Werte fuer sensible Freitextfelder muessen abstrahiert sein.
- Wenn ein konkreter Begriff rueckverfolgbar waere, ersetze ihn durch eine allgemeine Kategorie.

Bekannte Optionen (nur zur Orientierung, keine harte Einschraenkung):
- niveau: A1.1, A1.2, A2.1, A2.2, B1.1, B1.2
- zielgruppe: allgemein erwachsen, Pflege, Bau, Gastronomie, Integrationskurs, Arbeitssuchende, Eltern in der Schule
- tonalitaet: textsortennatuerlich, sachlich-neutral, persoenlich-warm, jugendlich-locker, formell, augenzwinkernd, kontrovers, nuechtern, einfuehlsam
- erzaehlperspektive: textsortennatuerlich, dritte-person, ich, wir, figuren-wechselnd
- leseransprache: textsortennatuerlich, keine, sie-formell, du-vertraut, wir-inklusiv
- glossar: ja, nein, nur schwierige Woerter
- kulturraum: CH, DE, AT, neutral-DACH

Gib AUSSCHLIESSLICH valides JSON zurueck. Kein Markdown. Kein Text ausserhalb von JSON.
JSON-Form:
{
  "niveau": { "value": "...", "reasoning": "...", "fromKnownOptions": true|false },
  "thema": { "value": "...", "reasoning": "..." },
  "textsorte": { "value": "...", "reasoning": "...", "fromKnownOptions": true|false },
  "themendetails": { "value": "...", "reasoning": "..." },
  "zielgruppe": { "value": "...", "reasoning": "...", "fromKnownOptions": true|false },
  "setting": { "value": "...", "reasoning": "..." },
  "tonalitaet": { "value": "...", "reasoning": "...", "fromKnownOptions": true|false },
  "erzaehlperspektive": { "value": "...", "reasoning": "...", "fromKnownOptions": true|false },
  "leseransprache": { "value": "...", "reasoning": "...", "fromKnownOptions": true|false },
  "lernschwerpunkt": { "value": "...", "reasoning": "..." },
  "pflichtwortschatz": { "value": "...", "reasoning": "..." },
  "tabuwortschatz": { "value": "...", "reasoning": "..." },
  "personen": { "value": "...", "reasoning": "..." },
  "wortzahl": { "value": "...", "reasoning": "..." },
  "absatzzahl": { "value": "...", "reasoning": "..." },
  "glossar": { "value": "...", "reasoning": "...", "fromKnownOptions": true|false },
  "kulturraum": { "value": "...", "reasoning": "...", "fromKnownOptions": true|false }
}

Hinweise:
- pflichtwortschatz und tabuwortschatz als komma-separierte Liste im value.
- wortzahl und absatzzahl als String-Zahl im value.
- reasoning immer kurz (maximal 1 Satz).`;
}

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return Response.json({ error: "OPENAI_API_KEY not configured." }, { status: 500 });
    }

    const body = (await req.json()) as AnalysisRequest;
    if (!body.text || typeof body.text !== "string" || body.text.trim().length === 0) {
      return Response.json({ error: "Text is required." }, { status: 400 });
    }

    const client = new OpenAI({ apiKey });
    const completion = await client.chat.completions.create({
      model: GPT_MODEL,
      temperature: 0.2,
      messages: [
        { role: "system", content: buildSystemPrompt() },
        { role: "user", content: `Analysiere diesen Text und extrahiere Generator-Werte:\n\n${body.text.trim()}` },
      ],
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) {
      return Response.json({ error: "Empty model response." }, { status: 502 });
    }

    const parsed = JSON.parse(extractJsonObject(raw));
    const analysis = await sanitizeAnalysisForPrivacy(normalizeResult(parsed), body.text.trim(), client);

    return Response.json({ analysis });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unbekannter Fehler.";
    return Response.json({ error: message }, { status: 500 });
  }
}
