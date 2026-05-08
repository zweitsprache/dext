import Link from "next/link";
import AppSidebar from "@/components/AppSidebar";
import GerSettingsEditor from "@/components/GerSettingsEditor";
import { getGerLevelSettings, getTextsorten, isNeonConfigured } from "@/lib/neon";

export default async function GerSettingsPage() {
  const [textsorten, gerLevelSettings] = await Promise.all([getTextsorten(), getGerLevelSettings()]);
  const enabledTextsorten = textsorten.filter((option) => option.enabled).map((option) => option.name);
  const disabledTextsorten = textsorten.filter((option) => !option.enabled).map((option) => option.name);

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
              </div>
              <Link
                href="/generator"
                className="radius-single-line border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 transition-colors hover:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
              >
                Zum Generator
              </Link>
            </div>

            <div>
              <GerSettingsEditor initialSettings={gerLevelSettings} persistenceEnabled={isNeonConfigured()} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
