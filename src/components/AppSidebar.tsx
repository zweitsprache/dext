"use client";

import Image from "next/image";
import Link from "next/link";
import { BookOpen } from "lucide-react";

type Props = {
  activeHref: string;
  activeTextsorte?: string;
  enabledTextsorten: string[];
  disabledTextsorten: string[];
};

export default function AppSidebar({ activeHref, activeTextsorte, enabledTextsorten, disabledTextsorten }: Props) {
  return (
    <aside className="bg-white p-5 shadow-[10px_0_28px_rgba(15,23,42,0.08)] dark:bg-zinc-900 dark:shadow-[10px_0_28px_rgba(0,0,0,0.35)] xl:sticky xl:top-0 xl:flex xl:min-h-screen xl:w-96 xl:shrink-0 xl:flex-col">
      <div className="mt-3 mb-10">
        <Image
          src="/logos/dext.svg"
          alt="Dext"
          width={153}
          height={59}
          priority
          className="h-auto w-14"
        />
      </div>

      <div className="flex-1 space-y-6 border-l border-zinc-200 pl-4 dark:border-zinc-700">
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">Navigation</h2>
          <ul className="mt-3 space-y-2 text-sm text-zinc-700 dark:text-zinc-300">
            <li>
              <Link
                href="/"
                className={activeHref === "/" ? "font-medium text-blue-700 dark:text-blue-300" : "transition-colors hover:text-zinc-900 dark:hover:text-zinc-100"}
              >
                Generator
              </Link>
            </li>
            <li>
              <Link
                href="/library"
                className={activeHref === "/library" ? "font-medium text-blue-700 dark:text-blue-300" : "transition-colors hover:text-zinc-900 dark:hover:text-zinc-100"}
              >
                Textbibliothek
              </Link>
            </li>
          </ul>
        </section>

        <section>
          <h2 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
            <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
            BIBLIOTHEK
          </h2>
          <ul className="mt-3 space-y-2 text-sm text-zinc-700 dark:text-zinc-300">
            {enabledTextsorten.map((textsorte) => (
              <li key={`sidebar-textsorte-${textsorte}`}>
                <Link
                  href={`/library?textsorte=${encodeURIComponent(textsorte)}`}
                  className={activeTextsorte === textsorte ? "font-medium text-blue-700 dark:text-blue-300" : "transition-colors hover:text-zinc-900 dark:hover:text-zinc-100"}
                >
                  {textsorte}
                </Link>
              </li>
            ))}
            {disabledTextsorten.map((textsorte) => (
              <li key={`sidebar-textsorte-disabled-${textsorte}`} className="text-zinc-400 dark:text-zinc-500" aria-disabled="true">
                {textsorte} (demnaechst)
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">System</h2>
          <ul className="mt-3 space-y-2 text-sm text-zinc-700 dark:text-zinc-300">
            <li>
              <Link
                href="/system/ger-settings"
                className={activeHref === "/system/ger-settings" || activeHref === "/ger-niveaus" ? "font-medium text-blue-700 dark:text-blue-300" : "transition-colors hover:text-zinc-900 dark:hover:text-zinc-100"}
              >
                GER-Niveaus
              </Link>
            </li>
          </ul>
        </section>
      </div>

      <div className="mt-8 border-t border-zinc-200 pt-4 dark:border-zinc-700 xl:mt-auto">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Lorem User</div>
            <div className="text-xs text-zinc-500 dark:text-zinc-400">ipsum@example.com</div>
          </div>
          <button
            type="button"
            className="radius-single-line border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 transition-colors hover:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
          >
            Logout
          </button>
        </div>
      </div>
    </aside>
  );
}
