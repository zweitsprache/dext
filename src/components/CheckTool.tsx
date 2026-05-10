"use client";

import { ChangeEvent, DragEvent, useEffect, useState } from "react";
import { Check, Upload } from "lucide-react";
import AppSidebar from "@/components/AppSidebar";

type TextsorteApiEntry = {
  name: string;
  enabled: boolean;
};

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
const TELC_LEVELS = ["TELC A1", "TELC A2", "TELC B1"] as const;

type CheckResult = {
  score: number;
  levelEstimate: string;
  verdict: string;
  strengths: string[];
  issues: string[];
  feedback: string;
};

function scoreDecodedText(value: string): number {
  if (!value) {
    return Number.POSITIVE_INFINITY;
  }

  const replacementCount = (value.match(/\uFFFD/g) ?? []).length;
  const controlCount = (value.match(/[\x00-\x08\x0E-\x1F\x7F]/g) ?? []).length;
  const length = value.length;

  return (replacementCount * 8 + controlCount * 4) / Math.max(1, length);
}

function decodeTextFromBuffer(buffer: ArrayBuffer): string {
  const encodings = ["utf-8", "utf-16le", "windows-1252", "iso-8859-1"];
  const candidates: string[] = [];

  for (const encoding of encodings) {
    try {
      const decoded = new TextDecoder(encoding).decode(buffer);
      candidates.push(decoded);
    } catch {
      // Ignore unsupported encodings and continue.
    }
  }

  if (candidates.length === 0) {
    return "";
  }

  return candidates.sort((a, b) => scoreDecodedText(a) - scoreDecodedText(b))[0].replace(/^\uFEFF/, "");
}

export default function CheckTool() {
  const [enabledTextsorten, setEnabledTextsorten] = useState<string[]>(SORTED_TEXTSORTEN);
  const [disabledTextsorten, setDisabledTextsorten] = useState<string[]>(SORTED_DISABLED_TEXTSORTEN);

  const [telcLevel, setTelcLevel] = useState<(typeof TELC_LEVELS)[number]>("TELC B1");
  const [taskText, setTaskText] = useState("");
  const [candidateSolution, setCandidateSolution] = useState("");
  const [checkNotes, setCheckNotes] = useState("");
  const [uploadedFileName, setUploadedFileName] = useState("");
  const [isDragActive, setIsDragActive] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [isCorrecting, setIsCorrecting] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<CheckResult | null>(null);

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
        // Keep static fallback if endpoint is unavailable.
      }
    }

    void loadTextsorten();

    return () => {
      isMounted = false;
    };
  }, []);

  async function readDroppedFile(file: File) {
    const fileName = file.name.toLowerCase();
    if (fileName.endsWith(".pdf") || /\.(jpg|jpeg|png|webp)$/.test(fileName) || file.type === "application/pdf" || file.type.startsWith("image/")) {
      try {
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch("/api/check/extract-task", {
          method: "POST",
          body: formData,
        });

        const data = (await response.json()) as { text?: string; error?: string };
        if (!response.ok || !data.text) {
          setUploadError(data.error ?? "Datei konnte nicht gelesen werden.");
          return;
        }

        setUploadError("");
        setError("");
        setResult(null);
        setTaskText(data.text);
        setUploadedFileName(file.name);
      } catch {
        setUploadError("Datei konnte nicht gelesen werden.");
      }

      return;
    }

    const buffer = await file.arrayBuffer();
    const decodedText = decodeTextFromBuffer(buffer).trim();

    if (!decodedText) {
      setUploadError("Datei konnte nicht als lesbarer Text verarbeitet werden.");
      return;
    }

    setUploadError("");
    setError("");
    setResult(null);
    setTaskText(decodedText);
    setUploadedFileName(file.name);
  }

  async function handleFileInput(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    await readDroppedFile(file);
  }

  async function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setIsDragActive(false);

    const file = event.dataTransfer.files?.[0];
    if (!file) {
      return;
    }
    await readDroppedFile(file);
  }

  async function handleCorrect() {
    const trimmedTask = taskText.trim();
    const trimmedCandidate = candidateSolution.trim();

    if (!trimmedTask) {
      setError("Bitte zuerst eine Aufgaben-Datei hochladen.");
      setResult(null);
      return;
    }

    if (!trimmedCandidate) {
      setError("Bitte Kandidatenlösung einfügen.");
      setResult(null);
      return;
    }

    setError("");
    setIsCorrecting(true);

    try {
      const response = await fetch("/api/check/correct", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          telcLevel,
          taskText: trimmedTask,
          candidateSolution: trimmedCandidate,
          checkNotes: checkNotes.trim(),
        }),
      });

      const data = (await response.json()) as { result?: CheckResult; error?: string };

      if (!response.ok || !data.result) {
        setResult(null);
        setError(data.error ?? "Korrektur fehlgeschlagen.");
        return;
      }

      setResult(data.result);
    } catch {
      setResult(null);
      setError("Korrektur fehlgeschlagen.");
    } finally {
      setIsCorrecting(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="xl:flex xl:items-start">
        <AppSidebar
          activeHref="/check"
          enabledTextsorten={enabledTextsorten}
          disabledTextsorten={disabledTextsorten}
        />

        <div className="flex-1">
          <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
            <section className="radius-section-card border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
              <h2 className="flex items-center gap-2 text-xl font-semibold text-zinc-900 dark:text-zinc-50">
                <Check className="h-6 w-6" aria-hidden="true" />
                dext : check
              </h2>
              <div className="mt-3 flex"><div className="w-40 border-b border-sky-600 dark:border-[#9AA180] section-divider-accent" /><div className="flex-1 border-b border-sky-400 dark:border-zinc-700 section-divider-line" /></div>

              <div className="mt-6 grid gap-5 lg:grid-cols-2">
                <div>
                  <label htmlFor="check-level" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">TELC Niveau</label>
                  <select
                    id="check-level"
                    value={telcLevel}
                    onChange={(event) => setTelcLevel(event.target.value as (typeof TELC_LEVELS)[number])}
                    className="mt-2 w-full radius-single-line border border-zinc-300 bg-white px-3.5 py-2.5 text-base text-zinc-900 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                  >
                    {TELC_LEVELS.map((level) => (
                      <option key={level} value={level}>{level}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <span className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Datei hochladen</span>
                  <label
                    onDragOver={(event) => {
                      event.preventDefault();
                      setIsDragActive(true);
                    }}
                    onDragEnter={(event) => {
                      event.preventDefault();
                      setIsDragActive(true);
                    }}
                    onDragLeave={() => setIsDragActive(false)}
                    onDrop={handleDrop}
                    className={`mt-2 flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-6 text-sm transition-colors ${
                      isDragActive
                        ? "border-sky-500 bg-sky-50 text-sky-700 dark:border-accent-500 dark:bg-accent-950 dark:text-accent-300"
                        : "border-zinc-300 text-zinc-600 hover:border-zinc-400 dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-zinc-500"
                    }`}
                  >
                    <Upload className="h-4 w-4" aria-hidden="true" />
                    Drag and drop file here or click to upload
                    <input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,.txt,.md,.csv,.json" className="hidden" onChange={handleFileInput} />
                  </label>
                  {uploadedFileName && (
                    <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">Geladen: {uploadedFileName}</p>
                  )}
                  {uploadError && (
                    <p className="mt-2 text-xs text-red-600 dark:text-red-400">{uploadError}</p>
                  )}
                </div>
              </div>

              <div className="mt-5 grid gap-5">
                <div>
                  <label htmlFor="check-task-text" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Task (aus Upload)</label>
                  <textarea
                    id="check-task-text"
                    value={taskText}
                    onChange={(event) => setTaskText(event.target.value)}
                    rows={12}
                    placeholder="Task erscheint hier nach Upload..."
                    className="mt-2 w-full radius-single-line border border-zinc-300 bg-white px-3.5 py-3 text-base text-zinc-900 placeholder:text-zinc-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                  />
                </div>

                <div>
                  <label htmlFor="check-candidate-solution" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Candidate Solution (Paste)</label>
                  <textarea
                    id="check-candidate-solution"
                    value={candidateSolution}
                    onChange={(event) => setCandidateSolution(event.target.value)}
                    rows={10}
                    placeholder="Lösungstext hier einfügen..."
                    className="mt-2 w-full radius-single-line border border-zinc-300 bg-white px-3.5 py-3 text-base text-zinc-900 placeholder:text-zinc-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                  />
                </div>

                <div>
                  <label htmlFor="check-notes" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Prüfhinweise / Fokus</label>
                  <textarea
                    id="check-notes"
                    value={checkNotes}
                    onChange={(event) => setCheckNotes(event.target.value)}
                    rows={5}
                    placeholder="z.B. Fokus auf Wortschatz, Grammatik oder Register"
                    className="mt-2 w-full radius-single-line border border-zinc-300 bg-white px-3.5 py-3 text-base text-zinc-900 placeholder:text-zinc-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                  />
                </div>
              </div>

              <div className="mt-5 flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleCorrect}
                  disabled={isCorrecting}
                  className="radius-single-line inline-flex items-center justify-center border border-sky-500 bg-sky-50 px-4 py-2 text-sm font-medium text-sky-700 transition-colors hover:border-sky-600 disabled:cursor-not-allowed disabled:opacity-60 dark:border-accent-700 dark:bg-accent-950 dark:text-accent-300"
                >
                  {isCorrecting ? "Correcting..." : "Correct"}
                </button>
                {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
              </div>

              <div className="mt-6 rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm dark:border-zinc-700 dark:bg-zinc-800/60">
                <div className="font-medium text-zinc-800 dark:text-zinc-200">Check-Konfiguration</div>
                <div className="mt-2 text-zinc-600 dark:text-zinc-300">Niveau: {telcLevel}</div>
                <div className="text-zinc-600 dark:text-zinc-300">Task-Länge: {taskText.trim().length} Zeichen</div>
                <div className="text-zinc-600 dark:text-zinc-300">Kandidatenlösung: {candidateSolution.trim().length} Zeichen</div>
              </div>

              {result && (
                <div className="mt-6 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
                  <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Korrektur-Ergebnis</h3>
                  <div className="mt-3 text-sm text-zinc-700 dark:text-zinc-300">Score: {result.score}/100</div>
                  <div className="text-sm text-zinc-700 dark:text-zinc-300">Niveau-Einschätzung: {result.levelEstimate}</div>
                  <div className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">{result.verdict}</div>
                  <div className="mt-3 text-sm font-medium text-zinc-800 dark:text-zinc-200">Stärken</div>
                  <ul className="mt-1 list-disc pl-5 text-sm text-zinc-700 dark:text-zinc-300">
                    {result.strengths.map((item, index) => (
                      <li key={`check-strength-${index}`}>{item}</li>
                    ))}
                  </ul>
                  <div className="mt-3 text-sm font-medium text-zinc-800 dark:text-zinc-200">Verbesserungspunkte</div>
                  <ul className="mt-1 list-disc pl-5 text-sm text-zinc-700 dark:text-zinc-300">
                    {result.issues.map((item, index) => (
                      <li key={`check-issue-${index}`}>{item}</li>
                    ))}
                  </ul>
                  <div className="mt-3 text-sm font-medium text-zinc-800 dark:text-zinc-200">Feedback</div>
                  <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">{result.feedback}</p>
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
