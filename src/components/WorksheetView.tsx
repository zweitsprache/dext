"use client";

import { useEffect, useState } from "react";

// ---------------------------------------------------------------------------
// Types (mirrored from GeneratorForm)
// ---------------------------------------------------------------------------
type GlossaryItem = { lemma: string; explanation: string };
type TextResult = {
  title: string;
  teaser: string;
  paragraphs: string[];
  glossary: GlossaryItem[];
};

type ExerciseFormat =
  | "lueckentext"
  | "mcq"
  | "truefalse"
  | "satzpuzzle"
  | "textpuzzle"
  | "zuordnung"
  | "umformung"
  | "wfragen"
  | "stichwort";

type TaskItem = {
  id: string;
  format: ExerciseFormat;
  instruction: string;
  question: string;
  options: string[];
  answer: string | string[];
  explanation: string;
};

type TaskResult = { worksheetTitle: string; tasks: TaskItem[] };
type WorksheetData = { text: TextResult; tasks: TaskResult };

// ---------------------------------------------------------------------------
// Per-task interactive state
// ---------------------------------------------------------------------------
type TaskState =
  | { kind: "lueckentext"; gaps: string[] }
  | { kind: "mcq"; selected: number | null }
  | { kind: "truefalse"; selected: string | null }
  | { kind: "satzpuzzle" | "textpuzzle"; order: number[] }
  | { kind: "open"; value: string };

function initTaskState(task: TaskItem): TaskState {
  switch (task.format) {
    case "lueckentext": {
      const gapCount = (task.question.match(/_{3,}|\[\.\.\.\]/g) ?? []).length;
      return { kind: "lueckentext", gaps: Array(gapCount).fill("") };
    }
    case "mcq":
      return { kind: "mcq", selected: null };
    case "truefalse":
      return { kind: "truefalse", selected: null };
    case "satzpuzzle":
    case "textpuzzle": {
      const pieces = getPieces(task);
      return { kind: "satzpuzzle", order: pieces.map((_, i) => i) };
    }
    default:
      return { kind: "open", value: "" };
  }
}

function getPieces(task: TaskItem): string[] {
  if (task.options.length > 0) return task.options;
  const ans = Array.isArray(task.answer) ? task.answer.join(" ") : task.answer;
  return ans.split(/\s+/).filter(Boolean);
}

// ---------------------------------------------------------------------------
// Interactive task body
// ---------------------------------------------------------------------------
function InteractiveTaskBody({
  task,
  state,
  onChange,
  revealed,
}: {
  task: TaskItem;
  state: TaskState;
  onChange: (s: TaskState) => void;
  revealed: boolean;
}) {
  if (task.format === "lueckentext" && state.kind === "lueckentext") {
    const segments = task.question.split(/(_{3,}|\[\.\.\.\])/g).filter(Boolean);
    let gapIndex = 0;
    return (
      <div className="mt-3 space-y-4">
        <div className="rounded-xl bg-zinc-50 p-4 text-base leading-9 text-zinc-800 dark:bg-zinc-950 dark:text-zinc-200">
          {segments.map((seg, i) => {
            if (/_{3,}|\[\.\.\.\]/.test(seg)) {
              const gi = gapIndex++;
              const correct = Array.isArray(task.answer)
                ? task.answer[gi] ?? ""
                : task.answer.split(/[,;]\s*/)[gi] ?? "";
              const val = state.gaps[gi] ?? "";
              const isCorrect = val.trim().toLowerCase() === correct.trim().toLowerCase();
              return (
                <input
                  key={`gap-${i}`}
                  type="text"
                  value={val}
                  onChange={(e) => {
                    const gaps = [...state.gaps];
                    gaps[gi] = e.target.value;
                    onChange({ ...state, gaps });
                  }}
                  className={`mx-1 inline-block w-28 border-b-2 bg-transparent px-1 text-center outline-none transition-colors ${
                    revealed
                      ? isCorrect
                        ? "border-green-500 text-green-700 dark:text-green-400"
                        : "border-red-400 text-red-600 dark:text-red-400"
                      : "border-sky-400 focus:border-sky-600 dark:border-sky-600 dark:focus:border-sky-400"
                  }`}
                  aria-label={`Lücke ${gi + 1}`}
                />
              );
            }
            return <span key={`text-${i}`} className="whitespace-pre-wrap">{seg}</span>;
          })}
        </div>
        {task.options.length > 0 && (
          <div>
            <div className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Wortbank</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {task.options.map((opt, index) => (
                <span
                  key={`${task.id}-wordbank-${index}-${opt}`}
                  className="cursor-pointer select-none rounded-full border border-zinc-300 bg-white px-3 py-1 text-sm text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  {opt}
                </span>
              ))}
            </div>
          </div>
        )}
        {revealed && (
          <div className="rounded-md bg-green-50 p-3 text-sm text-green-800 dark:bg-green-950 dark:text-green-300">
            Lösung: {Array.isArray(task.answer) ? task.answer.join(", ") : task.answer}
          </div>
        )}
      </div>
    );
  }

  if (task.format === "mcq" && state.kind === "mcq") {
    const options = task.options.length > 0 ? task.options : [];
    const correctAnswer = Array.isArray(task.answer) ? task.answer[0] : task.answer;
    return (
      <div className="mt-3 space-y-3">
        <p className="whitespace-pre-wrap text-base text-zinc-700 dark:text-zinc-300">{task.question}</p>
        <ol className="space-y-2">
          {options.map((opt, i) => {
            const isSelected = state.selected === i;
            const isCorrect = opt.trim().toLowerCase() === correctAnswer.trim().toLowerCase();
            let cls =
              "flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2 text-base transition-colors select-none";
            if (!revealed && isSelected)
              cls += " border-sky-400 bg-sky-50 dark:border-sky-600 dark:bg-sky-950";
            else if (revealed && isCorrect)
              cls += " border-green-400 bg-green-50 dark:border-green-700 dark:bg-green-950";
            else if (revealed && isSelected && !isCorrect)
              cls += " border-red-400 bg-red-50 dark:border-red-700 dark:bg-red-950";
            else cls += " border-zinc-200 dark:border-zinc-800";
            return (
              <li key={i} className={cls} onClick={() => !revealed && onChange({ ...state, selected: i })}>
                <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-sm font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                  {String.fromCharCode(65 + i)}
                </span>
                <span>{opt}</span>
              </li>
            );
          })}
        </ol>
      </div>
    );
  }

  if (task.format === "truefalse" && state.kind === "truefalse") {
    const buttons = ["Richtig", "Falsch", "Nicht im Text", "Unklar"];
    const correctAnswer = Array.isArray(task.answer) ? task.answer[0] : task.answer;
    return (
      <div className="mt-3 space-y-3">
        <p className="whitespace-pre-wrap text-base text-zinc-700 dark:text-zinc-300">{task.question}</p>
        <div className="flex flex-wrap gap-2">
          {buttons.map((btn) => {
            const isSelected = state.selected === btn;
            const isCorrect = btn.toLowerCase() === correctAnswer.trim().toLowerCase();
            let cls =
              "cursor-pointer select-none rounded-full border px-4 py-1.5 text-base transition-colors";
            if (!revealed && isSelected)
              cls += " border-sky-400 bg-sky-100 text-sky-800 dark:border-sky-600 dark:bg-sky-900 dark:text-sky-200";
            else if (revealed && isCorrect)
              cls += " border-green-400 bg-green-100 text-green-800 dark:border-green-600 dark:bg-green-900 dark:text-green-200";
            else if (revealed && isSelected && !isCorrect)
              cls += " border-red-400 bg-red-100 text-red-800 dark:border-red-600 dark:bg-red-900 dark:text-red-200";
            else
              cls += " border-zinc-300 text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800";
            return (
              <button
                key={btn}
                type="button"
                className={cls}
                onClick={() => !revealed && onChange({ ...state, selected: btn })}
              >
                {btn}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  if ((task.format === "satzpuzzle" || task.format === "textpuzzle") && state.kind === "satzpuzzle") {
    const pieces = getPieces(task);
    return (
      <div className="mt-3 space-y-4">
        <p className="whitespace-pre-wrap text-sm text-zinc-600 dark:text-zinc-400">{task.question}</p>
        <div>
          <div className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Bausteine</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {state.order.map((pieceIdx, slotIdx) => (
              <span
                key={slotIdx}
                className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-sm font-medium text-sky-800 dark:border-sky-800 dark:bg-sky-950 dark:text-sky-200"
              >
                {slotIdx + 1}. {pieces[pieceIdx]}
              </span>
            ))}
          </div>
        </div>
        {revealed && (
          <div className="rounded-md bg-green-50 p-3 text-sm text-green-800 dark:bg-green-950 dark:text-green-300">
            Lösung: {Array.isArray(task.answer) ? task.answer.join(" ") : task.answer}
          </div>
        )}
      </div>
    );
  }

  // open / wfragen / stichwort / zuordnung / umformung
  if (state.kind === "open") {
    const correctAnswer = Array.isArray(task.answer) ? task.answer.join("\n") : task.answer;
    return (
      <div className="mt-3 space-y-3">
        <p className="whitespace-pre-wrap text-base text-zinc-700 dark:text-zinc-300">{task.question}</p>
        <textarea
          rows={3}
          value={state.value}
          onChange={(e) => onChange({ ...state, value: e.target.value })}
          placeholder="Deine Antwort…"
          className="w-full rounded-lg border border-zinc-300 bg-white p-3 text-base text-zinc-800 focus:border-sky-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:focus:border-sky-500"
        />
        {revealed && (
          <div className="rounded-md bg-green-50 p-3 text-sm text-green-800 dark:bg-green-950 dark:text-green-300">
            Lösung: {correctAnswer}
          </div>
        )}
      </div>
    );
  }

  return null;
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export default function WorksheetView() {
  const [data, setData] = useState<WorksheetData | null>(null);
  const [taskStates, setTaskStates] = useState<TaskState[]>([]);
  const [revealed, setRevealed] = useState<boolean[]>([]);
  const [allRevealed, setAllRevealed] = useState(false);
  const [score, setScore] = useState<{ correct: number; total: number } | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("dext:worksheet");
      if (!raw) return;
      const parsed = JSON.parse(raw) as WorksheetData;
      setData(parsed);
      const states = parsed.tasks.tasks.map(initTaskState);
      setTaskStates(states);
      setRevealed(Array(parsed.tasks.tasks.length).fill(false));
    } catch {
      // ignore
    }
  }, []);

  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center text-base text-zinc-500 dark:text-zinc-400">
        Kein Arbeitsblatt geladen. Generiere zuerst Text und Aufgaben im{" "}
        <a href="/generator" className="ml-1 text-sky-600 hover:underline dark:text-sky-400">
          Generator
        </a>
        .
      </div>
    );
  }

  const { text, tasks } = data;

  function updateTask(index: number, state: TaskState) {
    setTaskStates((prev) => {
      const next = [...prev];
      next[index] = state;
      return next;
    });
  }

  function revealOne(index: number) {
    setRevealed((prev) => {
      const next = [...prev];
      next[index] = true;
      return next;
    });
  }

  function revealAll() {
    setRevealed(Array(tasks.tasks.length).fill(true));
    setAllRevealed(true);
  }

  function checkAll() {
    // Rough scoring: count tasks where user gave some correct signal
    let correct = 0;
    tasks.tasks.forEach((task, i) => {
      const state = taskStates[i];
      const ans = Array.isArray(task.answer) ? task.answer[0] : task.answer;
      if (!state) return;
      if (state.kind === "mcq" && state.selected !== null) {
        const opt = task.options[state.selected] ?? "";
        if (opt.trim().toLowerCase() === ans.trim().toLowerCase()) correct++;
      } else if (state.kind === "truefalse" && state.selected !== null) {
        if (state.selected.toLowerCase() === ans.trim().toLowerCase()) correct++;
      } else if (state.kind === "lueckentext") {
        const answers = Array.isArray(task.answer)
          ? task.answer
          : task.answer.split(/[,;]\s*/);
        const allCorrect = state.gaps.every(
          (g, gi) => g.trim().toLowerCase() === (answers[gi] ?? "").trim().toLowerCase()
        );
        if (allCorrect) correct++;
      }
    });
    setScore({ correct, total: tasks.tasks.length });
    revealAll();
  }

  function reset() {
    if (!data) return;
    setTaskStates(data.tasks.tasks.map(initTaskState));
    setRevealed(Array(data.tasks.tasks.length).fill(false));
    setAllRevealed(false);
    setScore(null);
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Header bar */}
      <header className="sticky top-0 z-20 border-b border-zinc-200 bg-white/90 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/90">
        <div className="mx-auto flex max-w-screen-2xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-3">
            <a
              href="/generator"
              className="text-sm text-zinc-500 transition-colors hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
            >
              ← Generator
            </a>
            <span className="hidden text-base font-semibold text-zinc-900 dark:text-zinc-50 sm:block">
              {tasks.worksheetTitle}
            </span>
          </div>
          <div className="flex items-center gap-3">
            {score && (
              <span className="text-sm font-semibold text-sky-700 dark:text-sky-400">
                {score.correct} / {score.total} richtig
              </span>
            )}
            <button
              type="button"
              onClick={checkAll}
              className="rounded-full bg-sky-600 px-4 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-sky-700"
            >
              Auswerten
            </button>
            <button
              type="button"
              onClick={reset}
              className="rounded-full border border-zinc-300 px-4 py-1.5 text-sm text-zinc-600 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Neu starten
            </button>
          </div>
        </div>
      </header>

      {/* Two-column layout */}
      <div className="mx-auto max-w-screen-2xl">
        <div className="flex flex-col lg:flex-row lg:min-h-[calc(100vh-57px)]">

          {/* LEFT / TOP: Text — sticky on desktop */}
          <div className="border-b border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900 lg:w-1/2 lg:overflow-y-auto lg:border-b-0 lg:border-r lg:sticky lg:top-[57px] lg:max-h-[calc(100vh-57px)]">
            <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">{text.title}</h1>
            <p className="mt-2 text-base italic text-zinc-600 dark:text-zinc-300">{text.teaser}</p>
            <div className="prose prose-zinc mt-6 max-w-none text-base dark:prose-invert">
              {text.paragraphs.map((para, i) => (
                <p key={i}>{para}</p>
              ))}
            </div>
            {text.glossary.length > 0 && (
              <div className="mt-6 border-t border-zinc-200 pt-4 dark:border-zinc-700">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  Glossar
                </h3>
                <dl className="mt-3 space-y-2 text-sm text-zinc-700 dark:text-zinc-300">
                  {text.glossary.map((item, index) => (
                    <div key={`${item.lemma}-${index}`} className="flex gap-2">
                      <dt className="min-w-28 font-semibold text-zinc-900 dark:text-zinc-50">{item.lemma}</dt>
                      <dd>{item.explanation}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}
          </div>

          {/* RIGHT / BOTTOM: Exercises */}
          <div className="flex-1 space-y-4 p-6 lg:overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                Aufgaben <span className="ml-1 text-base font-normal text-zinc-500 dark:text-zinc-400">({tasks.tasks.length})</span>
              </h2>
              {!allRevealed && (
                <button
                  type="button"
                  onClick={revealAll}
                  className="text-sm text-zinc-400 hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-zinc-300"
                >
                  Alle Lösungen anzeigen
                </button>
              )}
            </div>

            {tasks.tasks.map((task, index) => (
              <div
                key={task.id}
                className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-sm font-bold text-zinc-400 dark:text-zinc-500">{index + 1}</span>
                    <span className="ml-2 text-base font-semibold text-zinc-900 dark:text-zinc-50">
                      {task.instruction}
                    </span>
                  </div>
                  {!revealed[index] && (
                    <button
                      type="button"
                      onClick={() => revealOne(index)}
                      className="shrink-0 text-xs text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300"
                    >
                      Lösung
                    </button>
                  )}
                </div>

                <InteractiveTaskBody
                  task={task}
                  state={taskStates[index] ?? initTaskState(task)}
                  onChange={(s) => updateTask(index, s)}
                  revealed={revealed[index] ?? false}
                />

                {task.explanation && revealed[index] && (
                  <p className="mt-3 text-sm italic text-zinc-500 dark:text-zinc-400">{task.explanation}</p>
                )}
              </div>
            ))}

            {/* Bottom action row */}
            <div className="flex flex-wrap gap-3 pb-6">
              <button
                type="button"
                onClick={checkAll}
                className="rounded-full bg-sky-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-sky-700"
              >
                Auswerten
              </button>
              <button
                type="button"
                onClick={reset}
                className="rounded-full border border-zinc-300 px-5 py-2 text-sm text-zinc-600 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                Neu starten
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
