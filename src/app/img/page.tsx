"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowDownToLine, Check, Copy, Library, RefreshCw, Sparkles } from "lucide-react";
import AppSidebar from "@/components/AppSidebar";

const HANDOFF_STORAGE_KEY = "dext:img:handoff";

const TEXTSORTEN_FALLBACK = [
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
].sort((left, right) => left.localeCompare(right, "de"));

const DISABLED_TEXTSORTEN_FALLBACK = [
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
].sort((left, right) => left.localeCompare(right, "de"));

const MASTER_STYLE_BLOCK = `STYLE: Hand-drawn watercolor illustration with confident ink outlines. Loose, slightly imperfect lines with visible hand-drawn character. Soft watercolor washes with a natural paper feel. Muted, natural palette: warm beiges, soft greys, dusty blues, terracotta accents, sage green, warm browns. FLAT COLORING: Use solid, uniform color areas with minimal shading variation. Large flat color blocks rather than subtle gradients or multiple tones blending together. Simple, direct color application without complex layering. Bold, painterly brushstrokes with soft edges, no harsh contrasts. Artisanal editorial illustration feel, friendly and approachable. No text, no logos, no brand markings, no readable words.`;

const NEGATIVE_STYLE_BLOCK = `NEGATIVE: no photorealism, no 3D rendering, no vector art, no flat design, no bright saturated colors, no neon, no harsh black outlines, no digital gradients, no glossy finish, no AI-generic look, no text, no logos, no watermarks, no complex shading, no subtle color variations, no artistic blending.`;

const MODULES = {
  scene: {
    label: "Overall illustration / scene",
    description: "Narrative, warm and spacious. Best when the source text suggests a situation, interaction, or setting.",
    block: `SCENE: Wide editorial scene, full bleed edge to edge, no border. Multiple characters in natural interaction, diverse body types and ethnicities, expressive faces with subtle smiles. Detailed but not overworked background. Narrative warm atmosphere, soft daylight, balanced composition with clear foreground focus.`,
  },
  architecture: {
    label: "Specific object / architecture",
    description: "Good for buildings, interiors, houses, streets, and structural subjects.",
    block: `SUBJECT: Isolated building on clean white #FFFFFF background, three-quarter perspective. Slightly wobbly architectural lines (not ruler-perfect). Mixed materials visible: brick, wood cladding, plaster, glass. Small details like potted plants and balcony greenery. Soft watercolor shadows. No people, no cars, no surrounding context.`,
  },
  object: {
    label: "Single object / product",
    description: "Clean object illustration with a simple editorial product feel.",
    block: `SUBJECT: Single object isolated on clean white #FFFFFF background, three-quarter angle. Soft fabric folds and natural material rendering. Light grounding shadow underneath. No environment, no props, editorial product illustration feel.`,
  },
  device: {
    label: "Device / UI screen",
    description: "Use for phones, laptops, dashboards, app views, and digital products.",
    block: `SUBJECT: Single device isolated on clean white #FFFFFF background. Abstracted, simplified user interface on screen: placeholder bars instead of real text, generic icons, no readable words, no brand logos. Friendly approachable tech aesthetic, slight imperfections in straight lines.`,
  },
  objects: {
    label: "Object group / icon set",
    description: "Useful when the image should show multiple related items without a full scene.",
    block: `LAYOUT: Collection of separate objects arranged on clean white #FFFFFF background, evenly spaced. Each item rendered in identical hand-drawn watercolor and ink style with consistent line weight. Three-quarter or front views. Small soft shadow beneath each item. No connecting elements, no background context, set-illustration layout.`,
  },
} as const;

type TextsorteApiEntry = {
  name: string;
  enabled: boolean;
};

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

type ImageApiResponse = {
  model: string;
  mimeType: string;
  dataUrl: string;
  base64: string;
  error?: string;
};

type ModuleKey = keyof typeof MODULES;
type SizeOption = "auto" | "1024x1024" | "1536x1024" | "1024x1536";
type BackgroundKey = "auto" | "opaque" | "transparent";
type QualityKey = "auto" | "low" | "medium" | "high";

type AspectRatioOption = {
  id: string;
  label: string;
  size: SizeOption;
};

const ASPECT_RATIO_OPTIONS: AspectRatioOption[] = [
  { id: "square", label: "1:1 Square · 1024×1024", size: "1024x1024" },
  { id: "landscape_4_3", label: "4:3 Landscape · 1536×1024", size: "1536x1024" },
  { id: "portrait_3_4", label: "3:4 Portrait · 1024×1536", size: "1024x1536" },
  { id: "landscape_16_9", label: "16:9 Landscape · 1536×1024", size: "1536x1024" },
  { id: "portrait_9_16", label: "9:16 Portrait · 1024×1536", size: "1024x1536" },
];

const BACKGROUND_OPTIONS: Array<{ id: BackgroundKey; label: string; description: string }> = [
  { id: "auto", label: "Auto", description: "Let the model decide the background" },
  { id: "opaque", label: "Opaque", description: "Solid, non-transparent background" },
  { id: "transparent", label: "Transparent", description: "Transparent background where supported" },
];

const QUALITY_OPTIONS: Array<{ id: QualityKey; label: string }> = [
  { id: "auto", label: "Auto" },
  { id: "low", label: "Low" },
  { id: "medium", label: "Medium" },
  { id: "high", label: "High" },
];

function truncate(value: string, maxLength: number): string {
  const normalized = value.trim().replace(/\s+/g, " ");
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}

function buildSourceBlock(text: LibraryText): string {
  const highlights = [
    `TITLE: ${text.title}`,
    `TEASER: ${truncate(text.teaser, 220)}`,
    `SUMMARY: ${truncate(text.summary, 260)}`,
    text.linguisticSummary ? `LINGUISTIC SUMMARY: ${truncate(text.linguisticSummary, 220)}` : "",
    text.tags.length > 0 ? `TAGS: ${text.tags.slice(0, 8).join(", ")}` : "",
    text.paragraphs.length > 0
      ? `KEY CONTENT: ${text.paragraphs.slice(0, 2).map((paragraph, index) => `${index + 1}. ${truncate(paragraph, 220)}`).join(" ")}`
      : "",
  ].filter(Boolean);

  return `LIBRARY SOURCE (use only for meaning, never quote literally):\n${highlights.join("\n")}`;
}

function buildPrompt(params: {
  text: LibraryText;
  moduleKey: ModuleKey;
  customShow?: string;
  extraInstructions: string;
}): string {
  const moduleBlock = params.moduleKey === "scene"
    ? MODULES.scene.block
    : params.moduleKey === "architecture"
      ? MODULES.architecture.block
      : params.moduleKey === "object"
        ? MODULES.object.block
        : params.moduleKey === "device"
          ? MODULES.device.block
          : MODULES.objects.block;

  const customShow = params.customShow ?? "";
  const customLine = customShow.trim().length > 0
    ? `MAIN VISUAL FOCUS: ${truncate(customShow, 260)}`
    : "";

  const extra = params.extraInstructions.trim().length > 0
    ? `ADDITIONAL INSTRUCTIONS: ${truncate(params.extraInstructions, 500)}`
    : "";

  return [
    "Create one polished editorial illustration based on the selected library text.",
    "The image must be visually inspired by the meaning of the text, not by its wording.",
    "Do not include readable text from the source, and do not reuse exact sentences.",
    "",
    buildSourceBlock(params.text),
    "",
    MASTER_STYLE_BLOCK,
    "",
    NEGATIVE_STYLE_BLOCK,
    "",
    moduleBlock,
    customLine,
    extra,
    "",
    "REQUIREMENTS: visually coherent, educationally usable, calm composition, no text, no logos, no watermarks.",
  ]
    .filter(Boolean)
    .join("\n");
}

export default function ImgPage() {
  const [libraryTexts, setLibraryTexts] = useState<LibraryText[]>([]);
  const [loadingLibrary, setLoadingLibrary] = useState(true);
  const [selectedTextId, setSelectedTextId] = useState<string>("");
  const [librarySearch, setLibrarySearch] = useState("");
  const [libraryLevelFilter, setLibraryLevelFilter] = useState<string>("alle");
  const [libraryTypeFilter, setLibraryTypeFilter] = useState<string>("alle");
  const [enabledTextsorten, setEnabledTextsorten] = useState<string[]>(TEXTSORTEN_FALLBACK);
  const [disabledTextsorten, setDisabledTextsorten] = useState<string[]>(DISABLED_TEXTSORTEN_FALLBACK);

  const [moduleKey, setModuleKey] = useState<ModuleKey>("scene");
  const [subjectFocus, setSubjectFocus] = useState("");
  const [extraInstructions, setExtraInstructions] = useState("");
  const [aspectRatioId, setAspectRatioId] = useState("square");
  const [background, setBackground] = useState<BackgroundKey>("auto");
  const [quality, setQuality] = useState<QualityKey>("auto");

  const [loadingImage, setLoadingImage] = useState(false);
  const [error, setError] = useState("");
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [generatedPrompt, setGeneratedPrompt] = useState("");

  const selectedText = useMemo(
    () => libraryTexts.find((text) => text.id === (selectedTextId || libraryTexts[0]?.id || "")) ?? null,
    [libraryTexts, selectedTextId],
  );
  const effectiveSubjectFocus = subjectFocus.trim().length > 0
    ? subjectFocus.trim()
    : selectedText
      ? truncate(selectedText.summary || selectedText.title, 140)
      : "";

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

  const promptPreview = useMemo(() => {
    if (!selectedText || !effectiveSubjectFocus) {
      return "";
    }

    return buildPrompt({
      text: selectedText,
      moduleKey,
      customShow: effectiveSubjectFocus,
      extraInstructions,
    });
  }, [selectedText, moduleKey, effectiveSubjectFocus, extraInstructions]);

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

        const enabled = data.textsorten.filter((entry) => entry && entry.enabled).map((entry) => entry.name).sort((left, right) => left.localeCompare(right, "de"));
        const disabled = data.textsorten.filter((entry) => entry && !entry.enabled).map((entry) => entry.name).sort((left, right) => left.localeCompare(right, "de"));

        if (!isMounted) {
          return;
        }

        if (enabled.length > 0) {
          setEnabledTextsorten(enabled);
        }
        setDisabledTextsorten(disabled);
      } catch {
        // Keep static fallback if the endpoint is unavailable.
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

        const data = (await response.json()) as { texts?: LibraryText[] };
        if (!Array.isArray(data.texts)) {
          return;
        }

        if (!isMounted) {
          return;
        }

        setLibraryTexts(data.texts);
      } catch {
        // Keep the UI usable even if the API is temporarily unavailable.
      } finally {
        if (isMounted) {
          setLoadingLibrary(false);
        }
      }
    }

    void loadLibraryTexts();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const raw = window.localStorage.getItem(HANDOFF_STORAGE_KEY);
        if (!raw) {
          return;
        }

        const parsed = JSON.parse(raw) as { textId?: string; subjectFocus?: string; extraInstructions?: string };
        if (typeof parsed.textId === "string") {
          setSelectedTextId(parsed.textId);
        }
        if (typeof parsed.subjectFocus === "string" && parsed.subjectFocus.trim().length > 0) {
          setSubjectFocus(parsed.subjectFocus);
        }
        if (typeof parsed.extraInstructions === "string" && parsed.extraInstructions.trim().length > 0) {
          setExtraInstructions(parsed.extraInstructions);
        }
        window.localStorage.removeItem(HANDOFF_STORAGE_KEY);
      } catch {
        window.localStorage.removeItem(HANDOFF_STORAGE_KEY);
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  async function handleGenerate() {
    setError("");
    setImageUrl("");
    setGeneratedPrompt("");

    if (!selectedText) {
      setError("Bitte zuerst einen Text aus der Bibliothek auswählen.");
      return;
    }

    if (!effectiveSubjectFocus) {
      setError("Bitte kurz beschreiben, was im Bild gezeigt werden soll.");
      return;
    }

    const prompt = buildPrompt({
      text: selectedText,
      moduleKey,
      customShow: effectiveSubjectFocus,
      extraInstructions,
    });

    setLoadingImage(true);

    try {
      const aspectRatio = ASPECT_RATIO_OPTIONS.find((opt) => opt.id === aspectRatioId);
      if (!aspectRatio) {
        throw new Error("Invalid aspect ratio selection.");
      }

      const response = await fetch("/api/openai/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          model: "gpt-image-2",
          size: aspectRatio.size,
          background,
          quality,
        }),
      });

      const data = (await response.json()) as ImageApiResponse;
      if (!response.ok) {
        throw new Error(data.error ?? "Image generation failed.");
      }

      setGeneratedPrompt(prompt);
      setImageUrl(data.dataUrl);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Image generation failed.");
    } finally {
      setLoadingImage(false);
    }
  }

  async function handleCopyPrompt() {
    if (!promptPreview) {
      return;
    }

    await navigator.clipboard.writeText(promptPreview);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 1500);
  }

  function handleResetImage() {
    setImageUrl("");
    setGeneratedPrompt("");
    setError("");
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="xl:flex xl:items-start">
        <AppSidebar
          activeHref="/img"
          activeTextsorte={libraryTypeFilter !== "alle" ? libraryTypeFilter : undefined}
          enabledTextsorten={enabledTextsorten}
          disabledTextsorten={disabledTextsorten}
        />

        <main className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <section className="radius-section-card border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h1 className="flex items-center gap-2 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
                  <Sparkles className="h-6 w-6" aria-hidden="true" />
                  dext : img
                </h1>
                <p className="mt-2 max-w-3xl text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                  Choose a text from the library, define what the image should show, and generate a style-controlled editorial illustration with gpt-image-2.
                </p>
              </div>

              <button
                type="button"
                onClick={handleGenerate}
                disabled={loadingImage || !selectedText}
                className="radius-single-line inline-flex items-center justify-center gap-2 bg-sky-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-accent-500 dark:text-zinc-950 dark:hover:bg-accent-400"
              >
                {loadingImage ? <RefreshCw className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Sparkles className="h-4 w-4" aria-hidden="true" />}
                Generate image
              </button>
            </div>

            <div className="mt-5 grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
              <section className="space-y-4">
                <div className="radius-single-line border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950">
                  <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">Library pick</h2>
                  <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                    Search the library and choose the text the image should be based on.
                  </p>

                  <div className="mt-4 grid gap-3 lg:grid-cols-[1.3fr_0.7fr_0.7fr]">
                    <input
                      type="text"
                      value={librarySearch}
                      onChange={(event) => setLibrarySearch(event.target.value)}
                      placeholder="Search title, summary, tags..."
                      className="w-full radius-single-line border border-zinc-300 bg-white px-3 py-2 text-base text-zinc-900 placeholder:text-zinc-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                    />
                    <select
                      value={libraryLevelFilter}
                      onChange={(event) => setLibraryLevelFilter(event.target.value)}
                      className="w-full radius-single-line border border-zinc-300 bg-white px-3 py-2 text-base text-zinc-900 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                    >
                      <option value="alle">Alle Niveaus</option>
                      { ["A1.1", "A1.2", "A2.1", "A2.2", "B1.1", "B1.2"].map((level) => (
                        <option key={level} value={level}>{level}</option>
                      )) }
                    </select>
                    <select
                      value={libraryTypeFilter}
                      onChange={(event) => setLibraryTypeFilter(event.target.value)}
                      className="w-full radius-single-line border border-zinc-300 bg-white px-3 py-2 text-base text-zinc-900 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                    >
                      <option value="alle">Alle Textsorten</option>
                      {enabledTextsorten.map((textsorte) => (
                        <option key={textsorte} value={textsorte}>{textsorte}</option>
                      ))}
                    </select>
                  </div>

                  <div className="mt-4 flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
                    <span>{loadingLibrary ? "Loading library..." : `${filteredLibraryTexts.length} texts found`}</span>
                    <span>{filteredLibraryTexts.length > 8 ? "Scroll for more" : "All visible"}</span>
                  </div>
                </div>

                <div className="max-h-[34rem] space-y-3 overflow-auto pr-1">
                    {filteredLibraryTexts.map((text) => {
                    const isSelected = text.id === selectedTextId;

                    return (
                      <button
                        key={text.id}
                        type="button"
                        onClick={() => setSelectedTextId(text.id)}
                        className={`w-full rounded-2xl border p-4 text-left transition ${
                          isSelected
                            ? "border-sky-400 bg-sky-50 shadow-sm dark:border-accent-500 dark:bg-accent-950/30"
                            : "border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{text.title}</div>
                            <div className="mt-1 text-xs uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                              {text.niveau} · {text.textsorte}
                            </div>
                          </div>
                          {isSelected ? <Check className="h-4 w-4 shrink-0 text-sky-700 dark:text-accent-300" aria-hidden="true" /> : null}
                        </div>

                        <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                          {text.summary}
                        </p>

                        <div className="mt-3 flex flex-wrap gap-2">
                          {text.tags.slice(0, 4).map((tag) => (
                            <span key={`${text.id}-${tag}`} className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </button>
                    );
                  })}

                  {filteredLibraryTexts.length === 0 && !loadingLibrary ? (
                    <div className="rounded-2xl border border-dashed border-zinc-300 px-4 py-8 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
                      No texts match the current filters.
                    </div>
                  ) : null}
                </div>
              </section>

              <section className="space-y-4">
                <div className="radius-single-line border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
                  <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">Image form</h2>

                  <div className="mt-4 grid gap-4">
                    <div>
                      <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">What to show</label>
                      <select
                        value={moduleKey}
                        onChange={(event) => setModuleKey(event.target.value as ModuleKey)}
                        className="mt-1 w-full radius-single-line border border-zinc-300 bg-white px-3 py-2 text-base text-zinc-900 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                      >
                        {Object.entries(MODULES).map(([key, module]) => (
                          <option key={key} value={key}>{module.label}</option>
                        ))}
                      </select>
                      <p className="mt-2 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                        {MODULES[moduleKey].description}
                      </p>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Main subject / focus</label>
                      <textarea
                        value={subjectFocus}
                        onChange={(event) => setSubjectFocus(event.target.value)}
                        rows={4}
                        placeholder="Example: a quiet classroom with a reading corner, or a single notebook on a wooden desk"
                        className="mt-1 w-full radius-single-line border border-zinc-300 bg-white px-3 py-2 text-base text-zinc-900 placeholder:text-zinc-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Extra instructions</label>
                      <textarea
                        value={extraInstructions}
                        onChange={(event) => setExtraInstructions(event.target.value)}
                        rows={3}
                        placeholder="Example: keep the composition minimal, highlight the book on the table, make it suitable for A2 learners"
                        className="mt-1 w-full radius-single-line border border-zinc-300 bg-white px-3 py-2 text-base text-zinc-900 placeholder:text-zinc-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                      />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-3">
                      <div>
                        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Aspect ratio / size</label>
                        <select
                          value={aspectRatioId}
                          onChange={(event) => setAspectRatioId(event.target.value)}
                          className="mt-1 w-full radius-single-line border border-zinc-300 bg-white px-3 py-2 text-base text-zinc-900 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                        >
                          {ASPECT_RATIO_OPTIONS.map((option) => (
                            <option key={option.id} value={option.id}>{option.label}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Background</label>
                        <select
                          value={background}
                          onChange={(event) => setBackground(event.target.value as BackgroundKey)}
                          className="mt-1 w-full radius-single-line border border-zinc-300 bg-white px-3 py-2 text-base text-zinc-900 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                        >
                          {BACKGROUND_OPTIONS.map((option) => (
                            <option key={option.id} value={option.id}>{option.label} · {option.description}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Quality</label>
                        <select
                          value={quality}
                          onChange={(event) => setQuality(event.target.value as QualityKey)}
                          className="mt-1 w-full radius-single-line border border-zinc-300 bg-white px-3 py-2 text-base text-zinc-900 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                        >
                          {QUALITY_OPTIONS.map((option) => (
                            <option key={option.id} value={option.id}>{option.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={handleGenerate}
                        disabled={loadingImage || !selectedText}
                        className="radius-single-line inline-flex items-center justify-center gap-2 bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                      >
                        {loadingImage ? <RefreshCw className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Sparkles className="h-4 w-4" aria-hidden="true" />}
                        Generate image
                      </button>

                      <button
                        type="button"
                        onClick={handleCopyPrompt}
                        disabled={!promptPreview}
                        className="radius-single-line inline-flex items-center justify-center gap-2 border border-zinc-300 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 transition hover:border-zinc-400 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
                      >
                        {copiedPrompt ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
                        {copiedPrompt ? "Copied" : "Copy prompt"}
                      </button>

                      <button
                        type="button"
                        onClick={handleResetImage}
                        className="radius-single-line inline-flex items-center justify-center gap-2 border border-zinc-300 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 transition hover:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
                      >
                        Reset
                      </button>
                    </div>

                    {error ? (
                      <div className="radius-single-line border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
                        {error}
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="radius-single-line border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950">
                  <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">Prompt preview</h3>
                  <textarea
                    readOnly
                    value={promptPreview}
                    rows={13}
                    placeholder="Pick a library text and describe the image to see the prompt preview."
                    className="mt-3 w-full radius-single-line border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-800 placeholder:text-zinc-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                  />
                </div>

                <div className="radius-single-line border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
                  <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">Result</h3>

                  {imageUrl ? (
                    <div className="mt-3 space-y-3">
                      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900">
                        <img src={imageUrl} alt="Generated illustration" className="block h-auto w-full" />
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <a
                          href={imageUrl}
                          download="dext-img.png"
                          className="radius-single-line inline-flex items-center justify-center gap-2 bg-sky-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-800 dark:bg-accent-500 dark:text-zinc-950 dark:hover:bg-accent-400"
                        >
                          <ArrowDownToLine className="h-4 w-4" aria-hidden="true" />
                          Download PNG
                        </a>
                        <button
                          type="button"
                          onClick={handleGenerate}
                          disabled={loadingImage}
                          className="radius-single-line inline-flex items-center justify-center gap-2 border border-zinc-300 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 transition hover:border-zinc-400 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
                        >
                          <RefreshCw className={`h-4 w-4 ${loadingImage ? "animate-spin" : ""}`} aria-hidden="true" />
                          Regenerate
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-3 rounded-2xl border border-dashed border-zinc-300 px-4 py-8 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
                      {generatedPrompt ? "Generation finished without image data." : "Your generated image will appear here."}
                    </div>
                  )}
                </div>

                {selectedText ? (
                  <div className="radius-single-line border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950">
                    <div className="flex items-start gap-3">
                      <Library className="mt-0.5 h-4 w-4 shrink-0 text-zinc-500 dark:text-zinc-400" aria-hidden="true" />
                      <div>
                        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Selected library text</h3>
                        <p className="mt-1 text-xs uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                          {selectedText.niveau} · {selectedText.textsorte} · {selectedText.zielgruppe}
                        </p>
                        <p className="mt-3 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">{selectedText.summary}</p>
                      </div>
                    </div>
                  </div>
                ) : null}
              </section>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}