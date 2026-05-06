"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Check, Copy, FileCode } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
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

type TextsorteApiEntry = {
  name: string;
  enabled: boolean;
};

const TEXT_LIBRARY_PER_PAGE = 6;

type LibraryText = {
  id: string;
  title: string;
  summary: string;
  linguisticSummary?: string;
  teaser: string;
  paragraphs: string[];
  glossary: Array<{ lemma: string; explanation: string }>;
  niveau: string;
  textsorte: string;
  zielgruppe: string;
  tags: string[];
  updatedAt: string;
};

type LibraryApiResponse = {
  texts?: LibraryText[];
};

const DUMMY_TEXT_LIBRARY: LibraryText[] = [
  {
    id: "lib-b1-arbeitsvertrag",
    title: "Arbeitsvertrag verstehen",
    summary: "Sachtext zu Probezeit, Kündigungsfrist und zentralen Klauseln im Joballtag.",
    teaser: "Sachtext zu Probezeit, Kündigungsfrist und zentralen Klauseln im Joballtag.",
    paragraphs: [],
    glossary: [],
    niveau: "B1.1",
    textsorte: "Sachtext",
    zielgruppe: "Arbeitssuchende",
    tags: ["Arbeit", "Vertrag", "Rechte"],
    updatedAt: "2026-05-03",
  },
  {
    id: "lib-a2-wohnung-bericht",
    title: "Wohnungsbesichtigung in Basel",
    summary: "Bericht über eine Besichtigung mit Fokus auf Fragen an die Vermietung.",
    teaser: "Bericht über eine Besichtigung mit Fokus auf Fragen an die Vermietung.",
    paragraphs: [],
    glossary: [],
    niveau: "A2.1",
    textsorte: "Bericht",
    zielgruppe: "allgemein erwachsen",
    tags: ["Wohnen", "Termin", "Fragen"],
    updatedAt: "2026-04-28",
  },
  {
    id: "lib-a1-spitalkantine",
    title: "Mittagspause in der Spitalkantine",
    summary: "Kurzer Dialog mit einfachen Bestellungen und höflichen Rückfragen.",
    teaser: "Kurzer Dialog mit einfachen Bestellungen und höflichen Rückfragen.",
    paragraphs: [],
    glossary: [],
    niveau: "A1.2",
    textsorte: "Dialog",
    zielgruppe: "Pflege",
    tags: ["Spital", "Alltag", "Dialog"],
    updatedAt: "2026-04-25",
  },
  {
    id: "lib-b1-elternabend",
    title: "Elternabend in der Primarschule",
    summary: "Nachricht zur Organisation, Rollenverteilung und schulischen Erwartungen.",
    teaser: "Nachricht zur Organisation, Rollenverteilung und schulischen Erwartungen.",
    paragraphs: [],
    glossary: [],
    niveau: "B1.2",
    textsorte: "Nachricht",
    zielgruppe: "Eltern in der Schule",
    tags: ["Schule", "Eltern", "Planung"],
    updatedAt: "2026-05-01",
  },
  {
    id: "lib-a2-bewerbung-mail",
    title: "Bewerbungsanfrage per Mail",
    summary: "Brief/Mail mit klarer Struktur für Erstkontakt bei einer offenen Stelle.",
    teaser: "Brief/Mail mit klarer Struktur für Erstkontakt bei einer offenen Stelle.",
    paragraphs: [],
    glossary: [],
    niveau: "A2.2",
    textsorte: "Brief / Mail",
    zielgruppe: "Arbeitssuchende",
    tags: ["Bewerbung", "Mail", "Formell"],
    updatedAt: "2026-04-19",
  },
  {
    id: "lib-a1-busausfall",
    title: "Bus fällt aus",
    summary: "Einfache Nachricht über eine Verspätung und alternative Verbindungen.",
    teaser: "Einfache Nachricht über eine Verspätung und alternative Verbindungen.",
    paragraphs: [],
    glossary: [],
    niveau: "A1.1",
    textsorte: "Nachricht",
    zielgruppe: "Integrationskurs",
    tags: ["Verkehr", "Zeit", "Info"],
    updatedAt: "2026-03-30",
  },
  {
    id: "lib-b1-betriebsrat",
    title: "Gespräch mit dem Betriebsrat",
    summary: "Interview über Mitsprache, Beschwerden und Lösungswege im Betrieb.",
    teaser: "Interview über Mitsprache, Beschwerden und Lösungswege im Betrieb.",
    paragraphs: [],
    glossary: [],
    niveau: "B1.1",
    textsorte: "Interview",
    zielgruppe: "Bau",
    tags: ["Betrieb", "Rechte", "Interview"],
    updatedAt: "2026-05-04",
  },
  {
    id: "lib-a2-rezept-blog",
    title: "Schnelles Abendessen nach der Arbeit",
    summary: "Blogtext mit Reihenfolge, Zutaten und einfachen Küchenschritten.",
    teaser: "Blogtext mit Reihenfolge, Zutaten und einfachen Küchenschritten.",
    paragraphs: [],
    glossary: [],
    niveau: "A2.1",
    textsorte: "Blog",
    zielgruppe: "Gastronomie",
    tags: ["Kochen", "Ablauf", "Blog"],
    updatedAt: "2026-04-14",
  },
  {
    id: "lib-b1-kommentar-kita",
    title: "Kommentar zu Kita-Öffnungszeiten",
    summary: "Kontroverser Kommentar mit Argumenten aus Sicht berufstätiger Eltern.",
    teaser: "Kontroverser Kommentar mit Argumenten aus Sicht berufstätiger Eltern.",
    paragraphs: [],
    glossary: [],
    niveau: "B1.2",
    textsorte: "Kommentar",
    zielgruppe: "Eltern in der Schule",
    tags: ["Familie", "Kommentar", "Argumente"],
    updatedAt: "2026-04-22",
  },
  {
    id: "lib-a2-portraet-koch",
    title: "Porträt einer Chefköchin",
    summary: "Porträt über Berufsweg, Teamarbeit und Sprachlernen im Restaurant.",
    teaser: "Porträt über Berufsweg, Teamarbeit und Sprachlernen im Restaurant.",
    paragraphs: [],
    glossary: [],
    niveau: "A2.2",
    textsorte: "Porträt",
    zielgruppe: "Gastronomie",
    tags: ["Beruf", "Porträt", "Team"],
    updatedAt: "2026-04-09",
  },
  {
    id: "lib-a1-anleitung-anmeldung",
    title: "Anmeldung beim Deutschkurs",
    summary: "Anleitung mit Schritt-für-Schritt-Ablauf für Kursanmeldung und Unterlagen.",
    teaser: "Anleitung mit Schritt-für-Schritt-Ablauf für Kursanmeldung und Unterlagen.",
    paragraphs: [],
    glossary: [],
    niveau: "A1.2",
    textsorte: "Anleitung",
    zielgruppe: "Integrationskurs",
    tags: ["Anmeldung", "Dokumente", "Kurs"],
    updatedAt: "2026-03-18",
  },
  {
    id: "lib-a1-erzaehlung-feierabend",
    title: "Feierabend im neuen Quartier",
    summary: "Einfache Erzählung über Wege, Begegnungen und kleine Routinen am Abend.",
    teaser: "Einfache Erzählung über Wege, Begegnungen und kleine Routinen am Abend.",
    paragraphs: [],
    glossary: [],
    niveau: "A1.1",
    textsorte: "Erzählung",
    zielgruppe: "allgemein erwachsen",
    tags: ["Quartier", "Routine", "Erzählung"],
    updatedAt: "2026-03-11",
  },
];

export default function LibraryPage() {
  const searchParams = useSearchParams();
  const [librarySearch, setLibrarySearch] = useState("");
  const [libraryLevelFilter, setLibraryLevelFilter] = useState<string>("alle");
  const [libraryTypeFilter, setLibraryTypeFilter] = useState<string>("alle");
  const [libraryPage, setLibraryPage] = useState(1);
  const [libraryTexts, setLibraryTexts] = useState<LibraryText[]>(DUMMY_TEXT_LIBRARY);
  const [activeText, setActiveText] = useState<LibraryText | null>(null);
  const [copied, setCopied] = useState(false);
  const [enabledTextsorten, setEnabledTextsorten] = useState<string[]>(SORTED_TEXTSORTEN);
  const [disabledTextsorten, setDisabledTextsorten] = useState<string[]>(SORTED_DISABLED_TEXTSORTEN);

  const queryTextsorte = searchParams.get("textsorte");
  const prefixedTypeFilter = queryTextsorte && enabledTextsorten.includes(queryTextsorte) ? queryTextsorte : "alle";

  const filteredLibraryTexts = useMemo(() => {
    const query = librarySearch.trim().toLowerCase();

    return libraryTexts.filter((text) => {
      const levelMatch = libraryLevelFilter === "alle" || text.niveau === libraryLevelFilter;
      const typeMatch = libraryTypeFilter === "alle" || text.textsorte === libraryTypeFilter;
      const searchMatch =
        !query ||
        text.title.toLowerCase().includes(query) ||
        text.summary.toLowerCase().includes(query) ||
        text.zielgruppe.toLowerCase().includes(query) ||
        text.tags.some((tag) => tag.toLowerCase().includes(query));

      return levelMatch && typeMatch && searchMatch;
    });
  }, [librarySearch, libraryLevelFilter, libraryTypeFilter, libraryTexts]);

  const totalLibraryPages = Math.max(1, Math.ceil(filteredLibraryTexts.length / TEXT_LIBRARY_PER_PAGE));
  const clampedLibraryPage = Math.min(libraryPage, totalLibraryPages);
  const pagedLibraryTexts = useMemo(() => {
    const start = (clampedLibraryPage - 1) * TEXT_LIBRARY_PER_PAGE;
    return filteredLibraryTexts.slice(start, start + TEXT_LIBRARY_PER_PAGE);
  }, [filteredLibraryTexts, clampedLibraryPage]);

  useEffect(() => {
    setLibraryPage(1);
  }, [librarySearch, libraryLevelFilter, libraryTypeFilter]);

  useEffect(() => {
    setLibraryTypeFilter(prefixedTypeFilter);
  }, [prefixedTypeFilter]);

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
    let isMounted = true;

    async function loadLibraryTexts() {
      try {
        const response = await fetch("/api/library");
        if (!response.ok) {
          return;
        }

        const data = (await response.json()) as LibraryApiResponse;
        if (!Array.isArray(data.texts)) {
          return;
        }

        if (!isMounted) {
          return;
        }

        setLibraryTexts(data.texts);
      } catch {
        // Keep static fallback if library endpoint is unavailable.
      }
    }

    void loadLibraryTexts();

    return () => {
      isMounted = false;
    };
  }, []);

  const closeModal = useCallback(() => {
    setActiveText(null);
    setCopied(false);
  }, []);

  useEffect(() => {
    if (!activeText) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [activeText]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") closeModal();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [closeModal]);

  function buildCopyText(text: LibraryText): string {
    const lines: string[] = [text.title, "", text.teaser, "", ...text.paragraphs];
    if (text.glossary.length > 0) {
      lines.push("", "Glossar");
      for (const entry of text.glossary) {
        lines.push(`${entry.lemma}: ${entry.explanation}`);
      }
    }
    return lines.join("\n");
  }

  async function handleCopy() {
    if (!activeText) return;
    await navigator.clipboard.writeText(buildCopyText(activeText));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="xl:flex xl:items-start">
        <AppSidebar
          activeHref="/library"
          activeTextsorte={libraryTypeFilter !== "alle" ? libraryTypeFilter : undefined}
          enabledTextsorten={enabledTextsorten}
          disabledTextsorten={disabledTextsorten}
        />

        <div className="flex-1">
          <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
            <div className="mb-10 flex flex-wrap items-center justify-between gap-4">
              <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Textbibliothek</h1>
              <Link
                href="/"
                className="radius-single-line border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 transition-colors hover:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
              >
                Zum Generator
              </Link>
            </div>

            <section className="radius-section-card border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                <FileCode className="h-5 w-5" aria-hidden="true" />
                Bibliothek
              </h2>
              <div className="mt-3 border-b border-zinc-200 dark:border-zinc-700" />

              <div className="mt-4 grid gap-3 lg:grid-cols-[1.4fr_0.8fr_0.8fr_auto]">
                <input
                  type="text"
                  value={librarySearch}
                  onChange={(event) => setLibrarySearch(event.target.value)}
                  placeholder="Titel, Zielgruppe, Tag suchen..."
                  className="w-full radius-single-line border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                />
                <select
                  value={libraryLevelFilter}
                  onChange={(event) => setLibraryLevelFilter(event.target.value)}
                  className="w-full radius-single-line border border-zinc-300 bg-white px-3.5 py-2.5 text-sm text-zinc-900 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                >
                  <option value="alle">Alle Niveaus</option>
                  {NIVEAUS.map((niveau) => (
                    <option key={`library-level-${niveau}`} value={niveau}>{niveau}</option>
                  ))}
                </select>
                <select
                  value={libraryTypeFilter}
                  onChange={(event) => setLibraryTypeFilter(event.target.value)}
                  className="w-full radius-single-line border border-zinc-300 bg-white px-3.5 py-2.5 text-sm text-zinc-900 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                >
                  <option value="alle">Alle Textsorten</option>
                  {enabledTextsorten.map((textsorte) => (
                    <option key={`library-type-${textsorte}`} value={textsorte}>{textsorte}</option>
                  ))}
                  {disabledTextsorten.map((textsorte) => (
                    <option key={`library-type-disabled-${textsorte}`} value={textsorte} disabled>{textsorte} (demnaechst)</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => {
                    setLibrarySearch("");
                    setLibraryLevelFilter("alle");
                    setLibraryTypeFilter("alle");
                  }}
                  className="radius-single-line border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-700 transition-colors hover:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
                >
                  Zurücksetzen
                </button>
              </div>

              <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
                {filteredLibraryTexts.length} Text{filteredLibraryTexts.length !== 1 ? "e" : ""} gefunden
              </p>

              <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {pagedLibraryTexts.map((item) => (
                  <article
                    key={item.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setActiveText(item)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setActiveText(item);
                      }
                    }}
                    className="radius-card cursor-pointer border border-zinc-300 bg-white p-4 text-zinc-700 transition-colors hover:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className="inline-flex items-center radius-single-line border border-zinc-300 bg-zinc-50 px-2 py-0.5 text-[11px] font-semibold tracking-wide text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                        {item.niveau}
                      </span>
                      <span className="text-[11px] uppercase tracking-wide text-zinc-400">{item.textsorte}</span>
                    </div>
                    <div className="mt-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">{item.title}</div>
                    <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{item.summary}</p>
                    {item.linguisticSummary && (
                      <p className="mt-2 text-xs text-blue-700 dark:text-blue-300">
                        <span className="font-semibold">Linguistik:</span> {item.linguisticSummary}
                      </p>
                    )}
                    <div className="mt-3 text-xs uppercase tracking-wide opacity-70">{item.zielgruppe}</div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {item.tags.map((tag) => (
                        <span key={`${item.id}-${tag}`} className="inline-flex items-center radius-single-line border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[11px] text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400">
                          {tag}
                        </span>
                      ))}
                    </div>
                    <div className="mt-3 text-[11px] text-zinc-400">Aktualisiert: {item.updatedAt}</div>
                  </article>
                ))}
                {pagedLibraryTexts.length === 0 && (
                  <p className="md:col-span-2 xl:col-span-3 py-6 text-center text-sm text-zinc-400 dark:text-zinc-500">
                    Keine Texte für diese Filterkombination.
                  </p>
                )}
              </div>

              {totalLibraryPages > 1 && (
                <div className="mt-4 flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
                  <button
                    type="button"
                    onClick={() => setLibraryPage((page) => Math.max(1, page - 1))}
                    disabled={clampedLibraryPage === 1}
                    className="radius-single-line border border-zinc-300 bg-white px-3 py-1.5 text-zinc-700 transition-colors hover:border-zinc-400 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
                  >
                    Zurück
                  </button>
                  <span>Seite {clampedLibraryPage} von {totalLibraryPages}</span>
                  <button
                    type="button"
                    onClick={() => setLibraryPage((page) => Math.min(totalLibraryPages, page + 1))}
                    disabled={clampedLibraryPage === totalLibraryPages}
                    className="radius-single-line border border-zinc-300 bg-white px-3 py-1.5 text-zinc-700 transition-colors hover:border-zinc-400 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
                  >
                    Weiter
                  </button>
                </div>
              )}
            </section>

            {activeText && (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/70 p-4"
                onClick={closeModal}
              >
                <div
                  className="max-h-[90vh] w-full max-w-3xl overflow-y-auto radius-section-card border border-zinc-300 bg-white p-6 text-zinc-800 shadow-2xl dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
                  onClick={(event) => event.stopPropagation()}
                >
                  <div className="mb-4 flex items-start justify-between gap-4">
                    <div>
                      <div className="text-xs uppercase tracking-wide text-zinc-500">{activeText.niveau} • {activeText.textsorte}</div>
                      <h3 className="mt-1 text-xl font-semibold text-zinc-900 dark:text-zinc-100">{activeText.title}</h3>
                      {activeText.teaser && <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{activeText.teaser}</p>}
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <button
                        type="button"
                        onClick={() => void handleCopy()}
                        className="flex items-center gap-1.5 radius-single-line border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-700 hover:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
                      >
                        {copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                        {copied ? "Kopiert" : "Kopieren"}
                      </button>
                      <button
                        type="button"
                        onClick={closeModal}
                        className="radius-single-line border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-700 hover:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
                      >
                        Schliessen
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3 text-sm leading-7">
                    {activeText.paragraphs.length > 0 ? (
                      activeText.paragraphs.map((paragraph, index) => (
                        <p key={`${activeText.id}-paragraph-${index}`}>{paragraph}</p>
                      ))
                    ) : (
                      <p className="text-zinc-500 dark:text-zinc-400">Für diesen Eintrag ist kein Volltext verfügbar.</p>
                    )}
                  </div>

                  {activeText.glossary.length > 0 && (
                    <div className="mt-6 border-t border-zinc-200 pt-4 dark:border-zinc-700">
                      <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Glossar</h4>
                      <ul className="mt-2 space-y-1.5 text-sm text-zinc-600 dark:text-zinc-300">
                        {activeText.glossary.map((entry) => (
                          <li key={`${activeText.id}-${entry.lemma}`}>
                            <span className="font-medium text-zinc-900 dark:text-zinc-100">{entry.lemma}:</span> {entry.explanation}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
