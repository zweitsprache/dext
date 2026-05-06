import Link from "next/link";
import AppSidebar from "@/components/AppSidebar";
import { GER_LEVEL_ORDER, LEVEL_LIMITS, LEVEL_RULES, NIVEAU_MERKMAL_LISTE } from "@/lib/ger-level-specs";
import { DEFAULT_TEXTSORTEN, splitTextsorten } from "@/lib/textsorten";

const { enabled: enabledTextsorten, disabled: disabledTextsorten } = splitTextsorten(DEFAULT_TEXTSORTEN);

export default function GerSettingsPage() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="xl:flex xl:items-start">
        <AppSidebar
          activeHref="/system/ger-settings"
          enabledTextsorten={enabledTextsorten}
          disabledTextsorten={disabledTextsorten}
        />

        <div className="flex-1">
          <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
            <div className="mb-10 flex flex-wrap items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">System: GER-Settings</h1>
                <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                  Diese Seite zeigt die gleichen Niveau-Spezifikationen, die direkt im Generation-Prompt verwendet werden.
                </p>
              </div>
              <Link
                href="/"
                className="radius-single-line border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 transition-colors hover:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
              >
                Zum Generator
              </Link>
            </div>

            <section className="radius-section-card border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Kompakte Regeln pro Niveau</h2>
              <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                Erlaubte, bevorzugte und verbotene Strukturen werden 1:1 aus den Prompt-Regeln geladen.
              </p>

              <div className="mt-6 grid gap-4 lg:grid-cols-2">
                {GER_LEVEL_ORDER.map((level) => {
                  const limits = LEVEL_LIMITS[level];
                  const rules = LEVEL_RULES[level];

                  return (
                    <article key={level} className="radius-card border border-zinc-300 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
                      <div className="mb-3 flex items-center justify-between gap-2">
                        <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">{level}</h3>
                        <span className="text-xs text-zinc-500 dark:text-zinc-400">
                          {limits.minWords}-{limits.maxWords} Wörter, {limits.minParagraphs}-{limits.maxParagraphs} Absätze
                        </span>
                      </div>

                      <div className="space-y-3 text-sm">
                        <div>
                          <p className="font-medium text-zinc-900 dark:text-zinc-100">Erlaubt</p>
                          <p className="text-zinc-700 dark:text-zinc-300">{rules.allowed.join(", ")}</p>
                        </div>
                        <div>
                          <p className="font-medium text-zinc-900 dark:text-zinc-100">Bevorzugt</p>
                          <p className="text-zinc-700 dark:text-zinc-300">{rules.preferred.join(", ")}</p>
                        </div>
                        <div>
                          <p className="font-medium text-zinc-900 dark:text-zinc-100">Verboten</p>
                          <p className="text-zinc-700 dark:text-zinc-300">{rules.forbidden.join(", ")}</p>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>

            <section className="mt-6 radius-section-card border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Prompt-Quelle (verbatim)</h2>
              <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                Dieser Block wird im System-Prompt eingebettet und ist hier unverändert sichtbar.
              </p>

              <pre className="mt-4 max-h-[30rem] overflow-auto rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-xs leading-6 text-zinc-700 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-300">
                {NIVEAU_MERKMAL_LISTE.trim()}
              </pre>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
