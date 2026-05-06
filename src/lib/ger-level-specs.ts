export const GER_LEVEL_ORDER = ["A1.1", "A1.2", "A2.1", "A2.2", "B1.1", "B1.2"] as const;

export type GerLevel = (typeof GER_LEVEL_ORDER)[number];

export const NIVEAU_MERKMAL_LISTE = `
NIVEAU-MERKMAL-LISTE (kumulativ, strikt)
Kumulativität: z. B. A2.1 = A1.1 + A1.2 + A2.1 (ohne Merkmale von A2.2 oder höher).

A1.1
- Grammatik: Präsens (regelmässige Verben; sein, haben); Personalpronomen (ich/du/er/sie/es/wir/ihr/sie); Artikel Singular (bestimmt/unbestimmt) im Nominativ und sehr einfacher Akkusativ; Plural (Basis); keine Nebensätze.
- Konnektoren: und, oder, aber.
- Syntax und Stil: Aussagesatz (Verb-zweit), Ja/Nein-Frage (Verb-erst), W-Frage (W-Wort + Verb-zweit); Satzlänge Ø 5-8 Wörter; keine Inversion.
- Wortschatz: sehr hoher Alltagsbezug (Familie, Arbeit, Wohnen, Wege, Zeitwörter heute/jetzt/morgen); Ortsangaben ohne komplexe Präpositionalketten.
- Nicht verwenden: Perfekt, Modalverben, Nebensätze, komplexe Dativ/Genitiv-Strukturen, trennbare Verben.

A1.2
- Grammatik: Präsens + Perfekt (häufige Verben); Modalverben im Präsens (können, müssen, wollen, dürfen, sollen, mögen) mit Infinitiv am Satzende; trennbare Verben (Präsens/Perfekt); einfache Dativ-Phrase mit mit; Kontraktionen im/am/zum/zur.
- Konnektoren: und, oder, aber, denn; Zeitmarker: zuerst, dann, danach, später; am Morgen/Abend; um X Uhr; oft/manchmal/immer/nie.
- Syntax und Stil: Inversion nach Vorfeld möglich (Dann gehe ich ...); Satzlänge Ø 6-12 Wörter.
- Wortschatz: Routinen (Arbeit/Alltag/Spital/ÖV/Einkauf), Grundzahlen/Uhrzeit, einfache Mengen/Preise.
- Nicht verwenden: weil/dass/ob/Relativsätze, Präteritum ausser war/hatte (optional erst A2.1), Passiv, Konjunktiv II.

A2.1
- Grammatik: Nebensatz mit weil (Verb am Ende); Inversion nach Voranstellung; Präteritum nur von sein und haben; Wechselpräpositionen in einfachen Mustern (in + Akk/Dat), keine Ketten.
- Konnektoren: weil, deshalb/deswegen, zuerst, dann, danach, später, also, ausserdem (sparsam).
- Syntax und Stil: Satzlänge Ø 8-14 Wörter; max. 1 Nebensatz pro Satz; klare Chronologie.
- Wortschatz: einfache Vergleichs-/Zweckangaben auf Wortgruppenebene (kein zu-Infinitiv); berufsnahe Termini behutsam.
- Nicht verwenden: dass/ob/wenn-Sätze, Relativsätze, zu-Infinitiv, Komparativ/Superlativ als Struktur, Passiv, Konjunktiv II.

A2.2
- Grammatik: Nebensätze mit dass, wenn (temporal/konditional), ob; Komparativ/Superlativ; trennbar/untrennbar erweitert; Konjunktiv II (Höflichkeit/Wünsche): würde + Inf, könnte, sollte; Präteritum nur von sein und haben.
- Konnektoren: ausserdem, jedoch, trotzdem, während (als Präposition).
- Syntax und Stil: Satzlänge Ø 10-16 Wörter; 1-2 Nebensätze pro Satz; einfache indirekte Rede mit dass.
- Wortschatz: breiter Arbeits-/Gesellschaftskontext, einfache Abstrakta (Regel, Kosten, Termin).
- Nicht verwenden: Passiv, Plusquamperfekt, Konjunktiv II (ausser möchte), komplexe Relativketten, Partizipialattribute.

B1.1
- Grammatik: Relativsatz (der/die/das; Subjekt/Objekt, einfach); zu-Infinitiv und um ... zu; Passiv Präsens (wird + Partizip II) einfach; Plusquamperfekt in linearen Zeitbezügen; obwohl, damit als Nebensätze; erweiterte Objekt-/Präpositionalgruppen.
- Konnektoren: trotzdem, daher/deshalb, allerdings, jedoch, einerseits ... andererseits (einfach).
- Syntax und Stil: Satzlänge Ø 12-18 Wörter; bis 2 Nebensätze, klar strukturiert; indirekte Rede mit dass.
- Wortschatz: moderat abstrakt (Verantwortung, Massnahme), vorsichtige Bewertungssprache.
- Nicht verwenden: Futur I als Pflichtform, Passiv Perfekt, partizipiale Verdichtungen, verschachtelte Relativketten, exzessiver Nominalstil.

B1.2
- Grammatik: Relativsätze mit Präposition (einfach, nur wenn nötig); obwohl, bevor, nachdem, seit/seitdem; Zustandspassiv (sein + Partizip II), Passiv Präsens weiterhin möglich; behutsame Partizip-Attribute (die geöffnete Datei).
- Konnektoren: folglich, somit, hingegen, ausserdem, darüber hinaus (massvoll).
- Syntax und Stil: Satzlänge Ø 12-22 Wörter; Variation der Satzanfänge; klare Informationsgliederung (Thema-Rhema).
- Wortschatz: breitere Abstrakta, einfache Nominalisierungen (die Entscheidung, die Verbesserung), dennoch allgemeinverständlich.
- Nicht verwenden: Passiv Perfekt/Plusquamperfekt, komplexe Partizipialketten, unnötiger Fachjargon.
`;

export const LEVEL_LIMITS: Record<string, { minWords: number; maxWords: number; minParagraphs: number; maxParagraphs: number }> = {
  "A1.1": { minWords: 90, maxWords: 140, minParagraphs: 3, maxParagraphs: 3 },
  "A1.2": { minWords: 130, maxWords: 180, minParagraphs: 3, maxParagraphs: 4 },
  "A2.1": { minWords: 170, maxWords: 240, minParagraphs: 4, maxParagraphs: 4 },
  "A2.2": { minWords: 220, maxWords: 320, minParagraphs: 4, maxParagraphs: 5 },
  "B1.1": { minWords: 300, maxWords: 420, minParagraphs: 5, maxParagraphs: 5 },
  "B1.2": { minWords: 380, maxWords: 520, minParagraphs: 5, maxParagraphs: 6 },
};

export const LEVEL_RULES: Record<string, { allowed: string[]; preferred: string[]; forbidden: string[] }> = {
  "A1.1": {
    allowed: ["Präsens", "Aussagesätze", "Ja/Nein-Fragen", "W-Fragen", "und/oder/aber"],
    preferred: ["5-8 Wörter pro Satz", "hoher Alltagsbezug", "einfache Orts- und Zeitangaben"],
    forbidden: ["Perfekt", "Modalverben", "Nebensätze", "trennbare Verben", "komplexe Dativ- oder Genitivstrukturen"],
  },
  "A1.2": {
    allowed: ["Präsens", "Perfekt", "einfache Modalverben", "trennbare Verben", "einfache Inversion"],
    preferred: ["6-12 Wörter pro Satz", "klare Routineabläufe", "Zeitmarker wie zuerst, dann, später"],
    forbidden: ["weil/dass/ob", "Relativsätze", "Passiv", "Konjunktiv II"],
  },
  "A2.1": {
    allowed: ["weil-Sätze", "Inversion", "Präteritum nur von sein/haben", "einfache Wechselpräpositionen"],
    preferred: ["8-14 Wörter pro Satz", "maximal 1 Nebensatz pro Satz", "klare Chronologie"],
    forbidden: ["dass/ob/wenn-Sätze", "Relativsätze", "zu-Infinitiv", "Passiv", "Konjunktiv II", "Präteritum anderer Verben als sein/haben"],
  },
  "A2.2": {
    allowed: ["dass/wenn/ob", "Komparativ", "einfache indirekte Rede", "würde/könnte/sollte"],
    preferred: ["10-16 Wörter pro Satz", "1-2 Nebensätze pro Satz", "arbeitsnahe Themen"],
    forbidden: ["Passiv", "Plusquamperfekt", "komplexe Relativketten", "Partizipialattribute", "Präteritum anderer Verben als sein/haben"],
  },
  "B1.1": {
    allowed: ["Relativsätze", "zu-Infinitiv", "um ... zu", "Passiv Präsens", "obwohl/damit"],
    preferred: ["12-18 Wörter pro Satz", "klarer Argumentationsaufbau", "vorsichtige Bewertungssprache"],
    forbidden: ["Passiv Perfekt", "partizipiale Verdichtungen", "verschachtelte Relativketten", "exzessiver Nominalstil"],
  },
  "B1.2": {
    allowed: ["Relativsätze mit Präposition", "bevor/nachdem/seitdem", "Zustandspassiv", "behutsame Partizip-Attribute"],
    preferred: ["12-22 Wörter pro Satz", "Variation der Satzanfänge", "klare Informationsgliederung"],
    forbidden: ["Passiv Perfekt", "Passiv Plusquamperfekt", "komplexe Partizipialketten", "unnötiger Fachjargon"],
  },
};

export const FOCUS_MIN_LEVEL: Array<{ keywords: string[]; minLevel: string }> = [
  { keywords: ["perfekt"], minLevel: "A1.2" },
  { keywords: ["modalverben", "modalverb"], minLevel: "A1.2" },
  { keywords: ["weil", "wechselpräposition"], minLevel: "A2.1" },
  { keywords: ["dass", "wenn", "ob", "komparativ", "konjunktiv ii"], minLevel: "A2.2" },
  { keywords: ["relativsatz", "zu-infinitiv", "passiv", "obwohl", "damit"], minLevel: "B1.1" },
  { keywords: ["zustandspassiv", "partizip", "bevor", "nachdem", "seitdem"], minLevel: "B1.2" },
];
