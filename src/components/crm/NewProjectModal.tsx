"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import CrmPopoverDateField from "@/components/crm/CrmPopoverDateField";
import { useCrmTeamMembers } from "@/lib/crm/use-crm-team-members";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { NewProjectDealPrefill } from "@/lib/crm/new-project-deal-prefill";
import {
  DEFAULT_LEAD_PROJECT_TYPE,
  LEAD_PROJECT_TYPE_OPTIONS,
  PLAN_LABELS,
  PLAN_STAGE_ORDER,
  type MockProject,
} from "@/lib/crm/mock-data";
import { createProjectId } from "@/lib/crm/projects-storage";

export type { NewProjectDealPrefill } from "@/lib/crm/new-project-deal-prefill";

type ClientPickerRow = {
  id: string;
  name: string | null;
  email: string | null;
  company: string | null;
};

function clientPickerLabel(c: ClientPickerRow): string {
  const parts = [c.name?.trim(), c.company?.trim()].filter(Boolean) as string[];
  if (parts.length > 0) return parts.join(" · ");
  return c.email?.trim() || "Unnamed client";
}

function endDateInputValue(p: MockProject): string {
  const raw = p.expectedEndDate?.trim() ?? "";
  if (!raw || raw === "TBD") return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const t = Date.parse(raw);
  if (Number.isNaN(t)) return "";
  const d = new Date(t);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function NewProjectModal({
  dealPrefill,
  lockedClientId = null,
  lockedClientTitleHint = null,
  /** When set, submit uses create-from-lead path (client may be auto-created). */
  fromLeadId = null,
  editProject = null,
  leadProjectTypeOptions = LEAD_PROJECT_TYPE_OPTIONS,
  planStageOrder = PLAN_STAGE_ORDER,
  planLabels = PLAN_LABELS as Record<string, string>,
  onClose,
  onAdd,
  onUpdate,
}: {
  dealPrefill: NewProjectDealPrefill | null;
  /** When set, client is fixed and the picker is disabled (e.g. new project from Clients). */
  lockedClientId?: string | null;
  lockedClientTitleHint?: string | null;
  fromLeadId?: string | null;
  /** When set, modal edits this row (calls `onUpdate` instead of `onAdd`). */
  editProject?: MockProject | null;
  leadProjectTypeOptions?: readonly string[];
  planStageOrder?: readonly string[];
  planLabels?: Record<string, string>;
  onClose: () => void;
  onAdd: (p: MockProject) => void | Promise<void>;
  onUpdate?: (p: MockProject) => void | Promise<void>;
}) {
  const teamMembers = useCrmTeamMembers();
  const [title, setTitle] = useState("");
  const defaultPlanSlug = planStageOrder[0] ?? "backlog";
  const [plan, setPlan] = useState<string>(defaultPlanSlug);
  const [teamMemberId, setTeamMemberId] = useState("");
  const defaultProjectType =
    leadProjectTypeOptions[0] ?? DEFAULT_LEAD_PROJECT_TYPE;
  const [projectType, setProjectType] = useState<string>(defaultProjectType);
  const [endDate, setEndDate] = useState("");
  const [budget, setBudget] = useState("");
  const [website, setWebsite] = useState("");
  const [clients, setClients] = useState<ClientPickerRow[]>([]);
  const [clientsLoading, setClientsLoading] = useState(false);
  const [clientsError, setClientsError] = useState<string | null>(null);
  const [clientId, setClientId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const appliedDealClientRef = useRef(false);

  const lockClient = Boolean(lockedClientId?.trim()) && !editProject;
  const fromLeadFlow =
    Boolean(fromLeadId?.trim()) && !editProject && isSupabaseConfigured();
  const hideTeamForLeadCreate = fromLeadFlow;
  const isEdit = Boolean(editProject);

  useEffect(() => {
    appliedDealClientRef.current = false;
    if (editProject) {
      setTitle(editProject.title);
      setPlan(
        planStageOrder.includes(editProject.plan)
          ? editProject.plan
          : defaultPlanSlug
      );
      const pt = editProject.projectType?.trim() ?? "";
      setProjectType(
        pt && leadProjectTypeOptions.includes(pt) ? pt : defaultProjectType
      );
      setEndDate(endDateInputValue(editProject));
      setBudget(
        editProject.budget != null && !Number.isNaN(Number(editProject.budget))
          ? String(editProject.budget)
          : ""
      );
      setWebsite(editProject.website ?? "");
      setClientId(editProject.clientId?.trim() ?? "");
      setTeamMemberId("");
      return;
    }
    if (dealPrefill) {
      setPlan(defaultPlanSlug);
      setTitle(dealPrefill.title);
      setBudget(dealPrefill.budget);
      setWebsite(dealPrefill.website);
      const ptp = dealPrefill.projectType?.trim() ?? "";
      setProjectType(
        ptp && leadProjectTypeOptions.includes(ptp) ? ptp : defaultProjectType
      );
      setEndDate("");
      setClientId("");
      return;
    }
    if (lockClient) {
      setPlan(defaultPlanSlug);
      setTitle((lockedClientTitleHint ?? "").trim());
      setBudget("");
      setWebsite("");
      setProjectType(defaultProjectType);
      setEndDate("");
      setClientId("");
      return;
    }
    setPlan(defaultPlanSlug);
    setTitle("");
    setBudget("");
    setWebsite("");
    setProjectType(defaultProjectType);
    setEndDate("");
    setClientId("");
  }, [
    editProject,
    dealPrefill,
    lockClient,
    lockedClientTitleHint,
    defaultProjectType,
    leadProjectTypeOptions,
    planStageOrder,
    defaultPlanSlug,
  ]);

  useEffect(() => {
    if (editProject?.teamName?.trim() && teamMembers.length > 0) {
      const match = teamMembers.find(
        (m) => m.name.trim() === editProject.teamName!.trim()
      );
      setTeamMemberId(match?.id ?? "");
    }
  }, [editProject, teamMembers]);

  useEffect(() => {
    const locked = lockedClientId?.trim();
    if (!editProject && locked && clients.some((c) => c.id === locked)) {
      setClientId(locked);
      return;
    }
    if (
      editProject?.clientId?.trim() &&
      clients.some((c) => c.id === editProject.clientId)
    ) {
      setClientId(editProject.clientId.trim());
      return;
    }
    if (!dealPrefill?.clientId || appliedDealClientRef.current) return;
    if (!clients.some((c) => c.id === dealPrefill.clientId)) return;
    setClientId(dealPrefill.clientId);
    appliedDealClientRef.current = true;
  }, [dealPrefill, clients, lockedClientId, editProject]);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setClients([]);
      setClientsError(null);
      return;
    }
    let cancelled = false;
    setClientsLoading(true);
    setClientsError(null);
    void (async () => {
      try {
        const sb = createClient();
        const { data, error } = await sb
          .from("client")
          .select("id, name, email, company")
          .order("created_at", { ascending: false })
          .limit(300);
        if (cancelled) return;
        if (error) {
          setClientsError(error.message);
          setClients([]);
        } else {
          setClients(data ?? []);
        }
      } catch (e) {
        if (!cancelled) {
          setClientsError(
            e instanceof Error ? e.message : "Failed to load clients"
          );
          setClients([]);
        }
      } finally {
        if (!cancelled) setClientsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const fieldClass =
    "w-full rounded-xl border border-border bg-white px-3.5 py-2.5 text-sm text-text-primary shadow-sm outline-none transition-[box-shadow,border-color] placeholder:text-text-secondary/45 focus:border-accent focus:ring-2 focus:ring-accent/15";

  const selectClass = `${fieldClass} cursor-pointer appearance-none pr-10`;

  const labelClass =
    "mb-1.5 block text-xs font-semibold uppercase tracking-wide text-text-primary";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    const supabaseOn = isSupabaseConfigured();
    if (supabaseOn && !fromLeadFlow && !clientId.trim()) return;
    const client = clientId.trim()
      ? clients.find((c) => c.id === clientId)
      : undefined;
    if (supabaseOn && !fromLeadFlow && !client) return;
    const budgetRaw = budget.replace(/,/g, "").trim();
    let budgetNum: number | null = null;
    if (budgetRaw !== "") {
      const n = Number(budgetRaw);
      if (!Number.isNaN(n) && n >= 0) budgetNum = n;
    }
    const member = teamMemberId
      ? teamMembers.find((m) => m.id === teamMemberId)
      : undefined;
    const name = member?.name.trim() ?? "";
    const resolvedClientId = client?.id ?? "";
    const resolvedClientName = client
      ? clientPickerLabel(client)
      : "";
    setSubmitting(true);
    try {
      if (editProject) {
        if (onUpdate && client) {
          await onUpdate({
            ...editProject,
            title: title.trim(),
            plan,
            clientId: client.id,
            clientName: clientPickerLabel(client),
            teamId: member ? member.teamId : editProject.teamId,
            teamName: name || null,
            projectType,
            expectedEndDate: endDate || "TBD",
            budget: budgetNum,
            website: website.trim() || null,
          });
        }
        return;
      }
      await onAdd({
        id: createProjectId(),
        title: title.trim(),
        plan,
        clientId: resolvedClientId,
        clientName: resolvedClientName,
        teamId: hideTeamForLeadCreate
          ? "team-general"
          : member
            ? member.teamId
            : "team-general",
        teamName: hideTeamForLeadCreate ? null : name || null,
        projectType,
        color: "#6366f1",
        expectedEndDate: endDate || "TBD",
        budget: budgetNum,
        website: website.trim() || null,
        sprintCount: 0,
        taskCount: 0,
      });
    } finally {
      setSubmitting(false);
    }
  }

  const supabaseOn = isSupabaseConfigured();
  const canPickClient =
    supabaseOn &&
    (fromLeadFlow ||
      (!clientsLoading &&
        !clientsError &&
        clients.length > 0 &&
        Boolean(clientId.trim()) &&
        clients.some((c) => c.id === clientId)));
  const submitDisabled =
    !title.trim() || (supabaseOn && !fromLeadFlow && !canPickClient);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/45 p-4 backdrop-blur-[2px] sm:items-center"
      onClick={onClose}
      onKeyDown={(e) => e.key === "Escape" && onClose()}
      role="presentation"
      tabIndex={-1}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-project-title"
        className="max-h-[min(92vh,44rem)] w-full max-w-lg overflow-y-auto rounded-2xl border border-border bg-white shadow-2xl dark:border-zinc-700 dark:bg-zinc-950"
        onClick={(e) => e.stopPropagation()}
      >
        <form onSubmit={handleSubmit} className="p-6 sm:p-8">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-text-secondary">
            {isEdit ? "Update" : "Create"}
          </p>
          <h2
            id="new-project-title"
            className="mt-1 font-sans text-xl font-bold tracking-tight text-text-primary dark:text-zinc-50"
          >
            {isEdit ? "Edit project" : "New project"}
          </h2>
          <p className="mt-1.5 text-sm leading-relaxed text-text-secondary dark:text-zinc-400">
            {isEdit
              ? "Change client, status, team, or schedule. Sprint and task counts are unchanged here."
              : "Link the project to a client, then name your build and set status and type."}
          </p>

          {dealPrefill?.missingClientNote && !fromLeadFlow ? (
            <p
              className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/35 dark:text-amber-100"
              role="status"
            >
              No client is linked to this lead yet. Mark the deal as{" "}
              <span className="font-semibold">Won</span> to create one
              automatically, or choose any client below.
            </p>
          ) : null}

          <div className="mt-8 space-y-5">
            <div>
              <label htmlFor="np-client" className={labelClass}>
                Client
              </label>
              {fromLeadFlow && !dealPrefill?.clientId ? (
                <p className="rounded-lg border border-border bg-surface/60 px-3 py-2.5 text-sm text-text-secondary dark:border-zinc-700 dark:bg-zinc-800/40">
                  A client record will be created from this lead when you add the
                  project.
                </p>
              ) : !isSupabaseConfigured() ? (
                <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100">
                  Configure Supabase to load clients and link this project.
                </p>
              ) : clientsLoading ? (
                <p className="text-sm text-text-secondary">Loading clients…</p>
              ) : clientsError ? (
                <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
                  {clientsError}
                </p>
              ) : clients.length === 0 ? (
                <p className="text-sm text-text-secondary">
                  No clients yet. Add one under{" "}
                  <Link
                    href="/leads?section=clients"
                    className="font-medium text-accent hover:underline"
                  >
                    Clients
                  </Link>{" "}
                  first (for example when a deal closes).
                </p>
              ) : (
                <div className="relative">
                  <select
                    id="np-client"
                    required={!fromLeadFlow}
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    disabled={lockClient}
                    className={selectClass}
                  >
                    <option value="">Select a client…</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {clientPickerLabel(c)}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary/55"
                    aria-hidden
                  />
                </div>
              )}
            </div>

            <div>
              <label htmlFor="np-title" className={labelClass}>
                Project name
              </label>
              <input
                id="np-title"
                autoFocus
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className={fieldClass}
                placeholder="e.g. Acme Redesign"
              />
            </div>

            <div
              className={`grid gap-5 ${hideTeamForLeadCreate ? "" : "sm:grid-cols-2"}`}
            >
              <div>
                <label htmlFor="np-status" className={labelClass}>
                  Status
                </label>
                <div className="relative">
                  <select
                    id="np-status"
                    value={plan}
                    onChange={(e) => setPlan(e.target.value)}
                    className={selectClass}
                  >
                    {planStageOrder.map((p) => (
                      <option key={p} value={p}>
                        {planLabels[p] ?? p}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary/55"
                    aria-hidden
                  />
                </div>
              </div>
              {hideTeamForLeadCreate ? (
                <p className="text-xs text-text-secondary sm:col-span-1 sm:self-end sm:pb-2">
                  Assign team members on the project after it&apos;s created.
                </p>
              ) : (
                <div>
                  <label htmlFor="np-team-name" className={labelClass}>
                    Team name
                  </label>
                  <div className="relative">
                    <select
                      id="np-team-name"
                      value={teamMemberId}
                      onChange={(e) => setTeamMemberId(e.target.value)}
                      className={selectClass}
                      disabled={teamMembers.length === 0}
                    >
                      <option value="">Member</option>
                      {teamMembers.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name}
                          {m.role ? ` · ${m.role}` : ""}
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary/55"
                      aria-hidden
                    />
                  </div>
                </div>
              )}
            </div>

            <div>
              <label htmlFor="np-type" className={labelClass}>
                Project type
              </label>
              <div className="relative">
                <select
                  id="np-type"
                  value={projectType}
                  onChange={(e) => setProjectType(e.target.value)}
                  className={selectClass}
                >
                  {leadProjectTypeOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary/55"
                  aria-hidden
                />
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="np-budget" className={labelClass}>
                  Budget (USD)
                </label>
                <input
                  id="np-budget"
                  type="text"
                  inputMode="decimal"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  className={fieldClass}
                  placeholder="e.g. 25000"
                />
              </div>
              <div>
                <label htmlFor="np-website" className={labelClass}>
                  Website
                </label>
                <input
                  id="np-website"
                  type="text"
                  inputMode="url"
                  autoComplete="url"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  className={fieldClass}
                  placeholder="https://example.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="np-end" className={labelClass}>
                Expected end date
              </label>
              <CrmPopoverDateField
                id="np-end"
                value={endDate}
                onChange={setEndDate}
                triggerClassName={`${fieldClass} relative flex min-h-[2.625rem] items-center`}
              />
              <p className="mt-1.5 text-xs text-text-secondary">
                Optional. If you skip this, the project shows as{" "}
                <span className="font-medium text-text-primary">TBD</span>.
              </p>
            </div>
          </div>

          <div className="mt-8 flex flex-col-reverse gap-2 border-t border-border pt-6 sm:flex-row sm:justify-end sm:gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-border bg-white px-5 py-2.5 text-sm font-medium text-text-primary shadow-sm transition-colors hover:bg-surface"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitDisabled || submitting}
              className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-blue-600 dark:hover:bg-blue-500"
            >
              {submitting
                ? isEdit
                  ? "Saving…"
                  : "Adding…"
                : isEdit
                  ? "Save changes"
                  : "Add project"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
