"use client";

import { useState } from "react";
import { GER_LEVEL_ORDER, LEVEL_PROMPT_BLOCKS, type GerLevel, type GerLevelPromptSettings } from "@/lib/ger-level-specs";

type Props = {
  initialSettings: GerLevelPromptSettings;
  persistenceEnabled: boolean;
};

type AiLevelStatus = "idle" | "pending" | "error";

export default function GerSettingsEditor({ initialSettings, persistenceEnabled }: Props) {
  const [settings, setSettings] = useState<GerLevelPromptSettings>(initialSettings);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState("");

  const [aiPrompts, setAiPrompts] = useState<Record<GerLevel, string>>(
    () => Object.fromEntries(GER_LEVEL_ORDER.map((l) => [l, ""])) as Record<GerLevel, string>
  );
  const [aiStatus, setAiStatus] = useState<Record<GerLevel, AiLevelStatus>>(
    () => Object.fromEntries(GER_LEVEL_ORDER.map((l) => [l, "idle"])) as Record<GerLevel, AiLevelStatus>
  );
  const [aiErrors, setAiErrors] = useState<Record<GerLevel, string>>(
    () => Object.fromEntries(GER_LEVEL_ORDER.map((l) => [l, ""])) as Record<GerLevel, string>
  );

  function updateLevel(level: GerLevel, value: string) {
    setSettings((current) => ({
      ...current,
      [level]: value,
    }));
    setStatus("idle");
    setError("");
  }

  function resetLevel(level: GerLevel) {
    updateLevel(level, LEVEL_PROMPT_BLOCKS[level]);
  }

  async function handleAiEdit(level: GerLevel) {
    const instruction = aiPrompts[level].trim();
    if (!instruction) return;

    setAiStatus((prev) => ({ ...prev, [level]: "pending" }));
    setAiErrors((prev) => ({ ...prev, [level]: "" }));

    try {
      const response = await fetch("/api/system/ger-settings/ai-edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ level, currentContent: settings[level], instruction }),
      });

      const payload = await response.json() as { updatedContent?: string; error?: string };
      if (!response.ok || !payload.updatedContent) {
        throw new Error(payload.error || "KI-Bearbeitung fehlgeschlagen.");
      }

      updateLevel(level, payload.updatedContent);
      setAiPrompts((prev) => ({ ...prev, [level]: "" }));
      setAiStatus((prev) => ({ ...prev, [level]: "idle" }));
    } catch (aiError) {
      setAiStatus((prev) => ({ ...prev, [level]: "error" }));
      setAiErrors((prev) => ({
        ...prev,
        [level]: aiError instanceof Error ? aiError.message : "KI-Bearbeitung fehlgeschlagen.",
      }));
    }
  }

  async function handleSave() {
    setStatus("saving");
    setError("");

    try {
      const response = await fetch("/api/system/ger-settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ settings }),
      });

      const payload = await response.json() as { error?: string; settings?: GerLevelPromptSettings };
      if (!response.ok || !payload.settings) {
        throw new Error(payload.error || "Speichern fehlgeschlagen.");
      }

      setSettings(payload.settings);
      setStatus("saved");
    } catch (saveError) {
      setStatus("error");
      setError(saveError instanceof Error ? saveError.message : "Speichern fehlgeschlagen.");
    }
  }

  return (
    <>
      <section className="radius-section-card border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Prompt-Blöcke pro Niveau</h2>
            <p className="mt-2 max-w-3xl text-sm text-zinc-500 dark:text-zinc-400">
              Jeder Block wird direkt in die Niveau-Merkmal-Liste des System-Prompts übernommen. Änderungen wirken bei der nächsten Generierung.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-xs ${persistenceEnabled ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-accent-400"}`}>
              {persistenceEnabled ? "Persistenz aktiv" : "Nur Standardwerte verfügbar"}
            </span>
            <button
              type="button"
              onClick={handleSave}
              disabled={!persistenceEnabled || status === "saving"}
              className="radius-single-line bg-sky-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-sky-300 dark:disabled:bg-accent-900"
            >
              {status === "saving" ? "Speichere..." : "Änderungen speichern"}
            </button>
          </div>
        </div>

        {!persistenceEnabled && (
          <div className="mt-4 radius-card border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-accent-800 dark:bg-accent-950 dark:text-accent-200">
            Ohne DATABASE_URL können die GER-Settings nicht gespeichert werden. Der Generator verwendet dann weiterhin die Standardwerte.
          </div>
        )}
        {status === "saved" && (
          <div className="mt-4 radius-card border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
            GER-Settings gespeichert.
          </div>
        )}
        {status === "error" && error && (
          <div className="mt-4 radius-card border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
            {error}
          </div>
        )}

        <div className="mt-6 grid gap-4 xl:grid-cols-2">
          {GER_LEVEL_ORDER.map((level) => (
            <article key={level} className="radius-card border border-zinc-300 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">{level}</h3>
                <button
                  type="button"
                  onClick={() => resetLevel(level)}
                  className="text-xs font-medium text-zinc-500 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                >
                  Standard laden
                </button>
              </div>
              <textarea
                value={settings[level]}
                onChange={(event) => updateLevel(level, event.target.value)}
                rows={10}
                spellCheck={false}
                className="min-h-[15rem] w-full radius-single-line border border-zinc-300 bg-zinc-50 px-3 py-3 text-sm leading-6 text-zinc-900 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-sky-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
              />
              <div className="mt-3 flex gap-2">
                <input
                  type="text"
                  value={aiPrompts[level]}
                  onChange={(e) => setAiPrompts((prev) => ({ ...prev, [level]: e.target.value }))}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void handleAiEdit(level); } }}
                  placeholder='KI-Anweisung, z.B. "Füge Regel zu Perfekt hinzu"'
                  disabled={aiStatus[level] === "pending"}
                  className="min-w-0 flex-1 radius-single-line border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-sky-500 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                />
                <button
                  type="button"
                  onClick={() => void handleAiEdit(level)}
                  disabled={aiStatus[level] === "pending" || !aiPrompts[level].trim()}
                  className="shrink-0 radius-single-line bg-sky-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-sky-300 dark:disabled:bg-accent-900"
                >
                  {aiStatus[level] === "pending" ? "…" : "Anwenden"}
                </button>
              </div>
              {aiStatus[level] === "error" && aiErrors[level] && (
                <p className="mt-2 text-xs text-red-600 dark:text-red-400">{aiErrors[level]}</p>
              )}
            </article>
          ))}
        </div>
      </section>
    </>
  );
}