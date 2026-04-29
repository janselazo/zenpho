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
  createWorkItem,
} from "@/app/(crm)/actions/product-manager";
import CrmGroupedList, { type CrmListGroup } from "@/components/crm/product/CrmGroupedList";
import {
  ISSUE_CATEGORY_OPTIONS,
  issueCategoryLabel,
  type IssueCategoryValue,
} from "@/lib/crm/issue-categories";
import {
  BUG_ISSUE_STATUS_SET,
  BUG_STATUS_GROUPS,
  BUG_STATUS_LABELS,
  type BugIssueStatus,
} from "@/lib/crm/product-manager-types";
import { Circle, Loader2 } from "lucide-react";

function normalizeIssueStatus(status: string): string {
  const s = status.trim().toLowerCase();
  if (s === "open") return "new";
  if (s === "resolved" || s === "closed") return "fixed";
  return status;
}

function bucketBugStatus(status: string): BugIssueStatus {
  const n = normalizeIssueStatus(status);
  if (BUG_ISSUE_STATUS_SET.has(n)) return n as BugIssueStatus;
  return "new";
}

const STATUS_CYCLE: string[] = [
  "new",
  "confirmed",
  "in_progress",
  "ready_for_qa",
  "fixed",
  "rejected",
  "reopened",
];

function shortRef(id: string) {
  const tail = id.replace(/-/g, "").slice(0, 4);
  return `ISS-${tail.toUpperCase()}`;
}

type Props = { productId: string; projectId: string };

export default function ProductIssuesLinearTab({ productId, projectId }: Props) {
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

  const [env, setEnv] = useState("");
  const [browser, setBrowser] = useState("");
  const [steps, setSteps] = useState("");
  const [expected, setExpected] = useState("");
  const [actual, setActual] = useState("");

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
    return BUG_STATUS_GROUPS.map((g) => ({
      id: g.id,
      label: g.label,
      items: filteredIssues.filter((i) =>
        g.statuses.includes(bucketBugStatus(i.status))
      ),
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
    const newId = "id" in res ? res.id : null;
    if (newId) {
      const patch: Parameters<typeof updateCrmIssue>[1] = {};
      if (env.trim()) patch.environment = env.trim();
      if (browser.trim()) patch.browser_device = browser.trim();
      if (steps.trim()) patch.steps_to_reproduce = steps.trim();
      if (expected.trim()) patch.expected_result = expected.trim();
      if (actual.trim()) patch.actual_result = actual.trim();
      if (Object.keys(patch).length > 0) {
        await updateCrmIssue(newId, patch);
      }
    }
    setTitle("");
    setDescription("");
    setEnv("");
    setBrowser("");
    setSteps("");
    setExpected("");
    setActual("");
    await load();
  }

  async function convertToTask(issue: IssueRow) {
    if (issue.workspace_task_id) return;
    setConvertBusy(issue.id);
    setError(null);
    const res = await createWorkItem(productId, projectId, {
      title: issue.title,
      description: issue.description ?? null,
      item_type: "bug",
      sprint_id: null,
      board_status: "ready",
    });
    if ("error" in res && res.error) {
      setError(res.error);
      setConvertBusy(null);
      return;
    }
    const wid = "ok" in res ? res.id : null;
    if (!wid) {
      setError("Could not create work item.");
      setConvertBusy(null);
      return;
    }
    const up = await updateCrmIssue(issue.id, {
      workspace_task_id: wid,
      status: "confirmed",
    });
    setConvertBusy(null);
    if ("error" in up && up.error) {
      setError(up.error);
      return;
    }
    await load();
  }

  function cycleStatus(current: string): string {
    const n = normalizeIssueStatus(current);
    const idx = STATUS_CYCLE.indexOf(n);
    const next = STATUS_CYCLE[idx === -1 ? 0 : (idx + 1) % STATUS_CYCLE.length];
    return next ?? "new";
  }

  function statusDotColor(status: string) {
    const n = normalizeIssueStatus(status);
    switch (n) {
      case "fixed":
      case "rejected":
        return "#6b7280";
      case "in_progress":
      case "ready_for_qa":
        return "#3b82f6";
      case "confirmed":
      case "reopened":
        return "#f59e0b";
      default:
        return "#ef4444";
    }
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
      <div className="rounded-xl border border-border bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900/60">
        <h3 className="text-sm font-semibold text-text-primary dark:text-zinc-100">
          Report bug
        </h3>
        <p className="mt-1 text-xs text-text-secondary dark:text-zinc-500">
          QA lifecycle: new → confirmed → in progress → ready for QA → fixed /
          rejected. Convert to a backlog item when you are ready to schedule work.
        </p>
        <form onSubmit={onCreate} className="mt-4 space-y-3">
          <div className="grid gap-3 sm:grid-cols-3">
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
              {(["low", "medium", "high", "critical"] as const).map((s) => (
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
            className="w-full rounded-lg border border-border px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800"
            placeholder="Description (optional)"
            rows={2}
          />
          <div className="grid gap-2 sm:grid-cols-2">
            <input
              value={env}
              onChange={(e) => setEnv(e.target.value)}
              className="rounded-lg border border-border px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800"
              placeholder="Environment (optional)"
            />
            <input
              value={browser}
              onChange={(e) => setBrowser(e.target.value)}
              className="rounded-lg border border-border px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800"
              placeholder="Browser / device (optional)"
            />
          </div>
          <textarea
            value={steps}
            onChange={(e) => setSteps(e.target.value)}
            className="w-full rounded-lg border border-border px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800"
            placeholder="Steps to reproduce (optional)"
            rows={2}
          />
          <div className="grid gap-2 sm:grid-cols-2">
            <textarea
              value={expected}
              onChange={(e) => setExpected(e.target.value)}
              className="rounded-lg border border-border px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800"
              placeholder="Expected result"
              rows={2}
            />
            <textarea
              value={actual}
              onChange={(e) => setActual(e.target.value)}
              className="rounded-lg border border-border px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800"
              placeholder="Actual result"
              rows={2}
            />
          </div>
          <button
            type="submit"
            disabled={pending || !title.trim()}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {pending ? "Saving…" : "Report bug"}
          </button>
        </form>
      </div>

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
            const st = normalizeIssueStatus(issue.status);
            const stLabel =
              BUG_STATUS_LABELS[st as keyof typeof BUG_STATUS_LABELS] ?? st;
            return (
              <div className="flex flex-wrap items-center gap-3 px-3 py-2.5 text-sm hover:bg-surface/80 dark:hover:bg-zinc-800/50">
                <button
                  type="button"
                  onClick={async () => {
                    const next = cycleStatus(issue.status);
                    await updateCrmIssue(issue.id, { status: next });
                    await load();
                  }}
                  className="shrink-0"
                  aria-label="Cycle status"
                >
                  <Circle
                    className="h-4 w-4"
                    style={{ color: statusDotColor(issue.status) }}
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
                    {stLabel}
                    {linked ? " · linked to work item" : ""}
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
