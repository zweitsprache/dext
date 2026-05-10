"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Copy, WandSparkles } from "lucide-react";
import AppSidebar from "@/components/AppSidebar";

const NIVEAUS = ["A1.1", "A1.2", "A2.1", "A2.2", "B1.1", "B1.2"] as const;
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
const HANDOFF_STORAGE_KEY = "dext:presetgen:handoff";

type TextsorteApiEntry = {
  name: string;
  enabled: boolean;
};

type PresetFormValues = {
  niveau: string;
  thema: string;
  textsorte: string;
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
  glossar: "ja" | "nein" | "nur schwierige Wörter";
  kulturraum: string;
};

type PresetGenApiResponse = {
  preset: PresetFormValues;
  warnings: string[];
  privacy: {
    persistedSourceText: false;
    abstractionMode: "medium";
    handoffStorageKey: string;
  };
};

function formatPresetForCopy(preset: PresetFormValues): string {
  return JSON.stringify(preset, null, 2);
}

export default function PresetGenPage() {
  const [sourceText, setSourceText] = useState("");
  const [niveau, setNiveau] = useState<string>("A2.1");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [warnings, setWarnings] = useState<string[]>([]);
  const [preset, setPreset] = useState<PresetFormValues | null>(null);
  const [copied, setCopied] = useState(false);
  const [enabledTextsorten, setEnabledTextsorten] = useState<string[]>(SORTED_TEXTSORTEN);
  const [disabledTextsorten, setDisabledTextsorten] = useState<string[]>(SORTED_DISABLED_TEXTSORTEN);

  const wordCount = useMemo(() => sourceText.trim().split(/\s+/).filter(Boolean).length, [sourceText]);

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
        // Keep static fallbacks when endpoint is unavailable.
      }
    }

    void loadTextsorten();

    return () => {
      isMounted = false;
    };
  }, []);

  async function handleGenerate(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setWarnings([]);
    setPreset(null);

    if (wordCount < 70) {
      setError("Bitte mindestens 70 Wörter als Quelltext eingeben.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/dext/presetgen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceText, niveau }),
      });

      const data = (await response.json()) as PresetGenApiResponse & { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "Preset-Generierung fehlgeschlagen.");
      }

      setPreset(data.preset);
      setWarnings(Array.isArray(data.warnings) ? data.warnings : []);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Preset-Generierung fehlgeschlagen.");
    } finally {
      setLoading(false);
    }
  }

  function handleUseInGenerator() {
    if (!preset) {
      return;
    }

    localStorage.setItem(HANDOFF_STORAGE_KEY, JSON.stringify({ preset, createdAt: new Date().toISOString() }));
    window.location.href = "/generator?presetgen=1";
  }

  async function handleCopy() {
    if (!preset) {
      return;
    }

    await navigator.clipboard.writeText(formatPresetForCopy(preset));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="xl:flex xl:items-start">
        <AppSidebar
          activeHref="/presetgen"
          enabledTextsorten={enabledTextsorten}
          disabledTextsorten={disabledTextsorten}
        />

        <main className="mx-auto w-full max-w-7xl px-6 py-10 lg:px-10">
          <div className="mb-8 flex items-center gap-3">
            <div className="rounded-xl bg-sky-100 p-2 text-sky-700 dark:bg-accent-950 dark:text-accent-200">
              <WandSparkles className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-3xl font-semibold text-zinc-900 dark:text-zinc-100">dext : presetgen</h1>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Reverse-Abstraktion: Aus Quelltext + Niveau ein nicht-rückverfolgbares Generator-Preset.</p>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <section className="radius-section-card border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Eingabe</h2>
              <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                Der Quelltext wird nur für diese Anfrage verarbeitet, nicht gespeichert und nicht im Preset zurückgegeben.
              </p>

              <form className="mt-5 space-y-4" onSubmit={handleGenerate}>
                <div>
                  <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Zielniveau</label>
                  <select
                    value={niveau}
                    onChange={(event) => setNiveau(event.target.value)}
                    className="mt-1 w-full radius-single-line border border-zinc-300 bg-white px-3.5 py-2.5 text-base text-zinc-900 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                  >
                    {NIVEAUS.map((entry) => (
                      <option key={entry} value={entry}>{entry}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Quelltext</label>
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">{wordCount} Wörter</span>
                  </div>
                  <textarea
                    value={sourceText}
                    onChange={(event) => setSourceText(event.target.value)}
                    rows={14}
                    placeholder="Text einfügen, aus dem ein vergleichbares, abstrahiertes Preset abgeleitet werden soll"
                    className="w-full radius-single-line border border-zinc-300 bg-white px-3.5 py-2.5 text-base text-zinc-900 placeholder:text-zinc-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                  />
                </div>

                {error && (
                  <div className="radius-single-line border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
                    {error}
                  </div>
                )}

                {warnings.length > 0 && (
                  <div className="radius-single-line border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
                    {warnings.join(" ")}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="radius-single-line inline-flex items-center justify-center gap-2 bg-sky-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-accent-500 dark:text-zinc-950 dark:hover:bg-accent-400"
                >
                  {loading ? "Preset wird generiert ..." : "Preset generieren"}
                </button>
              </form>
            </section>

            <section className="radius-section-card border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Ausgabe</h2>
              <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                Ausgabe ist absichtlich generalisiert (Abstraktionsmodus: medium), damit das Preset vergleichbare Texte erzeugt ohne den Ursprungstext offenzulegen.
              </p>

              {!preset ? (
                <div className="mt-6 rounded-xl border border-dashed border-zinc-300 px-4 py-8 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
                  Noch kein Preset vorhanden.
                </div>
              ) : (
                <div className="mt-5 space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <PresetItem label="Niveau" value={preset.niveau} />
                    <PresetItem label="Textsorte" value={preset.textsorte} />
                    <PresetItem label="Thema" value={preset.thema} />
                    <PresetItem label="Zielgruppe" value={preset.zielgruppe} />
                    <PresetItem label="Setting" value={preset.setting} />
                    <PresetItem label="Lernschwerpunkt" value={preset.lernschwerpunkt || "-"} />
                    <PresetItem label="Wortzahl" value={preset.wortzahl} />
                    <PresetItem label="Absatzzahl" value={preset.absatzzahl} />
                    <PresetItem label="Glossar" value={preset.glossar} />
                    <PresetItem label="Kulturraum" value={preset.kulturraum} />
                  </div>

                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Themendetails</div>
                    <p className="mt-1 whitespace-pre-wrap rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-700 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-300">
                      {preset.themendetails || "-"}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={handleUseInGenerator}
                      className="radius-single-line inline-flex items-center justify-center bg-zinc-900 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                    >
                      Im Generator verwenden
                    </button>
                    <button
                      type="button"
                      onClick={handleCopy}
                      className="radius-single-line inline-flex items-center justify-center gap-2 border border-zinc-300 bg-white px-3.5 py-2 text-sm font-semibold text-zinc-700 transition hover:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
                    >
                      {copied ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
                      {copied ? "Kopiert" : "Preset kopieren"}
                    </button>
                  </div>
                </div>
              )}
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}

function PresetItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{label}</div>
      <div className="mt-1 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-700 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-300">
        {value || "-"}
      </div>
    </div>
  );
}
