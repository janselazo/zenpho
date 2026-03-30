"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createCrmIssue,
  deleteCrmIssue,
  listIssuesForPhase,
  updateCrmIssue,
  type IssueRow,
} from "@/app/(crm)/actions/projects";
import { useProjectWorkspace } from "@/lib/crm/use-project-workspace";
import CrmGroupedList, { type CrmListGroup } from "@/components/crm/product/CrmGroupedList";
import {
  ISSUE_CATEGORY_OPTIONS,
  issueCategoryLabel,
  type IssueCategoryValue,
} from "@/lib/crm/issue-categories";
import { Circle, Loader2 } from "lucide-react";

const ISSUE_GROUPS: { id: string; label: string; statuses: string[] }[] = [
  { id: "open", label: "Open", statuses: ["open"] },
  { id: "progress", label: "In progress", statuses: ["in_progress"] },
  { id: "resolved", label: "Resolved", statuses: ["resolved"] },
  { id: "closed", label: "Closed", statuses: ["closed"] },
];

const SEVERITIES = ["low", "medium", "high", "critical"] as const;

function shortRef(id: string) {
  const tail = id.replace(/-/g, "").slice(0, 4);
  return `ISS-${tail.toUpperCase()}`;
}

type Props = { projectId: string };

export default function ProductIssuesLinearTab({ projectId }: Props) {
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
  const [convertBusy, setConvertBusy] = useState<string | null>(null);

  const { addTask } = useProjectWorkspace(projectId);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await listIssuesForPhase(projectId);
    setLoading(false);
    if (res.error) {
      setError(res.error);
      setIssues([]);
      return;
    }
    setIssues(res.issues);
  }, [projectId]);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredIssues = useMemo(() => {
    if (categoryFilter === "all") return issues;
    return issues.filter((i) => i.category === categoryFilter);
  }, [issues, categoryFilter]);

  const groups: CrmListGroup<IssueRow>[] = useMemo(() => {
    return ISSUE_GROUPS.map((g) => ({
      id: g.id,
      label: g.label,
      items: filteredIssues.filter((i) => g.statuses.includes(i.status)),
    }));
  }, [filteredIssues]);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    const t = title.trim();
    if (!t) return;
    setPending(true);
    setError(null);
    const res = await createCrmIssue({
      phaseId: projectId,
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

  async function convertToTask(issue: IssueRow) {
    if (issue.workspace_task_id) return;
    setConvertBusy(issue.id);
    setError(null);
    const tid = addTask({
      title: issue.title,
      status: "not_started",
      sprintId: null,
      description: issue.description ?? undefined,
    });
    if (!tid) {
      setError("Could not create task.");
      setConvertBusy(null);
      return;
    }
    const up = await updateCrmIssue(issue.id, {
      workspace_task_id: tid,
      status: "resolved",
    });
    setConvertBusy(null);
    if ("error" in up && up.error) {
      setError(up.error);
      return;
    }
    await load();
  }

  if (loading && issues.length === 0) {
    return (
      <p className="flex items-center gap-2 text-sm text-text-secondary">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        Loading issues…
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <form
        onSubmit={onCreate}
        className="rounded-xl border border-border bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900/60"
      >
        <h3 className="text-sm font-semibold text-text-primary dark:text-zinc-100">
          Log issue
        </h3>
        <p className="mt-1 text-xs text-text-secondary dark:text-zinc-500">
          Bugs and client requests. Convert to a task when you are ready to schedule work.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="rounded-lg border border-border px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800 sm:col-span-1"
            placeholder="Title"
          />
          <select
            value={severity}
            onChange={(e) => setSeverity(e.target.value)}
            className="rounded-lg border border-border px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800"
            aria-label="Priority"
          >
            {SEVERITIES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <select
            value={category}
            onChange={(e) =>
              setCategory(e.target.value as IssueCategoryValue)
            }
            className="rounded-lg border border-border px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800"
            aria-label="Category"
          >
            {ISSUE_CATEGORY_OPTIONS.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="mt-3 w-full rounded-lg border border-border px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800"
          placeholder="Description (optional)"
          rows={2}
        />
        <button
          type="submit"
          disabled={pending || !title.trim()}
          className="mt-3 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {pending ? "Saving…" : "Add issue"}
        </button>
      </form>

      {error ? (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-text-secondary dark:text-zinc-500">
          Filter by category
        </span>
        <select
          value={categoryFilter}
          onChange={(e) =>
            setCategoryFilter(e.target.value as "all" | IssueCategoryValue)
          }
          className="rounded-lg border border-border px-3 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-800"
          aria-label="Filter issues by category"
        >
          <option value="all">All categories</option>
          {ISSUE_CATEGORY_OPTIONS.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      {issues.length > 0 && filteredIssues.length === 0 ? (
        <p className="text-sm text-text-secondary dark:text-zinc-500">
          No issues match this category.
        </p>
      ) : (
      <CrmGroupedList
        groups={groups}
        getItemKey={(i) => i.id}
        renderRow={(issue) => {
          const linked = Boolean(issue.workspace_task_id);
          return (
            <div className="flex flex-wrap items-center gap-3 px-3 py-2.5 text-sm hover:bg-surface/80 dark:hover:bg-zinc-800/50">
              <button
                type="button"
                onClick={async () => {
                  const next =
                    issue.status === "open"
                      ? "in_progress"
                      : issue.status === "in_progress"
                        ? "resolved"
                        : issue.status === "resolved"
                          ? "closed"
                          : "open";
                  await updateCrmIssue(issue.id, { status: next });
                  await load();
                }}
                className="shrink-0"
                aria-label="Cycle status"
              >
                <Circle
                  className="h-4 w-4"
                  style={{
                    color:
                      issue.status === "closed"
                        ? "#6b7280"
                        : issue.status === "resolved"
                          ? "#10b981"
                          : issue.status === "in_progress"
                            ? "#3b82f6"
                            : "#f59e0b",
                  }}
                  fill="currentColor"
                  fillOpacity={0.2}
                  aria-hidden
                />
              </button>
              <span className="w-14 shrink-0 font-mono text-xs text-text-secondary dark:text-zinc-500">
                {shortRef(issue.id)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-text-primary dark:text-zinc-100">
                  {issue.title}
                </p>
                <p className="text-xs text-text-secondary dark:text-zinc-500">
                  {issueCategoryLabel(issue.category)} · {issue.severity} ·{" "}
                  {issue.status}
                  {linked ? " · linked to task" : ""}
                </p>
              </div>
              {!linked ? (
                <button
                  type="button"
                  disabled={convertBusy === issue.id}
                  onClick={() => void convertToTask(issue)}
                  className="shrink-0 rounded-lg border border-border px-2 py-1 text-xs font-medium dark:border-zinc-600"
                >
                  {convertBusy === issue.id ? "…" : "Convert to task"}
                </button>
              ) : null}
              <button
                type="button"
                onClick={async () => {
                  if (confirm("Delete this issue?")) {
                    await deleteCrmIssue(issue.id);
                    await load();
                  }
                }}
                className="shrink-0 text-xs text-red-600 hover:underline dark:text-red-400"
              >
                Delete
              </button>
            </div>
          );
        }}
      />
      )}
    </div>
  );
}
