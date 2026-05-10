"use client";

import Link from "next/link";
import Image from "next/image";
import { Astroid, BrainCircuit, CirclePile, FileStack, List, ListChecks, ListOrdered, Milestone, PencilLine, PencilRuler, Play, Settings2, SlidersVertical, TextAlignStart, View, Library } from "lucide-react";
import AppSidebar from "@/components/AppSidebar";
import PublishDialog, { type PublishFormData } from "@/components/PublishDialog";
import { mergeAttributes } from "@tiptap/core";
import Paragraph from "@tiptap/extension-paragraph";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect, useMemo, useState } from "react";

const TEXTSORTEN = [
  "Sachtext",
  "Nachricht",
  "Bericht",
  "Porträt",
  "Interview",
  "Kommentar",
  "Blog",
  "Erzählung",
  "Dialog",
  "Anleitung",
  "Brief / Mail",
  "Veranstaltungskalender",
] as const;

const DISABLED_TEXTSORTEN = [
  "Werbetext / Anzeige (Inserate, Stellenanzeigen, Wohnungsinserate – sehr DaZ-relevant)",
  "Formular (Anmeldung, Antrag – wichtig für Alltagsbewältigung)",
  "Speisekarte / Fahrplan / Wetterbericht (diskontinuierliche Texte)",
  "Einladung",
  "Notiz / Mitteilung (z.B. an Mitbewohner, Kolleg:innen)",
  "Beschwerde / Reklamation",
  "Beschreibung",
  "Rezension",
  "Tagebucheintrag",
  "Rede / Vortrag",
  "Umfrage",
] as const;
const SORTED_TEXTSORTEN = [...TEXTSORTEN].sort((a, b) => a.localeCompare(b, "de"));
const SORTED_DISABLED_TEXTSORTEN = [...DISABLED_TEXTSORTEN].sort((a, b) => a.localeCompare(b, "de"));

type TextsorteApiEntry = {
  name: string;
  enabled: boolean;
};

const NIVEAUS = ["A1.1", "A1.2", "A2.1", "A2.2", "B1.1", "B1.2"] as const;
const ZIELGRUPPEN = [
  "allgemein erwachsen",
  "Pflege",
  "Bau",
  "Gastronomie",
  "Integrationskurs",
  "Arbeitssuchende",
  "Eltern in der Schule",
] as const;
const TONALITAETEN = [
  "textsortennatürlich",
  "sachlich-neutral",
  "persönlich-warm",
  "jugendlich-locker",
  "formell",
  "augenzwinkernd",
  "kontrovers",
  "nüchtern",
  "einfühlsam",
] as const;
const ERZAEHLPERSPEKTIVEN = ["textsortennatürlich", "dritte-person", "ich", "wir", "figuren-wechselnd"] as const;
const LESERANSPRACHEN = ["textsortennatürlich", "keine", "sie-formell", "du-vertraut", "wir-inklusiv"] as const;
const GLOSSAR_OPTIONEN = ["ja", "nein", "nur schwierige Wörter"] as const;
const KULTURRAEUME = ["CH", "DE", "AT", "neutral-DACH"] as const;
const PRESETS_PER_TAB_PAGE = 4;
const PRESETGEN_HANDOFF_KEY = "dext:presetgen:handoff";

const MODEL_OPTIONS: Array<{ id: string; label: string; provider: "anthropic" | "openai" | "mistral" }> = [
  { id: "claude-opus-4-5", label: "Claude Opus 4", provider: "anthropic" },
  { id: "claude-sonnet-4-5", label: "Claude Sonnet 4.5", provider: "anthropic" },
  { id: "gpt-4.1", label: "GPT-4.1", provider: "openai" },
  { id: "gpt-4o", label: "GPT-4o", provider: "openai" },
  { id: "gpt-4o-mini", label: "GPT-4o mini", provider: "openai" },
  { id: "mistral-large-latest", label: "Mistral Large", provider: "mistral" },
  { id: "qwen3.5-plus", label: "Qwen 3.5", provider: "openai" },
];

const NIVEAU_BESCHREIBUNGEN: Record<string, string> = {
  "A1.1": "Präsens, sehr einfache Sätze, hoher Alltagsbezug",
  "A1.2": "Perfekt, Modalverben, Routinen und Abläufe",
  "A2.1": "weil-Sätze, Präteritum von sein/haben/Modalverben",
  "A2.2": "dass/wenn/ob, Komparativ, Konjunktiv II",
  "B1.1": "Relativsätze, zu-Infinitiv, Passiv Präsens",
  "B1.2": "mehr Satzvariation, Zustandspassiv, Nominalisierungen",
};

const NIVEAU_LIMITS: Record<
  string,
  {
    minWords: number;
    maxWords: number;
    minParagraphs: number;
    maxParagraphs: number;
    defaultWords: number;
    defaultParagraphs: number;
  }
> = {
  "A1.1": { minWords: 90, maxWords: 140, minParagraphs: 3, maxParagraphs: 3, defaultWords: 115, defaultParagraphs: 3 },
  "A1.2": { minWords: 130, maxWords: 180, minParagraphs: 3, maxParagraphs: 4, defaultWords: 155, defaultParagraphs: 3 },
  "A2.1": { minWords: 170, maxWords: 240, minParagraphs: 4, maxParagraphs: 4, defaultWords: 205, defaultParagraphs: 4 },
  "A2.2": { minWords: 220, maxWords: 320, minParagraphs: 4, maxParagraphs: 5, defaultWords: 270, defaultParagraphs: 4 },
  "B1.1": { minWords: 300, maxWords: 420, minParagraphs: 5, maxParagraphs: 5, defaultWords: 360, defaultParagraphs: 5 },
  "B1.2": { minWords: 380, maxWords: 520, minParagraphs: 5, maxParagraphs: 6, defaultWords: 450, defaultParagraphs: 5 },
};

const FOCUS_MIN_LEVEL: Array<{ keywords: string[]; minLevel: string }> = [
  { keywords: ["perfekt"], minLevel: "A1.2" },
  { keywords: ["modalverben", "modalverb"], minLevel: "A1.2" },
  { keywords: ["weil", "wechselpräposition"], minLevel: "A2.1" },
  { keywords: ["dass", "wenn", "ob", "komparativ", "konjunktiv ii"], minLevel: "A2.2" },
  { keywords: ["relativsatz", "zu-infinitiv", "passiv", "obwohl", "damit"], minLevel: "B1.1" },
  { keywords: ["zustandspassiv", "partizip", "bevor", "nachdem", "seitdem"], minLevel: "B1.2" },
];

type Textsorte = (typeof TEXTSORTEN)[number];
type GlossarOption = (typeof GLOSSAR_OPTIONEN)[number];

type FormState = {
  niveau: string;
  thema: string;
  textsorte: Textsorte;
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
  glossar: GlossarOption;
  kulturraum: string;
};

type Preset = {
  id: string;
  title: string;
  summary: string;
  values: Partial<FormState>;
};

type ResultGlossaryItem = {
  lemma: string;
  explanation: string;
};

type ResultData = {
  title: string;
  teaser: string;
  paragraphs: string[];
  glossary: ResultGlossaryItem[];
  qa: {
    wordCount: number;
    paragraphCount: number;
    mandatoryWordsUsed: string[];
    missingMandatoryWords: string[];
    tabooWordsFound: string[];
    riskFlags: string[];
    perspective: string;
    address: string;
  };
};

type WorkflowStep = "generate" | "continue" | "tasks" | "audio";
type ProcessingAction = "redigieren" | "kuerzen" | "verlaengern";
type ExerciseFormat = "lueckentext" | "mcq" | "truefalse" | "satzpuzzle" | "textpuzzle" | "zuordnung" | "umformung" | "wfragen" | "stichwort";
type TaskOutputFormat = "app";
type LueckenMode = "all" | "selection";
type LueckenSelectionMode = "absolute" | "percent" | "rhythm";
type McqCorrectMode = "exactly-one" | "one-or-more" | "variable";
type McqOrderMode = "random" | "fixed";
type TfScaleMode = "tf" | "tfn" | "four";

type TaskGlobalConfig = {
  taskCount: number;
  outputFormat: TaskOutputFormat;
  withSeparateSolutions: boolean;
};

type LueckentextConfig = {
  wordTypes: string[];
  grammarFocus: string;
  vocabFocusMode: "auto" | "manual" | "upload";
  vocabFocusManual: string;
  vocabFocusUpload: string;
  mode: LueckenMode;
  selectionMode: LueckenSelectionMode;
  countAbsolute: number;
  countPercent: number;
  rhythmN: number;
  hintMode: "none" | "wordbank" | "first-letter" | "word-length" | "infinitive" | "image";
  wordbankMode: "alphabetical" | "mixed" | "with-distractors";
  excludeProperNames: boolean;
  excludeNumbers: boolean;
  minWordLength: number;
  maxPerSentence: number;
  noAdjacentGaps: boolean;
};

type McqConfig = {
  questionType: "comprehension" | "vocabulary" | "inference";
  optionsCount: 3 | 4 | 5;
  correctMode: McqCorrectMode;
  distractorSource: "from-text" | "similar-vocab" | "learner-errors";
  distractorStrategy: string[];
  orderMode: McqOrderMode;
  fixedPosition: number;
  phrasingMode: "sentence" | "gap" | "w-question";
  answerStyle: "quoted" | "paraphrased";
  equalLengthAnswers: boolean;
};

type TrueFalseConfig = {
  statementType: "quote" | "paraphrase" | "inference" | "mixed";
  mixedQuotePercent: number;
  mixedParaphrasePercent: number;
  mixedInferencePercent: number;
  scaleMode: TfScaleMode;
  justification: "none" | "mark-text" | "rewrite-false" | "quote-evidence";
  ratioTrue: number;
  ratioFalse: number;
  maxSameInRow: number;
  falsificationStrategies: string[];
};

type GeneratedTaskItem = {
  id: string;
  format: ExerciseFormat;
  instruction: string;
  question: string;
  options: string[];
  answer: string | string[];
  explanation: string;
};

type TaskResultData = {
  worksheetTitle: string;
  tasks: GeneratedTaskItem[];
};

const BoxedParagraph = Paragraph.extend({
  addAttributes() {
    return {
      boxed: {
        default: false,
        parseHTML: (element) => element.getAttribute("data-boxed") === "true",
      },
    };
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      "p",
      mergeAttributes(
        HTMLAttributes,
        node.attrs.boxed
          ? {
              "data-boxed": "true",
              class: "rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800",
            }
          : {},
      ),
      0,
    ];
  },
});

const TASK_FORMAT_LABELS: Array<{ id: ExerciseFormat; label: string }> = [
  { id: "lueckentext", label: "Lückentext" },
  { id: "mcq", label: "MCQ" },
  { id: "truefalse", label: "Richtig/Falsch" },
  { id: "satzpuzzle", label: "Satzpuzzle" },
  { id: "textpuzzle", label: "Textpuzzle" },
  { id: "zuordnung", label: "Zuordnung" },
  { id: "umformung", label: "Umformung" },
  { id: "wfragen", label: "W-Fragen" },
  { id: "stichwort", label: "Stichwortzusammenfassung" },
];

const TASK_OUTPUT_FORMAT_LABELS: Array<{ id: TaskOutputFormat; label: string }> = [{ id: "app", label: "In App" }];

const LUECKE_WORD_TYPES = [
  "Verben (konjugiert / Infinitiv / trennbar)",
  "Nomen (mit/ohne Artikel)",
  "Artikel (bestimmt/unbestimmt/Possessiv)",
  "Präpositionen",
  "Adjektive (prädikativ/attributiv/dekliniert)",
  "Konjunktionen",
  "Pronomen",
];

const MCQ_DISTRACTOR_STRATEGIES = ["Phonetisch ähnlich", "Semantisch ähnlich", "Falsche Grammatikform", "Klar falsch"];
const TF_FALSIFICATION_STRATEGIES = ["Negation", "Zahlenverdrehung", "Falsches Subjekt/Objekt", "Falscher Zeitpunkt", "Übertreibung/Abschwächung", "Kausalverdrehung"];

const DEFAULT_TASK_GLOBAL: TaskGlobalConfig = {
  taskCount: 8,
  outputFormat: "app",
  withSeparateSolutions: true,
};

const DEFAULT_LUECKENTEXT_CONFIG: LueckentextConfig = {
  wordTypes: ["Verben (konjugiert / Infinitiv / trennbar)", "Artikel (bestimmt/unbestimmt/Possessiv)"],
  grammarFocus: "",
  vocabFocusMode: "auto",
  vocabFocusManual: "",
  vocabFocusUpload: "",
  mode: "selection",
  selectionMode: "absolute",
  countAbsolute: 10,
  countPercent: 50,
  rhythmN: 7,
  hintMode: "none",
  wordbankMode: "alphabetical",
  excludeProperNames: true,
  excludeNumbers: true,
  minWordLength: 3,
  maxPerSentence: 2,
  noAdjacentGaps: true,
};

const DEFAULT_MCQ_CONFIG: McqConfig = {
  questionType: "comprehension",
  optionsCount: 4,
  correctMode: "exactly-one",
  distractorSource: "from-text",
  distractorStrategy: ["Semantisch ähnlich"],
  orderMode: "random",
  fixedPosition: 1,
  phrasingMode: "sentence",
  answerStyle: "paraphrased",
  equalLengthAnswers: true,
};

const DEFAULT_TRUE_FALSE_CONFIG: TrueFalseConfig = {
  statementType: "mixed",
  mixedQuotePercent: 40,
  mixedParaphrasePercent: 40,
  mixedInferencePercent: 20,
  scaleMode: "tf",
  justification: "none",
  ratioTrue: 50,
  ratioFalse: 50,
  maxSameInRow: 2,
  falsificationStrategies: ["Negation", "Zahlenverdrehung"],
};

const DEFAULT_FORM: FormState = {
  niveau: "A2.1",
  thema: "",
  textsorte: "Sachtext",
  themendetails: "",
  zielgruppe: "allgemein erwachsen",
  setting: "Schweiz, neutral",
  tonalitaet: "textsortennatürlich",
  erzaehlperspektive: "textsortennatürlich",
  leseransprache: "textsortennatürlich",
  lernschwerpunkt: "",
  pflichtwortschatz: "",
  tabuwortschatz: "",
  personen: "",
  wortzahl: "",
  absatzzahl: "",
  glossar: "ja",
  kulturraum: "CH",
};

const PRESETS: Preset[] = [
  // ── A1.1 ──────────────────────────────────────────────────────────────────
  {
    id: "a11-arzttermin",
    title: "A1.1 Arzttermin",
    summary: "Einfacher Alltagsdialog zur Anmeldung in einer Praxis.",
    values: {
      niveau: "A1.1",
      thema: "Arzttermin am Morgen",
      textsorte: "Dialog",
      themendetails: "Eine Patientin meldet sich am Empfang an. Es geht um Name, Termin, Uhrzeit und Wartezimmer.",
      zielgruppe: "allgemein erwachsen",
      setting: "Arztpraxis in Zürich",
      tonalitaet: "textsortennatürlich",
      erzaehlperspektive: "figuren-wechselnd",
      leseransprache: "keine",
      lernschwerpunkt: "sein und haben im Präsens",
      pflichtwortschatz: "Termin\nName\nheute\nWartezimmer",
      wortzahl: "140",
      glossar: "ja",
      kulturraum: "CH",
    },
  },
  {
    id: "a11-busfahrt",
    title: "A1.1 Busfahrt",
    summary: "Kurzer Sachtext über den Weg zur Arbeit mit dem Bus.",
    values: {
      niveau: "A1.1",
      thema: "Mit dem Bus zur Arbeit",
      textsorte: "Sachtext",
      themendetails: "Eine Person fährt jeden Morgen mit dem Bus zur Arbeit. Fokus auf Uhrzeit, Ort und einfache Routine.",
      zielgruppe: "Arbeitssuchende",
      setting: "Stadt in der Schweiz",
      tonalitaet: "sachlich-neutral",
      lernschwerpunkt: "Präsens",
      pflichtwortschatz: "Bus\nArbeit\nMorgen\nHaltestelle",
      wortzahl: "140",
      glossar: "ja",
      kulturraum: "CH",
    },
  },
  {
    id: "a11-kindergarten",
    title: "A1.1 Kindergarten",
    summary: "Dialog an der Kindergartentür über Abholzeit und Kind.",
    values: {
      niveau: "A1.1",
      thema: "Kind im Kindergarten abholen",
      textsorte: "Dialog",
      themendetails: "Eine Mutter und eine Betreuungsperson sprechen kurz über Abholzeit, Kind und Uhrzeit.",
      zielgruppe: "Eltern in der Schule",
      setting: "Kindergarten in Olten",
      tonalitaet: "persönlich-warm",
      erzaehlperspektive: "figuren-wechselnd",
      leseransprache: "keine",
      lernschwerpunkt: "sein und haben im Präsens",
      pflichtwortschatz: "Kind\nheute\nUhr\nGut",
      wortzahl: "140",
      glossar: "ja",
      kulturraum: "CH",
    },
  },
  {
    id: "a11-supermarkt",
    title: "A1.1 Supermarkt",
    summary: "Sachtext über Produkte und Preise im Supermarkt.",
    values: {
      niveau: "A1.1",
      thema: "Im Supermarkt einkaufen",
      textsorte: "Sachtext",
      themendetails: "Welche Produkte es gibt, was sie kosten und wo sie sind. Zahlen, Farben und einfache Ortsangaben.",
      zielgruppe: "Integrationskurs",
      setting: "Supermarkt in Aarau",
      tonalitaet: "sachlich-neutral",
      lernschwerpunkt: "Präsens",
      pflichtwortschatz: "Brot\nMilch\nFranken\nKasse",
      wortzahl: "140",
      glossar: "ja",
      kulturraum: "CH",
    },
  },
  {
    id: "a11-abend",
    title: "A1.1 Feierabend",
    summary: "Kurze Erzählung über einen Abend zu Hause.",
    values: {
      niveau: "A1.1",
      thema: "Nach der Arbeit zu Hause",
      textsorte: "Erzählung",
      themendetails: "Eine Person kommt nach Hause, isst, schaut fern und schläft. Einfache Routineverben im Präsens.",
      zielgruppe: "allgemein erwachsen",
      setting: "Wohnung in der Schweiz",
      tonalitaet: "persönlich-warm",
      erzaehlperspektive: "dritte-person",
      lernschwerpunkt: "Präsens",
      pflichtwortschatz: "Hause\nEssen\nMüde\nBett",
      wortzahl: "140",
      glossar: "ja",
      kulturraum: "CH",
    },
  },
  // ── A1.2 ──────────────────────────────────────────────────────────────────
  {
    id: "a12-einkauf",
    title: "A1.2 Einkauf",
    summary: "Alltagsdialog mit Perfekt und Preisen im Supermarkt.",
    values: {
      niveau: "A1.2",
      thema: "Einkauf nach der Arbeit",
      textsorte: "Dialog",
      themendetails: "Zwei Erwachsene sprechen über einen Einkauf am Abend. Sie nennen Produkte, Mengen, Preise und was sie gekauft haben.",
      zielgruppe: "allgemein erwachsen",
      setting: "Supermarkt in Bern",
      lernschwerpunkt: "Perfekt",
      pflichtwortschatz: "Milch\nBrot\ngekauft\nFranken",
      glossar: "ja",
      kulturraum: "CH",
    },
  },
  {
    id: "a12-spitaltag",
    title: "A1.2 Spitaltag",
    summary: "Bericht über einen Arbeitstag im Spital mit Routinen.",
    values: {
      niveau: "A1.2",
      thema: "Ein Tag im Spital",
      textsorte: "Bericht",
      themendetails: "Eine Pflegeassistenz beschreibt einen typischen Arbeitstag vom Morgen bis zum Abend.",
      zielgruppe: "Pflege",
      setting: "Spital im Kanton Bern",
      tonalitaet: "sachlich-neutral",
      lernschwerpunkt: "Modalverben",
      pflichtwortschatz: "Spital\nZimmer\nhelfen\nPause",
      glossar: "ja",
      kulturraum: "CH",
    },
  },
  {
    id: "a12-sprachkurs",
    title: "A1.2 Sprachkurs",
    summary: "Bericht einer Teilnehmerin über ihren Deutschkurs.",
    values: {
      niveau: "A1.2",
      thema: "Deutsch lernen im Kurs",
      textsorte: "Bericht",
      themendetails: "Eine Teilnehmerin beschreibt, wann der Kurs ist, was sie dort macht und was sie schon gelernt hat.",
      zielgruppe: "Integrationskurs",
      setting: "Sprachschule in Basel",
      tonalitaet: "persönlich-warm",
      erzaehlperspektive: "ich",
      lernschwerpunkt: "Perfekt",
      pflichtwortschatz: "Kurs\nlernen\ngelernt\nKlasse",
      glossar: "ja",
      kulturraum: "CH",
    },
  },
  {
    id: "a12-velo",
    title: "A1.2 Velotour",
    summary: "Kurze Erzählung über eine Velotour am Wochenende.",
    values: {
      niveau: "A1.2",
      thema: "Velotour am Samstag",
      textsorte: "Erzählung",
      themendetails: "Eine Person fährt am Samstag mit dem Velo in die Stadt. Sie erzählt, was sie gemacht und gesehen hat.",
      zielgruppe: "allgemein erwachsen",
      setting: "Zürichsee",
      tonalitaet: "persönlich-warm",
      erzaehlperspektive: "ich",
      lernschwerpunkt: "Perfekt",
      pflichtwortschatz: "Velo\nSamstag\ngefahren\nSee",
      glossar: "ja",
      kulturraum: "CH",
    },
  },
  {
    id: "a12-wochenende",
    title: "A1.2 Wochenende",
    summary: "Dialog über das vergangene Wochenende mit Perfekt.",
    values: {
      niveau: "A1.2",
      thema: "Was hast du am Wochenende gemacht?",
      textsorte: "Dialog",
      themendetails: "Zwei Kolleginnen sprechen am Montagmorgen über ihr Wochenende. Besuche, Ausflüge, Essen.",
      zielgruppe: "allgemein erwachsen",
      setting: "Teeküche in einem Büro",
      tonalitaet: "persönlich-warm",
      erzaehlperspektive: "figuren-wechselnd",
      leseransprache: "keine",
      lernschwerpunkt: "Perfekt",
      pflichtwortschatz: "Wochenende\ngemacht\ngewesen\nbesucht",
      glossar: "ja",
      kulturraum: "CH",
    },
  },
  // ── A2.1 ──────────────────────────────────────────────────────────────────
  {
    id: "a21-wohnung",
    title: "A2.1 Wohnungssuche",
    summary: "Erzählung über die Suche nach einer passenden Wohnung.",
    values: {
      niveau: "A2.1",
      thema: "Wohnungssuche in der Stadt",
      textsorte: "Erzählung",
      themendetails: "Eine Person sucht eine Wohnung, weil der Arbeitsweg zu lang ist. Besichtigung, Miete und Lage kommen vor.",
      zielgruppe: "allgemein erwachsen",
      setting: "Winterthur",
      tonalitaet: "persönlich-warm",
      erzaehlperspektive: "ich",
      lernschwerpunkt: "weil-Sätze",
      pflichtwortschatz: "Wohnung\nBesichtigung\nMiete\nruhig",
      glossar: "ja",
      kulturraum: "CH",
    },
  },
  {
    id: "a21-schuleltern",
    title: "A2.1 Elternabend",
    summary: "Mail mit klarer Chronologie rund um einen Elternabend.",
    values: {
      niveau: "A2.1",
      thema: "Information zum Elternabend",
      textsorte: "Brief / Mail",
      themendetails: "Eine Lehrperson informiert Eltern über Zeit, Ort und Ablauf eines Elternabends.",
      zielgruppe: "Eltern in der Schule",
      setting: "Primarschule in Basel",
      tonalitaet: "formell",
      erzaehlperspektive: "ich",
      leseransprache: "sie-formell",
      lernschwerpunkt: "Inversion nach Zeitangaben",
      pflichtwortschatz: "Elternabend\nKlasse\nBeginn\nFragen",
      glossar: "ja",
      kulturraum: "CH",
    },
  },
  {
    id: "a21-arztbesuch",
    title: "A2.1 Arztbesuch",
    summary: "Erzählung über einen Arztbesuch mit weil-Begründungen.",
    values: {
      niveau: "A2.1",
      thema: "Ich war beim Arzt",
      textsorte: "Erzählung",
      themendetails: "Eine Person erzählt, warum sie zum Arzt musste, was der Arzt gesagt hat und was sie jetzt machen soll.",
      zielgruppe: "allgemein erwachsen",
      setting: "Arztpraxis in Luzern",
      tonalitaet: "persönlich-warm",
      erzaehlperspektive: "ich",
      lernschwerpunkt: "weil-Sätze",
      pflichtwortschatz: "Arzt\nkrank\nMedikament\nRuhe",
      glossar: "ja",
      kulturraum: "CH",
    },
  },
  {
    id: "a21-restaurant",
    title: "A2.1 Im Restaurant",
    summary: "Dialog beim Bestellen im Restaurant mit Modalverben.",
    values: {
      niveau: "A2.1",
      thema: "Mittagessen im Restaurant",
      textsorte: "Dialog",
      themendetails: "Eine Gästin bestellt beim Service, fragt nach Zutaten und bezahlt. Modalverben und war/hatte kommen vor.",
      zielgruppe: "Gastronomie",
      setting: "Restaurant in Bern",
      tonalitaet: "textsortennatürlich",
      erzaehlperspektive: "figuren-wechselnd",
      leseransprache: "keine",
      lernschwerpunkt: "Modalverben im Präsens",
      pflichtwortschatz: "Menü\nbitte\nbezahlen\nSalat",
      glossar: "ja",
      kulturraum: "CH",
    },
  },
  {
    id: "a21-umzug",
    title: "A2.1 Umzug",
    summary: "Bericht über einen Umzug in eine neue Wohnung.",
    values: {
      niveau: "A2.1",
      thema: "Umzug in die neue Wohnung",
      textsorte: "Bericht",
      themendetails: "Eine Person beschreibt, wie der Umzug war, wer geholfen hat und warum die neue Wohnung besser ist.",
      zielgruppe: "allgemein erwachsen",
      setting: "Aarau",
      tonalitaet: "persönlich-warm",
      erzaehlperspektive: "ich",
      lernschwerpunkt: "weil-Sätze",
      pflichtwortschatz: "Umzug\nKarton\nhelfen\nNachbarn",
      glossar: "ja",
      kulturraum: "CH",
    },
  },
  // ── A2.2 ──────────────────────────────────────────────────────────────────
  {
    id: "a22-bibliothek",
    title: "A2.2 Bibliothek",
    summary: "Anleitung zur Anmeldung in einer Bibliothek.",
    values: {
      niveau: "A2.2",
      thema: "Anmeldung in der Bibliothek",
      textsorte: "Anleitung",
      themendetails: "Schritt für Schritt: Ausweis zeigen, Formular ausfüllen, Medien ausleihen, Frist verstehen.",
      zielgruppe: "Integrationskurs",
      setting: "Stadtbibliothek Luzern",
      tonalitaet: "sachlich-neutral",
      leseransprache: "sie-formell",
      lernschwerpunkt: "dass- und wenn-Sätze",
      pflichtwortschatz: "Ausweis\nAnmeldung\nFrist\nausleihen",
      glossar: "ja",
      kulturraum: "CH",
    },
  },
  {
    id: "a22-jobstart",
    title: "A2.2 Neuer Job",
    summary: "Porträt einer Person in den ersten Wochen im neuen Betrieb.",
    values: {
      niveau: "A2.2",
      thema: "Erste Wochen im neuen Job",
      textsorte: "Porträt",
      themendetails: "Eine Mitarbeitende lernt das Team kennen, vergleicht Aufgaben und erzählt, was schon gut läuft.",
      zielgruppe: "allgemein erwachsen",
      setting: "Büro in St. Gallen",
      tonalitaet: "einfühlsam",
      lernschwerpunkt: "Komparativ",
      pflichtwortschatz: "Team\nAufgabe\nTermin\nKolleg:innen",
      glossar: "nur schwierige Wörter",
      kulturraum: "CH",
    },
  },
  {
    id: "a22-krankmeldung",
    title: "A2.2 Krankmeldung",
    summary: "Formelle Mail an den Arbeitgeber wegen Krankheit.",
    values: {
      niveau: "A2.2",
      thema: "Krankmeldung per Mail",
      textsorte: "Brief / Mail",
      themendetails: "Eine Person meldet sich krank, erklärt warum sie nicht kommen kann und informiert über den Arztbesuch.",
      zielgruppe: "allgemein erwachsen",
      setting: "Büro in Zürich",
      tonalitaet: "formell",
      erzaehlperspektive: "ich",
      leseransprache: "sie-formell",
      lernschwerpunkt: "dass-Sätze",
      pflichtwortschatz: "krank\nArzt\nAbsence\nmorgen",
      glossar: "ja",
      kulturraum: "CH",
    },
  },
  {
    id: "a22-sicherheit",
    title: "A2.2 Sicherheit Bau",
    summary: "Sachtext über Sicherheitsregeln auf der Baustelle.",
    values: {
      niveau: "A2.2",
      thema: "Sicherheit auf der Baustelle",
      textsorte: "Sachtext",
      themendetails: "Welche Regeln es gibt, warum sie wichtig sind und was passieren kann, wenn man sie nicht befolgt.",
      zielgruppe: "Bau",
      setting: "Baustelle in der Deutschschweiz",
      tonalitaet: "sachlich-neutral",
      leseransprache: "sie-formell",
      lernschwerpunkt: "wenn-Sätze",
      pflichtwortschatz: "Helm\nSicherheit\nRegel\nUnfall",
      glossar: "ja",
      kulturraum: "CH",
    },
  },
  {
    id: "a22-interview-job",
    title: "A2.2 Vorstellungsinterview",
    summary: "Interview mit einer Mitarbeitenden über ihre neue Stelle.",
    values: {
      niveau: "A2.2",
      thema: "Interview: Neue Stelle in der Küche",
      textsorte: "Interview",
      themendetails: "Eine Köchin erzählt von ihrer neuen Stelle: Aufgaben, Team, Arbeitszeiten und erste Eindrücke. Vergleiche kommen vor.",
      zielgruppe: "Gastronomie",
      setting: "Restaurant in Biel",
      tonalitaet: "persönlich-warm",
      erzaehlperspektive: "figuren-wechselnd",
      leseransprache: "keine",
      lernschwerpunkt: "Komparativ",
      pflichtwortschatz: "Stelle\nKüche\nTeam\nbesser",
      glossar: "ja",
      kulturraum: "CH",
    },
  },
  // ── B1.1 ──────────────────────────────────────────────────────────────────
  {
    id: "b11-oev",
    title: "B1.1 ÖV-Kommentar",
    summary: "Vorsichtiger Kommentar zu Pendeln und Ticketkosten.",
    values: {
      niveau: "B1.1",
      thema: "ÖV-Kosten für Pendler:innen",
      textsorte: "Kommentar",
      themendetails: "These, Begründung und Fazit zu steigenden Kosten im öffentlichen Verkehr. Alltag und Arbeit sollen vorkommen.",
      zielgruppe: "allgemein erwachsen",
      setting: "Schweiz",
      tonalitaet: "kontrovers",
      erzaehlperspektive: "dritte-person",
      leseransprache: "wir-inklusiv",
      lernschwerpunkt: "obwohl",
      pflichtwortschatz: "Billet\nPendeln\nKosten\nMassnahme",
      glossar: "ja",
      kulturraum: "CH",
    },
  },
  {
    id: "b11-pflege-portrat",
    title: "B1.1 Pflegeporträt",
    summary: "Porträt einer Pflegefachperson mit Relativsätzen.",
    values: {
      niveau: "B1.1",
      thema: "Pflegefachfrau im Gespräch",
      textsorte: "Porträt",
      themendetails: "Eine Pflegefachfrau erzählt von ihrem Alltag, ihren Aufgaben und warum sie den Beruf gewählt hat.",
      zielgruppe: "Pflege",
      setting: "Pflegeheim im Kanton Aargau",
      tonalitaet: "einfühlsam",
      erzaehlperspektive: "dritte-person",
      lernschwerpunkt: "Relativsätze",
      pflichtwortschatz: "Beruf\nVerantwortung\nPatient:innen\nTeam",
      glossar: "ja",
      kulturraum: "CH",
    },
  },
  {
    id: "b11-digital",
    title: "B1.1 Digitale Tools",
    summary: "Sachtext über digitale Hilfsmittel im Arbeitsalltag.",
    values: {
      niveau: "B1.1",
      thema: "Digitale Tools im Arbeitsalltag",
      textsorte: "Sachtext",
      themendetails: "Welche digitalen Tools heute im Büro genutzt werden, wozu sie dienen und was man damit machen kann.",
      zielgruppe: "allgemein erwachsen",
      setting: "Büro in der Deutschschweiz",
      tonalitaet: "sachlich-neutral",
      lernschwerpunkt: "zu-Infinitiv",
      pflichtwortschatz: "Programm\nDatei\nKommunikation\nEffizienz",
      glossar: "ja",
      kulturraum: "CH",
    },
  },
  {
    id: "b11-nachbarschaft",
    title: "B1.1 Nachbarschaftskonflikt",
    summary: "Erzählung über einen Konflikt, der im Gespräch gelöst wird.",
    values: {
      niveau: "B1.1",
      thema: "Lärm im Mehrfamilienhaus",
      textsorte: "Erzählung",
      themendetails: "Zwei Nachbarn haben einen Konflikt wegen Lärm. Sie sprechen miteinander und finden eine Lösung.",
      zielgruppe: "allgemein erwachsen",
      setting: "Mehrfamilienhaus in Winterthur",
      tonalitaet: "einfühlsam",
      erzaehlperspektive: "dritte-person",
      lernschwerpunkt: "obwohl",
      pflichtwortschatz: "Lärm\nGespräch\nLösung\nVerständnis",
      glossar: "ja",
      kulturraum: "CH",
    },
  },
  {
    id: "b11-integration-bericht",
    title: "B1.1 Integrationsprogramm",
    summary: "Sachtext über ein kantonales Integrationsprogramm.",
    values: {
      niveau: "B1.1",
      thema: "Ein Integrationsprogramm im Kanton",
      textsorte: "Bericht",
      themendetails: "Was das Programm bietet, wer teilnehmen kann, welche Kurse es gibt und was die Ziele sind.",
      zielgruppe: "Integrationskurs",
      setting: "Kanton Solothurn",
      tonalitaet: "sachlich-neutral",
      lernschwerpunkt: "Passiv Präsens",
      pflichtwortschatz: "Programm\nTeilnahme\nZiel\nKurs",
      glossar: "ja",
      kulturraum: "CH",
    },
  },
  // ── B1.2 ──────────────────────────────────────────────────────────────────
  {
    id: "b12-bewerbung",
    title: "B1.2 Bewerbungsmail",
    summary: "Formelle Mail zu einer Bewerbung mit nachvollziehbaren Motiven.",
    values: {
      niveau: "B1.2",
      thema: "Bewerbung für eine Stelle im Verkauf",
      textsorte: "Brief / Mail",
      themendetails: "Eine erwachsene Person stellt Erfahrung, Motivation und Verfügbarkeit dar und bezieht sich auf ein Inserat.",
      zielgruppe: "Arbeitssuchende",
      setting: "Detailhandel in Zürich",
      tonalitaet: "formell",
      erzaehlperspektive: "ich",
      leseransprache: "sie-formell",
      lernschwerpunkt: "Relativsätze",
      pflichtwortschatz: "Bewerbung\nErfahrung\nVerfügbarkeit\nGespräch",
      glossar: "nur schwierige Wörter",
      kulturraum: "CH",
    },
  },
  {
    id: "b12-blog-schweiz",
    title: "B1.2 Erstes Jahr",
    summary: "Blog über Erfahrungen im ersten Jahr in der Schweiz.",
    values: {
      niveau: "B1.2",
      thema: "Ein Jahr in der Schweiz",
      textsorte: "Blog",
      themendetails: "Eine Person reflektiert das erste Jahr in der Schweiz: Sprache, Arbeit, Wohnen, soziale Kontakte.",
      zielgruppe: "allgemein erwachsen",
      setting: "Schweiz, städtisch",
      tonalitaet: "persönlich-warm",
      erzaehlperspektive: "ich",
      leseransprache: "wir-inklusiv",
      lernschwerpunkt: "bevor/nachdem",
      pflichtwortschatz: "Erfahrung\nSprache\nAlltagleben\nVeränderung",
      glossar: "nur schwierige Wörter",
      kulturraum: "CH",
    },
  },
  {
    id: "b12-arbeitszeugnis",
    title: "B1.2 Zeugnis-Anfrage",
    summary: "Formelle Mail mit der Bitte um ein Arbeitszeugnis.",
    values: {
      niveau: "B1.2",
      thema: "Bitte um ein Arbeitszeugnis",
      textsorte: "Brief / Mail",
      themendetails: "Eine Person verlässt die Stelle und bittet die Vorgesetzte um ein detailliertes Arbeitszeugnis.",
      zielgruppe: "allgemein erwachsen",
      setting: "Büro in Bern",
      tonalitaet: "formell",
      erzaehlperspektive: "ich",
      leseransprache: "sie-formell",
      lernschwerpunkt: "Relativsätze",
      pflichtwortschatz: "Arbeitszeugnis\nStelle\nZeit\nDank",
      glossar: "nein",
      kulturraum: "CH",
    },
  },
  {
    id: "b12-mieten-kommentar",
    title: "B1.2 Steigende Mieten",
    summary: "Kommentar zu hohen Mietpreisen in Schweizer Städten.",
    values: {
      niveau: "B1.2",
      thema: "Wohnen in der Stadt wird teurer",
      textsorte: "Kommentar",
      themendetails: "These: Wohnen in Schweizer Städten ist für viele nicht mehr erschwinglich. Begründung und Forderungen.",
      zielgruppe: "allgemein erwachsen",
      setting: "Schweiz",
      tonalitaet: "kontrovers",
      erzaehlperspektive: "dritte-person",
      leseransprache: "wir-inklusiv",
      lernschwerpunkt: "bevor/nachdem/seitdem",
      pflichtwortschatz: "Miete\nWohnungsmarkt\nMassnahme\nbezahlbar",
      glossar: "ja",
      kulturraum: "CH",
    },
  },
  {
    id: "b12-arbeitswelt-nachricht",
    title: "B1.2 Arbeitswelt",
    summary: "Kurze Nachricht über eine Veränderung in der Arbeitswelt.",
    values: {
      niveau: "B1.2",
      thema: "Vier-Tage-Woche in einem Schweizer Betrieb",
      textsorte: "Nachricht",
      themendetails: "Ein Betrieb führt die Vier-Tage-Woche ein. Was wurde entschieden, wer ist betroffen und was sagen die Mitarbeitenden.",
      zielgruppe: "allgemein erwachsen",
      setting: "Schweiz",
      tonalitaet: "nüchtern",
      erzaehlperspektive: "dritte-person",
      leseransprache: "keine",
      lernschwerpunkt: "Zustandspassiv",
      pflichtwortschatz: "Arbeitszeit\nBetrieb\nEntscheid\nModell",
      glossar: "ja",
      kulturraum: "CH",
    },
  },
];

const TEXTSORTEN_DEFAULTS: Record<Textsorte, { perspective: string; address: string; tone: string }> = {
  "Sachtext": { perspective: "dritte-person", address: "keine", tone: "sachlich-neutral" },
  "Nachricht": { perspective: "dritte-person", address: "keine", tone: "nüchtern" },
  "Bericht": { perspective: "dritte-person", address: "keine", tone: "sachlich-neutral" },
  "Porträt": { perspective: "dritte-person", address: "keine", tone: "persönlich-warm" },
  "Interview": { perspective: "figuren-wechselnd", address: "keine", tone: "textsortennatürlich" },
  "Kommentar": { perspective: "dritte-person", address: "wir-inklusiv", tone: "kontrovers" },
  "Blog": { perspective: "ich", address: "wir-inklusiv", tone: "persönlich-warm" },
  "Erzählung": { perspective: "ich", address: "keine", tone: "textsortennatürlich" },
  "Dialog": { perspective: "figuren-wechselnd", address: "keine", tone: "textsortennatürlich" },
  "Anleitung": { perspective: "dritte-person", address: "sie-formell", tone: "sachlich-neutral" },
  "Brief / Mail": { perspective: "ich", address: "sie-formell", tone: "formell" },
  "Veranstaltungskalender": { perspective: "dritte-person", address: "keine", tone: "sachlich-neutral" },
};

function parseList(value: string): string[] {
  return value
    .split(/\n|,|;/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function compareLevels(left: string, right: string): number {
  const order = ["A1.1", "A1.2", "A2.1", "A2.2", "B1.1", "B1.2"];
  return order.indexOf(left) - order.indexOf(right);
}

function normalizePhrase(value: string): string {
  return value.trim().toLowerCase();
}

function formatResult(result: ResultData): string {
  const sections = [result.title, result.teaser, ...result.paragraphs];
  if (result.glossary.length > 0) {
    sections.push(`Glossar\n${result.glossary.map((item) => `${item.lemma} - ${item.explanation}`).join("\n")}`);
  }
  return sections.join("\n\n");
}

function getTaskFormatLabel(format: ExerciseFormat): string {
  return TASK_FORMAT_LABELS.find((entry) => entry.id === format)?.label ?? format;
}

function formatTaskAnswer(answer: string | string[]): string {
  return Array.isArray(answer) ? answer.join(", ") : answer;
}

function getRenderedTaskOptions(task: GeneratedTaskItem): string[] {
  if (task.options.length > 0) {
    return task.options;
  }

  if (task.format === "truefalse") {
    return ["Richtig", "Falsch", "Nicht im Text", "Unklar"];
  }

  if (task.format === "satzpuzzle" || task.format === "textpuzzle") {
    const answerText = formatTaskAnswer(task.answer);
    return answerText.split(/\s+/).filter(Boolean);
  }

  return [];
}

function formatTaskWorksheet(taskResult: TaskResultData): string {
  return [
    taskResult.worksheetTitle,
    "",
    ...taskResult.tasks.map((task, index) => {
      const options = getRenderedTaskOptions(task);
      const lines = [`${index + 1}. ${getTaskFormatLabel(task.format)}: ${task.instruction}`, task.question];
      if (options.length > 0) {
        lines.push(...options.map((option, optionIndex) => `${String.fromCharCode(65 + optionIndex)}. ${option}`));
      }
      return lines.join("\n");
    }),
  ].join("\n\n");
}

function formatTaskSolutions(taskResult: TaskResultData): string {
  return [
    `${taskResult.worksheetTitle} - Lösungen`,
    "",
    ...taskResult.tasks.map((task, index) => {
      const lines = [`${index + 1}. ${getTaskFormatLabel(task.format)}`, `Lösung: ${formatTaskAnswer(task.answer)}`];
      if (task.explanation) {
        lines.push(`Hinweis: ${task.explanation}`);
      }
      return lines.join("\n");
    }),
  ].join("\n\n");
}

function downloadTextFile(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function TaskQuestionBody({ task }: { task: GeneratedTaskItem }) {
  const renderedOptions = getRenderedTaskOptions(task);

  if (task.format === "lueckentext") {
    const segments = task.question.split(/(_{3,}|\[\.\.\.\])/g).filter(Boolean);

    return (
      <div className="mt-3 space-y-4">
        <div className="rounded-xl bg-zinc-50 p-4 text-base leading-8 text-zinc-800 dark:bg-zinc-950 dark:text-zinc-200">
          {segments.map((segment, index) => (
            /_{3,}|\[\.\.\.\]/.test(segment)
              ? <span key={`${task.id}-gap-${index}`} className="mx-1 inline-block min-w-16 border-b-2 border-dashed border-zinc-400 align-baseline text-transparent dark:border-zinc-600">____</span>
              : <span key={`${task.id}-text-${index}`} className="whitespace-pre-wrap">{segment}</span>
          ))}
        </div>

        {renderedOptions.length > 0 && (
          <div>
            <div className="text-base font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Wortbank</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {renderedOptions.map((option, index) => (
                <span key={`${task.id}-wordbank-${index}-${option}`} className="radius-single-line border border-zinc-300 bg-white px-3 py-1.5 text-base text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
                  {option}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  if (task.format === "satzpuzzle" || task.format === "textpuzzle") {
    return (
      <div className="mt-3 space-y-4">
        <p className="whitespace-pre-wrap text-base text-zinc-700 dark:text-zinc-300">{task.question}</p>

        <div>
          <div className="text-base font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Bausteine</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {renderedOptions.map((option, index) => (
              <span key={`${task.id}-piece-${index}`} className="radius-single-line border border-sky-200 bg-sky-50 px-3 py-1.5 text-base font-medium text-sky-800 dark:border-accent-900 dark:bg-accent-950 dark:text-accent-200">
                {option}
              </span>
            ))}
          </div>
        </div>

        <div>
          <div className="text-base font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Reihenfolge</div>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {renderedOptions.map((_, index) => (
              <div key={`${task.id}-slot-${index}`} className="radius-single-line border border-dashed border-zinc-300 px-3 py-2 text-center text-base text-zinc-400 dark:border-zinc-700 dark:text-zinc-500">
                {index + 1}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (task.format === "mcq") {
    return (
      <div className="mt-3 space-y-3">
        <p className="whitespace-pre-wrap text-base text-zinc-700 dark:text-zinc-300">{task.question}</p>
        <ol className="space-y-2 text-base text-zinc-700 dark:text-zinc-300">
          {renderedOptions.map((option, index) => (
            <li key={`${task.id}-option-${index}`} className="flex items-start gap-3 rounded-lg border border-zinc-200 px-3 py-2 dark:border-zinc-800">
              <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-zinc-100 text-base font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                {String.fromCharCode(65 + index)}
              </span>
              <span>{option}</span>
            </li>
          ))}
        </ol>
      </div>
    );
  }

  if (task.format === "truefalse") {
    return (
      <div className="mt-3 space-y-3">
        <p className="whitespace-pre-wrap text-base text-zinc-700 dark:text-zinc-300">{task.question}</p>
        <div className="flex flex-wrap gap-2">
          {renderedOptions.map((option, index) => (
            <span key={`${task.id}-tf-${index}-${option}`} className="radius-single-line border border-zinc-300 px-3 py-1.5 text-base text-zinc-600 dark:border-zinc-700 dark:text-zinc-300">
              {option}
            </span>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mt-3 space-y-3">
      <p className="whitespace-pre-wrap text-base text-zinc-700 dark:text-zinc-300">{task.question}</p>
      {renderedOptions.length > 0 && (
        <ol className="space-y-1 text-base text-zinc-600 dark:text-zinc-300">
          {renderedOptions.map((option, index) => (
            <li key={`${task.id}-list-${index}-${option}`}>{option}</li>
          ))}
        </ol>
      )}
    </div>
  );
}

function buildConflictMessage(form: FormState): string | null {
  if (["A1.1", "A1.2", "A2.1", "A2.2"].includes(form.niveau) && form.textsorte === "Kommentar") {
    return "Kommentar ist erst ab B1.1 vorgesehen. Passe Niveau oder Textsorte an.";
  }

  if (form.textsorte !== "Dialog" && form.textsorte !== "Interview") {
    const limits = NIVEAU_LIMITS[form.niveau];
    const requestedParagraphs = form.absatzzahl ? Number(form.absatzzahl) : null;

    if (requestedParagraphs && (requestedParagraphs < limits.minParagraphs || requestedParagraphs > limits.maxParagraphs)) {
      return `Die Absatzzahl passt nicht zum Bereich für ${form.niveau} (${limits.minParagraphs}-${limits.maxParagraphs}).`;
    }
  }

  const focus = normalizePhrase(form.lernschwerpunkt);
  if (focus) {
    for (const rule of FOCUS_MIN_LEVEL) {
      if (rule.keywords.some((keyword) => focus.includes(keyword)) && compareLevels(form.niveau, rule.minLevel) < 0) {
        return `Der Lernschwerpunkt «${form.lernschwerpunkt}» passt nicht zu ${form.niveau}. Mindestniveau: ${rule.minLevel}.`;
      }
    }
  }

  const mandatoryWords = parseList(form.pflichtwortschatz);
  const requestedWordCount = form.wortzahl ? Number(form.wortzahl) : NIVEAU_LIMITS[form.niveau].defaultWords;
  const maxMandatoryWords = form.niveau.startsWith("A1") ? 4 : form.niveau.startsWith("A2") ? 6 : 8;

  if (mandatoryWords.length > maxMandatoryWords) {
    return `Zu viele Pflichtwörter für ${form.niveau}. Empfohlen sind höchstens ${maxMandatoryWords}.`;
  }

  if (mandatoryWords.length > Math.max(3, Math.floor(requestedWordCount / 35))) {
    return "Zu viele Pflichtwörter im Verhältnis zur Wortzahl. Reduziere die Liste oder erhöhe die Wortzahl.";
  }

  if (form.niveau.startsWith("A1") && ["kontrovers", "augenzwinkernd"].includes(form.tonalitaet)) {
    return `Die Tonalität «${form.tonalitaet}» ist für ${form.niveau} didaktisch zu anspruchsvoll.`;
  }

  return null;
}

function getLengthHint(niveau: string): string {
  const limits = NIVEAU_LIMITS[niveau];
  return `${limits.minWords}-${limits.maxWords} Wörter, ${limits.minParagraphs}-${limits.maxParagraphs} Absätze`;
}

function getPresetDisplayTitle(preset: Preset): string {
  const title = preset.title.trim();
  const niveau = (preset.values.niveau ?? "").trim();

  if (niveau && title.startsWith(`${niveau} `)) {
    return title.slice(niveau.length).trim();
  }

  return title.replace(/^[A-C]\d\.\d\s+/, "");
}

function getEditableResultText(result: ResultData | null): string {
  if (!result) {
    return "";
  }

  return [result.title, result.teaser, ...result.paragraphs].filter(Boolean).join("\n\n");
}

function plainTextToHtml(text: string): string {
  return text
    .split(/\n\n+/)
    .filter(Boolean)
    .map((para) => `<p>${para.replace(/\n/g, "<br>")}</p>`)
    .join("");
}

function toggleArrayEntry<T>(entries: T[], value: T): T[] {
  return entries.includes(value) ? entries.filter((entry) => entry !== value) : [...entries, value];
}

function coercePresetgenFormValues(input: unknown): Partial<FormState> {
  if (!input || typeof input !== "object") {
    return {};
  }

  const record = input as Record<string, unknown>;
  const out: Partial<FormState> = {};

  if (typeof record.niveau === "string" && NIVEAUS.includes(record.niveau as (typeof NIVEAUS)[number])) {
    out.niveau = record.niveau;
  }

  if (typeof record.thema === "string") out.thema = record.thema;
  if (typeof record.themendetails === "string") out.themendetails = record.themendetails;
  if (typeof record.zielgruppe === "string") out.zielgruppe = record.zielgruppe;
  if (typeof record.setting === "string") out.setting = record.setting;
  if (typeof record.tonalitaet === "string") out.tonalitaet = record.tonalitaet;
  if (typeof record.erzaehlperspektive === "string") out.erzaehlperspektive = record.erzaehlperspektive;
  if (typeof record.leseransprache === "string") out.leseransprache = record.leseransprache;
  if (typeof record.lernschwerpunkt === "string") out.lernschwerpunkt = record.lernschwerpunkt;
  if (typeof record.pflichtwortschatz === "string") out.pflichtwortschatz = record.pflichtwortschatz;
  if (typeof record.tabuwortschatz === "string") out.tabuwortschatz = record.tabuwortschatz;
  if (typeof record.personen === "string") out.personen = record.personen;
  if (typeof record.wortzahl === "string") out.wortzahl = record.wortzahl;
  if (typeof record.absatzzahl === "string") out.absatzzahl = record.absatzzahl;
  if (typeof record.kulturraum === "string") out.kulturraum = record.kulturraum;

  if (typeof record.textsorte === "string" && TEXTSORTEN.includes(record.textsorte as Textsorte)) {
    out.textsorte = record.textsorte as Textsorte;
  }

  if (
    typeof record.glossar === "string"
    && ["ja", "nein", "nur schwierige Wörter"].includes(record.glossar)
  ) {
    out.glossar = record.glossar as GlossarOption;
  }

  return out;
}

function estimateLueckenCandidates(text: string, config: LueckentextConfig): number {
  if (!text.trim()) {
    return 0;
  }

  const tokens = text.match(/[A-Za-zÄÖÜäöüß]+/g) ?? [];
  const articles = new Set(["der", "die", "das", "den", "dem", "des", "ein", "eine", "einen", "einem", "einer", "mein", "dein", "sein", "ihr", "unser", "euer"]);
  const prepositions = new Set(["in", "auf", "unter", "über", "vor", "hinter", "neben", "zwischen", "mit", "ohne", "für", "durch", "bei", "zu", "von"]);
  const conjunctions = new Set(["und", "oder", "aber", "denn", "weil", "dass", "wenn", "ob", "obwohl", "damit"]);
  const pronouns = new Set(["ich", "du", "er", "sie", "es", "wir", "ihr", "sie", "mich", "dich", "ihn", "uns", "euch", "mir", "dir", "ihm", "ihnen"]);

  const filtered = tokens.filter((token) => {
    if (config.excludeNumbers && /\d/.test(token)) {
      return false;
    }
    if (token.length < config.minWordLength) {
      return false;
    }
    if (config.excludeProperNames && /^[A-ZÄÖÜ][a-zäöüß]+$/.test(token) && token.toLowerCase() !== token) {
      return false;
    }
    return true;
  });

  const matchesType = (token: string): boolean => {
    const lower = token.toLowerCase();

    if (config.wordTypes.some((type) => type.startsWith("Verben")) && /(en|ern|eln|st|t)$/.test(lower)) return true;
    if (config.wordTypes.some((type) => type.startsWith("Nomen")) && /^[A-ZÄÖÜ]/.test(token)) return true;
    if (config.wordTypes.some((type) => type.startsWith("Artikel")) && articles.has(lower)) return true;
    if (config.wordTypes.some((type) => type.startsWith("Präpositionen")) && prepositions.has(lower)) return true;
    if (config.wordTypes.some((type) => type.startsWith("Adjektive")) && /(ig|lich|isch|bar|los)$/.test(lower)) return true;
    if (config.wordTypes.some((type) => type.startsWith("Konjunktionen")) && conjunctions.has(lower)) return true;
    if (config.wordTypes.some((type) => type.startsWith("Pronomen")) && pronouns.has(lower)) return true;

    return config.wordTypes.length === 0;
  };

  const candidates = filtered.filter(matchesType);
  return candidates.length;
}

const LABEL_SECTION_MAP: Record<string, string> = {
  "Niveau": "section-niveau",
  "Textsorte": "section-niveau",
  "Thema": "section-inhalt",
  "Themendetails": "section-inhalt",
  "Zielgruppe": "section-inhalt",
  "Setting": "section-inhalt",
  "Tonalität": "section-inhalt",
  "Kulturraum": "section-inhalt",
  "Perspektive": "section-perspektive",
  "Leseransprache": "section-perspektive",
  "Lernschwerpunkt": "section-didaktik",
  "Pflichtwortschatz": "section-didaktik",
  "Tabuwortschatz": "section-didaktik",
  "Personen": "section-didaktik",
  "Wortzahl": "section-umfang",
  "Absatzzahl": "section-umfang",
  "Glossar": "section-umfang",
};

function RedigiertEditor({ content, onChange }: { content: string; onChange: (text: string) => void }) {
  const editor = useEditor({
    extensions: [StarterKit.configure({ paragraph: false }), BoxedParagraph],
    content,
    immediatelyRender: false,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });

  // Sync external content changes (e.g. when result is loaded)
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content, { emitUpdate: false });
    }
  }, [content, editor]);

  return (
    <section className="radius-section-card border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="text-lg font-semibold text-sky-700 dark:text-[#9AA180]">Text redigieren</h2>
      <div className="mt-3 flex">
        <div className="w-40 border-b border-sky-600 dark:border-[#9AA180] section-divider-accent" />
        <div className="flex-1 border-b border-sky-400 dark:border-zinc-700 section-divider-line" />
      </div>
      {/* Toolbar */}
      <div className="mt-4 flex flex-wrap gap-1 rounded-t border border-b-0 border-zinc-300 bg-zinc-50 px-2 py-1.5 dark:border-zinc-700 dark:bg-zinc-800">
        <button
          type="button"
          onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}
          className={`rounded px-2 py-1 text-sm font-semibold transition-colors ${editor?.isActive("heading", { level: 1 }) ? "bg-zinc-200 dark:bg-zinc-600" : "hover:bg-zinc-200 dark:hover:bg-zinc-700"}`}
          title="Überschrift 1"
        >H1</button>
        <button
          type="button"
          onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
          className={`rounded px-2 py-1 text-sm font-semibold transition-colors ${editor?.isActive("heading", { level: 2 }) ? "bg-zinc-200 dark:bg-zinc-600" : "hover:bg-zinc-200 dark:hover:bg-zinc-700"}`}
          title="Überschrift 2"
        >H2</button>
        <button
          type="button"
          onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
          className={`rounded px-2 py-1 text-sm font-semibold transition-colors ${editor?.isActive("heading", { level: 3 }) ? "bg-zinc-200 dark:bg-zinc-600" : "hover:bg-zinc-200 dark:hover:bg-zinc-700"}`}
          title="Überschrift 3"
        >H3</button>
        <div className="mx-1 w-px self-stretch bg-zinc-300 dark:bg-zinc-600" />
        <button
          type="button"
          onClick={() => {
            const isBoxed = editor?.isActive("paragraph", { boxed: true }) ?? false;
            editor?.chain().focus().setNode("paragraph", { boxed: !isBoxed }).run();
          }}
          className={`rounded px-2 py-1 text-sm font-semibold transition-colors ${editor?.isActive("paragraph", { boxed: true }) ? "bg-zinc-200 dark:bg-zinc-600" : "hover:bg-zinc-200 dark:hover:bg-zinc-700"}`}
          title="Absatz als Box"
        >Box</button>
        <div className="mx-1 w-px self-stretch bg-zinc-300 dark:bg-zinc-600" />
        <button
          type="button"
          onClick={() => editor?.chain().focus().toggleBold().run()}
          className={`rounded px-2 py-1 text-sm font-bold transition-colors ${editor?.isActive("bold") ? "bg-zinc-200 dark:bg-zinc-600" : "hover:bg-zinc-200 dark:hover:bg-zinc-700"}`}
          title="Fett"
        >B</button>
        <button
          type="button"
          onClick={() => editor?.chain().focus().toggleItalic().run()}
          className={`rounded px-2 py-1 text-sm italic transition-colors ${editor?.isActive("italic") ? "bg-zinc-200 dark:bg-zinc-600" : "hover:bg-zinc-200 dark:hover:bg-zinc-700"}`}
          title="Kursiv"
        >I</button>
        <button
          type="button"
          onClick={() => editor?.chain().focus().toggleStrike().run()}
          className={`rounded px-2 py-1 text-sm line-through transition-colors ${editor?.isActive("strike") ? "bg-zinc-200 dark:bg-zinc-600" : "hover:bg-zinc-200 dark:hover:bg-zinc-700"}`}
          title="Durchgestrichen"
        >S</button>
        <div className="mx-1 w-px self-stretch bg-zinc-300 dark:bg-zinc-600" />
        <button
          type="button"
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
          className={`rounded px-2 py-1 text-sm transition-colors ${editor?.isActive("bulletList") ? "bg-zinc-200 dark:bg-zinc-600" : "hover:bg-zinc-200 dark:hover:bg-zinc-700"}`}
          title="Liste"
        ><List className="h-4 w-4" aria-hidden="true" /></button>
        <button
          type="button"
          onClick={() => editor?.chain().focus().toggleOrderedList().run()}
          className={`rounded px-2 py-1 text-sm transition-colors ${editor?.isActive("orderedList") ? "bg-zinc-200 dark:bg-zinc-600" : "hover:bg-zinc-200 dark:hover:bg-zinc-700"}`}
          title="Nummerierte Liste"
        ><ListOrdered className="h-4 w-4" aria-hidden="true" /></button>
        <div className="mx-1 w-px self-stretch bg-zinc-300 dark:bg-zinc-600" />
        <button
          type="button"
          onClick={() => editor?.chain().focus().undo().run()}
          disabled={!editor?.can().undo()}
          className="rounded px-2 py-1 text-sm transition-colors hover:bg-zinc-200 disabled:opacity-40 dark:hover:bg-zinc-700"
          title="Rückgängig"
        >↩</button>
        <button
          type="button"
          onClick={() => editor?.chain().focus().redo().run()}
          disabled={!editor?.can().redo()}
          className="rounded px-2 py-1 text-sm transition-colors hover:bg-zinc-200 disabled:opacity-40 dark:hover:bg-zinc-700"
          title="Wiederholen"
        >↪</button>
      </div>
      {/* Editor area */}
      <div className="min-h-[24rem] rounded-b border border-zinc-300 bg-white px-3.5 py-3 text-base text-zinc-900 focus-within:border-transparent focus-within:outline-none focus-within:ring-2 focus-within:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 [&_.tiptap]:min-h-[22rem] [&_.tiptap]:outline-none [&_.tiptap_h1]:mb-3 [&_.tiptap_h1]:text-3xl [&_.tiptap_h1]:font-bold [&_.tiptap_h2]:mb-2 [&_.tiptap_h2]:text-2xl [&_.tiptap_h2]:font-semibold [&_.tiptap_h3]:mb-2 [&_.tiptap_h3]:text-xl [&_.tiptap_h3]:font-semibold [&_.tiptap_ul]:list-disc [&_.tiptap_ul]:pl-5 [&_.tiptap_ol]:list-decimal [&_.tiptap_ol]:pl-5 [&_.tiptap_p]:mb-2 [&_.tiptap_p[data-boxed=true]]:mb-3 [&_.tiptap_p[data-boxed=true]]:rounded-md [&_.tiptap_p[data-boxed=true]]:border [&_.tiptap_p[data-boxed=true]]:border-zinc-200 [&_.tiptap_p[data-boxed=true]]:bg-zinc-50 [&_.tiptap_p[data-boxed=true]]:px-3 [&_.tiptap_p[data-boxed=true]]:py-2 dark:[&_.tiptap_p[data-boxed=true]]:border-zinc-700 dark:[&_.tiptap_p[data-boxed=true]]:bg-zinc-800">
        {!content && !editor?.isFocused && (
          <p className="pointer-events-none absolute text-zinc-400">Der generierte Text erscheint hier zur Bearbeitung.</p>
        )}
        <EditorContent editor={editor} />
      </div>
    </section>
  );
}

export default function GeneratorForm() {
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [result, setResult] = useState<ResultData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activePresetId, setActivePresetId] = useState<string | null>(null);
  const [presetTab, setPresetTab] = useState<string>("Alle");
  const [model, setModel] = useState("gpt-4.1");
  const [presetSearch, setPresetSearch] = useState("");
  const [searchSubmitted, setSearchSubmitted] = useState(false);
  const [presetTabPage, setPresetTabPage] = useState(1);
  const [workflowStep, setWorkflowStep] = useState<WorkflowStep>("generate");
  const [processingAction, setProcessingAction] = useState<ProcessingAction>("redigieren");
  const [processingText, setProcessingText] = useState("");
  const [shortenPercent, setShortenPercent] = useState(30);
  const [selectedTaskFormats, setSelectedTaskFormats] = useState<ExerciseFormat[]>(["lueckentext", "mcq", "truefalse"]);
  const [taskGlobalConfig, setTaskGlobalConfig] = useState<TaskGlobalConfig>(DEFAULT_TASK_GLOBAL);
  const [lueckentextConfig, setLueckentextConfig] = useState<LueckentextConfig>(DEFAULT_LUECKENTEXT_CONFIG);
  const [mcqConfig, setMcqConfig] = useState<McqConfig>(DEFAULT_MCQ_CONFIG);
  const [trueFalseConfig, setTrueFalseConfig] = useState<TrueFalseConfig>(DEFAULT_TRUE_FALSE_CONFIG);
  const [taskResult, setTaskResult] = useState<TaskResultData | null>(null);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [tasksError, setTasksError] = useState("");
  const [enabledTextsorten, setEnabledTextsorten] = useState<string[]>(SORTED_TEXTSORTEN);
  const [disabledTextsorten, setDisabledTextsorten] = useState<string[]>(SORTED_DISABLED_TEXTSORTEN);
  const [isPublishDialogOpen, setIsPublishDialogOpen] = useState(false);
  const [publishLoading, setPublishLoading] = useState(false);
  const [publishError, setPublishError] = useState("");

  const displayedPresets = useMemo(() => {
    const q = searchSubmitted ? presetSearch.trim().toLowerCase() : "";
    return PRESETS.filter((p) => {
      const levelMatch = presetTab === "Alle" || p.values.niveau === presetTab;
      const textMatch =
        !q ||
        p.title.toLowerCase().includes(q) ||
        p.summary.toLowerCase().includes(q) ||
        (p.values.thema ?? "").toLowerCase().includes(q) ||
        (p.values.themendetails ?? "").toLowerCase().includes(q) ||
        (p.values.zielgruppe ?? "").toLowerCase().includes(q);
      return levelMatch && textMatch;
    });
  }, [presetTab, presetSearch, searchSubmitted]);

  const totalPresetPages = Math.max(1, Math.ceil(displayedPresets.length / PRESETS_PER_TAB_PAGE));
  const clampedPresetPage = Math.min(presetTabPage, totalPresetPages);
  const pagedPresets = useMemo(() => {
    const start = (clampedPresetPage - 1) * PRESETS_PER_TAB_PAGE;
    return displayedPresets.slice(start, start + PRESETS_PER_TAB_PAGE);
  }, [displayedPresets, clampedPresetPage]);
  const presetPlaceholderCount = PRESETS_PER_TAB_PAGE - pagedPresets.length;

  function clearPresetFilter() {
    setPresetSearch("");
    setSearchSubmitted(false);
    setPresetTabPage(1);
  }

  const isDialogLike = form.textsorte === "Dialog" || form.textsorte === "Interview";
  const textsortenDefaults = TEXTSORTEN_DEFAULTS[form.textsorte] ?? TEXTSORTEN_DEFAULTS["Sachtext"];
  const perspectiveValue = form.erzaehlperspektive === "textsortennatürlich" ? textsortenDefaults.perspective : form.erzaehlperspektive;
  const addressValue = form.leseransprache === "textsortennatürlich" ? textsortenDefaults.address : form.leseransprache;
  const toneValue = form.tonalitaet === "textsortennatürlich" ? textsortenDefaults.tone : form.tonalitaet;
  const sourceTaskText = getEditableResultText(result);
  const lueckenCandidateCount = useMemo(
    () => estimateLueckenCandidates(sourceTaskText, lueckentextConfig),
    [sourceTaskText, lueckentextConfig],
  );
  const lueckenPreviewCount = useMemo(() => {
    if (lueckentextConfig.mode === "all") {
      return lueckenCandidateCount;
    }
    if (lueckentextConfig.selectionMode === "absolute") {
      return Math.min(lueckentextConfig.countAbsolute, lueckenCandidateCount);
    }
    if (lueckentextConfig.selectionMode === "percent") {
      return Math.round((lueckentextConfig.countPercent / 100) * lueckenCandidateCount);
    }
    if (lueckentextConfig.rhythmN <= 0) {
      return 0;
    }
    return Math.ceil(lueckenCandidateCount / lueckentextConfig.rhythmN);
  }, [lueckentextConfig, lueckenCandidateCount]);

  const conflictMessage = useMemo(() => buildConflictMessage(form), [form]);

  useEffect(() => {
    if (workflowStep === "continue" && processingAction === "redigieren") {
      setProcessingText(plainTextToHtml(getEditableResultText(result)));
    }
  }, [workflowStep, processingAction, result]);

  useEffect(() => {
    let isMounted = true;

    async function loadTextsorten() {
      try {
        const response = await fetch("/api/textsorten");
        if (!response.ok) {
          return;
        }

        const data = (await response.json()) as { textsorten?: TextsorteApiEntry[] };
        if (!Array.isArray(data.textsorten)) {
          return;
        }

        const enabled = data.textsorten
          .filter((entry) => entry && entry.enabled)
          .map((entry) => entry.name)
          .sort((left, right) => left.localeCompare(right, "de"));
        const disabled = data.textsorten
          .filter((entry) => entry && !entry.enabled)
          .map((entry) => entry.name)
          .sort((left, right) => left.localeCompare(right, "de"));

        if (!isMounted) {
          return;
        }

        if (enabled.length > 0) {
          setEnabledTextsorten(enabled);
        }
        setDisabledTextsorten(disabled);
      } catch {
        // Keep static fallback if textsorten endpoint is unavailable.
      }
    }

    void loadTextsorten();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(PRESETGEN_HANDOFF_KEY);
      if (!raw) {
        return;
      }

      const parsed = JSON.parse(raw) as { preset?: unknown };
      const values = coercePresetgenFormValues(parsed?.preset);
      if (Object.keys(values).length === 0) {
        window.localStorage.removeItem(PRESETGEN_HANDOFF_KEY);
        return;
      }

      setForm({
        ...DEFAULT_FORM,
        ...values,
        wortzahl: values.wortzahl ?? "",
        absatzzahl: values.absatzzahl ?? "",
      });
      setActivePresetId(null);
      setError("");
      setResult(null);
      setTaskResult(null);
      setTasksError("");

      window.localStorage.removeItem(PRESETGEN_HANDOFF_KEY);

      if (window.location.search.includes("presetgen=1")) {
        window.history.replaceState({}, "", "/generator");
      }
    } catch {
      window.localStorage.removeItem(PRESETGEN_HANDOFF_KEY);
    }
  }, []);

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setActivePresetId(null);
  }

  function applyPreset(preset: Preset) {
    setForm({ ...DEFAULT_FORM, ...preset.values, wortzahl: preset.values.wortzahl ?? "", absatzzahl: preset.values.absatzzahl ?? "" });
    setActivePresetId(preset.id);
    setError("");
    setResult(null);
    setTaskResult(null);
    setTasksError("");
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!form.thema.trim()) {
      return;
    }

    if (conflictMessage) {
      setError(conflictMessage);
      return;
    }

    setLoading(true);
    setResult(null);
    setError("");
    setTaskResult(null);
    setTasksError("");

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          model,
          thema: form.thema.trim(),
          themendetails: form.themendetails.trim() || undefined,
          tonalitaet: toneValue,
          erzaehlperspektive: perspectiveValue,
          leseransprache: addressValue,
          lernschwerpunkt: form.lernschwerpunkt.trim() || undefined,
          pflichtwortschatz: parseList(form.pflichtwortschatz),
          tabuwortschatz: parseList(form.tabuwortschatz),
          personen: parseList(form.personen),
          wortzahl: form.wortzahl ? Number(form.wortzahl) : undefined,
          absatzzahl: form.absatzzahl ? Number(form.absatzzahl) : undefined,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Unbekannter Fehler");
      }

      setResult(data as ResultData);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Fehler bei der Generierung");
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerateTasks() {
    if (!sourceTaskText.trim()) {
      setTasksError("Bitte zuerst einen Text generieren.");
      return;
    }

    if (selectedTaskFormats.length === 0) {
      setTasksError("Bitte mindestens ein Aufgabenformat auswählen.");
      return;
    }

    setTasksLoading(true);
    setTasksError("");
    setTaskResult(null);

    try {
      const response = await fetch("/api/generate/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          niveau: form.niveau,
          textsorte: form.textsorte,
          zielgruppe: form.zielgruppe,
          sourceText: sourceTaskText,
          selectedFormats: selectedTaskFormats,
          taskGlobalConfig,
          lueckentextConfig,
          mcqConfig,
          trueFalseConfig,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Unbekannter Fehler bei der Aufgabengenerierung");
      }

      setTaskResult(data as TaskResultData);
    } catch (taskError) {
      setTasksError(taskError instanceof Error ? taskError.message : "Fehler bei der Aufgabengenerierung");
    } finally {
      setTasksLoading(false);
    }
  }

  async function handlePublish(publishData: PublishFormData) {
    if (!result) {
      throw new Error("No text to publish");
    }

    setPublishLoading(true);
    setPublishError("");

    try {
      // Generate image if requested
      let imageUrl: string | undefined;
      let imagePrompt: string | undefined;

      if (publishData.imagePrompt) {
        imagePrompt = publishData.imagePrompt;
        const imageResponse = await fetch("/api/openai/image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: imagePrompt,
            size: "1024x1024",
            quality: "high",
          }),
        });

        if (imageResponse.ok) {
          const imageData = await imageResponse.json();
          imageUrl = imageData.dataUrl;
        } else {
          console.error("Image generation failed");
        }
      }

      // Publish text to library
      const publishResponse = await fetch("/api/library/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: publishData.title,
          summary: publishData.summary,
          paragraphs: publishData.paragraphs,
          imageUrl,
          imagePrompt,
          isPublic: publishData.isPublic,
        }),
      });

      const publishResult = await publishResponse.json();
      if (!publishResponse.ok) {
        throw new Error(publishResult.error ?? "Failed to publish text");
      }

      // Show success message
      alert(`Text published successfully! ID: ${publishResult.publishedTextId}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error during publishing";
      setPublishError(message);
      throw err;
    } finally {
      setPublishLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="xl:flex xl:items-start">
        <AppSidebar
          activeHref="/generator"
          enabledTextsorten={enabledTextsorten}
          disabledTextsorten={disabledTextsorten}
        />

        <div className="flex-1">
          <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
            <section className="radius-section-card mb-8 border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
              <h2 className="flex items-center gap-2 text-xl font-semibold text-zinc-900 dark:text-zinc-50">
                <Astroid className="h-6 w-6" aria-hidden="true" />
                Generator
              </h2>
              <div className="mt-3 flex"><div className="w-40 border-b border-sky-600 dark:border-[#9AA180] section-divider-accent" /><div className="flex-1 border-b border-sky-400 dark:border-zinc-700 section-divider-line" /></div>

              <div className="mt-4 grid gap-2 sm:grid-cols-4">
                <button
                  type="button"
                  onClick={() => setWorkflowStep("generate")}
                  className={`inline-flex w-full items-center justify-center gap-2 radius-single-line border px-4 py-2 text-base font-medium transition-colors ${
                    workflowStep === "generate"
                      ? "border-sky-500 bg-sky-50 text-sky-700 dark:bg-accent-950 dark:text-accent-300"
                      : "border-zinc-300 bg-white text-zinc-700 hover:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
                  }`}
                >
                  <TextAlignStart className="h-4 w-4" aria-hidden="true" />
                  Text generieren
                </button>
                <button
                  type="button"
                  onClick={() => setWorkflowStep("continue")}
                  className={`inline-flex w-full items-center justify-center gap-2 radius-single-line border px-4 py-2 text-base font-medium transition-colors ${
                    workflowStep === "continue"
                      ? "border-sky-500 bg-sky-50 text-sky-700 dark:bg-accent-950 dark:text-accent-300"
                      : "border-zinc-300 bg-white text-zinc-700 hover:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
                  }`}
                >
                  <PencilLine className="h-4 w-4" aria-hidden="true" />
                  Text weiterverarbeiten
                </button>
                <button
                  type="button"
                  onClick={() => setWorkflowStep("tasks")}
                  className={`inline-flex w-full items-center justify-center gap-2 radius-single-line border px-4 py-2 text-base font-medium transition-colors ${
                    workflowStep === "tasks"
                      ? "border-sky-500 bg-sky-50 text-sky-700 dark:bg-accent-950 dark:text-accent-300"
                      : "border-zinc-300 bg-white text-zinc-700 hover:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
                  }`}
                >
                  <ListChecks className="h-4 w-4" aria-hidden="true" />
                  Aufgaben erstellen
                </button>
                <button
                  type="button"
                  onClick={() => setWorkflowStep("audio")}
                  className={`inline-flex w-full items-center justify-center gap-2 radius-single-line border px-4 py-2 text-base font-medium transition-colors ${
                    workflowStep === "audio"
                      ? "border-sky-500 bg-sky-50 text-sky-700 dark:bg-accent-950 dark:text-accent-300"
                      : "border-zinc-300 bg-white text-zinc-700 hover:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
                  }`}
                >
                  <Play className="h-4 w-4" aria-hidden="true" />
                  Audio generieren
                </button>
              </div>
            </section>

            <div className="grid gap-8 xl:grid-cols-[1.2fr_0.8fr]">
              <div className="space-y-8">

            {workflowStep === "generate" ? (
              <form id="generate-form" onSubmit={handleSubmit} className="space-y-8">
            <section className="radius-section-card border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-sky-700 dark:text-[#9AA180]">
                <FileStack className="h-5 w-5" aria-hidden="true" />
                Presets
              </h2>
              <div className="mt-3 flex"><div className="w-40 border-b border-sky-600 dark:border-[#9AA180] section-divider-accent" /><div className="flex-1 border-b border-sky-400 dark:border-zinc-700 section-divider-line" /></div>

              <div className="mt-4 grid grid-cols-7 gap-2">
                <input
                  type="text"
                  value={presetSearch}
                  onChange={(e) => { setPresetSearch(e.target.value); if (!e.target.value) setSearchSubmitted(false); }}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); setSearchSubmitted(true); } }}
                  placeholder="Thema, Zielgruppe, Stichwort…"
                  className="col-span-5 radius-single-line border border-zinc-300 bg-white px-3 py-2 text-base text-zinc-900 placeholder:text-zinc-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                />
                <button type="button" onClick={() => setSearchSubmitted(true)} className={`${searchSubmitted ? "col-span-1" : "col-span-2"} radius-single-line border border-zinc-300 bg-white px-3 py-2 text-base text-zinc-700 hover:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300`}>
                  Suchen
                </button>
                {searchSubmitted && (
                  <button type="button" onClick={clearPresetFilter} className="col-span-1 radius-single-line border border-zinc-300 bg-white px-3 py-2 text-base text-zinc-500 hover:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400">
                    ✕
                  </button>
                )}
              </div>

              <div
                className="mt-4 grid gap-2"
                style={{ gridTemplateColumns: `repeat(${NIVEAUS.length + 1}, minmax(0, 1fr))` }}
                role="tablist"
                aria-label="Preset-Niveaus"
              >
                {(["Alle", ...NIVEAUS] as string[]).map((niveau) => (
                  <button
                    key={niveau}
                    type="button"
                    onClick={() => {
                      setPresetTab(niveau);
                      setPresetTabPage(1);
                    }}
                    id={`preset-tab-${niveau}`}
                    role="tab"
                    aria-selected={presetTab === niveau}
                    aria-controls={`preset-panel-${niveau}`}
                    tabIndex={presetTab === niveau ? 0 : -1}
                    className={`w-full radius-single-line border py-2 text-base font-medium transition-colors text-center ${
                      presetTab === niveau
                        ? "border-sky-500 bg-sky-50 text-sky-700 dark:border-accent-700 dark:bg-accent-950 dark:text-accent-300"
                        : "border-zinc-300 bg-white text-zinc-600 hover:border-zinc-400 hover:text-zinc-800 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
                    }`}
                  >
                    {niveau}
                  </button>
                ))}
              </div>
              <div
                id={`preset-panel-${presetTab}`}
                className="mt-4 grid gap-3 md:grid-cols-2"
                role="tabpanel"
                aria-labelledby={`preset-tab-${presetTab}`}
              >
                {pagedPresets.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => applyPreset(preset)}
                    className={`radius-single-line border text-left transition-colors overflow-hidden ${
                      activePresetId === preset.id
                        ? "border-sky-500 bg-sky-50 text-sky-800 dark:bg-accent-950 dark:text-accent-200"
                        : "border-zinc-300 bg-white text-zinc-700 hover:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
                    }`}
                  >
                    <div className={`flex items-center gap-2 px-4 pt-2 pb-2 ${activePresetId === preset.id ? "bg-sky-100 dark:bg-accent-900" : "bg-zinc-100 dark:bg-zinc-800"}`}>
                      <span
                        className={`shrink-0 inline-flex items-center radius-single-line border px-2 py-0.5 text-[11px] font-semibold tracking-wide ${
                          activePresetId === preset.id
                            ? "border-blue-300 bg-white text-blue-800 dark:border-blue-700 dark:bg-blue-800 dark:text-blue-200"
                            : "border-zinc-300 bg-white text-zinc-600 dark:border-zinc-700 dark:bg-zinc-700 dark:text-zinc-300"
                        }`}
                      >
                        {preset.values.niveau ?? "-"}
                      </span>
                      <div className="text-base font-semibold leading-snug">{getPresetDisplayTitle(preset)}</div>
                    </div>
                    <div className="px-4 pt-3 pb-4">
                      <div className="text-base leading-snug text-zinc-600 dark:text-zinc-300">{preset.summary}</div>
                      <div className="mt-3 text-xs uppercase tracking-wide opacity-70">{preset.values.textsorte} · {preset.values.zielgruppe}</div>
                    </div>
                  </button>
                ))}
                {displayedPresets.length === 0 && (
                  <p className="col-span-2 py-6 text-center text-sm text-zinc-400 dark:text-zinc-500">Keine Presets gefunden.</p>
                )}
                {pagedPresets.length > 0 && Array.from({ length: presetPlaceholderCount }).map((_, index) => (
                  <div
                    key={`preset-placeholder-${clampedPresetPage}-${index}`}
                    aria-hidden="true"
                    className="radius-single-line border border-transparent p-4 opacity-0 pointer-events-none select-none"
                  />
                ))}
              </div>
              {totalPresetPages > 1 && (
                <div className="mt-4 flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
                  <button
                    type="button"
                    onClick={() => setPresetTabPage((page) => Math.max(1, page - 1))}
                    disabled={clampedPresetPage === 1}
                    className="radius-single-line border border-zinc-300 bg-white px-3 py-1.5 text-zinc-700 transition-colors hover:border-zinc-400 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
                  >
                    Zurück
                  </button>
                  <span>Seite {clampedPresetPage} von {totalPresetPages}</span>
                  <button
                    type="button"
                    onClick={() => setPresetTabPage((page) => Math.min(totalPresetPages, page + 1))}
                    disabled={clampedPresetPage === totalPresetPages}
                    className="radius-single-line border border-zinc-300 bg-white px-3 py-1.5 text-zinc-700 transition-colors hover:border-zinc-400 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
                  >
                    Weiter
                  </button>
                </div>
              )}
            </section>

            <section className="radius-section-card border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-sky-700 dark:text-[#9AA180]">
                <BrainCircuit className="h-5 w-5" aria-hidden="true" />
                Modell
              </h2>
              <div className="mt-3 flex"><div className="w-40 border-b border-sky-600 dark:border-[#9AA180] section-divider-accent" /><div className="flex-1 border-b border-sky-400 dark:border-zinc-700 section-divider-line" /></div>
              <div className="mt-4 grid grid-cols-4 gap-2">
                {MODEL_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setModel(option.id)}
                    className={`radius-single-line border px-3 py-2 text-base font-medium transition-colors ${
                      model === option.id
                        ? option.provider === "anthropic"
                          ? "border-violet-500 bg-violet-50 text-violet-700 dark:bg-violet-950 dark:text-violet-300"
                          : "border-sky-500 bg-sky-50 text-sky-700 dark:bg-accent-950 dark:text-accent-300"
                        : "border-zinc-300 bg-white text-zinc-700 hover:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </section>

            <section id="section-niveau" className="radius-section-card border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-sky-700 dark:text-[#9AA180]">
                <SlidersVertical className="h-5 w-5" aria-hidden="true" />
                Niveau und Textsorte
              </h2>
              <div className="mt-3 flex"><div className="w-40 border-b border-sky-600 dark:border-[#9AA180] section-divider-accent" /><div className="flex-1 border-b border-sky-400 dark:border-zinc-700 section-divider-line" /></div>
              <div className="mt-5 space-y-5">
                <div>
                  <label className="mb-2 block text-base font-medium text-zinc-700 dark:text-zinc-300">Niveau <span className="text-red-500">*</span></label>
                  <div className="grid grid-cols-6 gap-2">
                    {NIVEAUS.map((niveau) => (
                      <button
                        key={niveau}
                        type="button"
                        onClick={() => updateField("niveau", niveau)}
                        className={`radius-single-line border px-3 py-2.5 text-center transition-colors ${
                          form.niveau === niveau
                            ? "border-sky-500 bg-sky-50 text-sky-700 dark:bg-accent-950 dark:text-accent-300"
                            : "border-zinc-300 bg-white text-zinc-700 hover:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
                        }`}
                      >
                        <div className="text-base font-semibold">{niveau}</div>
                      </button>
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">Standard: {getLengthHint(form.niveau)}</p>
                </div>

                <div>
                  <label className="mb-2 block text-base font-medium text-zinc-700 dark:text-zinc-300">Textsorte <span className="text-red-500">*</span></label>
                  <select
                    value={form.textsorte}
                    onChange={(event) => updateField("textsorte", event.target.value as Textsorte)}
                    className="w-full radius-single-line border border-zinc-300 bg-white px-3.5 py-2.5 text-base text-zinc-900 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                  >
                    {enabledTextsorten.map((textsorte) => (
                      <option key={textsorte} value={textsorte}>{textsorte}</option>
                    ))}
                    {disabledTextsorten.map((textsorte) => (
                      <option key={textsorte} value={textsorte} disabled>{textsorte} (demnaechst)</option>
                    ))}
                  </select>
                </div>

              </div>
            </section>

            <section id="section-inhalt" className="radius-section-card border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-sky-700 dark:text-[#9AA180]">
                <CirclePile className="h-5 w-5" aria-hidden="true" />
                Inhalt und Kontext
              </h2>
              <div className="mt-3 flex"><div className="w-40 border-b border-sky-600 dark:border-[#9AA180] section-divider-accent" /><div className="flex-1 border-b border-sky-400 dark:border-zinc-700 section-divider-line" /></div>
              <div className="mt-5 grid gap-5 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label className="mb-2 block text-base font-medium text-zinc-700 dark:text-zinc-300">Thema <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={form.thema}
                    onChange={(event) => updateField("thema", event.target.value)}
                    placeholder="z. B. Spitalaufnahme, Wohnungssuche, erste Tage im neuen Job"
                    required
                    className="w-full radius-single-line border border-zinc-300 bg-white px-3.5 py-2.5 text-base text-zinc-900 placeholder:text-zinc-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="mb-2 block text-base font-medium text-zinc-700 dark:text-zinc-300">Themendetails</label>
                  <textarea value={form.themendetails} onChange={(event) => updateField("themendetails", event.target.value)} rows={3} placeholder="Konkrete Aspekte, Plotpunkte, Eckdaten oder Übersteuerungen" className="w-full radius-single-line border border-zinc-300 bg-white px-3.5 py-2.5 text-base text-zinc-900 placeholder:text-zinc-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100" />
                </div>
                <div>
                  <label className="mb-2 block text-base font-medium text-zinc-700 dark:text-zinc-300">Zielgruppe</label>
                  <select value={form.zielgruppe} onChange={(event) => updateField("zielgruppe", event.target.value)} className="w-full radius-single-line border border-zinc-300 bg-white px-3.5 py-2.5 text-base text-zinc-900 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100">
                    {ZIELGRUPPEN.map((zielgruppe) => <option key={zielgruppe} value={zielgruppe}>{zielgruppe}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-base font-medium text-zinc-700 dark:text-zinc-300">Setting</label>
                  <input type="text" value={form.setting} onChange={(event) => updateField("setting", event.target.value)} placeholder="z. B. Zürich, kleines Dorf in den Alpen" className="w-full radius-single-line border border-zinc-300 bg-white px-3.5 py-2.5 text-base text-zinc-900 placeholder:text-zinc-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100" />
                </div>
                <div>
                  <label className="mb-2 block text-base font-medium text-zinc-700 dark:text-zinc-300">Tonalität</label>
                  <select value={form.tonalitaet} onChange={(event) => updateField("tonalitaet", event.target.value)} className="w-full radius-single-line border border-zinc-300 bg-white px-3.5 py-2.5 text-base text-zinc-900 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100">
                    {TONALITAETEN.map((tonalitaet) => <option key={tonalitaet} value={tonalitaet}>{tonalitaet}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-base font-medium text-zinc-700 dark:text-zinc-300">Kulturraum</label>
                  <select value={form.kulturraum} onChange={(event) => updateField("kulturraum", event.target.value)} className="w-full radius-single-line border border-zinc-300 bg-white px-3.5 py-2.5 text-base text-zinc-900 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100">
                    {KULTURRAEUME.map((kulturraum) => <option key={kulturraum} value={kulturraum}>{kulturraum}</option>)}
                  </select>
                </div>
              </div>
            </section>

            <section id="section-perspektive" className="radius-section-card border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-sky-700 dark:text-[#9AA180]">
                <View className="h-5 w-5" aria-hidden="true" />
                Perspektive und Ansprache
              </h2>
              <div className="mt-3 flex"><div className="w-40 border-b border-sky-600 dark:border-[#9AA180] section-divider-accent" /><div className="flex-1 border-b border-sky-400 dark:border-zinc-700 section-divider-line" /></div>
              <div className="mt-5 grid gap-5 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-base font-medium text-zinc-700 dark:text-zinc-300">Erzählperspektive</label>
                  <select value={form.erzaehlperspektive} onChange={(event) => updateField("erzaehlperspektive", event.target.value)} className="w-full radius-single-line border border-zinc-300 bg-white px-3.5 py-2.5 text-base text-zinc-900 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100">
                    {ERZAEHLPERSPEKTIVEN.map((value) => <option key={value} value={value}>{value}</option>)}
                  </select>
                  <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">Default für {form.textsorte}: {textsortenDefaults.perspective}</p>
                </div>
                <div>
                  <label className="mb-2 block text-base font-medium text-zinc-700 dark:text-zinc-300">Leseransprache</label>
                  <select value={form.leseransprache} onChange={(event) => updateField("leseransprache", event.target.value)} className="w-full radius-single-line border border-zinc-300 bg-white px-3.5 py-2.5 text-base text-zinc-900 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100">
                    {LESERANSPRACHEN.map((value) => <option key={value} value={value}>{value}</option>)}
                  </select>
                  <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">Default für {form.textsorte}: {textsortenDefaults.address}</p>
                </div>
              </div>
            </section>

            <section id="section-didaktik" className="radius-section-card border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-sky-700 dark:text-[#9AA180]">
                <Milestone className="h-5 w-5" aria-hidden="true" />
                Didaktische Steuerung
              </h2>
              <div className="mt-3 flex"><div className="w-40 border-b border-sky-600 dark:border-[#9AA180] section-divider-accent" /><div className="flex-1 border-b border-sky-400 dark:border-zinc-700 section-divider-line" /></div>
              <div className="mt-5 grid gap-5 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label className="mb-2 block text-base font-medium text-zinc-700 dark:text-zinc-300">Lernschwerpunkt</label>
                  <input type="text" value={form.lernschwerpunkt} onChange={(event) => updateField("lernschwerpunkt", event.target.value)} placeholder="z. B. Perfekt, Modalverben, Relativsätze" className="w-full radius-single-line border border-zinc-300 bg-white px-3.5 py-2.5 text-base text-zinc-900 placeholder:text-zinc-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100" />
                </div>
                <div>
                  <label className="mb-2 block text-base font-medium text-zinc-700 dark:text-zinc-300">Pflichtwortschatz</label>
                  <textarea value={form.pflichtwortschatz} onChange={(event) => updateField("pflichtwortschatz", event.target.value)} rows={4} placeholder="Ein Wort pro Zeile oder durch Kommas getrennt" className="w-full radius-single-line border border-zinc-300 bg-white px-3.5 py-2.5 text-base text-zinc-900 placeholder:text-zinc-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100" />
                </div>
                <div>
                  <label className="mb-2 block text-base font-medium text-zinc-700 dark:text-zinc-300">Tabuwortschatz</label>
                  <textarea value={form.tabuwortschatz} onChange={(event) => updateField("tabuwortschatz", event.target.value)} rows={4} placeholder="Wörter oder Wendungen, die nicht vorkommen dürfen" className="w-full radius-single-line border border-zinc-300 bg-white px-3.5 py-2.5 text-base text-zinc-900 placeholder:text-zinc-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100" />
                </div>
                <div className="md:col-span-2">
                  <label className="mb-2 block text-base font-medium text-zinc-700 dark:text-zinc-300">Personen</label>
                  <textarea value={form.personen} onChange={(event) => updateField("personen", event.target.value)} rows={3} placeholder="z. B. Anna – Patientin, Herr Meier – Pflegefachperson" className="w-full radius-single-line border border-zinc-300 bg-white px-3.5 py-2.5 text-base text-zinc-900 placeholder:text-zinc-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100" />
                </div>
              </div>
            </section>

            <section id="section-umfang" className="radius-section-card border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-sky-700 dark:text-[#9AA180]">
                <PencilRuler className="h-5 w-5" aria-hidden="true" />
                Umfang und Ausgabe
              </h2>
              <div className="mt-3 flex"><div className="w-40 border-b border-sky-600 dark:border-[#9AA180] section-divider-accent" /><div className="flex-1 border-b border-sky-400 dark:border-zinc-700 section-divider-line" /></div>
              <div className="mt-5 grid gap-5 md:grid-cols-3">
                <div>
                  <label className="mb-2 block text-base font-medium text-zinc-700 dark:text-zinc-300">Wortzahl</label>
                  <input type="number" min={1} value={form.wortzahl} onChange={(event) => updateField("wortzahl", event.target.value)} placeholder={String(NIVEAU_LIMITS[form.niveau].defaultWords)} className="w-full radius-single-line border border-zinc-300 bg-white px-3.5 py-2.5 text-base text-zinc-900 placeholder:text-zinc-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100" />
                </div>
                <div>
                  <label className="mb-2 block text-base font-medium text-zinc-700 dark:text-zinc-300">Absatzzahl</label>
                  <input type="number" min={1} value={form.absatzzahl} onChange={(event) => updateField("absatzzahl", event.target.value)} placeholder={String(NIVEAU_LIMITS[form.niveau].defaultParagraphs)} disabled={isDialogLike} className="w-full radius-single-line border border-zinc-300 bg-white px-3.5 py-2.5 text-base text-zinc-900 placeholder:text-zinc-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100" />
                </div>
                <div>
                  <label className="mb-2 block text-base font-medium text-zinc-700 dark:text-zinc-300">Glossar</label>
                  <select value={form.glossar} onChange={(event) => updateField("glossar", event.target.value as GlossarOption)} className="w-full radius-single-line border border-zinc-300 bg-white px-3.5 py-2.5 text-base text-zinc-900 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100">
                    {GLOSSAR_OPTIONEN.map((option) => <option key={option} value={option}>{option}</option>)}
                  </select>
                </div>
              </div>
              {isDialogLike && <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">Für Dialog und Interview gilt die Absatzzahl nicht. Der Generator richtet die Länge am natürlichen Gesprächsverlauf aus.</p>}
            </section>

            {conflictMessage && <div className="radius-card border border-sky-300 bg-sky-50 px-4 py-3 text-sm text-sky-900 dark:text-[#9AA180] dark:border-accent-800 dark:bg-accent-950 dark:text-accent-200">{conflictMessage}</div>}
            {error && <div className="radius-card border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">{error}</div>}
              </form>
            ) : workflowStep === "continue" ? (
              <div className="space-y-8">
                <section className="radius-section-card border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
                  <h2 className="text-lg font-semibold text-sky-700 dark:text-[#9AA180]">Bearbeitung</h2>
                  <div className="mt-3 flex"><div className="w-40 border-b border-sky-600 dark:border-[#9AA180] section-divider-accent" /><div className="flex-1 border-b border-sky-400 dark:border-zinc-700 section-divider-line" /></div>
                  <div className="mt-5 grid gap-3 sm:grid-cols-3">
                    <button
                      type="button"
                      onClick={() => {
                        setProcessingAction("redigieren");
                        setProcessingText(plainTextToHtml(getEditableResultText(result)));
                      }}
                      className={`radius-single-line border px-4 py-3 text-sm font-medium transition-colors ${
                        processingAction === "redigieren"
                          ? "border-sky-500 bg-sky-50 text-sky-700 dark:bg-accent-950 dark:text-accent-300"
                          : "border-zinc-300 bg-white text-zinc-700 hover:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
                      }`}
                    >
                      Text redigieren
                    </button>
                    <button
                      type="button"
                      onClick={() => setProcessingAction("kuerzen")}
                      className={`radius-single-line border px-4 py-3 text-sm font-medium transition-colors ${
                        processingAction === "kuerzen"
                          ? "border-sky-500 bg-sky-50 text-sky-700 dark:bg-accent-950 dark:text-accent-300"
                          : "border-zinc-300 bg-white text-zinc-700 hover:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
                      }`}
                    >
                      Text kürzen
                    </button>
                    <button
                      type="button"
                      onClick={() => setProcessingAction("verlaengern")}
                      className={`radius-single-line border px-4 py-3 text-sm font-medium transition-colors ${
                        processingAction === "verlaengern"
                          ? "border-sky-500 bg-sky-50 text-sky-700 dark:bg-accent-950 dark:text-accent-300"
                          : "border-zinc-300 bg-white text-zinc-700 hover:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
                      }`}
                    >
                      Text verlängern
                    </button>
                  </div>
                </section>

                {processingAction === "redigieren" && (
                  <RedigiertEditor
                    content={processingText}
                    onChange={setProcessingText}
                  />
                )}

                {processingAction === "kuerzen" && (
                  <section className="radius-section-card border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
                    <h2 className="text-lg font-semibold text-sky-700 dark:text-[#9AA180]">Text kürzen</h2>
                    <div className="mt-3 flex"><div className="w-40 border-b border-sky-600 dark:border-[#9AA180] section-divider-accent" /><div className="flex-1 border-b border-sky-400 dark:border-zinc-700 section-divider-line" /></div>
                    <div className="mt-5 space-y-4">
                      <textarea
                        value={getEditableResultText(result)}
                        readOnly
                        rows={14}
                        placeholder="Der aktuelle Text erscheint hier als Vorschau."
                        className="w-full radius-single-line border border-zinc-300 bg-zinc-50 px-3.5 py-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                      />
                      <div>
                        <div className="mb-2 flex items-center justify-between text-sm text-zinc-700 dark:text-zinc-300">
                          <label htmlFor="shorten-percent" className="font-medium">Kürzen um</label>
                          <span>{shortenPercent}%</span>
                        </div>
                        <input
                          id="shorten-percent"
                          type="range"
                          min={0}
                          max={100}
                          step={1}
                          value={shortenPercent}
                          onChange={(event) => setShortenPercent(Number(event.target.value))}
                          className="w-full accent-blue-600"
                        />
                      </div>
                      <button
                        type="button"
                        className="w-full radius-single-line bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600"
                      >
                        Text kürzen
                      </button>
                    </div>
                  </section>
                )}

                {processingAction === "verlaengern" && (
                  <section className="radius-section-card border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
                    <h2 className="text-lg font-semibold text-sky-700 dark:text-[#9AA180]">Text verlängern</h2>
                    <div className="mt-3 flex"><div className="w-40 border-b border-sky-600 dark:border-[#9AA180] section-divider-accent" /><div className="flex-1 border-b border-sky-400 dark:border-zinc-700 section-divider-line" /></div>
                    <div className="mt-5 space-y-4">
                      <textarea
                        value={getEditableResultText(result)}
                        readOnly
                        rows={14}
                        placeholder="Der aktuelle Text erscheint hier als Vorschau."
                        className="w-full radius-single-line border border-zinc-300 bg-zinc-50 px-3.5 py-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                      />
                      <button
                        type="button"
                        className="w-full radius-single-line bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600"
                      >
                        Text verlängern
                      </button>
                    </div>
                  </section>
                )}
              </div>
            ) : workflowStep === "audio" ? (
              <div className="space-y-8">
                <section className="radius-section-card border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
                  <h2 className="text-lg font-semibold text-sky-700 dark:text-[#9AA180]">Audio generieren</h2>
                  <div className="mt-3 flex"><div className="w-40 border-b border-sky-600 dark:border-[#9AA180] section-divider-accent" /><div className="flex-1 border-b border-sky-400 dark:border-zinc-700 section-divider-line" /></div>
                  <p className="mt-5 text-sm text-zinc-600 dark:text-zinc-300">
                    Die Audio-Funktion wird im nächsten Schritt definiert. Die Oberfläche ist hier jetzt vorbereitet.
                  </p>
                </section>
              </div>
            ) : (
              <div className="space-y-8">
                <section className="radius-section-card border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
                  <h2 className="text-lg font-semibold text-sky-700 dark:text-[#9AA180]">Aufgaben erstellen</h2>
                  <div className="mt-3 flex"><div className="w-40 border-b border-sky-600 dark:border-[#9AA180] section-divider-accent" /><div className="flex-1 border-b border-sky-400 dark:border-zinc-700 section-divider-line" /></div>

                  <div className="mt-5 space-y-6">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Formate</label>
                      <div className="flex flex-wrap gap-2">
                        {TASK_FORMAT_LABELS.map((format) => (
                          <button
                            key={format.id}
                            type="button"
                            onClick={() => setSelectedTaskFormats((current) => toggleArrayEntry(current, format.id))}
                            className={`radius-single-line border px-3 py-2 text-sm transition-colors ${
                              selectedTaskFormats.includes(format.id)
                                ? "border-sky-500 bg-sky-50 text-sky-700 dark:bg-accent-950 dark:text-accent-300"
                                : "border-zinc-300 bg-white text-zinc-700 hover:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
                            }`}
                          >
                            {format.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Aufgabenanzahl</label>
                        <input
                          type="number"
                          min={5}
                          max={20}
                          value={taskGlobalConfig.taskCount}
                          onChange={(event) => setTaskGlobalConfig((current) => ({ ...current, taskCount: Number(event.target.value) || 5 }))}
                          className="w-full radius-single-line border border-zinc-300 bg-white px-3.5 py-2.5 text-sm text-zinc-900 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Lösungsblatt</label>
                        <label className="inline-flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                          <input
                            type="checkbox"
                            checked={taskGlobalConfig.withSeparateSolutions}
                            onChange={(event) => setTaskGlobalConfig((current) => ({ ...current, withSeparateSolutions: event.target.checked }))}
                          />
                          parallel generieren
                        </label>
                      </div>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Output-Format</label>
                      <div className="inline-flex items-center gap-2 rounded-md border border-zinc-200 px-3 py-2 text-sm text-zinc-700 dark:border-zinc-700 dark:text-zinc-300">
                        <input type="checkbox" checked readOnly />
                        {TASK_OUTPUT_FORMAT_LABELS[0].label}
                      </div>
                    </div>
                  </div>
                </section>

                {selectedTaskFormats.includes("lueckentext") && (
                  <section className="radius-section-card border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
                    <h2 className="text-lg font-semibold text-sky-700 dark:text-[#9AA180]">Lückentext</h2>
                    <div className="mt-3 flex"><div className="w-40 border-b border-sky-600 dark:border-[#9AA180] section-divider-accent" /><div className="flex-1 border-b border-sky-400 dark:border-zinc-700 section-divider-line" /></div>

                    <div className="mt-5 space-y-6">
                      <div>
                        <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Was soll ersetzt werden?</label>
                        <div className="grid gap-2 md:grid-cols-2">
                          {LUECKE_WORD_TYPES.map((wordType) => (
                            <label key={wordType} className="inline-flex items-center gap-2 rounded-md border border-zinc-200 px-3 py-2 text-sm text-zinc-700 dark:border-zinc-700 dark:text-zinc-300">
                              <input
                                type="checkbox"
                                checked={lueckentextConfig.wordTypes.includes(wordType)}
                                onChange={() => setLueckentextConfig((current) => ({ ...current, wordTypes: toggleArrayEntry(current.wordTypes, wordType) }))}
                              />
                              {wordType}
                            </label>
                          ))}
                        </div>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Grammatik-Fokus</label>
                          <input
                            type="text"
                            value={lueckentextConfig.grammarFocus}
                            onChange={(event) => setLueckentextConfig((current) => ({ ...current, grammarFocus: event.target.value }))}
                            placeholder="z. B. nur Verben im Perfekt"
                            className="w-full radius-single-line border border-zinc-300 bg-white px-3.5 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                          />
                        </div>

                        <div>
                          <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Wortschatz-Fokus</label>
                          <select
                            value={lueckentextConfig.vocabFocusMode}
                            onChange={(event) => setLueckentextConfig((current) => ({ ...current, vocabFocusMode: event.target.value as LueckentextConfig["vocabFocusMode"] }))}
                            className="w-full radius-single-line border border-zinc-300 bg-white px-3.5 py-2.5 text-sm text-zinc-900 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                          >
                            <option value="auto">Themenspezifischer Wortschatz (automatisch)</option>
                            <option value="manual">Manuelle Beschreibung</option>
                            <option value="upload">Upload Themenwortliste</option>
                          </select>
                        </div>
                      </div>

                      {lueckentextConfig.vocabFocusMode === "manual" && (
                        <textarea
                          value={lueckentextConfig.vocabFocusManual}
                          onChange={(event) => setLueckentextConfig((current) => ({ ...current, vocabFocusManual: event.target.value }))}
                          rows={3}
                          placeholder="z. B. nur Wörter zum Thema Arbeitssuche"
                          className="w-full radius-single-line border border-zinc-300 bg-white px-3.5 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                        />
                      )}

                      {lueckentextConfig.vocabFocusMode === "upload" && (
                        <div className="space-y-2">
                          <input
                            type="file"
                            accept=".txt,.csv"
                            onChange={(event) =>
                              setLueckentextConfig((current) => ({
                                ...current,
                                vocabFocusUpload: event.target.files?.[0]?.name ?? "",
                              }))
                            }
                            className="w-full text-sm text-zinc-700 dark:text-zinc-300"
                          />
                          {lueckentextConfig.vocabFocusUpload && <p className="text-xs text-zinc-500 dark:text-zinc-400">Datei: {lueckentextConfig.vocabFocusUpload}</p>}
                        </div>
                      )}

                      <div className="rounded-md border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-950">
                        <div className="mb-2 text-sm font-medium text-zinc-800 dark:text-zinc-200">Wie viele Lücken?</div>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => setLueckentextConfig((current) => ({ ...current, mode: "all" }))}
                            className={`radius-single-line border px-3 py-2 text-sm ${
                              lueckentextConfig.mode === "all"
                                ? "border-sky-500 bg-sky-50 text-sky-700 dark:bg-accent-950 dark:text-accent-300"
                                : "border-zinc-300 bg-white text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
                            }`}
                          >
                            Alle Vorkommen ersetzen
                          </button>
                          <button
                            type="button"
                            onClick={() => setLueckentextConfig((current) => ({ ...current, mode: "selection" }))}
                            className={`radius-single-line border px-3 py-2 text-sm ${
                              lueckentextConfig.mode === "selection"
                                ? "border-sky-500 bg-sky-50 text-sky-700 dark:bg-accent-950 dark:text-accent-300"
                                : "border-zinc-300 bg-white text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
                            }`}
                          >
                            Auswahl aus Vorkommen
                          </button>
                        </div>

                        <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-300">Live-Vorschau: <span className="font-semibold text-zinc-900 dark:text-zinc-100">{lueckenPreviewCount} Lücken</span> (aus ~{lueckenCandidateCount} Kandidaten)</p>

                        <div className="mt-4 grid gap-3 md:grid-cols-3">
                          <select
                            disabled={lueckentextConfig.mode === "all"}
                            value={lueckentextConfig.selectionMode}
                            onChange={(event) => setLueckentextConfig((current) => ({ ...current, selectionMode: event.target.value as LueckenSelectionMode }))}
                            className="radius-single-line border border-zinc-300 bg-white px-3 py-2 text-sm disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900"
                          >
                            <option value="absolute">Anzahl absolut</option>
                            <option value="percent">Dichte in Prozent</option>
                            <option value="rhythm">Rhythmus (jedes n-te)</option>
                          </select>

                          <input
                            type="number"
                            min={1}
                            disabled={lueckentextConfig.mode === "all" || lueckentextConfig.selectionMode !== "absolute"}
                            value={lueckentextConfig.countAbsolute}
                            onChange={(event) => setLueckentextConfig((current) => ({ ...current, countAbsolute: Number(event.target.value) || 1 }))}
                            className="radius-single-line border border-zinc-300 bg-white px-3 py-2 text-sm disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900"
                            placeholder="10"
                          />

                          <input
                            type="number"
                            min={1}
                            max={100}
                            disabled={lueckentextConfig.mode === "all" || lueckentextConfig.selectionMode !== "percent"}
                            value={lueckentextConfig.countPercent}
                            onChange={(event) => setLueckentextConfig((current) => ({ ...current, countPercent: Number(event.target.value) || 1 }))}
                            className="radius-single-line border border-zinc-300 bg-white px-3 py-2 text-sm disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900"
                            placeholder="50"
                          />

                          <input
                            type="number"
                            min={2}
                            disabled={lueckentextConfig.mode === "all" || lueckentextConfig.selectionMode !== "rhythm"}
                            value={lueckentextConfig.rhythmN}
                            onChange={(event) => setLueckentextConfig((current) => ({ ...current, rhythmN: Number(event.target.value) || 2 }))}
                            className="radius-single-line border border-zinc-300 bg-white px-3 py-2 text-sm disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900"
                            placeholder="7"
                          />
                        </div>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Hilfestellung</label>
                          <select
                            value={lueckentextConfig.hintMode}
                            onChange={(event) => setLueckentextConfig((current) => ({ ...current, hintMode: event.target.value as LueckentextConfig["hintMode"] }))}
                            className="w-full radius-single-line border border-zinc-300 bg-white px-3.5 py-2.5 text-sm text-zinc-900 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                          >
                            <option value="none">Keine Hilfe</option>
                            <option value="wordbank">Wortbank oben</option>
                            <option value="first-letter">Anfangsbuchstabe vorgegeben</option>
                            <option value="word-length">Wortlänge angedeutet</option>
                            <option value="infinitive">Infinitiv in Klammern</option>
                            <option value="image">Bild als Hinweis</option>
                          </select>
                        </div>

                        <div>
                          <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Wortbank-Modus</label>
                          <select
                            disabled={lueckentextConfig.hintMode !== "wordbank"}
                            value={lueckentextConfig.wordbankMode}
                            onChange={(event) => setLueckentextConfig((current) => ({ ...current, wordbankMode: event.target.value as LueckentextConfig["wordbankMode"] }))}
                            className="w-full radius-single-line border border-zinc-300 bg-white px-3.5 py-2.5 text-sm text-zinc-900 disabled:opacity-50 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                          >
                            <option value="alphabetical">alphabetisch</option>
                            <option value="mixed">gemischt</option>
                            <option value="with-distractors">mit Distraktoren</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Ausschlüsse</label>
                        <div className="grid gap-3 md:grid-cols-2">
                          <label className="inline-flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300"><input type="checkbox" checked={lueckentextConfig.excludeProperNames} onChange={(event) => setLueckentextConfig((current) => ({ ...current, excludeProperNames: event.target.checked }))} /> Eigennamen nicht ersetzen</label>
                          <label className="inline-flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300"><input type="checkbox" checked={lueckentextConfig.excludeNumbers} onChange={(event) => setLueckentextConfig((current) => ({ ...current, excludeNumbers: event.target.checked }))} /> Zahlen nicht ersetzen</label>
                          <label className="inline-flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300"><input type="checkbox" checked={lueckentextConfig.noAdjacentGaps} onChange={(event) => setLueckentextConfig((current) => ({ ...current, noAdjacentGaps: event.target.checked }))} /> Keine zwei Lücken nebeneinander</label>
                          <div className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">Min. Buchstaben <input type="number" min={1} value={lueckentextConfig.minWordLength} onChange={(event) => setLueckentextConfig((current) => ({ ...current, minWordLength: Number(event.target.value) || 1 }))} className="w-20 radius-single-line border border-zinc-300 bg-white px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900" /></div>
                          <div className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">Max. Lücken/Satz <input type="number" min={1} value={lueckentextConfig.maxPerSentence} onChange={(event) => setLueckentextConfig((current) => ({ ...current, maxPerSentence: Number(event.target.value) || 1 }))} className="w-20 radius-single-line border border-zinc-300 bg-white px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900" /></div>
                        </div>
                      </div>
                    </div>
                  </section>
                )}

                {selectedTaskFormats.includes("mcq") && (
                  <section className="radius-section-card border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
                    <h2 className="text-lg font-semibold text-sky-700 dark:text-[#9AA180]">MCQ</h2>
                    <div className="mt-3 flex"><div className="w-40 border-b border-sky-600 dark:border-[#9AA180] section-divider-accent" /><div className="flex-1 border-b border-sky-400 dark:border-zinc-700 section-divider-line" /></div>

                    <div className="mt-5 grid gap-4 md:grid-cols-2">
                      <div>
                        <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Fragetyp</label>
                        <select value={mcqConfig.questionType} onChange={(event) => setMcqConfig((current) => ({ ...current, questionType: event.target.value as McqConfig["questionType"] }))} className="w-full radius-single-line border border-zinc-300 bg-white px-3.5 py-2.5 text-sm dark:border-zinc-700 dark:bg-zinc-900">
                          <option value="comprehension">Verständnisfragen</option>
                          <option value="vocabulary">Wortschatzfragen</option>
                          <option value="inference">Inferenzfragen</option>
                        </select>
                      </div>
                      <div>
                        <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Anzahl Optionen</label>
                        <select value={mcqConfig.optionsCount} onChange={(event) => setMcqConfig((current) => ({ ...current, optionsCount: Number(event.target.value) as 3 | 4 | 5 }))} className="w-full radius-single-line border border-zinc-300 bg-white px-3.5 py-2.5 text-sm dark:border-zinc-700 dark:bg-zinc-900">
                          <option value={3}>3</option>
                          <option value={4}>4</option>
                          <option value={5}>5</option>
                        </select>
                      </div>
                      <div>
                        <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Korrekte Antworten</label>
                        <select value={mcqConfig.correctMode} onChange={(event) => setMcqConfig((current) => ({ ...current, correctMode: event.target.value as McqCorrectMode }))} className="w-full radius-single-line border border-zinc-300 bg-white px-3.5 py-2.5 text-sm dark:border-zinc-700 dark:bg-zinc-900">
                          <option value="exactly-one">Genau 1</option>
                          <option value="one-or-more">1 oder mehr</option>
                          <option value="variable">variabel</option>
                        </select>
                      </div>
                      <div>
                        <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Distraktoren-Quelle</label>
                        <select value={mcqConfig.distractorSource} onChange={(event) => setMcqConfig((current) => ({ ...current, distractorSource: event.target.value as McqConfig["distractorSource"] }))} className="w-full radius-single-line border border-zinc-300 bg-white px-3.5 py-2.5 text-sm dark:border-zinc-700 dark:bg-zinc-900">
                          <option value="from-text">Aus dem Text</option>
                          <option value="similar-vocab">Ähnlicher Wortschatz</option>
                          <option value="learner-errors">Typische Lernerfehler</option>
                        </select>
                      </div>
                    </div>

                    <div className="mt-4">
                      <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Distraktoren-Strategie</label>
                      <div className="grid gap-2 md:grid-cols-2">
                        {MCQ_DISTRACTOR_STRATEGIES.map((strategy) => (
                          <label key={strategy} className="inline-flex items-center gap-2 rounded-md border border-zinc-200 px-3 py-2 text-sm text-zinc-700 dark:border-zinc-700 dark:text-zinc-300">
                            <input type="checkbox" checked={mcqConfig.distractorStrategy.includes(strategy)} onChange={() => setMcqConfig((current) => ({ ...current, distractorStrategy: toggleArrayEntry(current.distractorStrategy, strategy) }))} />
                            {strategy}
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="mt-4 grid gap-4 md:grid-cols-3">
                      <div>
                        <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Reihenfolge</label>
                        <select value={mcqConfig.orderMode} onChange={(event) => setMcqConfig((current) => ({ ...current, orderMode: event.target.value as McqOrderMode }))} className="w-full radius-single-line border border-zinc-300 bg-white px-3.5 py-2.5 text-sm dark:border-zinc-700 dark:bg-zinc-900">
                          <option value="random">Zufällig</option>
                          <option value="fixed">Position X</option>
                        </select>
                      </div>
                      <div>
                        <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Position X</label>
                        <input type="number" min={1} max={5} disabled={mcqConfig.orderMode !== "fixed"} value={mcqConfig.fixedPosition} onChange={(event) => setMcqConfig((current) => ({ ...current, fixedPosition: Number(event.target.value) || 1 }))} className="w-full radius-single-line border border-zinc-300 bg-white px-3.5 py-2.5 text-sm disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900" />
                      </div>
                      <div>
                        <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Frageform</label>
                        <select value={mcqConfig.phrasingMode} onChange={(event) => setMcqConfig((current) => ({ ...current, phrasingMode: event.target.value as McqConfig["phrasingMode"] }))} className="w-full radius-single-line border border-zinc-300 bg-white px-3.5 py-2.5 text-sm dark:border-zinc-700 dark:bg-zinc-900">
                          <option value="sentence">vollständiger Satz</option>
                          <option value="gap">als Lücke</option>
                          <option value="w-question">als W-Frage</option>
                        </select>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      <div>
                        <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Antwortstil</label>
                        <select value={mcqConfig.answerStyle} onChange={(event) => setMcqConfig((current) => ({ ...current, answerStyle: event.target.value as McqConfig["answerStyle"] }))} className="w-full radius-single-line border border-zinc-300 bg-white px-3.5 py-2.5 text-sm dark:border-zinc-700 dark:bg-zinc-900">
                          <option value="quoted">zitiert aus Text</option>
                          <option value="paraphrased">umformuliert</option>
                        </select>
                      </div>
                      <label className="inline-flex items-center gap-2 self-end text-sm text-zinc-700 dark:text-zinc-300"><input type="checkbox" checked={mcqConfig.equalLengthAnswers} onChange={(event) => setMcqConfig((current) => ({ ...current, equalLengthAnswers: event.target.checked }))} /> Antwortlängen angleichen</label>
                    </div>
                  </section>
                )}

                {selectedTaskFormats.includes("truefalse") && (
                  <section className="radius-section-card border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
                    <h2 className="text-lg font-semibold text-sky-700 dark:text-[#9AA180]">Richtig/Falsch</h2>
                    <div className="mt-3 flex"><div className="w-40 border-b border-sky-600 dark:border-[#9AA180] section-divider-accent" /><div className="flex-1 border-b border-sky-400 dark:border-zinc-700 section-divider-line" /></div>

                    <div className="mt-5 grid gap-4 md:grid-cols-2">
                      <div>
                        <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Aussagentyp</label>
                        <select value={trueFalseConfig.statementType} onChange={(event) => setTrueFalseConfig((current) => ({ ...current, statementType: event.target.value as TrueFalseConfig["statementType"] }))} className="w-full radius-single-line border border-zinc-300 bg-white px-3.5 py-2.5 text-sm dark:border-zinc-700 dark:bg-zinc-900">
                          <option value="quote">Wörtliches Zitat</option>
                          <option value="paraphrase">Paraphrasiert</option>
                          <option value="inference">Inferenz</option>
                          <option value="mixed">Mischung</option>
                        </select>
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Antwortskala</label>
                        <select value={trueFalseConfig.scaleMode} onChange={(event) => setTrueFalseConfig((current) => ({ ...current, scaleMode: event.target.value as TfScaleMode }))} className="w-full radius-single-line border border-zinc-300 bg-white px-3.5 py-2.5 text-sm dark:border-zinc-700 dark:bg-zinc-900">
                          <option value="tf">Richtig / Falsch</option>
                          <option value="tfn">Richtig / Falsch / Nicht im Text</option>
                          <option value="four">stimmt / stimmt nicht / steht nicht im Text / unklar</option>
                        </select>
                      </div>
                    </div>

                    {trueFalseConfig.statementType === "mixed" && (
                      <div className="mt-4 grid gap-3 md:grid-cols-3">
                        <div><label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Zitat %</label><input type="number" min={0} max={100} value={trueFalseConfig.mixedQuotePercent} onChange={(event) => setTrueFalseConfig((current) => ({ ...current, mixedQuotePercent: Number(event.target.value) || 0 }))} className="w-full radius-single-line border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900" /></div>
                        <div><label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Paraphrase %</label><input type="number" min={0} max={100} value={trueFalseConfig.mixedParaphrasePercent} onChange={(event) => setTrueFalseConfig((current) => ({ ...current, mixedParaphrasePercent: Number(event.target.value) || 0 }))} className="w-full radius-single-line border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900" /></div>
                        <div><label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Inferenz %</label><input type="number" min={0} max={100} value={trueFalseConfig.mixedInferencePercent} onChange={(event) => setTrueFalseConfig((current) => ({ ...current, mixedInferencePercent: Number(event.target.value) || 0 }))} className="w-full radius-single-line border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900" /></div>
                      </div>
                    )}

                    <div className="mt-4 grid gap-4 md:grid-cols-3">
                      <div>
                        <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Begründungspflicht</label>
                        <select value={trueFalseConfig.justification} onChange={(event) => setTrueFalseConfig((current) => ({ ...current, justification: event.target.value as TrueFalseConfig["justification"] }))} className="w-full radius-single-line border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900">
                          <option value="none">Keine</option>
                          <option value="mark-text">Textstelle markieren</option>
                          <option value="rewrite-false">Korrekte Aussage formulieren</option>
                          <option value="quote-evidence">Zitat als Beleg</option>
                        </select>
                      </div>
                      <div><label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Richtig %</label><input type="number" min={0} max={100} value={trueFalseConfig.ratioTrue} onChange={(event) => setTrueFalseConfig((current) => ({ ...current, ratioTrue: Number(event.target.value) || 0 }))} className="w-full radius-single-line border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900" /></div>
                      <div><label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Falsch %</label><input type="number" min={0} max={100} value={trueFalseConfig.ratioFalse} onChange={(event) => setTrueFalseConfig((current) => ({ ...current, ratioFalse: Number(event.target.value) || 0 }))} className="w-full radius-single-line border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900" /></div>
                    </div>

                    <div className="mt-4">
                      <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Falsifikationsstrategie</label>
                      <div className="grid gap-2 md:grid-cols-2">
                        {TF_FALSIFICATION_STRATEGIES.map((strategy) => (
                          <label key={strategy} className="inline-flex items-center gap-2 rounded-md border border-zinc-200 px-3 py-2 text-sm text-zinc-700 dark:border-zinc-700 dark:text-zinc-300">
                            <input type="checkbox" checked={trueFalseConfig.falsificationStrategies.includes(strategy)} onChange={() => setTrueFalseConfig((current) => ({ ...current, falsificationStrategies: toggleArrayEntry(current.falsificationStrategies, strategy) }))} />
                            {strategy}
                          </label>
                        ))}
                      </div>
                    </div>
                  </section>
                )}

                {(selectedTaskFormats.includes("satzpuzzle") || selectedTaskFormats.includes("textpuzzle") || selectedTaskFormats.includes("zuordnung") || selectedTaskFormats.includes("umformung") || selectedTaskFormats.includes("wfragen") || selectedTaskFormats.includes("stichwort")) && (
                  <section className="radius-section-card border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
                    <h2 className="text-lg font-semibold text-sky-700 dark:text-[#9AA180]">Weitere Formate</h2>
                    <div className="mt-3 flex"><div className="w-40 border-b border-sky-600 dark:border-[#9AA180] section-divider-accent" /><div className="flex-1 border-b border-sky-400 dark:border-zinc-700 section-divider-line" /></div>
                    <div className="mt-5 space-y-3 text-sm text-zinc-600 dark:text-zinc-300">
                      {selectedTaskFormats.includes("satzpuzzle") && <p>Satzpuzzle: Wörter in richtige Reihenfolge bringen.</p>}
                      {selectedTaskFormats.includes("textpuzzle") && <p>Textpuzzle: Absätze ordnen.</p>}
                      {selectedTaskFormats.includes("zuordnung") && <p>Zuordnung: Wort↔Definition, Frage↔Antwort, Satzanfang↔Ende.</p>}
                      {selectedTaskFormats.includes("umformung") && <p>Umformung: Aktiv→Passiv, direkte→indirekte Rede.</p>}
                      {selectedTaskFormats.includes("wfragen") && <p>W-Fragen: offene Antworten zum Text.</p>}
                      {selectedTaskFormats.includes("stichwort") && <p>Stichwortzusammenfassung: Kerninhalte in Stichpunkten.</p>}
                    </div>
                  </section>
                )}

                <button
                  type="button"
                  onClick={handleGenerateTasks}
                  className="w-full radius-single-line bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:bg-blue-300 dark:bg-blue-700 dark:hover:bg-blue-600 dark:disabled:bg-blue-900"
                  disabled={selectedTaskFormats.length === 0 || !sourceTaskText.trim() || tasksLoading}
                >
                  {tasksLoading ? "Aufgaben werden generiert…" : "Aufgaben generieren"}
                </button>

                {tasksError && <div className="radius-card border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">{tasksError}</div>}
              </div>
            )}
          </div>

          <aside className="space-y-6 xl:sticky xl:top-6 xl:self-start xl:max-h-[calc(100vh-3rem)] xl:overflow-y-auto">
            {workflowStep === "generate" && (
              <button
                type="submit"
                form="generate-form"
                disabled={loading || !form.thema.trim()}
                className="w-full radius-single-line bg-sky-600 px-5 py-3 text-base font-semibold text-white transition-colors hover:bg-sky-700 disabled:bg-sky-300 dark:disabled:bg-accent-900"
              >
                {loading ? "Generiere Text…" : "Text generieren"}
              </button>
            )}
            <div className="radius-section-card border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-sky-700 dark:text-[#9AA180]">
                <Settings2 className="h-5 w-5" aria-hidden="true" />
                Aktive Einstellungen
              </h2>
              <div className="mt-3 flex"><div className="w-40 border-b border-sky-600 dark:border-[#9AA180] section-divider-accent" /><div className="flex-1 border-b border-sky-400 dark:border-zinc-700 section-divider-line" /></div>
              <div className="mt-4 overflow-hidden radius-single-line border border-zinc-200 dark:border-zinc-800">
                <table className="w-full border-collapse text-base text-zinc-600 dark:text-zinc-300">
                  <tbody>
                    {([
                      ["Niveau", form.niveau],
                      ["Thema", form.thema || "—"],
                      ["Textsorte", form.textsorte],
                      ["Perspektive", form.erzaehlperspektive !== "textsortennatürlich" ? form.erzaehlperspektive : textsortenDefaults.perspective],
                      ["Leseransprache", form.leseransprache !== "textsortennatürlich" ? form.leseransprache : textsortenDefaults.address],
                      ["Tonalität", form.tonalitaet !== "textsortennatürlich" ? form.tonalitaet : textsortenDefaults.tone],
                      ["Zielgruppe", form.zielgruppe],
                      ["Setting", form.setting],
                      ["Kulturraum", form.kulturraum],
                      ["Wortzahl", form.wortzahl || `${NIVEAU_LIMITS[form.niveau]?.defaultWords ?? "—"} (Standard)`],
                      ["Absatzzahl", form.absatzzahl || `${NIVEAU_LIMITS[form.niveau]?.defaultParagraphs ?? "—"} (Standard)`],
                      ["Glossar", form.glossar],
                      form.lernschwerpunkt ? ["Lernschwerpunkt", form.lernschwerpunkt] : null,
                      form.themendetails ? ["Themendetails", form.themendetails] : null,
                      form.pflichtwortschatz ? ["Pflichtwortschatz", form.pflichtwortschatz] : null,
                      form.tabuwortschatz ? ["Tabuwortschatz", form.tabuwortschatz] : null,
                      form.personen ? ["Personen", form.personen] : null,
                    ] as ([string, string] | null)[])
                      .filter((row): row is [string, string] => row !== null)
                      .map(([label, value], index, arr) => (
                      <tr key={label} className={index < arr.length - 1 ? "border-b border-zinc-200 dark:border-zinc-800" : ""}>
                        <th scope="row" className="w-2/5 bg-zinc-50 px-3 py-2 text-left font-medium text-zinc-800 align-top dark:bg-zinc-900 dark:text-zinc-100">
                          <a href={`#${LABEL_SECTION_MAP[label] ?? ""}`} className="hover:text-sky-700 dark:hover:text-accent-300 transition-colors">{label}</a>
                        </th>
                        <td className="px-3 py-2 break-words">{value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="radius-section-card border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-sky-700 dark:text-[#9AA180]"><TextAlignStart className="h-5 w-5" aria-hidden="true" />Ergebnis</h2>
              <div className="mt-3 flex"><div className="w-40 border-b border-sky-600 dark:border-[#9AA180] section-divider-accent" /><div className="flex-1 border-b border-sky-400 dark:border-zinc-700 section-divider-line" /></div>
              {!result && !loading && <p className="mt-4 text-base text-zinc-500 dark:text-zinc-400">Der generierte Text erscheint hier als strukturierte Ausgabe mit QA-Signalen.</p>}
              {loading && !result && (
                <div className="mt-4 radius-card border border-zinc-200 p-4 dark:border-zinc-800">
                  <div className="flex items-center gap-2 text-base text-zinc-500 dark:text-zinc-400">
                    <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-blue-500" />
                    {model === "qwen3.5-plus" ? "Generiere Text…" : "Generiere Entwurf und Reparaturfassung…"}
                  </div>
                </div>
              )}
              {result && (
                <div className="mt-4 space-y-4">
                  <div className="radius-card border border-zinc-200 p-4 dark:border-zinc-800">
                    <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">{result.title}</h3>
                    <p className="mt-2 text-base italic text-zinc-600 dark:text-zinc-300">{result.teaser}</p>
                    <div className="prose prose-zinc mt-4 max-w-none text-base dark:prose-invert">
                      {result.paragraphs.map((paragraph, index) => (
                        <p key={`${index}-${paragraph.slice(0, 16)}`}>{paragraph}</p>
                      ))}
                    </div>
                  </div>

                  {result.glossary.length > 0 && (
                    <div className="radius-card border border-zinc-200 p-4 dark:border-zinc-800">
                      <h4 className="text-base font-semibold uppercase tracking-wide text-zinc-700 dark:text-zinc-300">Glossar</h4>
                      <dl className="mt-3 space-y-3 text-base text-zinc-700 dark:text-zinc-300">
                        {result.glossary.map((item) => (
                          <div key={item.lemma}>
                            <dt className="font-semibold text-zinc-900 dark:text-zinc-50">{item.lemma}</dt>
                            <dd>{item.explanation}</dd>
                          </div>
                        ))}
                      </dl>
                    </div>
                  )}

                  <div className="radius-card border border-zinc-200 p-4 dark:border-zinc-800">
                    <h4 className="text-base font-semibold uppercase tracking-wide text-zinc-700 dark:text-zinc-300">QA</h4>
                    <dl className="mt-3 space-y-3 text-base text-zinc-600 dark:text-zinc-300">
                      <div><dt className="font-medium text-zinc-800 dark:text-zinc-100">Wörter</dt><dd>{result.qa.wordCount}</dd></div>
                      <div><dt className="font-medium text-zinc-800 dark:text-zinc-100">Absätze</dt><dd>{result.qa.paragraphCount}</dd></div>
                      <div><dt className="font-medium text-zinc-800 dark:text-zinc-100">Perspektive</dt><dd>{result.qa.perspective}</dd></div>
                      <div><dt className="font-medium text-zinc-800 dark:text-zinc-100">Ansprache</dt><dd>{result.qa.address}</dd></div>
                    </dl>
                    <div className="mt-4 space-y-3 text-base">
                      <div>
                        <div className="font-medium text-zinc-900 dark:text-zinc-50">Verwendeter Pflichtwortschatz</div>
                        <div className="mt-1 text-zinc-600 dark:text-zinc-300">{result.qa.mandatoryWordsUsed.length > 0 ? result.qa.mandatoryWordsUsed.join(", ") : "keine"}</div>
                      </div>
                      <div>
                        <div className="font-medium text-zinc-900 dark:text-zinc-50">Fehlender Pflichtwortschatz</div>
                        <div className="mt-1 text-zinc-600 dark:text-zinc-300">{result.qa.missingMandatoryWords.length > 0 ? result.qa.missingMandatoryWords.join(", ") : "keiner"}</div>
                      </div>
                      <div>
                        <div className="font-medium text-zinc-900 dark:text-zinc-50">Gefundener Tabuwortschatz</div>
                        <div className="mt-1 text-zinc-600 dark:text-zinc-300">{result.qa.tabooWordsFound.length > 0 ? result.qa.tabooWordsFound.join(", ") : "keiner"}</div>
                      </div>
                      <div>
                        <div className="font-medium text-zinc-900 dark:text-zinc-50">Risiken</div>
                        <div className="mt-1 text-zinc-600 dark:text-zinc-300">{result.qa.riskFlags.length > 0 ? result.qa.riskFlags.join(" ") : "Keine erkannten Risiken."}</div>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3 text-base">
                    <button type="button" onClick={() => navigator.clipboard.writeText(formatResult(result))} className="text-zinc-500 transition-colors hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200">Kopieren</button>
                    <button type="button" onClick={() => { setResult(null); setTaskResult(null); setTasksError(""); }} className="text-zinc-500 transition-colors hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200">Leeren</button>
                    <button
                      type="button"
                      onClick={() => setIsPublishDialogOpen(true)}
                      className="inline-flex items-center gap-2 text-zinc-500 transition-colors hover:text-sky-600 dark:text-zinc-400 dark:hover:text-sky-400"
                    >
                      <Library className="h-4 w-4" aria-hidden="true" />
                      Veröffentlichen
                    </button>
                  </div>
                </div>
              )}

              {/* Worksheet view: two-column on desktop (text left, exercises right), stacked on mobile */}
              {result && taskResult && (
                <div className="mt-4 flex flex-col gap-6 lg:flex-row lg:items-start">
                  {/* LEFT / TOP: Text */}
                  <div className="min-w-0 flex-1 space-y-4">
                    <div className="radius-card border border-zinc-200 p-4 dark:border-zinc-800">
                      <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">{result.title}</h3>
                      <p className="mt-2 text-base italic text-zinc-600 dark:text-zinc-300">{result.teaser}</p>
                      <div className="prose prose-zinc mt-4 max-w-none text-base dark:prose-invert">
                        {result.paragraphs.map((paragraph, index) => (
                          <p key={`${index}-${paragraph.slice(0, 16)}`}>{paragraph}</p>
                        ))}
                      </div>
                      <div className="mt-4 flex flex-wrap items-center gap-3 text-base">
                        <button
                          type="button"
                          onClick={() => {
                            localStorage.setItem("dext:worksheet", JSON.stringify({ text: result, tasks: taskResult }));
                            window.open("/worksheet", "_blank");
                          }}
                          className="radius-single-line bg-sky-600 px-4 py-2 text-base font-semibold text-white transition-colors hover:bg-sky-700"
                        >
                          Interaktives Arbeitsblatt öffnen
                        </button>
                        <button type="button" onClick={() => navigator.clipboard.writeText(formatResult(result))} className="text-zinc-500 transition-colors hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200">Kopieren</button>
                        <button type="button" onClick={() => { setResult(null); setTaskResult(null); setTasksError(""); }} className="text-zinc-500 transition-colors hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200">Leeren</button>
                        <button
                          type="button"
                          onClick={() => setIsPublishDialogOpen(true)}
                          className="inline-flex items-center gap-2 text-zinc-500 transition-colors hover:text-sky-600 dark:text-zinc-400 dark:hover:text-sky-400"
                        >
                          <Library className="h-4 w-4" aria-hidden="true" />
                          Veröffentlichen
                        </button>
                        <button
                          type="button"
                          onClick={() => navigator.clipboard.writeText(formatTaskWorksheet(taskResult))}
                          className="text-zinc-500 transition-colors hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
                        >
                          Arbeitsblatt kopieren
                        </button>
                        <button
                          type="button"
                          onClick={() => downloadTextFile("arbeitsblatt.txt", formatTaskWorksheet(taskResult))}
                          className="text-zinc-500 transition-colors hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
                        >
                          Arbeitsblatt herunterladen
                        </button>
                        <button
                          type="button"
                          onClick={() => navigator.clipboard.writeText(formatTaskSolutions(taskResult))}
                          className="text-zinc-500 transition-colors hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
                        >
                          Lösungen kopieren
                        </button>
                        <button
                          type="button"
                          onClick={() => downloadTextFile("loesungen.txt", formatTaskSolutions(taskResult))}
                          className="text-zinc-500 transition-colors hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
                        >
                          Lösungen herunterladen
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {taskResult.tasks.map((task, index) => (
                      <div key={task.id} className="radius-card border border-zinc-200 p-4 dark:border-zinc-800">
                        <div className="flex items-center justify-between gap-3">
                          <h4 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">{index + 1}. {task.instruction}</h4>
                          <span className="radius-single-line border border-zinc-300 px-2 py-0.5 text-base font-semibold uppercase tracking-wide text-zinc-600 dark:border-zinc-700 dark:text-zinc-300">{getTaskFormatLabel(task.format)}</span>
                        </div>
                        <TaskQuestionBody task={task} />
                        {!taskGlobalConfig.withSeparateSolutions && (
                          <div className="mt-4 rounded-md bg-zinc-50 p-3 text-base text-zinc-700 dark:bg-zinc-950 dark:text-zinc-300">
                            <div className="font-medium text-zinc-900 dark:text-zinc-100">Lösung</div>
                            <div className="mt-1 whitespace-pre-wrap">{formatTaskAnswer(task.answer)}</div>
                            {task.explanation && <div className="mt-2 text-zinc-500 dark:text-zinc-400">{task.explanation}</div>}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {taskGlobalConfig.withSeparateSolutions && (
                    <div className="radius-card border border-zinc-200 p-4 dark:border-zinc-800">
                      <h4 className="text-base font-semibold uppercase tracking-wide text-zinc-700 dark:text-zinc-300">Lösungen</h4>
                      <div className="mt-3 space-y-3 text-base text-zinc-700 dark:text-zinc-300">
                        {taskResult.tasks.map((task, index) => (
                          <div key={`${task.id}-solution`}>
                            <div className="font-medium text-zinc-900 dark:text-zinc-50">{index + 1}. {getTaskFormatLabel(task.format)}</div>
                            <div className="mt-1">{formatTaskAnswer(task.answer)}</div>
                            {task.explanation && <div className="mt-1 text-zinc-500 dark:text-zinc-400">{task.explanation}</div>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </aside>
            </div>
          </div>
        </div>
      </div>

      <PublishDialog
        isOpen={isPublishDialogOpen}
        result={result}
        onClose={() => setIsPublishDialogOpen(false)}
        onPublish={handlePublish}
        isLoading={publishLoading}
      />
    </div>
  );
}
