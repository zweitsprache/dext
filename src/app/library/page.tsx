"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Check, Copy, Library, X } from "lucide-react";
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

type PublishedText = {
  id: string;
  generatedTextId: string;
  title: string;
  summary: string;
  paragraphs: string[];
  imageUrl?: string;
  imagePrompt?: string;
  isPublic: boolean;
  publishedAt: string;
};

type LibraryApiResponse = {
  texts?: LibraryText[];
  publishedTexts?: PublishedText[];
};

function LibraryContent() {
  const searchParams = useSearchParams();
  const [librarySearch, setLibrarySearch] = useState("");
  const [libraryLevelFilter, setLibraryLevelFilter] = useState<string>("alle");
  const [libraryTypeFilter, setLibraryTypeFilter] = useState<string>("alle");
  const [libraryPage, setLibraryPage] = useState(1);
  const [libraryTexts, setLibraryTexts] = useState<LibraryText[]>([]);
  const [isLibraryLoading, setIsLibraryLoading] = useState(true);
  const [activeText, setActiveText] = useState<LibraryText | null>(null);
  const [copied, setCopied] = useState(false);
  const [enabledTextsorten, setEnabledTextsorten] = useState<string[]>(SORTED_TEXTSORTEN);
  const [disabledTextsorten, setDisabledTextsorten] = useState<string[]>(SORTED_DISABLED_TEXTSORTEN);
  const [publishedTexts, setPublishedTexts] = useState<PublishedText[]>([]);
  const [isPublishedLoading, setIsPublishedLoading] = useState(true);
  const [activePublishedText, setActivePublishedText] = useState<PublishedText | null>(null);
  const [publishedCopied, setPublishedCopied] = useState(false);

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
      } finally {
        if (isMounted) {
          setIsLibraryLoading(false);
        }
      }
    }

    void loadLibraryTexts();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadPublishedTexts() {
      try {
        const response = await fetch("/api/library?published=true");
        if (!response.ok) {
          return;
        }

        const data = (await response.json()) as LibraryApiResponse;
        if (!Array.isArray(data.publishedTexts)) {
          return;
        }

        if (!isMounted) {
          return;
        }

        setPublishedTexts(data.publishedTexts);
      } catch {
        // Keep static fallback if endpoint is unavailable.
      } finally {
        if (isMounted) {
          setIsPublishedLoading(false);
        }
      }
    }

    void loadPublishedTexts();

    return () => {
      isMounted = false;
    };
  }, []);

  const closeModal = useCallback(() => {
    setActiveText(null);
    setCopied(false);
    setActivePublishedText(null);
    setPublishedCopied(false);
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

  useEffect(() => {
    if (!activePublishedText) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [activePublishedText]);

  function buildCopyTextPublished(text: PublishedText): string {
    const lines: string[] = [text.title, "", text.summary, "", ...text.paragraphs];
    return lines.join("\n");
  }

  async function handleCopyPublished() {
    if (!activePublishedText) return;
    await navigator.clipboard.writeText(buildCopyTextPublished(activePublishedText));
    setPublishedCopied(true);
    setTimeout(() => setPublishedCopied(false), 2000);
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
            <section className="radius-section-card border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
              <h2 className="flex items-center gap-2 text-xl font-semibold text-zinc-900 dark:text-zinc-50">
                <Library className="h-6 w-6" aria-hidden="true" />
                Bibliothek
              </h2>
              <div className="mt-3 flex"><div className="w-40 border-b border-sky-600 dark:border-[#9AA180] section-divider-accent" /><div className="flex-1 border-b border-sky-400 dark:border-zinc-700 section-divider-line" /></div>

              <div className="mt-4 grid gap-3 lg:grid-cols-[1.4fr_0.8fr_0.8fr_auto]">
                <input
                  type="text"
                  value={librarySearch}
                  onChange={(event) => setLibrarySearch(event.target.value)}
                  placeholder="Titel, Zielgruppe, Tag suchen..."
                  className="w-full radius-single-line border border-zinc-300 bg-white px-3 py-2 text-base text-zinc-900 placeholder:text-zinc-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                />
                <select
                  value={libraryLevelFilter}
                  onChange={(event) => setLibraryLevelFilter(event.target.value)}
                  className="w-full radius-single-line border border-zinc-300 bg-white px-3.5 py-2.5 text-base text-zinc-900 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                >
                  <option value="alle">Alle Niveaus</option>
                  {NIVEAUS.map((niveau) => (
                    <option key={`library-level-${niveau}`} value={niveau}>{niveau}</option>
                  ))}
                </select>
                <select
                  value={libraryTypeFilter}
                  onChange={(event) => setLibraryTypeFilter(event.target.value)}
                  className="w-full radius-single-line border border-zinc-300 bg-white px-3.5 py-2.5 text-base text-zinc-900 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
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
                  className="radius-single-line border border-zinc-300 bg-white px-3 py-2 text-base text-zinc-700 transition-colors hover:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
                >
                  Zurücksetzen
                </button>
              </div>

              <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
                {isLibraryLoading
                  ? "Texte werden geladen..."
                  : `${filteredLibraryTexts.length} Text${filteredLibraryTexts.length !== 1 ? "e" : ""} gefunden`}
              </p>

              <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {isLibraryLoading
                  ? Array.from({ length: TEXT_LIBRARY_PER_PAGE }).map((_, index) => (
                      <article
                        key={`library-skeleton-${index}`}
                        aria-hidden="true"
                        className="radius-card border border-zinc-300 bg-white dark:border-zinc-700 dark:bg-zinc-900 overflow-hidden flex flex-col"
                      >
                        <div className="bg-zinc-100 px-4 pt-2 pb-2 dark:bg-zinc-800">
                          <div className="flex items-center gap-2">
                            <div className="h-5 w-14 animate-pulse rounded-full bg-zinc-200 dark:bg-zinc-700" />
                            <div className="h-5 w-40 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
                          </div>
                        </div>
                        <div className="w-full bg-zinc-200 dark:bg-zinc-800 aspect-video animate-pulse" />
                        <div className="px-4 pt-3 pb-4">
                          <div className="mb-1.5 h-3 w-24 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
                          <div className="h-4 w-full animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
                          <div className="mt-2 h-4 w-11/12 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
                          <div className="mt-3 h-3 w-32 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            <div className="h-5 w-16 animate-pulse rounded-full bg-zinc-200 dark:bg-zinc-700" />
                            <div className="h-5 w-20 animate-pulse rounded-full bg-zinc-200 dark:bg-zinc-700" />
                            <div className="h-5 w-14 animate-pulse rounded-full bg-zinc-200 dark:bg-zinc-700" />
                          </div>
                          <div className="mt-3 h-3 w-28 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
                        </div>
                      </article>
                    ))
                  : pagedLibraryTexts.map((item) => (
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
                        className="radius-card cursor-pointer border border-zinc-300 bg-white text-zinc-700 transition-colors hover:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 overflow-hidden flex flex-col"
                      >
                        <div className="bg-zinc-100 px-4 pt-2 pb-2 dark:bg-zinc-800">
                          <div className="flex items-center gap-2">
                            <span className="shrink-0 inline-flex items-center radius-single-line border border-zinc-300 bg-white px-2 py-0.5 text-[11px] font-semibold tracking-wide text-zinc-600 dark:border-zinc-700 dark:bg-zinc-700 dark:text-zinc-300">
                              {item.niveau}
                            </span>
                            <div className="text-base font-semibold leading-snug text-zinc-900 dark:text-zinc-100">{item.title}</div>
                          </div>
                        </div>
                        <div className="w-full bg-zinc-200 dark:bg-zinc-800 aspect-video flex items-center justify-center">
                          <img
                            src="/placeholder/dext-img-placeholder.png"
                            alt={item.title}
                            className="w-full h-full object-contain"
                          />
                        </div>
                        <div className="px-4 pt-3 pb-4">
                          <div className="mb-1.5 text-[11px] uppercase tracking-wide text-zinc-400">{item.textsorte}</div>
                          <p className="text-base leading-snug text-zinc-600 dark:text-zinc-300">{item.summary}</p>
                          {item.linguisticSummary && (
                            <p className="mt-2 text-base leading-snug text-zinc-600 dark:text-zinc-300">
                              {item.linguisticSummary}
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
                        </div>
                      </article>
                    ))}
                {!isLibraryLoading && pagedLibraryTexts.length === 0 && (
                  <p className="md:col-span-2 xl:col-span-3 py-6 text-center text-sm text-zinc-400 dark:text-zinc-500">
                    Keine Texte für diese Filterkombination.
                  </p>
                )}
              </div>

              {!isLibraryLoading && totalLibraryPages > 1 && (
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

            {/* Published Library Section */}
            <section className="radius-section-card mt-8 border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
              <h2 className="flex items-center gap-2 text-xl font-semibold text-zinc-900 dark:text-zinc-50">
                <Library className="h-6 w-6" aria-hidden="true" />
                Öffentliche Bibliothek
              </h2>
              <div className="mt-3 flex"><div className="w-40 border-b border-sky-600 dark:border-[#9AA180] section-divider-accent" /><div className="flex-1 border-b border-sky-400 dark:border-zinc-700 section-divider-line" /></div>

              <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
                {isPublishedLoading
                  ? "Veröffentlichte Texte werden geladen..."
                  : `${publishedTexts.length} veröffentlichter Text${publishedTexts.length !== 1 ? "e" : ""}`}
              </p>

              <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {isPublishedLoading
                  ? Array.from({ length: 3 }).map((_, idx) => (
                      <article key={`published-skeleton-${idx}`} className="radius-card border border-zinc-300 bg-white dark:border-zinc-700 dark:bg-zinc-900 overflow-hidden flex flex-col">
                        <div className="bg-zinc-100 dark:bg-zinc-800 aspect-video animate-pulse" />
                        <div className="px-4 pt-3 pb-4 space-y-3">
                          <div className="h-5 w-24 animate-pulse rounded-full bg-zinc-200 dark:bg-zinc-700" />
                          <div className="h-4 w-full animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
                          <div className="h-4 w-20 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
                        </div>
                      </article>
                    ))
                  : publishedTexts.map((item) => (
                      <article
                        key={item.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => setActivePublishedText(item)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            setActivePublishedText(item);
                          }
                        }}
                        className="radius-card cursor-pointer border border-zinc-300 bg-white text-zinc-700 transition-colors hover:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 overflow-hidden flex flex-col"
                      >
                        {item.imageUrl ? (
                          <div className="w-full bg-zinc-100 dark:bg-zinc-800 aspect-video flex items-center justify-center overflow-hidden">
                            <img
                              src={item.imageUrl}
                              alt={item.title}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="w-full bg-zinc-100 px-4 py-8 dark:bg-zinc-800 aspect-video flex items-center justify-center">
                            <img
                              src="/placeholder/dext-img-placeholder.png"
                              alt={item.title}
                              className="w-full h-full object-contain"
                            />
                          </div>
                        )}
                        <div className="px-4 pt-3 pb-4">
                          <div className="text-base font-semibold leading-snug text-zinc-900 dark:text-zinc-100">{item.title}</div>
                          <p className="mt-2 text-base leading-snug text-zinc-600 dark:text-zinc-300">{item.summary}</p>
                          <div className="mt-3 text-[11px] text-zinc-400">Veröffentlicht: {item.publishedAt}</div>
                        </div>
                      </article>
                    ))}
                {!isPublishedLoading && publishedTexts.length === 0 && (
                  <p className="md:col-span-2 xl:col-span-3 py-6 text-center text-sm text-zinc-400 dark:text-zinc-500">
                    Noch keine veröffentlichten Texte vorhanden.
                  </p>
                )}
              </div>
            </section>

            {activeText && (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/70 p-4"
                onClick={closeModal}
              >
                <div
                  className="max-h-[90vh] w-full max-w-3xl radius-section-card border border-zinc-300 bg-white text-zinc-800 shadow-2xl dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 flex flex-col"
                  onClick={(event) => event.stopPropagation()}
                >
                  <div className="p-6 border-b border-zinc-200 dark:border-zinc-700">
                    <div className="flex items-start justify-between gap-4">
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
                  </div>

                  <div className="w-full bg-zinc-200 dark:bg-zinc-800 aspect-video flex items-center justify-center border-b border-zinc-200 dark:border-zinc-700">
                    <img
                      src="/placeholder/dext-img-placeholder.png"
                      alt={activeText.title}
                      className="w-full h-full object-contain"
                    />
                  </div>

                  <div className="p-6 overflow-y-auto flex-1">

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
              </div>
            )}
            {/* Published Text Modal */}
            {activePublishedText && (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/70 p-4"
                onClick={closeModal}
              >
                <div
                  className="max-h-[90vh] w-full max-w-3xl radius-section-card border border-zinc-300 bg-white text-zinc-800 shadow-2xl dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 flex flex-col"
                  onClick={(event) => event.stopPropagation()}
                >
                  <div className="p-6 border-b border-zinc-200 dark:border-zinc-700">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="mt-1 text-xl font-semibold text-zinc-900 dark:text-zinc-100">{activePublishedText.title}</h3>
                        {activePublishedText.summary && (
                          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{activePublishedText.summary}</p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={closeModal}
                        className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                      >
                        <X className="h-5 w-5" aria-hidden="true" />
                      </button>
                    </div>
                  </div>

                  {activePublishedText.imageUrl && (
                    <div className="w-full bg-zinc-100 dark:bg-zinc-800 aspect-video flex items-center justify-center border-b border-zinc-200 dark:border-zinc-700 overflow-hidden">
                      <img
                        src={activePublishedText.imageUrl}
                        alt={activePublishedText.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}

                  <div className="p-6 overflow-y-auto flex-1">
                    <div className="space-y-3 text-sm leading-7">
                      {activePublishedText.paragraphs.length > 0 ? (
                        activePublishedText.paragraphs.map((paragraph, index) => (
                          <p key={`${activePublishedText.id}-paragraph-${index}`}>{paragraph}</p>
                        ))
                      ) : (
                        <p className="text-zinc-500 dark:text-zinc-400">Für diesen Eintrag ist kein Volltext verfügbar.</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-zinc-200 bg-zinc-50 px-6 py-3 dark:border-zinc-700 dark:bg-zinc-950">
                    <div className="text-xs text-zinc-500 dark:text-zinc-400">
                      Veröffentlicht: {activePublishedText.publishedAt}
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleCopyPublished}
                        className="radius-single-line border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-700 transition-colors hover:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 inline-flex items-center gap-2"
                      >
                        {publishedCopied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                        {publishedCopied ? "Kopiert" : "Kopieren"}
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
                </div>
              </div>
            )}          </div>
        </div>
      </div>
    </div>
  );
}

export default function LibraryPage() {
  return (
    <Suspense>
      <LibraryContent />
    </Suspense>
  );
}
