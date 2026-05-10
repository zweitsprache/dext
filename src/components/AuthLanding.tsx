"use client";

import { AuthView } from "@neondatabase/auth-ui";
import { useEffect, useRef, useState } from "react";

type AuthTab = "sign-in" | "sign-up";

type ShowcaseText = {
  id: string;
  title: string;
  summary: string;
  niveau: string;
  textsorte: string;
  zielgruppe: string;
  tags: string[];
};

const SHOWCASE_TEXTS: ShowcaseText[] = [
  {
    id: "1",
    title: "Arbeitsvertrag verstehen",
    summary: "Sachtext zu Probezeit, Kündigungsfrist und zentralen Klauseln im Joballtag.",
    niveau: "B1.1",
    textsorte: "Sachtext",
    zielgruppe: "Arbeitssuchende",
    tags: ["Arbeit", "Vertrag", "Rechte"],
  },
  {
    id: "2",
    title: "Wohnungsbesichtigung in Basel",
    summary: "Bericht über eine Besichtigung mit Fokus auf Fragen an die Vermietung.",
    niveau: "A2.1",
    textsorte: "Bericht",
    zielgruppe: "Allgemein erwachsen",
    tags: ["Wohnen", "Termin", "Fragen"],
  },
  {
    id: "3",
    title: "Gespräch mit dem Betriebsrat",
    summary: "Interview über Mitsprache, Beschwerden und Lösungswege im Betrieb.",
    niveau: "B1.1",
    textsorte: "Interview",
    zielgruppe: "Bau",
    tags: ["Betrieb", "Rechte", "Interview"],
  },
  {
    id: "4",
    title: "Elternabend in der Primarschule",
    summary: "Nachricht zur Organisation, Rollenverteilung und schulischen Erwartungen.",
    niveau: "B1.2",
    textsorte: "Nachricht",
    zielgruppe: "Eltern in der Schule",
    tags: ["Schule", "Eltern", "Planung"],
  },
  {
    id: "5",
    title: "Bewerbungsanfrage per Mail",
    summary: "Brief/Mail mit klarer Struktur für Erstkontakt bei einer offenen Stelle.",
    niveau: "A2.2",
    textsorte: "Brief / Mail",
    zielgruppe: "Arbeitssuchende",
    tags: ["Bewerbung", "Mail", "Formell"],
  },
  {
    id: "6",
    title: "Kommentar zu Kita-Öffnungszeiten",
    summary: "Kontroverser Kommentar mit Argumenten aus Sicht berufstätiger Eltern.",
    niveau: "B1.2",
    textsorte: "Kommentar",
    zielgruppe: "Eltern in der Schule",
    tags: ["Familie", "Argumente", "Kommentar"],
  },
  {
    id: "7",
    title: "Feierabend im neuen Quartier",
    summary: "Einfache Erzählung über Wege, Begegnungen und kleine Routinen am Abend.",
    niveau: "A1.1",
    textsorte: "Erzählung",
    zielgruppe: "Allgemein erwachsen",
    tags: ["Quartier", "Routine", "Erzählung"],
  },
  {
    id: "8",
    title: "Porträt einer Chefköchin",
    summary: "Porträt über Berufsweg, Teamarbeit und Sprachlernen im Restaurant.",
    niveau: "A2.2",
    textsorte: "Porträt",
    zielgruppe: "Gastronomie",
    tags: ["Beruf", "Porträt", "Team"],
  },
  {
    id: "9",
    title: "Schnelles Abendessen nach der Arbeit",
    summary: "Blogtext mit Reihenfolge, Zutaten und einfachen Küchenschritten.",
    niveau: "A2.1",
    textsorte: "Blog",
    zielgruppe: "Gastronomie",
    tags: ["Kochen", "Ablauf", "Blog"],
  },
  {
    id: "10",
    title: "Anmeldung beim Deutschkurs",
    summary: "Anleitung mit Schritt-für-Schritt-Ablauf für Kursanmeldung und Unterlagen.",
    niveau: "A1.2",
    textsorte: "Anleitung",
    zielgruppe: "Integrationskurs",
    tags: ["Anmeldung", "Dokumente", "Kurs"],
  },
];

const NIVEAU_COLORS: Record<string, string> = {
  "A1.1": "bg-emerald-900/60 text-emerald-300 border-emerald-700/50",
  "A1.2": "bg-emerald-900/60 text-emerald-300 border-emerald-700/50",
  "A2.1": "bg-teal-900/60 text-teal-300 border-teal-700/50",
  "A2.2": "bg-teal-900/60 text-teal-300 border-teal-700/50",
  "B1.1": "bg-blue-900/60 text-blue-300 border-blue-700/50",
  "B1.2": "bg-blue-900/60 text-blue-300 border-blue-700/50",
};

function TextShowcase() {
  const [slideIndex, setSlideIndex] = useState(0);
  const [isFading, setIsFading] = useState(false);
  const contentRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const contentElement = contentRef.current;

    if (!contentElement) {
      return;
    }

    contentElement.scrollTop = 0;

    const maxScroll = Math.max(0, contentElement.scrollHeight - contentElement.clientHeight);
    const scrollSpeed = 28;
    const holdDelay = 700;
    const fadeDuration = 300;
    let animationFrame = 0;
    let nextSlideTimeout = 0;
    let fadeTimeout = 0;

    const advanceSlide = () => {
      setIsFading(true);
      fadeTimeout = window.setTimeout(() => {
        setSlideIndex((current) => (current + 1) % SHOWCASE_TEXTS.length);
        setIsFading(false);
      }, fadeDuration);
    };

    if (maxScroll === 0) {
      nextSlideTimeout = window.setTimeout(() => {
        advanceSlide();
      }, holdDelay);
      return () => {
        window.clearTimeout(nextSlideTimeout);
        window.clearTimeout(fadeTimeout);
      };
    }

    const duration = (maxScroll / scrollSpeed) * 1000;
    const startedAt = window.performance.now();

    const step = (timestamp: number) => {
      const elapsed = timestamp - startedAt;
      const progress = Math.min(elapsed / duration, 1);

      contentElement.scrollTop = progress * maxScroll;

      if (progress < 1) {
        animationFrame = window.requestAnimationFrame(step);
        return;
      }

      nextSlideTimeout = window.setTimeout(() => {
        advanceSlide();
      }, holdDelay);
    };

    animationFrame = window.requestAnimationFrame(step);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.clearTimeout(nextSlideTimeout);
      window.clearTimeout(fadeTimeout);
    };
  }, [slideIndex]);

  const activeText = SHOWCASE_TEXTS[slideIndex];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2">
        {SHOWCASE_TEXTS.map((_, index) => (
          <span
            key={index}
            className={`block h-1 flex-1 rounded-full transition-colors duration-300 ${
              index === slideIndex ? "bg-white" : "bg-white/25"
            }`}
          />
        ))}
      </div>

      <article
        key={activeText.id}
        className="relative overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/55 p-5 shadow-lg shadow-black/10"
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-10 bg-gradient-to-b from-zinc-950/90 to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-10 bg-gradient-to-t from-zinc-950/90 to-transparent" />

        <div className="flex items-center justify-between gap-3">
          <span
            className={`inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-semibold tracking-wide ${NIVEAU_COLORS[activeText.niveau] ?? "bg-zinc-800 text-zinc-300 border-zinc-700"}`}
          >
            {activeText.niveau}
          </span>
          <span className="text-xs uppercase tracking-widest text-white/40">{activeText.textsorte}</span>
        </div>

        <div className="relative mt-4 h-56 overflow-hidden rounded-xl">
          <div
            ref={contentRef}
            className="h-full overflow-y-auto"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            <div className={`space-y-4 pb-16 transition-opacity duration-300 ${
              isFading ? "opacity-0" : "opacity-100"
            }`}>
              <div>
                <h3 className="text-lg font-bold leading-snug text-white">{activeText.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/70">{activeText.summary}</p>
              </div>

              <div className="rounded-xl border border-white/10 bg-zinc-950/45 p-4 text-sm leading-relaxed text-white/65">
                {activeText.textsorte} mit {activeText.niveau} für {activeText.zielgruppe}.
                Der Inhalt bleibt während der Anzeige lesbar und wird automatisch bis zum Ende gescrollt.
              </div>

              <div>
                <div className="text-xs uppercase tracking-wide text-white/35">Zielgruppe</div>
                <div className="mt-2 text-sm text-white/75">{activeText.zielgruppe}</div>
              </div>

              <div>
                <div className="text-xs uppercase tracking-wide text-white/35">Tags</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {activeText.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/50"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </article>

      <div className="grid grid-cols-3 gap-4 rounded-xl border border-white/10 bg-white/5 p-5">
        <div className="text-center">
          <div className="text-2xl font-bold text-white">6</div>
          <div className="mt-1 text-xs text-white/40">Niveaus</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-white">11</div>
          <div className="mt-1 text-xs text-white/40">Textsorten</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-white">∞</div>
          <div className="mt-1 text-xs text-white/40">Texte</div>
        </div>
      </div>
    </div>
  );
}

type AuthLandingProps = {
  initialTab: AuthTab;
};

export function AuthLanding({ initialTab }: AuthLandingProps) {
  const [activeTab, setActiveTab] = useState<AuthTab>(initialTab);
  const [headlineSuffix, setHeadlineSuffix] = useState("");

  useEffect(() => {
    const target = "GER-";
    let index = 0;

    const startDelay = window.setTimeout(() => {
      const interval = window.setInterval(() => {
        index += 1;
        setHeadlineSuffix(target.slice(0, index));

        if (index >= target.length) {
          window.clearInterval(interval);
        }
      }, 140);
    }, 250);

    return () => window.clearTimeout(startDelay);
  }, []);

  return (
    <div className="flex min-h-screen">
      <div
        className="hidden overflow-hidden bg-cover bg-center lg:flex lg:w-1/2 flex-col justify-between bg-zinc-900 p-12 relative"
        style={{ backgroundImage: `url('/placeholder/bg_placeholder.png')` }}
      >
        <div className="absolute inset-0 z-0 bg-slate-950/70" />

        <div className="relative z-10">
          <div className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logos/dext.svg" alt="dext" className="h-8 w-auto invert" />
          </div>
        </div>

        <div className="my-auto relative z-10 py-12">
          <h2 className="text-4xl font-bold leading-[0.95] tracking-tight text-white xl:text-5xl">
            Texte mit <span>{headlineSuffix}</span>Niveau
            <br />
            <span className="text-white/50">für A1 bis B1</span>
          </h2>

          <div className="mt-10">
            <TextShowcase />
          </div>
        </div>

        <div className="relative z-10 text-xs text-white/20">© {new Date().getFullYear()} dext</div>

      </div>

      <div className="flex w-full items-center justify-center bg-zinc-50 p-8 dark:bg-zinc-950 lg:w-1/2">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2 lg:hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logos/dext.svg" alt="dext" className="h-7 w-auto dark:invert" />
          </div>

          <div className="mb-5 inline-flex w-full rounded-full border border-zinc-200 bg-white p-1 text-sm shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <button
              type="button"
              onClick={() => setActiveTab("sign-in")}
              className={`flex-1 rounded-full px-4 py-2 transition-colors ${
                activeTab === "sign-in"
                  ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                  : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
              }`}
              aria-pressed={activeTab === "sign-in"}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("sign-up")}
              className={`flex-1 rounded-full px-4 py-2 transition-colors ${
                activeTab === "sign-up"
                  ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                  : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
              }`}
              aria-pressed={activeTab === "sign-up"}
            >
              Sign up
            </button>
          </div>

          <AuthView path={activeTab} classNames={{ footer: "hidden" }} />
        </div>
      </div>
    </div>
  );
}