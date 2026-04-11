"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { createAgencyCustomDoc } from "@/app/(crm)/actions/agency-docs";
import type { AgencyDocType } from "@/lib/crm/agency-custom-doc";

type Props = {
  docType?: AgencyDocType;
  basePath?: string;
};

export default function AgencyNewDocButton({ docType = "doc", basePath = "/docs" }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) {
      setTitle("");
      setDescription("");
      setError(null);
    }
  }, [open]);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await createAgencyCustomDoc({ title, description, docType });
      if ("error" in res && res.error) {
        setError(res.error);
        return;
      }
      if ("slug" in res && res.slug) {
        setOpen(false);
        router.push(`${basePath}/${res.slug}`);
        router.refresh();
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-accent-hover dark:bg-blue-600 dark:hover:bg-blue-500"
      >
        <Plus className="h-4 w-4" aria-hidden />
        New doc
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="agency-new-doc-title"
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/40 dark:bg-black/60"
            aria-label="Close dialog"
            onClick={() => !pending && setOpen(false)}
          />
          <form
            onSubmit={(e) => void onSubmit(e)}
            className="relative z-10 w-full max-w-md rounded-2xl border border-border bg-white p-6 shadow-xl dark:border-zinc-700 dark:bg-zinc-900"
          >
            <h2
              id="agency-new-doc-title"
              className="text-lg font-semibold text-text-primary dark:text-zinc-50"
            >
              New document
            </h2>
            <p className="mt-1 text-sm text-text-secondary dark:text-zinc-400">
              Add a doc to the hub. The page URL is generated automatically from
              the title.
            </p>

            <label className="mt-5 block text-sm font-medium text-text-primary dark:text-zinc-200">
              Title
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-text-primary outline-none ring-accent/0 focus:border-accent/40 focus:ring-2 focus:ring-accent/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                placeholder="e.g. Q1 positioning"
                autoComplete="off"
                required
              />
            </label>

            <label className="mt-4 block text-sm font-medium text-text-primary dark:text-zinc-200">
              Description
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="mt-1.5 w-full resize-y rounded-xl border border-border bg-white px-3 py-2 text-sm text-text-primary outline-none ring-accent/0 focus:border-accent/40 focus:ring-2 focus:ring-accent/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                placeholder="Short summary for the card on the hub"
                required
              />
            </label>

            {error ? (
              <p className="mt-3 text-sm text-red-600 dark:text-red-400">
                {error}
              </p>
            ) : null}

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                disabled={pending}
                onClick={() => setOpen(false)}
                className="rounded-xl px-4 py-2 text-sm font-medium text-text-secondary hover:bg-surface disabled:opacity-50 dark:text-zinc-400 dark:hover:bg-zinc-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={pending}
                className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-50 dark:bg-blue-600 dark:hover:bg-blue-500"
              >
                {pending ? "Creating…" : "Create"}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </>
  );
}
