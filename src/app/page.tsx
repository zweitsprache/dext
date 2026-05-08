import Link from "next/link";
import { BookOpen, FileCode, FileText, Layers } from "lucide-react";
import AppSidebar from "@/components/AppSidebar";
import { getDashboardStats, getTextsorten } from "@/lib/neon";

const NIVEAUS = ["A1.1", "A1.2", "A2.1", "A2.2", "B1.1", "B1.2"];

export default async function DashboardPage() {
  const [stats, textsorten] = await Promise.all([getDashboardStats(), getTextsorten()]);

  const enabledTextsorten = textsorten.filter((t) => t.enabled).map((t) => t.name);
  const disabledTextsorten = textsorten.filter((t) => !t.enabled).map((t) => t.name);

  const niveauMax = Math.max(1, ...Object.values(stats.niveauCounts));
  const topTextsorten = Object.entries(stats.textsorteCounts).slice(0, 5);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="xl:flex xl:items-start">
        <AppSidebar
          activeHref="/"
          enabledTextsorten={enabledTextsorten}
          disabledTextsorten={disabledTextsorten}
        />

        <div className="flex-1">
          <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">

            {/* Page title */}
            <div className="mb-8">
              <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Übersicht</h1>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Statistiken und zuletzt generierte Texte</p>
            </div>

            {/* Stat cards */}
            <div className="mb-8 grid gap-4 sm:grid-cols-3">
              <div className="radius-card border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-50 dark:bg-accent-950">
                    <FileText className="h-5 w-5 text-sky-600 dark:text-[#9AA180]" aria-hidden="true" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">{stats.totalTexts}</div>
                    <div className="text-xs text-zinc-500 dark:text-zinc-400">Texte generiert</div>
                  </div>
                </div>
              </div>

              <div className="radius-card border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-50 dark:bg-accent-950">
                    <Layers className="h-5 w-5 text-sky-600 dark:text-[#9AA180]" aria-hidden="true" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                      {Object.keys(stats.niveauCounts).length}
                      <span className="ml-1 text-sm font-normal text-zinc-400">/ {NIVEAUS.length}</span>
                    </div>
                    <div className="text-xs text-zinc-500 dark:text-zinc-400">Niveaus abgedeckt</div>
                  </div>
                </div>
              </div>

              <div className="radius-card border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-50 dark:bg-accent-950">
                    <FileCode className="h-5 w-5 text-sky-600 dark:text-[#9AA180]" aria-hidden="true" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                      {Object.keys(stats.textsorteCounts).length}
                    </div>
                    <div className="text-xs text-zinc-500 dark:text-zinc-400">Textsorten verwendet</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom grid: niveau bars + recent texts */}
            <div className="grid gap-6 lg:grid-cols-2">

              {/* Niveau distribution */}
              <div className="radius-section-card border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
                <h2 className="mb-5 text-sm font-semibold text-zinc-700 dark:text-zinc-300">Texte nach Niveau</h2>
                <div className="space-y-3">
                  {NIVEAUS.map((niveau) => {
                    const count = stats.niveauCounts[niveau] ?? 0;
                    const pct = Math.round((count / niveauMax) * 100);
                    return (
                      <div key={niveau} className="flex items-center gap-3">
                        <span className="w-10 shrink-0 text-xs font-medium text-zinc-500 dark:text-zinc-400">{niveau}</span>
                        <div className="flex-1 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800" style={{ height: "6px" }}>
                          <div
                            className="h-full rounded-full bg-sky-500"
                            style={{ width: `${pct}%`, transition: "width 0.4s ease" }}
                          />
                        </div>
                        <span className="w-6 shrink-0 text-right text-xs text-zinc-400 dark:text-zinc-500">{count}</span>
                      </div>
                    );
                  })}
                </div>

                {topTextsorten.length > 0 && (
                  <>
                    <h2 className="mb-4 mt-7 text-sm font-semibold text-zinc-700 dark:text-zinc-300">Top Textsorten</h2>
                    <div className="flex flex-wrap gap-2">
                      {topTextsorten.map(([ts, cnt]) => (
                        <span
                          key={ts}
                          className="radius-single-line border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-xs text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                        >
                          {ts} <span className="ml-1 text-zinc-400">{cnt}</span>
                        </span>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Recent texts + quick actions */}
              <div className="flex flex-col gap-6">

                {/* Recent texts */}
                <div className="radius-section-card border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
                  <div className="mb-5 flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Zuletzt generiert</h2>
                    <Link href="/library" className="text-xs text-sky-900 dark:text-[#9AA180] hover:underline dark:text-accent-400">
                      Alle anzeigen →
                    </Link>
                  </div>
                  {stats.recent.length === 0 ? (
                    <p className="text-sm text-zinc-400 dark:text-zinc-500">Noch keine Texte vorhanden.</p>
                  ) : (
                    <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
                      {stats.recent.map((text) => (
                        <li key={text.id} className="flex items-start gap-3 py-2.5 first:pt-0 last:pb-0">
                          <span className="radius-single-line mt-0.5 shrink-0 border border-zinc-200 bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400">
                            {text.niveau}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-medium text-zinc-800 dark:text-zinc-200">{text.title}</div>
                            <div className="text-xs text-zinc-400 dark:text-zinc-500">{text.textsorte} · {text.updatedAt}</div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Quick actions */}
                <div className="radius-section-card border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
                  <h2 className="mb-4 text-sm font-semibold text-zinc-700 dark:text-zinc-300">Schnellzugriff</h2>
                  <div className="grid grid-cols-2 gap-3">
                    <Link
                      href="/generator"
                      className="radius-card flex flex-col items-center gap-2 border border-zinc-200 bg-zinc-50 p-4 text-center transition-colors hover:border-sky-300 hover:bg-sky-50 dark:border-zinc-700 dark:bg-zinc-800 dark:hover:border-accent-700 dark:hover:bg-accent-950"
                    >
                      <FileCode className="h-6 w-6 text-sky-600 dark:text-[#9AA180]" aria-hidden="true" />
                      <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Generator</span>
                    </Link>
                    <Link
                      href="/library"
                      className="radius-card flex flex-col items-center gap-2 border border-zinc-200 bg-zinc-50 p-4 text-center transition-colors hover:border-sky-300 hover:bg-sky-50 dark:border-zinc-700 dark:bg-zinc-800 dark:hover:border-accent-700 dark:hover:bg-accent-950"
                    >
                      <BookOpen className="h-6 w-6 text-sky-600 dark:text-[#9AA180]" aria-hidden="true" />
                      <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Bibliothek</span>
                    </Link>
                  </div>
                </div>

              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
