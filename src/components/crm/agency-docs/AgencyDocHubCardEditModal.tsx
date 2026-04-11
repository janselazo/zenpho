"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { updateAgencyDocHubCard } from "@/app/(crm)/actions/agency-docs";
import type { AgencyDocType } from "@/lib/crm/agency-custom-doc";

type AgencyDocHubCardEditModalProps = {
  slug: string;
  initialTitle: string;
  initialDescription: string;
  open: boolean;
  onClose: () => void;
  docType?: AgencyDocType;
};

export default function AgencyDocHubCardEditModal({
  slug,
  initialTitle,
  initialDescription,
  open,
  onClose,
  docType = "doc",
}: AgencyDocHubCardEditModalProps) {
  const router = useRouter();
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setTitle(initialTitle);
      setDescription(initialDescription);
      setError(null);
    }
  }, [open, initialTitle, initialDescription]);

  if (!open) return null;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const res = await updateAgencyDocHubCard(slug, title, description, docType);
    setPending(false);
    if ("error" in res && res.error) {
      setError(res.error);
      return;
    }
    onClose();
    router.refresh();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="agency-doc-card-edit-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/40 dark:bg-black/60"
        aria-label="Close dialog"
        onClick={onClose}
      />
      <form
        onSubmit={(e) => void onSubmit(e)}
        className="relative z-10 w-full max-w-md rounded-2xl border border-border bg-white p-6 shadow-xl dark:border-zinc-700 dark:bg-zinc-900"
      >
        <h2
          id="agency-doc-card-edit-title"
          className="text-lg font-semibold text-text-primary dark:text-zinc-50"
        >
          Edit card
        </h2>
        <p className="mt-1 text-sm text-text-secondary dark:text-zinc-400">
          Updates the title and description on the hub. The document URL is
          unchanged.
        </p>

        <label className="mt-5 block text-sm font-medium text-text-primary dark:text-zinc-200">
          Title
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-text-primary outline-none ring-accent/0 focus:border-accent/40 focus:ring-2 focus:ring-accent/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            autoComplete="off"
            required
          />
        </label>

        <label className="mt-4 block text-sm font-medium text-text-primary dark:text-zinc-200">
          Description
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className="mt-1.5 w-full resize-y rounded-xl border border-border bg-white px-3 py-2 text-sm text-text-primary outline-none ring-accent/0 focus:border-accent/40 focus:ring-2 focus:ring-accent/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            required
          />
        </label>

        {error ? (
          <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>
        ) : null}

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-4 py-2 text-sm font-medium text-text-secondary hover:bg-surface dark:text-zinc-400 dark:hover:bg-zinc-800"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={pending}
            className="rounded-xl bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50 dark:bg-blue-600 dark:hover:bg-blue-500"
          >
            {pending ? "Saving…" : "Save"}
          </button>
        </div>
      </form>
    </div>
  );
}
