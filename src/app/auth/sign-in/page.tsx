"use client";

import { AuthView } from "@neondatabase/auth-ui";
import { useEffect, useState } from "react";

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
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIndex((prev) => (prev + 1) % SHOWCASE_TEXTS.length);
        setVisible(true);
      }, 400);
    }, 4500);
    return () => clearInterval(interval);
  }, []);

  const text = SHOWCASE_TEXTS[index];
  const niveauColor = NIVEAU_COLORS[text.niveau] ?? "bg-zinc-800 text-zinc-300 border-zinc-700";

  return (
    <div className="flex flex-col gap-6">
      {/* counter */}
      <div className="flex items-center gap-2">
        {SHOWCASE_TEXTS.map((_, i) => (
          <span
            key={i}
            className={`block h-1 rounded-full transition-all duration-500 ${
              i === index ? "w-6 bg-white" : "w-2 bg-white/25"
            }`}
          />
        ))}
      </div>

      {/* card */}
      <div
        className="rounded-2xl border border-white/10 bg-white/5 p-7 backdrop-blur-sm transition-all duration-400"
        style={{ opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(8px)" }}
      >
        <div className="flex items-center justify-between gap-3">
          <span
            className={`inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-semibold tracking-wide ${niveauColor}`}
          >
            {text.niveau}
          </span>
          <span className="text-xs uppercase tracking-widest text-white/40">{text.textsorte}</span>
        </div>

        <h3 className="mt-4 text-xl font-bold leading-snug text-white">{text.title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-white/60">{text.summary}</p>

        <div className="mt-4 text-xs uppercase tracking-wide text-white/35">{text.zielgruppe}</div>

        <div className="mt-3 flex flex-wrap gap-2">
          {text.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/50"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* stats */}
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

export default function SignInPage() {
  return (
    <div className="flex min-h-screen">
      {/* left panel */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between bg-zinc-900 p-12">
        <div>
          <div className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logos/dext.svg" alt="dext" className="h-8 w-auto invert" />
          </div>
          <p className="mt-2 text-sm text-white/40">DaZ-Lesetextgenerator</p>
        </div>

        <div className="my-auto py-12">
          <h2 className="text-3xl font-bold leading-tight text-white">
            Niveaukonsistente Lesetexte<br />
            <span className="text-white/50">auf Knopfdruck.</span>
          </h2>
          <p className="mt-3 text-sm text-white/40 leading-relaxed max-w-sm">
            Texte für Deutsch als Zweitsprache — passgenau nach GER-Niveau,
            Textsorte und Zielgruppe generiert.
          </p>

          <div className="mt-10">
            <TextShowcase />
          </div>
        </div>

        <div className="text-xs text-white/20">
          © {new Date().getFullYear()} dext
        </div>
      </div>

      {/* right panel */}
      <div className="flex w-full lg:w-1/2 items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-8">
        <div className="w-full max-w-sm">
          {/* mobile logo */}
          <div className="mb-8 flex items-center gap-2 lg:hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logos/dext.svg" alt="dext" className="h-7 w-auto dark:invert" />
          </div>
          <AuthView path="sign-in" />
        </div>
      </div>
    </div>
  );
}
