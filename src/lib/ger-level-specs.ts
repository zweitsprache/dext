export const GER_LEVEL_ORDER = ["A1.1", "A1.2", "A2.1", "A2.2", "B1.1", "B1.2"] as const;

export type GerLevel = (typeof GER_LEVEL_ORDER)[number];

export const NIVEAU_MERKMAL_LISTE = `
NIVEAU-MERKMAL-LISTE (kumulativ, strikt)
Kumulativitaet: z. B. A2.1 = A1.1 + A1.2 + A2.1 (ohne Merkmale von A2.2 oder hoeher).

A1.1
- Grammatik: Praesens (regelmaessige Verben; sein, haben); Personalpronomen (ich/du/er/sie/es/wir/ihr/sie); Artikel Singular (bestimmt/unbestimmt) im Nominativ und sehr einfacher Akkusativ; Plural (Basis); keine Nebensaetze.
- Konnektoren: und, oder, aber.
- Syntax und Stil: Aussagesatz (Verb-zweit), Ja/Nein-Frage (Verb-erst), W-Frage (W-Wort + Verb-zweit); Satzlaenge O 5-8 Woerter; keine Inversion.
- Wortschatz: sehr hoher Alltagsbezug (Familie, Arbeit, Wohnen, Wege, Zeitwoerter heute/jetzt/morgen); Ortsangaben ohne komplexe Praepositionalketten.
- Nicht verwenden: Perfekt, Modalverben, Nebensaetze, komplexe Dativ/Genitiv-Strukturen, trennbare Verben.

A1.2
- Grammatik: Praesens + Perfekt (haeufige Verben); Modalverben im Praesens (koennen, muessen, wollen, duerfen, sollen, moegen) mit Infinitiv am Satzende; trennbare Verben (Praesens/Perfekt); einfache Dativ-Phrase mit mit; Kontraktionen im/am/zum/zur.
- Konnektoren: und, oder, aber, denn; Zeitmarker: zuerst, dann, danach, spaeter; am Morgen/Abend; um X Uhr; oft/manchmal/immer/nie.
- Syntax und Stil: Inversion nach Vorfeld moeglich (Dann gehe ich ...); Satzlaenge O 6-12 Woerter.
- Wortschatz: Routinen (Arbeit/Alltag/Spital/OEV/Einkauf), Grundzahlen/Uhrzeit, einfache Mengen/Preise.
- Nicht verwenden: weil/dass/ob/Relativsaetze, Praeteritum ausser war/hatte (optional erst A2.1), Passiv, Konjunktiv II.

A2.1
- Grammatik: Nebensatz mit weil (Verb am Ende); Inversion nach Voranstellung; Praeteritum nur von sein und haben; Wechselpraepositionen in einfachen Mustern (in + Akk/Dat), keine Ketten.
- Konnektoren: weil, deshalb/deswegen, zuerst, dann, danach, spaeter, also, ausserdem (sparsam).
- Syntax und Stil: Satzlaenge O 8-14 Woerter; max. 1 Nebensatz pro Satz; klare Chronologie.
- Wortschatz: einfache Vergleichs-/Zweckangaben auf Wortgruppenebene (kein zu-Infinitiv); berufsnahe Termini behutsam.
- Nicht verwenden: dass/ob/wenn-Saetze, Relativsaetze, zu-Infinitiv, Komparativ/Superlativ als Struktur, Passiv, Konjunktiv II.

A2.2
- Grammatik: Nebensaetze mit dass, wenn (temporal/konditional), ob; Komparativ/Superlativ; trennbar/untrennbar erweitert; Konjunktiv II (Hoeflichkeit/Wuensche): wuerde + Inf, koennte, sollte; Praeteritum nur von sein und haben.
- Konnektoren: ausserdem, jedoch, trotzdem, waehrend (als Praeposition).
- Syntax und Stil: Satzlaenge O 10-16 Woerter; 1-2 Nebensaetze pro Satz; einfache indirekte Rede mit dass.
- Wortschatz: breiter Arbeits-/Gesellschaftskontext, einfache Abstrakta (Regel, Kosten, Termin).
- Nicht verwenden: Passiv, Plusquamperfekt, Konjunktiv II (ausser moechte), komplexe Relativketten, Partizipialattribute.

B1.1
- Grammatik: Relativsatz (der/die/das; Subjekt/Objekt, einfach); zu-Infinitiv und um ... zu; Passiv Praesens (wird + Partizip II) einfach; Plusquamperfekt in linearen Zeitbezuegen; obwohl, damit als Nebensaetze; erweiterte Objekt-/Praepositionalgruppen.
- Konnektoren: trotzdem, daher/deshalb, allerdings, jedoch, einerseits ... andererseits (einfach).
- Syntax und Stil: Satzlaenge O 12-18 Woerter; bis 2 Nebensaetze, klar strukturiert; indirekte Rede mit dass.
- Wortschatz: moderat abstrakt (Verantwortung, Massnahme), vorsichtige Bewertungssprache.
- Nicht verwenden: Futur I als Pflichtform, Passiv Perfekt, partizipiale Verdichtungen, verschachtelte Relativketten, exzessiver Nominalstil.

B1.2
- Grammatik: Relativsaetze mit Praeposition (einfach, nur wenn noetig); obwohl, bevor, nachdem, seit/seitdem; Zustandspassiv (sein + Partizip II), Passiv Praesens weiterhin moeglich; behutsame Partizip-Attribute (die geoeffnete Datei).
- Konnektoren: folglich, somit, hingegen, ausserdem, darueber hinaus (massvoll).
- Syntax und Stil: Satzlaenge O 12-22 Woerter; Variation der Satzanfaenge; klare Informationsgliederung (Thema-Rhema).
- Wortschatz: breitere Abstrakta, einfache Nominalisierungen (die Entscheidung, die Verbesserung), dennoch allgemeinverstaendlich.
- Nicht verwenden: Passiv Perfekt/Plusquamperfekt, komplexe Partizipialketten, unnoetiger Fachjargon.
`;

export const LEVEL_LIMITS: Record<GerLevel, { minWords: number; maxWords: number; minParagraphs: number; maxParagraphs: number }> = {
  "A1.1": { minWords: 90, maxWords: 140, minParagraphs: 3, maxParagraphs: 3 },
  "A1.2": { minWords: 130, maxWords: 180, minParagraphs: 3, maxParagraphs: 4 },
  "A2.1": { minWords: 170, maxWords: 240, minParagraphs: 4, maxParagraphs: 4 },
  "A2.2": { minWords: 220, maxWords: 320, minParagraphs: 4, maxParagraphs: 5 },
  "B1.1": { minWords: 300, maxWords: 420, minParagraphs: 5, maxParagraphs: 5 },
  "B1.2": { minWords: 380, maxWords: 520, minParagraphs: 5, maxParagraphs: 6 },
};

export const LEVEL_RULES: Record<GerLevel, { allowed: string[]; preferred: string[]; forbidden: string[] }> = {
  "A1.1": {
    allowed: ["Praesens", "Aussagesaetze", "Ja/Nein-Fragen", "W-Fragen", "und/oder/aber"],
    preferred: ["5-8 Woerter pro Satz", "hoher Alltagsbezug", "einfache Orts- und Zeitangaben"],
    forbidden: ["Perfekt", "Modalverben", "Nebensaetze", "trennbare Verben", "komplexe Dativ- oder Genitivstrukturen"],
  },
  "A1.2": {
    allowed: ["Praesens", "Perfekt", "einfache Modalverben", "trennbare Verben", "einfache Inversion"],
    preferred: ["6-12 Woerter pro Satz", "klare Routineablaeufe", "Zeitmarker wie zuerst, dann, spaeter"],
    forbidden: ["weil/dass/ob", "Relativsaetze", "Passiv", "Konjunktiv II"],
  },
  "A2.1": {
    allowed: ["weil-Saetze", "Inversion", "Praeteritum nur von sein/haben", "einfache Wechselpraepositionen"],
    preferred: ["8-14 Woerter pro Satz", "maximal 1 Nebensatz pro Satz", "klare Chronologie"],
    forbidden: ["dass/ob/wenn-Saetze", "Relativsaetze", "zu-Infinitiv", "Passiv", "Konjunktiv II", "Praeteritum anderer Verben als sein/haben"],
  },
  "A2.2": {
    allowed: ["dass/wenn/ob", "Komparativ", "einfache indirekte Rede", "wuerde/koennte/sollte"],
    preferred: ["10-16 Woerter pro Satz", "1-2 Nebensaetze pro Satz", "arbeitsnahe Themen"],
    forbidden: ["Passiv", "Plusquamperfekt", "komplexe Relativketten", "Partizipialattribute", "Praeteritum anderer Verben als sein/haben"],
  },
  "B1.1": {
    allowed: ["Relativsaetze", "zu-Infinitiv", "um ... zu", "Passiv Praesens", "obwohl/damit"],
    preferred: ["12-18 Woerter pro Satz", "klarer Argumentationsaufbau", "vorsichtige Bewertungssprache"],
    forbidden: ["Passiv Perfekt", "partizipiale Verdichtungen", "verschachtelte Relativketten", "exzessiver Nominalstil"],
  },
  "B1.2": {
    allowed: ["Relativsaetze mit Praeposition", "bevor/nachdem/seitdem", "Zustandspassiv", "behutsame Partizip-Attribute"],
    preferred: ["12-22 Woerter pro Satz", "Variation der Satzanfaenge", "klare Informationsgliederung"],
    forbidden: ["Passiv Perfekt", "Passiv Plusquamperfekt", "komplexe Partizipialketten", "unnoetiger Fachjargon"],
  },
};

export const FOCUS_MIN_LEVEL: Array<{ keywords: string[]; minLevel: GerLevel }> = [
  { keywords: ["perfekt"], minLevel: "A1.2" },
  { keywords: ["modalverben", "modalverb"], minLevel: "A1.2" },
  { keywords: ["weil", "wechselpraeposition"], minLevel: "A2.1" },
  { keywords: ["dass", "wenn", "ob", "komparativ", "konjunktiv ii"], minLevel: "A2.2" },
  { keywords: ["relativsatz", "zu-infinitiv", "passiv", "obwohl", "damit"], minLevel: "B1.1" },
  { keywords: ["zustandspassiv", "partizip", "bevor", "nachdem", "seitdem"], minLevel: "B1.2" },
];
