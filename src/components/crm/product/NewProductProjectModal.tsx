"use client";

import { useState, type FormEvent } from "react";
import { createCrmChildProject } from "@/app/(crm)/actions/projects";
import { PLAN_LABELS, type PlanStage } from "@/lib/crm/mock-data";
import { Loader2, X } from "lucide-react";

const PLANS: PlanStage[] = ["pipeline", "planning", "mvp", "growth"];

type Props = {
  productId: string;
  open: boolean;
  onClose: () => void;
  onCreated: (childId: string) => void;
};

export default function NewProductProjectModal({
  productId,
  open,
  onClose,
  onCreated,
}: Props) {
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [description, setDescription] = useState("");
  const [plan, setPlan] = useState<PlanStage>("pipeline");
  const [targetDate, setTargetDate] = useState("");
  const [milestoneRows, setMilestoneRows] = useState<string[]>([
    "Design",
    "Development",
    "Testing",
  ]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  function reset() {
    setTitle("");
    setSummary("");
    setDescription("");
    setPlan("pipeline");
    setTargetDate("");
    setMilestoneRows(["Design", "Development", "Testing"]);
    setError(null);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const t = title.trim();
    if (!t) return;
    setPending(true);
    setError(null);
    const res = await createCrmChildProject(productId, {
      title: t,
      summary: summary.trim() || null,
      description: description.trim() || null,
      plan_stage: plan,
      target_date: targetDate.trim() || null,
      milestoneTitles: milestoneRows.map((m) => m.trim()).filter(Boolean),
    });
    setPending(false);
    if ("error" in res) {
      setError(res.error);
      return;
    }
    reset();
    onClose();
    onCreated(res.id);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 py-10"
      role="presentation"
      onClick={onClose}
    >
      <form
        className="w-full max-w-2xl rounded-2xl border border-border bg-white shadow-xl dark:border-zinc-700 dark:bg-zinc-900"
        onClick={(e) => e.stopPropagation()}
        onSubmit={onSubmit}
      >
        <div className="flex items-center justify-between border-b border-border px-6 py-4 dark:border-zinc-800">
          <h2 className="text-lg font-semibold text-text-primary dark:text-zinc-100">
            New project
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-text-secondary hover:bg-surface dark:hover:bg-zinc-800"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-5 px-6 py-5">
          <div>
            <input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full border-0 border-b border-transparent bg-transparent text-2xl font-semibold text-text-primary outline-none placeholder:text-zinc-400 focus:border-border dark:text-zinc-100"
              placeholder="Project name"
            />
            <input
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              className="mt-2 w-full border-0 bg-transparent text-sm text-text-secondary outline-none placeholder:text-zinc-500 dark:text-zinc-400"
              placeholder="Add a short summary…"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {PLANS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPlan(p)}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                  plan === p
                    ? "border-accent bg-accent/10 text-accent dark:border-blue-500 dark:bg-blue-500/15 dark:text-blue-400"
                    : "border-border text-text-secondary hover:border-accent/30 dark:border-zinc-700 dark:text-zinc-400"
                }`}
              >
                {PLAN_LABELS[p]}
              </button>
            ))}
            <input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="rounded-full border border-border px-3 py-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-800"
              title="Target date"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-text-secondary dark:text-zinc-500">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="w-full rounded-xl border border-border px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800"
              placeholder="Write a description, a project brief, or collect ideas…"
            />
          </div>

          <div className="rounded-xl border border-border p-4 dark:border-zinc-800">
            <p className="text-xs font-semibold uppercase tracking-wider text-text-secondary dark:text-zinc-500">
              Milestones
            </p>
            <ul className="mt-3 space-y-2">
              {milestoneRows.map((row, idx) => (
                <li key={idx} className="flex gap-2">
                  <span className="pt-2 text-text-secondary" aria-hidden>
                    ◇
                  </span>
                  <input
                    value={row}
                    onChange={(e) =>
                      setMilestoneRows((prev) =>
                        prev.map((x, i) => (i === idx ? e.target.value : x))
                      )
                    }
                    className="min-w-0 flex-1 rounded-lg border border-border px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setMilestoneRows((prev) => prev.filter((_, i) => i !== idx))
                    }
                    className="rounded-lg px-2 text-text-secondary hover:text-red-600"
                    aria-label="Remove"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => setMilestoneRows((prev) => [...prev, ""])}
              className="mt-3 text-sm font-medium text-accent hover:underline"
            >
              + Add milestone
            </button>
          </div>

          {error ? (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          ) : null}
        </div>

        <div className="flex justify-end gap-2 border-t border-border px-6 py-4 dark:border-zinc-800">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-border px-4 py-2 text-sm font-medium dark:border-zinc-600"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={pending || !title.trim()}
            className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 dark:bg-blue-600"
          >
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : null}
            Create project
          </button>
        </div>
      </form>
    </div>
  );
}
