# Generator Form Fields

Reference for all fields in the `/generator` form (dext : gen). Fields marked **required** must be filled to generate a text.

---

## Section: Niveau und Textsorte

### Niveau *(required)*
| | |
|---|---|
| **Type** | Button group (single select) |
| **Values** | `A1.1`, `A1.2`, `A2.1`, `A2.2`, `B1.1`, `B1.2` |
| **Description** | The CEFR sub-level the generated text targets. Controls vocabulary complexity, sentence structure, and enforces word/paragraph count limits. |

**Level details:**

| Niveau | Grammar scope | Word range | Paragraphs |
|---|---|---|---|
| A1.1 | Präsens, very simple sentences | 90–140 | 3 |
| A1.2 | Perfekt, modal verbs | 130–180 | 3–4 |
| A2.1 | weil-clauses, Präteritum of sein/haben/modals | 170–240 | 4 |
| A2.2 | dass/wenn/ob, Komparativ, Konjunktiv II | 220–320 | 4–5 |
| B1.1 | Relativsätze, zu-Infinitiv, Passiv Präsens | 300–420 | 5 |
| B1.2 | More sentence variety, Zustandspassiv, nominalisations | 380–520 | 5–6 |

---

### Textsorte *(required)*
| | |
|---|---|
| **Type** | Dropdown (single select) |
| **Values** | `Sachtext`, `Nachricht`, `Bericht`, `Porträt`, `Interview`, `Kommentar`, `Blog`, `Erzählung`, `Dialog`, `Anleitung`, `Brief / Mail`, `Veranstaltungskalender` |
| **Description** | The genre/text type to generate. Determines default perspective, address form, and tone. |

---

## Section: Inhalt und Kontext

### Thema *(required)*
| | |
|---|---|
| **Type** | Text input |
| **Format** | Free text, e.g. `Arztbesuch`, `Wohnungssuche in der Schweiz` |
| **Description** | The central topic of the text. Should be concise and specific enough to guide the AI clearly. |

---

### Themendetails
| | |
|---|---|
| **Type** | Textarea |
| **Format** | Free text — bullet points, sentences, or keywords |
| **Description** | Additional context, sub-topics, or constraints for the content (e.g. which aspect of the topic to focus on, specific scenarios to include). |

---

### Zielgruppe
| | |
|---|---|
| **Type** | Dropdown (single select) |
| **Values** | `allgemein erwachsen`, `Pflege`, `Bau`, `Gastronomie`, `Integrationskurs`, `Arbeitssuchende`, `Eltern in der Schule` |
| **Description** | The target audience/professional context. Affects vocabulary choices, examples, and situational relevance of the text. |

---

### Setting
| | |
|---|---|
| **Type** | Text input |
| **Format** | Free text, e.g. `Krankenhaus`, `Baustelle`, `Supermarkt` |
| **Description** | The physical or situational setting where the text's events take place. Grounds the scenario for learners. |

---

### Tonalität
| | |
|---|---|
| **Type** | Dropdown (single select) |
| **Values** | `textsortennatürlich`, `sachlich-neutral`, `persönlich-warm`, `jugendlich-locker`, `formell`, `augenzwinkernd`, `kontrovers`, `nüchtern`, `einfühlsam` |
| **Default** | `textsortennatürlich` (lets the genre determine the tone automatically) |
| **Description** | The emotional register and writing style of the text. |

---

### Kulturraum
| | |
|---|---|
| **Type** | Dropdown (single select) |
| **Values** | `CH` (Switzerland), `DE` (Germany), `AT` (Austria), `neutral-DACH` |
| **Description** | Localises vocabulary, idioms, and cultural references (e.g. Kollekte vs. Sammlung, Tram vs. Straßenbahn). Use `neutral-DACH` to avoid strong regional markers. |

---

## Section: Perspektive und Ansprache

### Erzählperspektive
| | |
|---|---|
| **Type** | Dropdown (single select) |
| **Values** | `textsortennatürlich`, `dritte-person`, `ich`, `wir`, `figuren-wechselnd` |
| **Default** | `textsortennatürlich` |
| **Description** | Grammatical person used in the text. `textsortennatürlich` lets the chosen Textsorte decide. |

---

### Leseransprache
| | |
|---|---|
| **Type** | Dropdown (single select) |
| **Values** | `textsortennatürlich`, `keine`, `sie-formell`, `du-vertraut`, `wir-inklusiv` |
| **Default** | `textsortennatürlich` |
| **Description** | How (or whether) the reader is directly addressed. Relevant for instructional texts, letters, and blog posts. |

---

## Section: Didaktik

### Lernschwerpunkt
| | |
|---|---|
| **Type** | Text input |
| **Format** | Free text, e.g. `Perfekt`, `Modalverben`, `Wechselpräpositionen` |
| **Description** | A grammar or vocabulary focus the text should practise. Certain values enforce a minimum Niveau (e.g. `Passiv` requires at least B1.1). |

---

### Pflichtwortschatz
| | |
|---|---|
| **Type** | Text input |
| **Format** | Comma-separated words or phrases, e.g. `der Termin, vereinbaren, die Überweisung` |
| **Description** | Words that **must** appear in the generated text. The QA check reports any that are missing. |

---

### Tabuwortschatz
| | |
|---|---|
| **Type** | Text input |
| **Format** | Comma-separated words or phrases |
| **Description** | Words that **must not** appear. The QA check flags any occurrences. Useful for paraphrase practice or avoiding topic-specific spoilers. |

---

### Personen
| | |
|---|---|
| **Type** | Text input |
| **Format** | Free text, e.g. `Fatima (Pflegerin, 34), Dr. Meier (Arzt)` |
| **Description** | Named characters who should appear in the text, optionally with role or age. Helps create consistent and culturally representative figures. |

---

## Section: Umfang und Ausgabe

### Wortzahl
| | |
|---|---|
| **Type** | Number input |
| **Range** | Determined by Niveau (see table above) |
| **Description** | Target word count. Must stay within the min/max bounds of the selected Niveau. |

---

### Absatzzahl
| | |
|---|---|
| **Type** | Number input |
| **Range** | Determined by Niveau (see table above) |
| **Description** | Number of paragraphs in the body of the text (excluding title and teaser). |

---

### Glossar
| | |
|---|---|
| **Type** | Dropdown (single select) |
| **Values** | `ja`, `nein`, `nur schwierige Wörter` |
| **Description** | Whether to append a vocabulary glossary to the result. `ja` glosses all notable words, `nur schwierige Wörter` limits it to words likely unfamiliar to the target Niveau. |

---

## Model Selection

### Modell
| | |
|---|---|
| **Type** | Dropdown (single select) |
| **Values** | `claude-opus-4-5`, `claude-sonnet-4-5`, `gpt-4.1`, `gpt-4o`, `gpt-4o-mini`, `mistral-large-latest`, `qwen3.5-plus` |
| **Description** | The AI model used for generation. Larger models (Opus, GPT-4.1) produce higher quality at greater cost/latency; smaller models (GPT-4o mini) are faster for iteration. |
