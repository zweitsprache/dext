"use client";

import { X } from "lucide-react";
import { useEffect, useState } from "react";

type ResultData = {
  title: string;
  teaser: string;
  paragraphs: string[];
  glossary: Array<{ lemma: string; explanation: string }>;
};

type PublishDialogProps = {
  isOpen: boolean;
  result: ResultData | null;
  onClose: () => void;
  onPublish: (data: PublishFormData) => Promise<void>;
  isLoading?: boolean;
};

export type PublishFormData = {
  title: string;
  summary: string;
  paragraphs: string[];
  imagePrompt?: string;
  isPublic: boolean;
};

export default function PublishDialog({ isOpen, result, onClose, onPublish, isLoading }: PublishDialogProps) {
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [generateImage, setGenerateImage] = useState(false);
  const [imagePrompt, setImagePrompt] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (result) {
      setTitle(result.title || "");
      setSummary(result.teaser || "");
    }
  }, [result]);

  if (!isOpen || !result) {
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setPublishing(true);
    const currentResult = result;

    try {
      if (!currentResult) {
        setError("No result available");
        return;
      }

      if (!title.trim()) {
        setError("Title is required");
        return;
      }
      if (!summary.trim()) {
        setError("Summary is required");
        return;
      }

      await onPublish({
        title: title.trim(),
        summary: summary.trim(),
        paragraphs: currentResult.paragraphs,
        imagePrompt: generateImage ? imagePrompt.trim() || undefined : undefined,
        isPublic,
      });

      // Reset form on success
      setTitle("");
      setSummary("");
      setImagePrompt("");
      setGenerateImage(false);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to publish");
    } finally {
      setPublishing(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="w-full max-w-2xl rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Publish to Library</h2>
          <button
            onClick={onClose}
            disabled={publishing}
            className="text-zinc-500 transition-colors hover:text-zinc-700 disabled:opacity-50 dark:text-zinc-400 dark:hover:text-zinc-300"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          {error && (
            <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="pub-title" className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Title
            </label>
            <input
              id="pub-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Text title"
              disabled={publishing || isLoading}
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-sky-500 disabled:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:placeholder:text-zinc-500"
            />
          </div>

          <div>
            <label htmlFor="pub-summary" className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Summary
            </label>
            <textarea
              id="pub-summary"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Brief description of the text"
              rows={3}
              disabled={publishing || isLoading}
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-sky-500 disabled:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:placeholder:text-zinc-500"
            />
          </div>

          <div className="space-y-3 rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950">
            <div className="flex items-center gap-3">
              <input
                id="pub-generate-image"
                type="checkbox"
                checked={generateImage}
                onChange={(e) => setGenerateImage(e.target.checked)}
                disabled={publishing || isLoading}
                className="h-4 w-4 rounded border-zinc-300"
              />
              <label htmlFor="pub-generate-image" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Generate illustration image
              </label>
            </div>

            {generateImage && (
              <div>
                <label htmlFor="pub-image-prompt" className="mb-2 block text-sm text-zinc-600 dark:text-zinc-400">
                  Image prompt (optional - will use text content if empty)
                </label>
                <textarea
                  id="pub-image-prompt"
                  value={imagePrompt}
                  onChange={(e) => setImagePrompt(e.target.value)}
                  placeholder="Describe the image you want generated..."
                  rows={2}
                  disabled={publishing || isLoading}
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-sky-500 disabled:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                />
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <input
              id="pub-public"
              type="checkbox"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              disabled={publishing || isLoading}
              className="h-4 w-4 rounded border-zinc-300"
            />
            <label htmlFor="pub-public" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Make this text publicly visible
            </label>
          </div>
        </form>

        {/* Footer */}
        <div className="flex gap-3 border-t border-zinc-200 bg-zinc-50 px-6 py-4 dark:border-zinc-800 dark:bg-zinc-950">
          <button
            onClick={onClose}
            disabled={publishing || isLoading}
            className="flex-1 rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:border-zinc-400 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-zinc-600"
          >
            Cancel
          </button>
          <button
            onClick={(e) => {
              const container = (e.currentTarget as HTMLElement).closest("div");
              const form = container?.querySelector("form");
              if (form) {
                form.dispatchEvent(new Event("submit", { bubbles: true }));
              }
            }}
            disabled={publishing || isLoading}
            className="flex-1 rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-sky-700 disabled:bg-sky-300 dark:bg-accent-700 dark:hover:bg-accent-600 dark:disabled:bg-accent-900"
          >
            {publishing ? "Publishing..." : "Publish"}
          </button>
        </div>
      </div>
    </div>
  );
}
