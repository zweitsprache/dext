"use client";

import { useRouter } from "next/navigation";
import { BrainCircuit } from "lucide-react";
import { useEffect, useState } from "react";
import AppSidebar from "@/components/AppSidebar";

type AnalysisField = {
  value: string;
  reasoning: string;
  fromKnownOptions?: boolean;
};

type AnalysisResult = {
  niveau: AnalysisField;
  thema: AnalysisField;
  textsorte: AnalysisField;
  themendetails: AnalysisField;
  zielgruppe: AnalysisField;
  setting: AnalysisField;
  tonalitaet: AnalysisField;
  erzaehlperspektive: AnalysisField;
  leseransprache: AnalysisField;
  lernschwerpunkt: AnalysisField;
  pflichtwortschatz: AnalysisField;
  tabuwortschatz: AnalysisField;
  personen: AnalysisField;
  wortzahl: AnalysisField;
  absatzzahl: AnalysisField;
  glossar: AnalysisField;
  kulturraum: AnalysisField;
};

type AnalysisResponse = {
  analysis?: AnalysisResult;
  error?: string;
};

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
const PRESETGEN_HANDOFF_KEY = "dext:presetgen:handoff";

const FIELD_LABELS: Array<{ key: keyof AnalysisResult; label: string }> = [
  { key: "niveau", label: "Niveau" },
  { key: "thema", label: "Thema" },
  { key: "textsorte", label: "Textsorte" },
  { key: "themendetails", label: "Themendetails" },
  { key: "zielgruppe", label: "Zielgruppe" },
  { key: "setting", label: "Setting" },
  { key: "tonalitaet", label: "Tonalität" },
  { key: "erzaehlperspektive", label: "Erzählperspektive" },
  { key: "leseransprache", label: "Leseransprache" },
  { key: "lernschwerpunkt", label: "Lernschwerpunkt" },
  { key: "pflichtwortschatz", label: "Pflichtwortschatz" },
  { key: "tabuwortschatz", label: "Tabuwortschatz" },
  { key: "personen", label: "Personen" },
  { key: "wortzahl", label: "Wortzahl" },
  { key: "absatzzahl", label: "Absatzzahl" },
  { key: "glossar", label: "Glossar" },
  { key: "kulturraum", label: "Kulturraum" },
];

export default function AnalysisTool() {
  const router = useRouter();
  const [enabledTextsorten, setEnabledTextsorten] = useState<string[]>(SORTED_TEXTSORTEN);
  const [disabledTextsorten, setDisabledTextsorten] = useState<string[]>(SORTED_DISABLED_TEXTSORTEN);
  const [sourceText, setSourceText] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<AnalysisResult | null>(null);

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

  async function handleAnalyze() {
    const trimmed = sourceText.trim();
    if (!trimmed) {
      setError("Bitte einen Text eingeben.");
      setResult(null);
      return;
    }

    setError("");
    setIsAnalyzing(true);

    try {
      const response = await fetch("/api/analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: trimmed }),
      });

      const data = (await response.json()) as AnalysisResponse;

      if (!response.ok || !data.analysis) {
        setResult(null);
        setError(data.error ?? "Analyse fehlgeschlagen.");
        return;
      }

      setResult(data.analysis);
    } catch {
      setResult(null);
      setError("Analyse fehlgeschlagen.");
    } finally {
      setIsAnalyzing(false);
    }
  }

  function handleUseInGenerator() {
    if (!result) {
      return;
    }

    const availableTextsorten = new Set([...enabledTextsorten, ...disabledTextsorten]);
    const textsorte = availableTextsorten.has(result.textsorte.value) ? result.textsorte.value : "Sachtext";

    const preset = {
      niveau: result.niveau.value || "A2.1",
      thema: result.thema.value,
      textsorte,
      themendetails: result.themendetails.value,
      zielgruppe: result.zielgruppe.value || "allgemein erwachsen",
      setting: result.setting.value,
      tonalitaet: result.tonalitaet.value || "textsortennatürlich",
      erzaehlperspektive: result.erzaehlperspektive.value || "textsortennatürlich",
      leseransprache: result.leseransprache.value || "textsortennatürlich",
      lernschwerpunkt: result.lernschwerpunkt.value,
      pflichtwortschatz: result.pflichtwortschatz.value,
      tabuwortschatz: result.tabuwortschatz.value,
      personen: result.personen.value,
      wortzahl: result.wortzahl.value,
      absatzzahl: result.absatzzahl.value,
      glossar: result.glossar.value || "ja",
      kulturraum: result.kulturraum.value || "CH",
    };

    window.localStorage.setItem(PRESETGEN_HANDOFF_KEY, JSON.stringify({ preset }));
    router.push("/generator?presetgen=1");
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="xl:flex xl:items-start">
        <AppSidebar
          activeHref="/analysis"
          enabledTextsorten={enabledTextsorten}
          disabledTextsorten={disabledTextsorten}
        />

        <div className="flex-1">
          <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
            <section className="radius-section-card border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
              <h2 className="flex items-center gap-2 text-xl font-semibold text-zinc-900 dark:text-zinc-50">
                <BrainCircuit className="h-6 w-6" aria-hidden="true" />
                Textanalyse für Generator-Felder
              </h2>
              <div className="mt-3 flex"><div className="w-40 border-b border-sky-600 dark:border-[#9AA180] section-divider-accent" /><div className="flex-1 border-b border-sky-400 dark:border-zinc-700 section-divider-line" /></div>

              <div className="mt-5 space-y-3">
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Text</label>
                <textarea
                  value={sourceText}
                  onChange={(event) => setSourceText(event.target.value)}
                  rows={12}
                  placeholder="Text einfügen, der analysiert werden soll..."
                  className="w-full radius-single-line border border-zinc-300 bg-white px-3.5 py-3 text-base text-zinc-900 placeholder:text-zinc-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                />
                <button
                  type="button"
                  onClick={handleAnalyze}
                  disabled={isAnalyzing}
                  className="radius-single-line inline-flex items-center justify-center border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:border-zinc-400 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
                >
                  {isAnalyzing ? "Analysiere..." : "Analyze"}
                </button>
                {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
              </div>
            </section>

            {result && (
              <section className="mt-6 radius-section-card border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Analyse-Ergebnis</h3>
                  <button
                    type="button"
                    onClick={handleUseInGenerator}
                    className="radius-single-line inline-flex items-center justify-center border border-sky-500 bg-sky-50 px-4 py-2 text-sm font-medium text-sky-700 transition-colors hover:border-sky-600 dark:border-accent-700 dark:bg-accent-950 dark:text-accent-300"
                  >
                    Im Generator verwenden
                  </button>
                </div>
                <div className="mt-4 overflow-x-auto">
                  <table className="min-w-full border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-zinc-200 text-left dark:border-zinc-700">
                        <th className="px-3 py-2 font-semibold text-zinc-700 dark:text-zinc-200">Feld</th>
                        <th className="px-3 py-2 font-semibold text-zinc-700 dark:text-zinc-200">Wert</th>
                        <th className="px-3 py-2 font-semibold text-zinc-700 dark:text-zinc-200">Analyse</th>
                      </tr>
                    </thead>
                    <tbody>
                      {FIELD_LABELS.map(({ key, label }) => {
                        const item = result[key];
                        return (
                          <tr key={key} className="border-b border-zinc-100 align-top dark:border-zinc-800">
                            <td className="px-3 py-2 text-zinc-700 dark:text-zinc-300">{label}</td>
                            <td className="px-3 py-2 font-medium text-zinc-900 dark:text-zinc-100">{item.value || "-"}</td>
                            <td className="px-3 py-2 text-zinc-600 dark:text-zinc-400">
                              {item.reasoning || "-"}
                              {typeof item.fromKnownOptions === "boolean" && (
                                <span className="ml-2 text-xs text-zinc-500 dark:text-zinc-500">
                                  ({item.fromKnownOptions ? "bekannte Option" : "freie Option"})
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
