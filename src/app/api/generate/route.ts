import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { NextRequest } from "next/server";
import { storeGeneratedText } from "@/lib/neon";
import { FOCUS_MIN_LEVEL, LEVEL_LIMITS, LEVEL_RULES, NIVEAU_MERKMAL_LISTE } from "@/lib/ger-level-specs";

type ModelProvider = "anthropic" | "openai";

const MODEL_PROVIDERS: Record<string, ModelProvider> = {
  "claude-opus-4-5": "anthropic",
  "claude-sonnet-4-5": "anthropic",
  "gpt-4.1": "openai",
  "gpt-4o": "openai",
  "gpt-4o-mini": "openai",
};

type GenerateRequest = {
  niveau?: string;
  thema?: string;
  textsorte?: string;
  themendetails?: string;
  zielgruppe?: string;
  setting?: string;
  tonalitaet?: string;
  erzaehlperspektive?: string;
  leseransprache?: string;
  lernschwerpunkt?: string;
  pflichtwortschatz?: string[];
  tabuwortschatz?: string[];
  personen?: string[];
  wortzahl?: number;
  absatzzahl?: number;
  glossar?: string;
  kulturraum?: string;
  model?: string;
  textOrigin?: "user" | "system" | "unknown";
};

type GlossaryItem = {
  lemma: string;
  explanation: string;
};

type StructuredText = {
  title: string;
  teaser: string;
  paragraphs: string[];
  glossary: GlossaryItem[];
  linguisticSummary: string;
};

type QaSummary = {
  wordCount: number;
  paragraphCount: number;
  mandatoryWordsUsed: string[];
  missingMandatoryWords: string[];
  tabooWordsFound: string[];
  riskFlags: string[];
  perspective: string;
  address: string;
};

type GenerationResponse = StructuredText & {
  qa: QaSummary;
};

type ValidationSummary = {
  riskFlags: string[];
  mandatoryWordsUsed: string[];
  missingMandatoryWords: string[];
  tabooWordsFound: string[];
  wordCount: number;
  paragraphCount: number;
};

function getDefaultWordCount(niveau: string): number {
  const limits = LEVEL_LIMITS[niveau];
  return Math.round((limits.minWords + limits.maxWords) / 2);
}

function getDefaultParagraphCount(niveau: string, wordCount: number): number {
  const limits = LEVEL_LIMITS[niveau];
  if (limits.minParagraphs === limits.maxParagraphs) {
    return limits.minParagraphs;
  }

  const midPoint = Math.round((limits.minWords + limits.maxWords) / 2);
  return wordCount <= midPoint ? limits.minParagraphs : limits.maxParagraphs;
}

function isDialogLike(textsorte: string): boolean {
  return textsorte === "Dialog" || textsorte === "Interview";
}

function countWords(value: string): number {
  return value.trim().split(/\s+/).filter(Boolean).length;
}

function compareLevels(left: string, right: string): number {
  const order = ["A1.1", "A1.2", "A2.1", "A2.2", "B1.1", "B1.2"];
  return order.indexOf(left) - order.indexOf(right);
}

function normalizePhrase(value: string): string {
  return value.trim().toLowerCase();
}

function listOrNone(values: string[]): string {
  return values.length > 0 ? values.join(", ") : "keine";
}

function getTextsortHint(textsorte: string): string {
  const normalized = textsorte.toLowerCase();

  if (normalized.includes("sachtext") || normalized.includes("bericht")) {
    return "Sachtext / Bericht: klarer Lead, Absätze mit Themensätzen, neutrale Tonalität, einfache Beispiele oder Daten. Standard: keine Leseranrede, 3. Person.";
  }
  if (normalized.includes("nachricht") || normalized.includes("meldung")) {
    return "Nachricht / Meldung: W-Fragen (Wer/Was/Wo/Wann/Wie/Warum) in den ersten Sätzen, sachlich, knapp. Keine Leseranrede.";
  }
  if (normalized.includes("porträt") || normalized.includes("portrat")) {
    return "Porträt: Person, Kontext, charakteristische Details. Indirekte Rede erst ab A2.2.";
  }
  if (normalized.includes("interview")) {
    return "Interview: Sprecherwechsel mit Person A, Person B oder vorgegebenen Namen aus Personen. Niveaugerechte Fragen und Antworten.";
  }
  if (normalized.includes("dialog")) {
    return "Dialog: zwei oder mehr Sprecher:innen, klare Sprecherkennzeichnung, alltagsnahe Pragmatik. Die Figuren wählen ihre Anrede zueinander passend zum Kontext.";
  }
  if (normalized.includes("erzählung") || normalized.includes("blog")) {
    return "Erzählung / Blog: klare Chronologie, niveaugerechte Zeitmarker. Blog erlaubt Ich-Perspektive und persönlichere Tonalität.";
  }
  if (normalized.includes("kommentar")) {
    return "Kommentar: erst ab B1.1. Aufbau: These - Begründung - Fazit. Vorsichtige Bewertungssprache, einfache Argumentationsmarker.";
  }
  if (normalized.includes("anleitung")) {
    return "Anleitung: Schritt-für-Schritt-Aufbau. Auf A1.x kein Imperativ, sondern Aussagesätze mit Modalverb. Ab A2.2 ist Imperativ möglich, falls passend.";
  }
  if (normalized.includes("brief") || normalized.includes("mail")) {
    return "Brief / Mail: Anrede und Grussformel niveaugerecht. Direkte Leseransprache ist hier sinnvoll.";
  }

  return "";
}

function getOutputContract(glossaryMode: string, dialogLike: boolean): string {
  return `
Antworte ausschliesslich mit einem gültigen JSON-Objekt ohne Codeblock.
Das Objekt muss genau diese Struktur haben:
{
  "title": "string",
  "teaser": "string",
  "paragraphs": ["string", "..."],
  "glossary": [{ "lemma": "string", "explanation": "string" }],
  "linguisticSummary": "string"
}

Regeln für dieses JSON:
- title: 3-8 Wörter.
- teaser: max. 140 Zeichen.
- paragraphs: ${dialogLike ? "ein Array aus Sprecherwechseln oder dialognahen Abschnitten" : "ein Array mit genau der verlangten Absatzzahl"}.
- glossary: ${glossaryMode === "nein" ? "ein leeres Array" : "ein Array mit 6-12 Einträgen oder weniger, falls nur schwierige Wörter glossiert werden sollen"}.
- linguisticSummary: Maximal 2 kurze Sätze für Lehrpersonen. Nenne direkt die dominanten grammatischen Strukturen und den didaktischen Schwerpunkt. Kein Einstieg wie «Dieser Text», «Der Text», «In diesem Text». Keine Empfehlungen, wie man ihn einsetzt. Verwende ausschliesslich die Anführungszeichen « und », niemals " oder '. Beispiel: «Perfekt und weil-Sätze auf A2.1. Alltagswortschatz zu Arbeit und Routinen.»
- Keine zusätzlichen Felder.
- Keine Markdown-Formatierung.
`;
}

function getCompactLevelRules(niveau: string): string {
  const rules = LEVEL_RULES[niveau];
  return `
Kompakte Niveauregeln für ${niveau}
- Erlaubt: ${rules.allowed.join(", ")}
- Bevorzugt: ${rules.preferred.join(", ")}
- Verboten: ${rules.forbidden.join(", ")}
`;
}

function buildSystemPrompt(niveau: string, glossaryMode: string, dialogLike: boolean): string {
  return `Rolle und Ziel
Du bist Autor:in für didaktisch hochwertige Lesetexte im Bereich Deutsch als Zweitsprache (Erwachsene). Erzeuge einen flüssigen, authentischen und sprachlich korrekten Text auf dem vorgegebenen Niveau zum vorgegebenen Thema in der vorgegebenen Textsorte.
Sakrosankte Regel: Verwende ausschliesslich die in der Niveau-Merkmal-Liste für das gewählte Niveau freigegebenen Strukturen (kumulativ). Höhere Strukturen sind verboten - auch dann, wenn sie inhaltlich schöner wären. Lieber den Inhalt umformulieren als das Niveau überschreiten.
Orthografie: DE-CH (ss statt ß; CH-Lexik wie Spital, Velo, Tram, Billet, Tschüss, parkieren ist zulässig und erwünscht, sofern stimmig).

${NIVEAU_MERKMAL_LISTE}

${getCompactLevelRules(niveau)}

Globale Qualitätskriterien
- Flüssigkeit und Lesbarkeit: klare, natürliche Sätze; kein Telegrafstil, kein Schulbuch-Sound; stimmiger Rhythmus.
- Authentizität: Der Text soll wie ein echter Text für lesende Erwachsene klingen, nicht wie eine Sprachübung.
- Kohäsion: thematische Fortschreibung, saubere Referenzen, niveaugerechte Konnektoren.
- Erwachsenenrelevanz: alltags-, berufs- oder gesellschaftsnah; respektvoll, inklusiv, kultursensibel.
- DE-CH-Standard: ss statt ß; CH-Lexik nutzen, wenn natürlich.
- Wortschatz: hochfrequente, konkrete Lexik bevorzugen; Jargon nur, wenn das Thema ihn fordert und der Kontext stützt.
- Fehlerfreiheit: Grammatik, Orthografie, Zeichensetzung tadellos.
- Neutralität: keine bewertenden, romantisierenden, verniedlichenden oder moralisierenden Aussagen, ausser wenn Textsorte, Figur oder Vorgabe das motivieren.
- Inklusive Sprache: neutrale Formen bevorzugt (Mitarbeitende, Lehrpersonen). Wenn Genderform nötig: Doppelpunkt, kein Stern, kein Binnen-I.

Erzählperspektive und Leseransprache
- Erzählperspektive und Leseransprache sind getrennte Schalter und bleiben im ganzen Text konsistent, auch in Titel, Teaser und Glossar.
- man ist nicht Standard. Wenn Neutralität gewünscht ist, bevorzuge natürlichere Lösungen wie 3. Person Plural oder beschreibende Konstruktionen.
- man ist erlaubt, wenn es natürlich klingt und sparsam eingesetzt wird.
- Auf A1.1 und A1.2: kein Imperativ, weder bei sie-formell noch bei du-vertraut. Stattdessen Aussagesätze oder Ja-Nein-Fragen.
- Bei Dialog und Interview legen die Figuren ihre eigene Anrede zueinander passend zum Kontext fest. Das ist unabhängig von der Leseransprache.

Lernschwerpunkt
- Wenn ein Lernschwerpunkt gesetzt ist, soll die genannte Struktur gehäuft, aber nicht künstlich vorkommen.
- Zielgrösse: 3-6 klare Belege, eingebettet in natürliche Sätze.
- Der Text bleibt primär Lesetext, kein Drillübungstext.

Wortschatzsteuerung
- A1.x: 85-90 % hochfrequente Wörter, neue Wörter sofort kontextualisieren.
- A2.x: 75-85 % hochfrequente Wörter, fachnahe Wörter sparsam und kontextgestützt.
- B1.x: 65-75 % hochfrequente Wörter, Abstrakta gezielt und anschaulich.
- Pflichtwortschatz natürlich einbauen, nicht aufreihen.
- Tabuwortschatz konsequent vermeiden und durch häufigere Synonyme ersetzen.

Qualitätssicherung vor Ausgabe, still und intern
- Prüfe Satz für Satz auf Niveaueinhaltung.
- Prüfe Wortzahl, Absatzzahl und Format.
- Prüfe Pflichtwortschatz, Tabuwortschatz, Glossar, Perspektive und Leseransprache.
- Wenn etwas nicht passt, überarbeite den Text vor der Ausgabe.

${getOutputContract(glossaryMode, dialogLike)}`;
}

function buildUserPrompt(input: Required<GenerateRequest>): string {
  const dialogLike = isDialogLike(input.textsorte);
  const textsortHint = getTextsortHint(input.textsorte);

  return `Eingaben der Lehrkraft
- Niveau: ${input.niveau}
- Thema: ${input.thema}
- Textsorte: ${input.textsorte}
- Themendetails: ${input.themendetails || "frei wählen"}
- Zielgruppe: ${input.zielgruppe}
- Setting: ${input.setting}
- Tonalität: ${input.tonalitaet}
- Erzählperspektive: ${input.erzaehlperspektive}
- Leseransprache: ${input.leseransprache}
- Lernschwerpunkt: ${input.lernschwerpunkt || "keiner"}
- Pflichtwortschatz: ${listOrNone(input.pflichtwortschatz)}
- Tabuwortschatz: ${listOrNone(input.tabuwortschatz)}
- Personen: ${listOrNone(input.personen)}
- Wortzahl: ${input.wortzahl}
- Absatzzahl: ${dialogLike ? "Dialogregel anwenden" : input.absatzzahl}
- Glossar: ${input.glossar}
- Kulturraum: ${input.kulturraum}

Arbeitsanweisungen
- Übernimm eingebettete Übersteuerungen aus Thema, Themendetails oder Textsorte ohne Rückfrage.
- Verwende nur die Strukturen des Niveaus ${input.niveau}, kumulativ und strikt.
- Bevorzuge Inhaltstreue und natürliche Formulierungen innerhalb der Niveaugrenzen.
- ${textsortHint}
- ${dialogLike ? `Richte die Länge am natürlichen Dialogverlauf aus. Richtwert: für ${input.niveau} kurze, natürliche Sprecherwechsel.` : `Ziele auf ungefähr ${input.wortzahl} Wörter und ${input.absatzzahl} Absätze.`}
- Glossarregel: ${input.glossar === "nein" ? "kein Glossar" : input.glossar === "nur schwierige Wörter" ? "nur schwierige oder niveaurelevante Wörter glossieren" : "6-12 stufengerechte Glossareinträge"}.
- Falls Pflichtwortschatz das Niveau herausfordert, stütze die Wörter durch klaren Kontext und decke sie bei aktiviertem Glossar ab.
- Vermeide jeden Ausdruck aus dem Tabuwortschatz.
`;
}

function buildRepairPrompt(input: Required<GenerateRequest>, draft: StructuredText, summary: ValidationSummary): string {
  return `Überarbeite den folgenden JSON-Entwurf. Behalte Thema, Textsorte und Niveau bei. Repariere alle Verstösse gegen Niveau, Format, Pflichtwortschatz und Glossarqualität.

Aktuelle Probleme: ${summary.riskFlags.length > 0 ? summary.riskFlags.join(" | ") : "keine harten Probleme, aber normalisieren und verbessern"}
Fehlende Pflichtwörter: ${listOrNone(summary.missingMandatoryWords)}
Gefundene Tabuwörter: ${listOrNone(summary.tabooWordsFound)}

Eingaben der Lehrkraft
- Niveau: ${input.niveau}
- Textsorte: ${input.textsorte}
- Thema: ${input.thema}
- Erzählperspektive: ${input.erzaehlperspektive}
- Leseransprache: ${input.leseransprache}
- Lernschwerpunkt: ${input.lernschwerpunkt || "keiner"}

JSON-Entwurf:
${JSON.stringify(draft, null, 2)}

Gib nur ein gültiges JSON-Objekt in derselben Struktur zurück. Keine Erklärung.`;
}

function normalizeInput(body: GenerateRequest): Required<GenerateRequest> {
  const niveau = body.niveau ?? "A2.1";
  const wordCount = body.wortzahl ?? getDefaultWordCount(niveau);
  const paragraphCount = body.absatzzahl ?? getDefaultParagraphCount(niveau, wordCount);

  return {
    niveau,
    thema: body.thema ?? "",
    textsorte: body.textsorte ?? "Sachtext",
    themendetails: body.themendetails ?? "",
    zielgruppe: body.zielgruppe ?? "allgemein erwachsen",
    setting: body.setting ?? "Schweiz, neutral",
    tonalitaet: body.tonalitaet ?? "textsortennatürlich",
    erzaehlperspektive: body.erzaehlperspektive ?? "textsortennatürlich",
    leseransprache: body.leseransprache ?? "textsortennatürlich",
    lernschwerpunkt: body.lernschwerpunkt ?? "",
    pflichtwortschatz: body.pflichtwortschatz ?? [],
    tabuwortschatz: body.tabuwortschatz ?? [],
    personen: body.personen ?? [],
    wortzahl: wordCount,
    absatzzahl: paragraphCount,
    glossar: body.glossar ?? "ja",
    kulturraum: body.kulturraum ?? "CH",
    model: body.model ?? "gpt-4.1",
    textOrigin: body.textOrigin ?? "system",
  };
}

function validateInput(input: Required<GenerateRequest>): string | null {
  if (!input.thema || !input.textsorte || !input.niveau) {
    return "Bitte ergänzen: Niveau, Thema und Textsorte.";
  }

  if (input.textsorte === "Kommentar" && compareLevels(input.niveau, "B1.1") < 0) {
    return "Kommentar ist erst ab B1.1 vorgesehen. Passe Textsorte oder Niveau an.";
  }

  if (!isDialogLike(input.textsorte)) {
    const limits = LEVEL_LIMITS[input.niveau];
    if (input.wortzahl < limits.minWords || input.wortzahl > limits.maxWords) {
      return `Wortzahl ausserhalb des Bereichs für ${input.niveau} (${limits.minWords}-${limits.maxWords}).`;
    }
    if (input.absatzzahl < limits.minParagraphs || input.absatzzahl > limits.maxParagraphs) {
      return `Absatzzahl ausserhalb des Bereichs für ${input.niveau} (${limits.minParagraphs}-${limits.maxParagraphs}).`;
    }
  }

  const focus = normalizePhrase(input.lernschwerpunkt);
  if (focus) {
    for (const rule of FOCUS_MIN_LEVEL) {
      if (rule.keywords.some((keyword) => focus.includes(keyword)) && compareLevels(input.niveau, rule.minLevel) < 0) {
        return `Der Lernschwerpunkt «${input.lernschwerpunkt}» passt nicht zu ${input.niveau}. Mindestniveau: ${rule.minLevel}.`;
      }
    }
  }

  const maxMandatoryWords = input.niveau.startsWith("A1") ? 4 : input.niveau.startsWith("A2") ? 6 : 8;
  if (input.pflichtwortschatz.length > maxMandatoryWords) {
    return `Zu viele Pflichtwörter für ${input.niveau}. Empfohlen sind höchstens ${maxMandatoryWords}.`;
  }

  if (input.pflichtwortschatz.length > Math.max(3, Math.floor(input.wortzahl / 35))) {
    return "Zu viele Pflichtwörter im Verhältnis zur Wortzahl. Reduziere die Liste oder erhöhe die Wortzahl.";
  }

  if (input.niveau.startsWith("A1") && ["kontrovers", "augenzwinkernd"].includes(input.tonalitaet)) {
    return `Die Tonalität «${input.tonalitaet}» ist für ${input.niveau} didaktisch zu anspruchsvoll.`;
  }

  return null;
}

function extractTextFromResponse(response: Anthropic.Messages.Message): string {
  return response.content.map((block) => (block.type === "text" ? block.text : "")).join("").trim();
}

function parseJsonResponse(raw: string): StructuredText {
  const cleaned = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  const jsonText = start >= 0 && end >= 0 ? cleaned.slice(start, end + 1) : cleaned;
  const parsed = JSON.parse(jsonText) as Partial<StructuredText>;

  return {
    title: typeof parsed.title === "string" ? parsed.title.trim() : "",
    teaser: typeof parsed.teaser === "string" ? parsed.teaser.trim() : "",
    paragraphs: Array.isArray(parsed.paragraphs)
      ? parsed.paragraphs.map((paragraph) => String(paragraph).trim()).filter(Boolean)
      : [],
    glossary: Array.isArray(parsed.glossary)
      ? parsed.glossary
          .map((entry) => ({
            lemma: typeof entry?.lemma === "string" ? entry.lemma.trim() : "",
            explanation: typeof entry?.explanation === "string" ? entry.explanation.trim() : "",
          }))
          .filter((entry) => entry.lemma && entry.explanation)
      : [],
    linguisticSummary: typeof parsed.linguisticSummary === "string" ? parsed.linguisticSummary.trim() : "",
  };
}

function buildPlainText(payload: StructuredText): string {
  const sections = [payload.title, payload.teaser, ...payload.paragraphs];
  if (payload.glossary.length > 0) {
    sections.push("Glossar\n" + payload.glossary.map((entry) => `${entry.lemma} - ${entry.explanation}`).join("\n"));
  }
  return sections.join("\n\n");
}

function findInvalidPraeteritumForms(text: string): string[] {
  const lower = text.toLowerCase();
  const tokens = Array.from(lower.matchAll(/\b[a-zäöü]+\b/g)).map((match) => match[0]);

  const allowedForms = new Set([
    "war",
    "warst",
    "waren",
    "wart",
    "hatte",
    "hattest",
    "hatten",
    "hattet",
  ]);

  const nonVerbExceptions = new Set([
    "heute",
    "leute",
    "bitte",
    "seite",
    "seiten",
    "zweite",
    "dritte",
    "breite",
    "mitte",
  ]);

  const irregularCandidates = new Set([
    "ging",
    "kam",
    "sah",
    "nahm",
    "gab",
    "lief",
    "fand",
    "stand",
    "blieb",
    "wurde",
    "musste",
    "konnte",
    "wollte",
    "sollte",
    "durfte",
    "machte",
    "sagte",
  ]);

  const violations = new Set<string>();

  for (const token of tokens) {
    if (allowedForms.has(token) || nonVerbExceptions.has(token)) {
      continue;
    }

    if (irregularCandidates.has(token)) {
      violations.add(token);
      continue;
    }

    if (/^[a-zäöü]+(te|test|ten|tet)$/.test(token)) {
      violations.add(token);
    }
  }

  return Array.from(violations);
}

function analyzePayload(payload: StructuredText, input: Required<GenerateRequest>): ValidationSummary {
  const plainText = buildPlainText(payload);
  const wordCount = countWords(plainText);
  const paragraphCount = payload.paragraphs.length;
  const normalizedText = normalizePhrase(plainText);
  const mandatoryWordsUsed = input.pflichtwortschatz.filter((word) => normalizedText.includes(normalizePhrase(word)));
  const missingMandatoryWords = input.pflichtwortschatz.filter((word) => !mandatoryWordsUsed.includes(word));
  const tabooWordsFound = input.tabuwortschatz.filter((word) => normalizedText.includes(normalizePhrase(word)));
  const riskFlags: string[] = [];

  if (!payload.title) {
    riskFlags.push("Titel fehlt.");
  }
  if (payload.title && (countWords(payload.title) < 3 || countWords(payload.title) > 8)) {
    riskFlags.push("Titel hat nicht 3-8 Wörter.");
  }
  if (!payload.teaser) {
    riskFlags.push("Teaser fehlt.");
  }
  if (payload.teaser.length > 140) {
    riskFlags.push("Teaser ist länger als 140 Zeichen.");
  }
  if (payload.paragraphs.length === 0) {
    riskFlags.push("Haupttext fehlt.");
  }

  if (!isDialogLike(input.textsorte) && paragraphCount !== input.absatzzahl) {
    riskFlags.push(`Absatzzahl ist ${paragraphCount} statt ${input.absatzzahl}.`);
  }

  if (!isDialogLike(input.textsorte)) {
    const limits = LEVEL_LIMITS[input.niveau];
    if (wordCount < limits.minWords || wordCount > limits.maxWords) {
      riskFlags.push(`Wortzahl ${wordCount} liegt ausserhalb des Bereichs für ${input.niveau}.`);
    }
  }

  if (input.glossar === "nein" && payload.glossary.length > 0) {
    riskFlags.push("Glossar ist vorhanden, obwohl es deaktiviert ist.");
  }

  if (input.glossar !== "nein" && input.glossar !== "nur schwierige Wörter" && (payload.glossary.length < 6 || payload.glossary.length > 12)) {
    riskFlags.push("Glossar hat nicht 6-12 Einträge.");
  }

  if (missingMandatoryWords.length > 0) {
    riskFlags.push(`Pflichtwortschatz fehlt teilweise: ${missingMandatoryWords.join(", ")}.`);
  }

  if (tabooWordsFound.length > 0) {
    riskFlags.push(`Tabuwortschatz gefunden: ${tabooWordsFound.join(", ")}.`);
  }

  if (input.niveau === "A2.1" || input.niveau === "A2.2") {
    const invalidPraeteritum = findInvalidPraeteritumForms(plainText);
    if (invalidPraeteritum.length > 0) {
      riskFlags.push(`Unzulässiges Präteritum für ${input.niveau}: ${invalidPraeteritum.join(", ")}. Erlaubt sind nur war/warst/waren/wart und hatte/hattest/hatten/hattet.`);
    }
  }

  return {
    riskFlags,
    mandatoryWordsUsed,
    missingMandatoryWords,
    tabooWordsFound,
    wordCount,
    paragraphCount,
  };
}

async function generateWithAnthropic(client: Anthropic, model: string, system: string, prompt: string): Promise<StructuredText> {
  const response = await client.messages.create({
    model,
    max_tokens: 2600,
    temperature: 0.4,
    system,
    messages: [{ role: "user", content: prompt }],
  });
  return parseJsonResponse(extractTextFromResponse(response));
}

async function generateWithOpenAI(client: OpenAI, model: string, system: string, prompt: string): Promise<StructuredText> {
  const isReasoningModel = model.startsWith("o1") || model.startsWith("o3") || model.startsWith("o4");
  const response = await client.chat.completions.create({
    model,
    ...(isReasoningModel
      ? { max_completion_tokens: 5000 }
      : { max_tokens: 2600, temperature: 0.4 }),
    messages: [
      { role: isReasoningModel ? "developer" : "system", content: system },
      { role: "user", content: prompt },
    ],
  });
  const text = response.choices[0]?.message?.content ?? "";
  return parseJsonResponse(text);
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as GenerateRequest;
    const input = normalizeInput(body);
    const validationError = validateInput(input);

    if (validationError) {
      return new Response(JSON.stringify({ error: validationError }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const provider: ModelProvider = MODEL_PROVIDERS[input.model] ?? "anthropic";

    let generateFn: (system: string, prompt: string) => Promise<StructuredText>;

    if (provider === "openai") {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        return new Response(JSON.stringify({ error: "OPENAI_API_KEY nicht konfiguriert" }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }
      const client = new OpenAI({ apiKey });
      generateFn = (system, prompt) => generateWithOpenAI(client, input.model, system, prompt);
    } else {
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        return new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY nicht konfiguriert" }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }
      const client = new Anthropic({ apiKey });
      generateFn = (system, prompt) => generateWithAnthropic(client, input.model, system, prompt);
    }

    const dialogLike = isDialogLike(input.textsorte);
    const systemPrompt = buildSystemPrompt(input.niveau, input.glossar, dialogLike);

    const draft = await generateFn(systemPrompt, buildUserPrompt(input));
    const draftSummary = analyzePayload(draft, input);
    const repaired = await generateFn(systemPrompt, buildRepairPrompt(input, draft, draftSummary));
    const finalSummary = analyzePayload(repaired, input);

    const payload: GenerationResponse = {
      ...repaired,
      glossary: input.glossar === "nein" ? [] : repaired.glossary,
      qa: {
        wordCount: finalSummary.wordCount,
        paragraphCount: finalSummary.paragraphCount,
        mandatoryWordsUsed: finalSummary.mandatoryWordsUsed,
        missingMandatoryWords: finalSummary.missingMandatoryWords,
        tabooWordsFound: finalSummary.tabooWordsFound,
        riskFlags: finalSummary.riskFlags,
        perspective: input.erzaehlperspektive,
        address: input.leseransprache,
      },
    };

    void storeGeneratedText({
      model: input.model,
      provider,
      niveau: input.niveau,
      textsorte: input.textsorte,
      zielgruppe: input.zielgruppe,
      textOrigin: input.textOrigin,
      requestPayload: input,
      responsePayload: payload,
    });

    return new Response(JSON.stringify(payload), {
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("Generate error:", error);
    return new Response(JSON.stringify({ error: "Fehler bei der Textgenerierung" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
