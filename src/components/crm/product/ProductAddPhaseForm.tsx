"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createCrmPhase } from "@/app/(crm)/actions/projects";

export default function ProductAddPhaseForm({
  productId,
}: {
  productId: string;
}) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const t = title.trim();
    if (!t) return;
    setPending(true);
    setError(null);
    const res = await createCrmPhase(productId, t);
    setPending(false);
    if ("error" in res && res.error) {
      setError(res.error);
      return;
    }
    setTitle("");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
        Add phase
      </h3>
      <p className="text-xs text-text-secondary dark:text-zinc-500">
        e.g. UI redesign, API build, or a named release.
      </p>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          className="min-w-0 flex-1 rounded-xl border border-border px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800"
          placeholder="Phase name"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <button
          type="submit"
          disabled={pending || !title.trim()}
          className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {pending ? "Adding…" : "Add phase"}
        </button>
      </div>
      {error ? (
        <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
      ) : null}
    </form>
  );
}
