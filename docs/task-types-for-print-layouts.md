# Task Types Spec for Puppeteer Print Layouts

This file describes the exercise/task formats produced by the app, so another tool can generate deterministic print layouts.

## Source of truth
- API endpoint: src/app/api/generate/tasks/route.ts
- UI labels and rendering hints: src/components/GeneratorForm.tsx

## Worksheet JSON contract

```json
{
  "worksheetTitle": "string",
  "tasks": [
    {
      "id": "string",
      "format": "lueckentext|mcq|truefalse|satzpuzzle|textpuzzle|zuordnung|umformung|wfragen|stichwort",
      "instruction": "string",
      "question": "string",
      "options": ["string"],
      "answer": "string or string[]",
      "explanation": "string"
    }
  ]
}
```

## Global constraints
- `worksheetTitle`: usually 2-10 words after normalization.
- `tasks.length`: exactly requested task count.
- `format` distribution: exact per-format allocation requested by caller.
- `instruction` and `question`: always non-empty.
- `answer`: always non-empty (`string` or `string[]`).
- `explanation`: short teacher hint.

## Task formats

### 1) lueckentext
- Meaning: cloze text with visible gaps.
- Required signal in `question`: at least one gap marker `____` or `[...]`.
- `options`: optional (word bank).
- `answer`: string or string[] (accepted solutions).
- Print layout:
  - Render `question` as running text.
  - Replace each gap marker with a line/blank field.
  - If `options.length > 0`, print a word bank block below.

### 2) mcq
- Meaning: multiple choice question.
- `options`: required, usually 3+.
- `answer`: must match one or more values from `options`.
- Print layout:
  - Show `question`.
  - Show options A/B/C/... with circles/checkboxes.
  - Keep option order as provided.

### 3) truefalse
- Meaning: statement classification.
- `question`: the statement to evaluate.
- Canonical answer values: `Richtig`, `Falsch`, `Nicht im Text`, `Unklar`.
- `options`: provided scale labels (can be 2 or more, depending on config).
- `answer`: one canonical label.
- Print layout:
  - Show statement.
  - Render option chips/checkbox row using `options` from payload.

### 4) satzpuzzle
- Meaning: reorder words/chunks into a correct sentence.
- `options`: required scrambled pieces (3+ expected).
- `answer`: correct order text (string or array).
- Print layout:
  - Show instruction and optional prompt from `question`.
  - Print pieces as tiles/tokens.
  - Provide numbered target slots for ordering.

### 5) textpuzzle
- Meaning: reorder larger text parts/paragraphs.
- `options`: required scrambled parts (3+ expected).
- `answer`: correct sequence.
- Print layout:
  - Print each part as a labeled card (A, B, C...).
  - Provide answer line like `Reihenfolge: ____`.

### 6) zuordnung
- Meaning: matching exercise (e.g., term-definition, question-answer).
- `options`: optional/format-dependent.
- `answer`: string or array describing correct matches.
- Print layout:
  - Two-column matching table.
  - Left items and right items with letter/number mapping lines.

### 7) umformung
- Meaning: transformation task (e.g., rewrite sentence form).
- `options`: optional.
- `answer`: expected transformed output.
- Print layout:
  - Show source in `question`.
  - Provide writing lines under each item.

### 8) wfragen
- Meaning: open WH-questions based on source text.
- `options`: usually empty.
- `answer`: expected short answer or key points.
- Print layout:
  - Show question.
  - Provide multi-line answer area.

### 9) stichwort
- Meaning: key-point summary task.
- `options`: usually empty.
- `answer`: expected bullet keywords or concise summary.
- Print layout:
  - Show prompt.
  - Provide bullet lines (e.g., 4-6 lines).

## Label map (UI)
- `lueckentext`: Lückentext
- `mcq`: MCQ
- `truefalse`: Richtig/Falsch
- `satzpuzzle`: Satzpuzzle
- `textpuzzle`: Textpuzzle
- `zuordnung`: Zuordnung
- `umformung`: Umformung
- `wfragen`: W-Fragen
- `stichwort`: Stichwortzusammenfassung

## Print-focused rendering rules
- Always print task number, instruction, and format label.
- Never infer missing options: use payload as-is.
- If `answer` is array, join with comma for solution key.
- If worksheet is generated with separate solutions, create a second page/section:
  - `n. <format label>`
  - `Lösung: <answer>`
  - Optional `Hinweis: <explanation>` if present.

## Suggested page architecture for Puppeteer
- A4 portrait default.
- Header: worksheet title.
- Body per task card:
  - Number + instruction + format tag
  - Question block
  - Format-specific answer UI
- Footer: page number.
- Optional answer key appendix page.
