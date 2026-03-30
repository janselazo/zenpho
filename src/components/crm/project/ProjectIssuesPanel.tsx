"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createCrmIssue,
  deleteCrmIssue,
  listIssuesForPhase,
  updateCrmIssue,
  type IssueRow,
} from "@/app/(crm)/actions/projects";
import {
  ISSUE_CATEGORY_OPTIONS,
  issueCategoryLabel,
  type IssueCategoryValue,
} from "@/lib/crm/issue-categories";
import { Loader2, Trash2 } from "lucide-react";

const SEVERITIES = ["low", "medium", "high", "critical"] as const;
const STATUSES = ["open", "in_progress", "resolved", "closed"] as const;

export default function ProjectIssuesPanel({
  phaseId,
}: {
  phaseId: string;
}) {
  const [issues, setIssues] = useState<IssueRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [severity, setSeverity] = useState<string>("medium");
  const [category, setCategory] = useState<IssueCategoryValue>("bug_report");
  const [categoryFilter, setCategoryFilter] = useState<
    "all" | IssueCategoryValue
  >("all");
  const [pending, setPending] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await listIssuesForPhase(phaseId);
    setLoading(false);
    if (res.error) {
      setError(res.error);
      setIssues([]);
      return;
    }
    setIssues(res.issues);
  }, [phaseId]);

  useEffect(() => {
    void load();
  }, [load]);

  const visibleIssues = useMemo(() => {
    if (categoryFilter === "all") return issues;
    return issues.filter((i) => i.category === categoryFilter);
  }, [issues, categoryFilter]);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    const t = title.trim();
    if (!t) return;
    setPending(true);
    setError(null);
    const res = await createCrmIssue({
      phaseId,
      title: t,
      description: description.trim() || null,
      severity,
      category,
    });
    setPending(false);
    if ("error" in res && res.error) {
      setError(res.error);
      return;
    }
    setTitle("");
    setDescription("");
    await load();
  }

  return (
    <div className="space-y-6">
      <form
        onSubmit={onCreate}
        className="rounded-2xl border border-border bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900"
      >
        <h3 className="text-sm font-semibold text-text-primary dark:text-zinc-100">
          Log issue
        </h3>
        <p className="mt-1 text-xs text-text-secondary dark:text-zinc-500">
          Track bugs and feedback discovered during testing.
        </p>
        <div className="mt-4 space-y-3">
          <input
            className="w-full rounded-xl border border-border px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800"
            placeholder="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <textarea
            className="min-h-[72px] w-full rounded-xl border border-border px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800"
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <div className="flex flex-wrap items-center gap-3">
            <label className="text-xs font-medium text-text-secondary">
              Severity
              <select
                className="ml-2 rounded-lg border border-border px-2 py-1 text-sm dark:border-zinc-600 dark:bg-zinc-800"
                value={severity}
                onChange={(e) => setSeverity(e.target.value)}
              >
                {SEVERITIES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-medium text-text-secondary">
              Category
              <select
                className="ml-2 rounded-lg border border-border px-2 py-1 text-sm dark:border-zinc-600 dark:bg-zinc-800"
                value={category}
                onChange={(e) =>
                  setCategory(e.target.value as IssueCategoryValue)
                }
              >
                {ISSUE_CATEGORY_OPTIONS.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="submit"
              disabled={pending || !title.trim()}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {pending ? "Saving…" : "Add issue"}
            </button>
          </div>
        </div>
      </form>

      {error ? (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      ) : null}

      <div className="rounded-2xl border border-border bg-white dark:border-zinc-700 dark:bg-zinc-900">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3 dark:border-zinc-700">
          <h3 className="text-sm font-semibold text-text-primary dark:text-zinc-100">
            Issues
          </h3>
          <label className="flex items-center gap-2 text-xs text-text-secondary">
            <span>Category</span>
            <select
              value={categoryFilter}
              onChange={(e) =>
                setCategoryFilter(e.target.value as "all" | IssueCategoryValue)
              }
              className="rounded-lg border border-border px-2 py-1 text-sm text-text-primary dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
            >
              <option value="all">All</option>
              {ISSUE_CATEGORY_OPTIONS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        {loading ? (
          <div className="flex items-center gap-2 p-8 text-sm text-text-secondary">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading…
          </div>
        ) : issues.length === 0 ? (
          <p className="p-8 text-sm text-text-secondary">
            No issues yet. Add one when testing surfaces a problem.
          </p>
        ) : visibleIssues.length === 0 ? (
          <p className="p-8 text-sm text-text-secondary">
            No issues in this category.
          </p>
        ) : (
          <ul className="divide-y divide-border dark:divide-zinc-700">
            {visibleIssues.map((issue) => (
              <li
                key={issue.id}
                className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="font-medium text-text-primary dark:text-zinc-100">
                    {issue.title}
                  </p>
                  <p className="mt-0.5 text-xs text-text-secondary">
                    {issueCategoryLabel(issue.category)}
                  </p>
                  {issue.description ? (
                    <p className="mt-1 text-sm text-text-secondary">
                      {issue.description}
                    </p>
                  ) : null}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    className="rounded-lg border border-border px-2 py-1 text-xs dark:border-zinc-600 dark:bg-zinc-800"
                    value={issue.status}
                    onChange={async (e) => {
                      const res = await updateCrmIssue(issue.id, {
                        status: e.target.value,
                      });
                      if ("error" in res && res.error) setError(res.error);
                      else void load();
                    }}
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s.replace("_", " ")}
                      </option>
                    ))}
                  </select>
                  <select
                    className="rounded-lg border border-border px-2 py-1 text-xs dark:border-zinc-600 dark:bg-zinc-800"
                    value={issue.severity}
                    onChange={async (e) => {
                      const res = await updateCrmIssue(issue.id, {
                        severity: e.target.value,
                      });
                      if ("error" in res && res.error) setError(res.error);
                      else void load();
                    }}
                  >
                    {SEVERITIES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                  <select
                    className="max-w-[10rem] rounded-lg border border-border px-2 py-1 text-xs dark:border-zinc-600 dark:bg-zinc-800"
                    value={issue.category}
                    onChange={async (e) => {
                      const res = await updateCrmIssue(issue.id, {
                        category: e.target.value,
                      });
                      if ("error" in res && res.error) setError(res.error);
                      else void load();
                    }}
                    aria-label="Issue category"
                  >
                    {ISSUE_CATEGORY_OPTIONS.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="rounded-lg p-2 text-text-secondary hover:bg-surface hover:text-red-600 dark:hover:bg-zinc-800"
                    aria-label="Delete issue"
                    onClick={async () => {
                      if (!confirm("Delete this issue?")) return;
                      const res = await deleteCrmIssue(issue.id);
                      if ("error" in res && res.error) setError(res.error);
                      else void load();
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
