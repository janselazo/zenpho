"use client";

import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Briefcase,
  Building2,
  Check,
  ChevronDown,
  FolderKanban,
  Handshake,
  ListTodo,
  Loader2,
  Pencil,
  Search,
  Settings2,
  StickyNote,
  Trash2,
  X,
} from "lucide-react";
import { LEAD_PROJECT_TYPE_OPTIONS } from "@/lib/crm/mock-data";
import CreateDealForLeadModal from "@/components/crm/CreateDealForLeadModal";
import CrmNewProjectFromLeadModal from "@/components/crm/CrmNewProjectFromLeadModal";
import CrmQuickTaskModal from "@/components/crm/CrmQuickTaskModal";
import KanbanBoard, { type KanbanColumn } from "@/components/crm/KanbanBoard";
import LeadsPipelineSummary from "@/components/crm/LeadsPipelineSummary";
import PipelineSettingsModal from "@/components/crm/PipelineSettingsModal";
import {
  leadStageLabelColor,
  normalizeLeadStageForPipeline,
  type PipelineColumnDef,
} from "@/lib/crm/pipeline-columns";
import {
  createLead,
  deleteLead,
  updateLeadNotes,
  updateLeadRow,
  updateLeadStage,
} from "@/app/(crm)/actions/crm";

export interface Lead {
  id: string;
  name: string | null;
  email: string | null;
  phone?: string | null;
  company: string | null;
  stage: string | null;
  source?: string | null;
  notes?: string | null;
  project_type?: string | null;
  created_at?: string | null;
  /** Most recently updated deal for this lead, if any */
  deal?: { id: string; title: string | null } | null;
}

/** Shared chip shell: white / dark surface, no tinted fill. Text color applied per column. */
const neutralChipBase =
  "inline-flex rounded-full border border-border bg-white px-2.5 py-0.5 text-xs font-semibold dark:border-zinc-600 dark:bg-zinc-900/35";

const sourceTextClasses: Record<string, string> = {
  website: "text-sky-700 dark:text-sky-400",
  referral: "text-teal-700 dark:text-teal-400",
  linkedin: "text-blue-700 dark:text-blue-400",
  "cold outreach": "text-orange-700 dark:text-orange-400",
  conference: "text-purple-700 dark:text-purple-400",
  facebook: "text-indigo-700 dark:text-indigo-400",
};

function getSourceTextClass(source: string) {
  return (
    sourceTextClasses[source.toLowerCase()] ??
    "text-zinc-700 dark:text-zinc-300"
  );
}

const projectTypeTextClasses: Record<string, string> = {
  "web app": "text-sky-700 dark:text-sky-400",
  "mobile app": "text-emerald-700 dark:text-emerald-400",
  website: "text-cyan-700 dark:text-cyan-400",
  "ecommerce store": "text-amber-800 dark:text-amber-400",
  other: "text-violet-700 dark:text-violet-400",
};

function getProjectTypeTextClass(projectType: string) {
  const key = projectType.trim().toLowerCase();
  return (
    projectTypeTextClasses[key] ?? "text-zinc-700 dark:text-zinc-300"
  );
}

/** Preset source values for inline edit (custom values still supported). */
const LEAD_SOURCE_OPTIONS = [
  "website",
  "referral",
  "linkedin",
  "cold outreach",
  "conference",
  "facebook",
] as const;

const inlineInputClass =
  "w-full min-w-0 rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-xs text-text-primary outline-none placeholder:text-zinc-400 focus:border-blue-400 focus:ring-1 focus:ring-blue-400/20 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500";

type LeadDraft = {
  nameFirst: string;
  nameLast: string;
  email: string;
  phone: string;
  company: string;
  source: string;
  stage: string;
  project_type: string;
  notes: string;
};

function splitName(name: string | null): { first: string; last: string } {
  const n = (name ?? "").trim();
  if (!n) return { first: "", last: "" };
  const i = n.indexOf(" ");
  if (i === -1) return { first: n, last: "" };
  return { first: n.slice(0, i), last: n.slice(i + 1).trim() };
}

function joinName(first: string, last: string): string {
  return [first.trim(), last.trim()].filter(Boolean).join(" ");
}

function normalizeSourceForSelect(source: string): string {
  const raw = source.trim();
  if (!raw) return "";
  const low = raw.toLowerCase();
  for (const o of LEAD_SOURCE_OPTIONS) {
    if (o === low) return o;
  }
  return raw;
}

function leadToDraft(lead: Lead, pipeline: PipelineColumnDef[]): LeadDraft {
  const { first, last } = splitName(lead.name);
  return {
    nameFirst: first,
    nameLast: last,
    email: lead.email ?? "",
    phone: lead.phone ?? "",
    company: lead.company ?? "",
    source: normalizeSourceForSelect(lead.source ?? ""),
    stage: normalizeLeadStageForPipeline(lead.stage, pipeline),
    project_type: lead.project_type ?? "",
    notes: lead.notes ?? "",
  };
}

function sourceMatchesPreset(source: string) {
  const t = source.trim().toLowerCase();
  return LEAD_SOURCE_OPTIONS.some((o) => o === t);
}

function formatSourceOptionLabel(value: string) {
  return value
    .split(/[\s_-]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

function PillSelect({
  value,
  onChange,
  dotColor,
  textClassName,
  children,
}: {
  value: string;
  onChange: (v: string) => void;
  dotColor: string;
  textClassName: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-w-[7.5rem] max-w-[11rem]">
      <span
        className="pointer-events-none absolute left-2.5 top-1/2 z-10 h-2 w-2 -translate-y-1/2 rounded-full ring-2 ring-white dark:ring-zinc-900"
        style={{ backgroundColor: dotColor }}
        aria-hidden
      />
      <ChevronDown
        className="pointer-events-none absolute right-2 top-1/2 z-10 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400"
        aria-hidden
      />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full appearance-none rounded-full border border-zinc-200/90 bg-white py-1.5 pl-7 pr-8 text-xs font-semibold outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/15 dark:border-zinc-600 dark:bg-zinc-900 ${textClassName}`}
      >
        {children}
      </select>
    </div>
  );
}

function leadStageLabel(
  rawStage: string | null | undefined,
  pipeline: PipelineColumnDef[]
): string {
  const key = normalizeLeadStageForPipeline(rawStage, pipeline);
  return leadStageLabelColor(key, pipeline).label;
}

function leadKanbanKey(
  lead: Lead,
  pipeline: PipelineColumnDef[]
): string {
  return normalizeLeadStageForPipeline(lead.stage, pipeline);
}

function formatLeadPhone(phone: string | null | undefined): string {
  if (!phone?.trim()) return "—";
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return phone.trim();
}

function formatDate(iso?: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatPipelineCardDate(iso?: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function leadQuickTaskContextLabel(lead: Lead): string {
  return (
    lead.name?.trim() ||
    lead.email?.trim() ||
    lead.company?.trim() ||
    "this lead"
  );
}

type LeadsViewMode = "table" | "pipeline";

export default function LeadsView({
  leads,
  leadPipelineColumns,
  dealPipelineColumns,
}: {
  leads: Lead[];
  leadPipelineColumns: PipelineColumnDef[];
  dealPipelineColumns: PipelineColumnDef[];
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [view, setView] = useState<LeadsViewMode>("table");
  const [leadsSnapshot, setLeadsSnapshot] = useState(leads);
  const [leadPipeline, setLeadPipeline] =
    useState<PipelineColumnDef[]>(leadPipelineColumns);
  const [pipelineSettingsOpen, setPipelineSettingsOpen] = useState(false);

  useEffect(() => {
    setLeadsSnapshot(leads);
  }, [leads]);

  useEffect(() => {
    setLeadPipeline(leadPipelineColumns.map((c) => ({ ...c })));
  }, [leadPipelineColumns]);

  const filtered = leadsSnapshot.filter((l) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      l.name?.toLowerCase().includes(q) ||
      l.email?.toLowerCase().includes(q) ||
      l.company?.toLowerCase().includes(q) ||
      l.source?.toLowerCase().includes(q) ||
      l.project_type?.toLowerCase().includes(q) ||
      (l.deal?.title?.toLowerCase().includes(q) ?? false)
    );
  });

  const leadStageCounts = leadsSnapshot.reduce<Record<string, number>>(
    (acc, l) => {
      const s = (l.stage ?? "").trim() || "new";
      acc[s] = (acc[s] ?? 0) + 1;
      return acc;
    },
    {}
  );

  const pipelineColumns: KanbanColumn<Lead>[] = useMemo(() => {
    const configuredSlugs = new Set(leadPipeline.map((c) => c.slug));
    const keys = new Set(
      filtered.map((l) => leadKanbanKey(l, leadPipeline))
    );
    const orphanSlugs = [...keys].filter((k) => !configuredSlugs.has(k));
    return [
      ...leadPipeline.map((col) => ({
        id: col.slug,
        label: col.label,
        color: col.color,
        items: filtered.filter(
          (l) => leadKanbanKey(l, leadPipeline) === col.slug
        ),
      })),
      ...orphanSlugs.map((slug) => {
        const meta = leadStageLabelColor(slug, leadPipeline);
        return {
          id: slug,
          label: `${meta.label} (legacy)`,
          color: meta.color,
          items: filtered.filter(
            (l) => leadKanbanKey(l, leadPipeline) === slug
          ),
        };
      }),
    ];
  }, [filtered, leadPipeline]);

  function handlePipelineMove(
    itemId: string,
    fromCol: string,
    toCol: string
  ) {
    setLeadsSnapshot((prev) =>
      prev.map((l) => (l.id === itemId ? { ...l, stage: toCol } : l))
    );
    void (async () => {
      const res = await updateLeadStage(itemId, toCol);
      if ("error" in res && res.error) {
        window.alert(res.error);
        setLeadsSnapshot((prev) =>
          prev.map((l) => (l.id === itemId ? { ...l, stage: fromCol } : l))
        );
        return;
      }
      router.refresh();
    })();
  }

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<LeadDraft | null>(null);
  const [savePending, setSavePending] = useState(false);
  const [createDealLead, setCreateDealLead] = useState<Lead | null>(null);
  const [notesLead, setNotesLead] = useState<Lead | null>(null);
  const [newProjectLeadId, setNewProjectLeadId] = useState<string | null>(null);
  const [quickTaskLead, setQuickTaskLead] = useState<Lead | null>(null);

  function startEdit(lead: Lead) {
    setEditingId(lead.id);
    setDraft(leadToDraft(lead, leadPipeline));
  }

  function cancelEdit() {
    setEditingId(null);
    setDraft(null);
  }

  function startEditFromPipeline(lead: Lead) {
    setView("table");
    startEdit(lead);
  }

  async function saveEdit(leadId: string) {
    if (!draft) return;
    setSavePending(true);
    const fd = new FormData();
    fd.set("id", leadId);
    fd.set("name", joinName(draft.nameFirst, draft.nameLast));
    fd.set("email", draft.email);
    fd.set("phone", draft.phone);
    fd.set("company", draft.company);
    fd.set("source", draft.source);
    fd.set("stage", draft.stage);
    fd.set("notes", draft.notes);
    fd.set("project_type", draft.project_type);
    const res = await updateLeadRow(fd);
    setSavePending(false);
    if ("error" in res && res.error) {
      window.alert(res.error);
      return;
    }
    cancelEdit();
    router.refresh();
  }

  async function handleDeleteLead(lead: Lead) {
    const label = lead.name?.trim() || lead.email?.trim() || "this lead";
    if (
      !confirm(
        `Delete ${label}? This will remove the lead and its linked deal data.`
      )
    ) {
      return;
    }
    if (editingId === lead.id) cancelEdit();
    setDeletingId(lead.id);
    const res = await deleteLead(lead.id);
    setDeletingId(null);
    if ("error" in res && res.error) {
      window.alert(res.error);
      return;
    }
    router.refresh();
  }

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="heading-display text-2xl font-bold text-text-primary">
            Leads
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            {view === "pipeline"
              ? "Drag cards between stages to update pipeline status. Project types reflect the work each contact is interested in."
              : "Track inbound inquiries and nurture them through qualification."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary/50" />
            <input
              type="text"
              placeholder="Search…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-48 rounded-lg border border-border bg-white py-1.5 pl-8 pr-3 text-sm text-text-primary outline-none focus:border-accent focus:ring-2 focus:ring-accent/15"
            />
          </div>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="shrink-0 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-accent-hover"
          >
            + Add lead
          </button>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-4">
        <div className="inline-flex rounded-lg border border-border bg-surface/50 p-0.5">
          {(["table", "pipeline"] as LeadsViewMode[]).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                view === v
                  ? "bg-white text-text-primary shadow-sm"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              {v === "pipeline" ? "Pipeline" : "Table"}
            </button>
          ))}
        </div>
        <span className="text-sm text-text-secondary">
          {filtered.length} leads
        </span>
        <button
          type="button"
          onClick={() => setPipelineSettingsOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-text-secondary hover:border-accent hover:text-accent dark:border-zinc-600"
        >
          <Settings2 className="h-3.5 w-3.5" />
          Pipeline stages
        </button>
      </div>

      <LeadsPipelineSummary
        leads={leadsSnapshot}
        leadPipeline={leadPipeline}
        searchQuery={search}
      />

      <div className="mt-6">
        {view === "table" ? (
          <LeadsTable
            leads={filtered}
            leadPipeline={leadPipeline}
            router={router}
            editingId={editingId}
            draft={draft}
            setDraft={setDraft}
            savePending={savePending}
            deletingId={deletingId}
            startEdit={startEdit}
            cancelEdit={cancelEdit}
            saveEdit={saveEdit}
            handleDeleteLead={handleDeleteLead}
            setCreateDealLead={setCreateDealLead}
            setNotesLead={setNotesLead}
            onCreateProject={(lead) => setNewProjectLeadId(lead.id)}
            onQuickTask={setQuickTaskLead}
          />
        ) : (
          <LeadsPipelineBoard
            columns={pipelineColumns}
            onMove={handlePipelineMove}
            editingId={editingId}
            deletingId={deletingId}
            onNotes={setNotesLead}
            onCreateDeal={setCreateDealLead}
            onCreateProject={(lead) => setNewProjectLeadId(lead.id)}
            onQuickTask={setQuickTaskLead}
            onEditFromPipeline={startEditFromPipeline}
            onDelete={handleDeleteLead}
          />
        )}
      </div>

      {createDealLead && (
        <CreateDealForLeadModal
          lead={createDealLead}
          dealPipelineColumns={dealPipelineColumns}
          onClose={() => setCreateDealLead(null)}
        />
      )}
      {notesLead && (
        <LeadNotesModal lead={notesLead} onClose={() => setNotesLead(null)} />
      )}
      {newProjectLeadId ? (
        <CrmNewProjectFromLeadModal
          leadId={newProjectLeadId}
          onClose={() => setNewProjectLeadId(null)}
        />
      ) : null}
      {quickTaskLead ? (
        <CrmQuickTaskModal
          leadId={quickTaskLead.id}
          contextLabel={leadQuickTaskContextLabel(quickTaskLead)}
          resetKey={quickTaskLead.id}
          onClose={() => setQuickTaskLead(null)}
        />
      ) : null}
      {modalOpen && <NewLeadModal onClose={() => setModalOpen(false)} />}

      <PipelineSettingsModal
        open={pipelineSettingsOpen}
        onClose={() => setPipelineSettingsOpen(false)}
        kind="lead"
        columns={leadPipeline}
        stageCounts={leadStageCounts}
        onSaved={() => router.refresh()}
      />
    </div>
  );
}

type LeadsRouter = ReturnType<typeof useRouter>;

type LeadsTableProps = {
  leads: Lead[];
  leadPipeline: PipelineColumnDef[];
  router: LeadsRouter;
  editingId: string | null;
  draft: LeadDraft | null;
  setDraft: Dispatch<SetStateAction<LeadDraft | null>>;
  savePending: boolean;
  deletingId: string | null;
  startEdit: (lead: Lead) => void;
  cancelEdit: () => void;
  saveEdit: (leadId: string) => Promise<void>;
  handleDeleteLead: (lead: Lead) => Promise<void>;
  setCreateDealLead: Dispatch<SetStateAction<Lead | null>>;
  setNotesLead: Dispatch<SetStateAction<Lead | null>>;
  onCreateProject: (lead: Lead) => void;
  onQuickTask: (lead: Lead) => void;
};

function LeadsPipelineBoard({
  columns,
  onMove,
  editingId,
  deletingId,
  onNotes,
  onCreateDeal,
  onCreateProject,
  onQuickTask,
  onEditFromPipeline,
  onDelete,
}: {
  columns: KanbanColumn<Lead>[];
  onMove: (itemId: string, fromCol: string, toCol: string) => void;
  editingId: string | null;
  deletingId: string | null;
  onNotes: (lead: Lead) => void;
  onCreateDeal: (lead: Lead) => void;
  onCreateProject: (lead: Lead) => void;
  onQuickTask: (lead: Lead) => void;
  onEditFromPipeline: (lead: Lead) => void;
  onDelete: (lead: Lead) => void;
}) {
  const stopDragMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <KanbanBoard<Lead>
      columns={columns}
      emptyColumnLabel="No leads"
      onMove={onMove}
      renderCard={(lead) => {
        const deleteLabel =
          lead.name?.trim() || lead.email?.trim() || "this lead";
        return (
          <div className="flex flex-col rounded-xl border border-zinc-200/90 bg-white p-3.5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:border-zinc-700 dark:bg-zinc-900">
            <div className="flex items-start justify-between gap-2">
              <Link
                href={`/leads/${lead.id}`}
                className="min-w-0 truncate text-sm font-semibold text-accent hover:underline dark:text-blue-400"
              >
                {lead.name?.trim() || lead.email?.trim() || "Lead"}
              </Link>
              <div
                className="max-w-[58%] shrink-0"
                onMouseDown={stopDragMouseDown}
              >
                {lead.source?.trim() ? (
                  <span
                    className={`${neutralChipBase} inline-block max-w-full truncate text-[11px] font-medium capitalize ${getSourceTextClass(lead.source)}`}
                  >
                    {lead.source}
                  </span>
                ) : null}
              </div>
            </div>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              {formatLeadPhone(lead.phone)}
            </p>
            {lead.company?.trim() ? (
              <div className="mt-1.5 flex min-w-0 items-center gap-1.5 text-xs">
                <Building2
                  className="h-3.5 w-3.5 shrink-0 text-zinc-400"
                  aria-hidden
                />
                <span className="min-w-0 truncate font-medium text-zinc-700 dark:text-zinc-300">
                  {lead.company.trim()}
                </span>
              </div>
            ) : null}
            {lead.deal ? (
              <Link
                href={`/leads/${lead.id}?tab=deal`}
                className="mt-1.5 block min-w-0 truncate text-xs font-medium text-accent hover:underline dark:text-blue-400"
              >
                {lead.deal.title?.trim() || "Untitled deal"}
              </Link>
            ) : null}
            <div className="mt-2 flex min-w-0 items-center gap-1.5 text-xs">
              <Briefcase
                className="h-3.5 w-3.5 shrink-0 text-zinc-400"
                aria-hidden
              />
              <span
                className={`min-w-0 truncate font-medium ${
                  lead.project_type?.trim()
                    ? getProjectTypeTextClass(lead.project_type)
                    : "text-zinc-500 dark:text-zinc-400"
                }`}
              >
                {lead.project_type?.trim() || "Project type —"}
              </span>
            </div>
            <p className="mt-2 text-[11px] text-zinc-400 dark:text-zinc-500">
              {formatPipelineCardDate(lead.created_at)}
            </p>
            <div
              className="mt-3 flex flex-wrap items-center gap-1 border-t border-zinc-100 pt-2.5 dark:border-zinc-700/80"
              onMouseDown={stopDragMouseDown}
            >
              <button
                type="button"
                onClick={() => onCreateProject(lead)}
                disabled={editingId !== null}
                className="inline-flex items-center justify-center rounded-md p-1.5 text-violet-600 transition-colors hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-40 dark:text-violet-400 dark:hover:bg-violet-950/40"
                aria-label={`Create project for ${deleteLabel}`}
                title="Create project"
              >
                <FolderKanban className="h-4 w-4 shrink-0" aria-hidden />
              </button>
              <button
                type="button"
                onClick={() => onCreateDeal(lead)}
                disabled={editingId !== null}
                className="inline-flex items-center justify-center rounded-md p-1.5 text-emerald-600 transition-colors hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-40 dark:text-emerald-400 dark:hover:bg-emerald-950/40"
                aria-label={`Create a deal for ${deleteLabel}`}
                title="Create a deal"
              >
                <Handshake className="h-4 w-4 shrink-0" aria-hidden />
              </button>
              <button
                type="button"
                onClick={() => onNotes(lead)}
                disabled={editingId !== null}
                title="Notes"
                className="inline-flex items-center justify-center rounded-md p-1.5 text-zinc-600 transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-40 dark:text-zinc-400 dark:hover:bg-zinc-800"
                aria-label={`View notes for ${deleteLabel}`}
              >
                <StickyNote className="h-4 w-4 shrink-0" aria-hidden />
              </button>
              <button
                type="button"
                onClick={() => onQuickTask(lead)}
                disabled={editingId !== null}
                title="Quick task"
                className="inline-flex items-center justify-center rounded-md p-1.5 text-zinc-600 transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-40 dark:text-zinc-400 dark:hover:bg-zinc-800"
                aria-label={`Add task for ${deleteLabel}`}
              >
                <ListTodo className="h-4 w-4 shrink-0" aria-hidden />
              </button>
              <button
                type="button"
                onClick={() => onEditFromPipeline(lead)}
                disabled={Boolean(editingId && editingId !== lead.id)}
                className="inline-flex items-center justify-center rounded-md p-1.5 text-accent transition-colors hover:bg-accent/10 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label={`Edit ${deleteLabel}`}
                title="Edit"
              >
                <Pencil className="h-4 w-4 shrink-0" aria-hidden />
              </button>
              <button
                type="button"
                disabled={
                  deletingId === lead.id ||
                  Boolean(editingId && editingId !== lead.id)
                }
                onClick={() => void onDelete(lead)}
                aria-busy={deletingId === lead.id}
                className="inline-flex items-center justify-center rounded-md p-1.5 text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50 dark:text-red-400 dark:hover:bg-red-950/40"
                aria-label={`Delete ${deleteLabel}`}
              >
                {deletingId === lead.id ? (
                  <Loader2
                    className="h-4 w-4 shrink-0 animate-spin"
                    aria-hidden
                  />
                ) : (
                  <Trash2 className="h-4 w-4 shrink-0" aria-hidden />
                )}
              </button>
            </div>
          </div>
        );
      }}
    />
  );
}

function LeadsTable({
  leads,
  leadPipeline,
  router,
  editingId,
  draft,
  setDraft,
  savePending,
  deletingId,
  startEdit,
  cancelEdit,
  saveEdit,
  handleDeleteLead,
  setCreateDealLead,
  setNotesLead,
  onCreateProject,
  onQuickTask,
}: LeadsTableProps) {
  if (leads.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-white py-16 text-center text-sm text-text-secondary">
        No leads found.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-border bg-white shadow-sm">
      <table className="w-full min-w-[88rem] text-left text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="px-4 py-3 font-semibold text-text-secondary">Name</th>
            <th className="px-4 py-3 font-semibold text-text-secondary">Phone</th>
            <th className="px-4 py-3 font-semibold text-text-secondary">Email</th>
            <th className="px-4 py-3 font-semibold text-text-secondary">Status</th>
            <th className="px-4 py-3 font-semibold text-text-secondary">Service</th>
            <th className="px-4 py-3 font-semibold text-text-secondary">Company</th>
            <th className="px-4 py-3 font-semibold text-text-secondary">Deal</th>
            <th className="px-4 py-3 font-semibold text-text-secondary">Source</th>
            <th className="px-4 py-3 font-semibold text-text-secondary">Date</th>
            <th className="px-4 py-3 font-semibold text-text-secondary">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {leads.map((lead) => {
            const stageKey = normalizeLeadStageForPipeline(
              lead.stage,
              leadPipeline
            );
            const stageMeta = leadStageLabelColor(stageKey, leadPipeline);
            const isEditing = editingId === lead.id && draft !== null;
            const initials = (lead.name ?? "?")
              .split(/\s+/)
              .filter(Boolean)
              .map((w) => w[0])
              .join("")
              .toUpperCase()
              .slice(0, 2);
            const deleteLabel =
              lead.name?.trim() || lead.email?.trim() || "this lead";

            return (
              <tr
                key={lead.id}
                className={`transition-colors ${
                  isEditing
                    ? "bg-sky-50/60 dark:bg-sky-950/25"
                    : "hover:bg-surface/50"
                }`}
              >
                <td className="px-4 py-3 align-top">
                  <div className="flex items-center gap-2.5">
                    <span
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#E8F1FB] text-xs font-bold text-[#4086D6] dark:bg-sky-950/50 dark:text-sky-400"
                      aria-hidden
                    >
                      {initials || "?"}
                    </span>
                    {isEditing ? (
                      <div className="flex min-w-0 flex-1 gap-1.5">
                        <input
                          type="text"
                          value={draft.nameFirst}
                          onChange={(e) =>
                            setDraft((d) =>
                              d ? { ...d, nameFirst: e.target.value } : d
                            )
                          }
                          placeholder="First"
                          className={inlineInputClass}
                          autoComplete="given-name"
                        />
                        <input
                          type="text"
                          value={draft.nameLast}
                          onChange={(e) =>
                            setDraft((d) =>
                              d ? { ...d, nameLast: e.target.value } : d
                            )
                          }
                          placeholder="Last"
                          className={inlineInputClass}
                          autoComplete="family-name"
                        />
                      </div>
                    ) : (
                      <Link
                        href={`/leads/${lead.id}`}
                        className="min-w-0 font-medium text-accent hover:underline dark:text-blue-400"
                      >
                        {lead.name?.trim() || "—"}
                      </Link>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 align-top">
                  {isEditing ? (
                    <input
                      type="tel"
                      value={draft.phone}
                      onChange={(e) =>
                        setDraft((d) => (d ? { ...d, phone: e.target.value } : d))
                      }
                      placeholder="(555) 000-0000"
                      className={inlineInputClass}
                    />
                  ) : (
                    <span className="text-text-secondary">
                      {formatLeadPhone(lead.phone)}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 align-top">
                  {isEditing ? (
                    <input
                      type="email"
                      value={draft.email}
                      onChange={(e) =>
                        setDraft((d) => (d ? { ...d, email: e.target.value } : d))
                      }
                      placeholder="name@company.com"
                      className={inlineInputClass}
                    />
                  ) : (
                    <span className="text-text-secondary">
                      {lead.email ?? "—"}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 align-top">
                  {isEditing && draft ? (
                    <PillSelect
                      value={draft.stage}
                      onChange={(v) =>
                        setDraft((d) => (d ? { ...d, stage: v } : d))
                      }
                      dotColor={
                        leadStageLabelColor(draft.stage, leadPipeline).color
                      }
                      textClassName="text-zinc-700 dark:text-zinc-300"
                    >
                      {(() => {
                        const opts = leadPipeline.map((c) => ({ ...c }));
                        if (!opts.some((c) => c.slug === draft.stage)) {
                          const m = leadStageLabelColor(
                            draft.stage,
                            leadPipeline
                          );
                          opts.unshift({
                            slug: draft.stage,
                            label: m.label,
                            color: m.color,
                          });
                        }
                        return opts.map((c) => (
                          <option key={c.slug} value={c.slug}>
                            {c.label}
                          </option>
                        ));
                      })()}
                    </PillSelect>
                  ) : (
                    <span
                      className={`${neutralChipBase} items-center gap-1.5`}
                      style={{ color: stageMeta.color }}
                    >
                      <span
                        className="h-2 w-2 shrink-0 rounded-full ring-2 ring-border dark:ring-zinc-600"
                        style={{
                          backgroundColor: stageMeta.color,
                        }}
                      />
                      {leadStageLabel(lead.stage, leadPipeline)}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 align-top">
                  {isEditing ? (
                    <div className="relative min-w-[7rem] max-w-[12rem]">
                      <select
                        value={draft.project_type}
                        onChange={(e) =>
                          setDraft((d) =>
                            d ? { ...d, project_type: e.target.value } : d
                          )
                        }
                        className={`${inlineInputClass} appearance-none pr-7`}
                      >
                        <option value="">Select service…</option>
                        {LEAD_PROJECT_TYPE_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                      <ChevronDown
                        className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400"
                        aria-hidden
                      />
                    </div>
                  ) : lead.project_type?.trim() ? (
                    <span
                      className={`${neutralChipBase} ${getProjectTypeTextClass(lead.project_type)}`}
                    >
                      {lead.project_type}
                    </span>
                  ) : (
                    <span className="text-text-secondary">—</span>
                  )}
                </td>
                <td className="px-4 py-3 align-top">
                  {isEditing ? (
                    <input
                      type="text"
                      value={draft.company}
                      onChange={(e) =>
                        setDraft((d) =>
                          d ? { ...d, company: e.target.value } : d
                        )
                      }
                      placeholder="Company name"
                      className={inlineInputClass}
                    />
                  ) : lead.company?.trim() ? (
                    <span
                      className={`${neutralChipBase} font-medium text-amber-800 dark:text-amber-300`}
                    >
                      {lead.company}
                    </span>
                  ) : (
                    <span className="text-text-secondary">—</span>
                  )}
                </td>
                <td className="px-4 py-3 align-top">
                  {lead.deal ? (
                    <Link
                      href={`/leads/${lead.id}?tab=deal`}
                      className="font-medium text-accent hover:underline dark:text-blue-400"
                    >
                      {lead.deal.title?.trim() || "Untitled deal"}
                    </Link>
                  ) : (
                    <span className="text-text-secondary">—</span>
                  )}
                </td>
                <td className="px-4 py-3 align-top">
                    {isEditing && draft ? (
                    <PillSelect
                      value={draft.source}
                      onChange={(v) =>
                        setDraft((d) => (d ? { ...d, source: v } : d))
                      }
                      dotColor="#0ea5e9"
                      textClassName="text-sky-800 dark:text-sky-300"
                    >
                      <option value="">—</option>
                      {draft.source && !sourceMatchesPreset(draft.source) && (
                        <option value={draft.source}>{draft.source}</option>
                      )}
                      {LEAD_SOURCE_OPTIONS.map((o) => (
                        <option key={o} value={o}>
                          {formatSourceOptionLabel(o)}
                        </option>
                      ))}
                    </PillSelect>
                  ) : lead.source ? (
                    <span
                      className={`${neutralChipBase} font-medium capitalize ${getSourceTextClass(lead.source)}`}
                    >
                      {lead.source}
                    </span>
                  ) : (
                    <span className="text-text-secondary">—</span>
                  )}
                </td>
                <td className="px-4 py-3 align-top text-text-secondary">
                  {formatDate(lead.created_at)}
                </td>
                <td className="px-4 py-3 align-top">
                  <div className="flex flex-wrap items-center gap-2">
                    {isEditing ? (
                      <>
                        <button
                          type="button"
                          disabled={savePending}
                          onClick={() => void saveEdit(lead.id)}
                          className="inline-flex items-center justify-center rounded-md p-1.5 text-emerald-600 transition-colors hover:bg-emerald-50 disabled:opacity-50 dark:text-emerald-400 dark:hover:bg-emerald-950/40"
                          aria-label="Save changes"
                        >
                          {savePending ? (
                            <Loader2
                              className="h-4 w-4 shrink-0 animate-spin"
                              aria-hidden
                            />
                          ) : (
                            <Check className="h-4 w-4 shrink-0" aria-hidden />
                          )}
                        </button>
                        <button
                          type="button"
                          disabled={savePending}
                          onClick={cancelEdit}
                          className="inline-flex items-center justify-center rounded-md p-1.5 text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50 dark:text-red-400 dark:hover:bg-red-950/40"
                          aria-label="Discard changes"
                        >
                          <X className="h-4 w-4 shrink-0" aria-hidden />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => onCreateProject(lead)}
                          disabled={editingId !== null}
                          className="inline-flex items-center justify-center rounded-md p-1.5 text-violet-600 transition-colors hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-40 dark:text-violet-400 dark:hover:bg-violet-950/40"
                          aria-label={`Create project for ${deleteLabel}`}
                          title="Create project"
                        >
                          <FolderKanban className="h-4 w-4 shrink-0" aria-hidden />
                        </button>
                        <button
                          type="button"
                          onClick={() => setCreateDealLead(lead)}
                          disabled={editingId !== null}
                          className="inline-flex items-center justify-center rounded-md p-1.5 text-emerald-600 transition-colors hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-40 dark:text-emerald-400 dark:hover:bg-emerald-950/40"
                          aria-label={`Create a deal for ${deleteLabel}`}
                          title="Create a deal"
                        >
                          <Handshake className="h-4 w-4 shrink-0" aria-hidden />
                        </button>
                        <button
                          type="button"
                          onClick={() => setNotesLead(lead)}
                          disabled={editingId !== null}
                          title="Notes"
                          className="inline-flex items-center justify-center rounded-md p-1.5 text-zinc-600 transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-40 dark:text-zinc-400 dark:hover:bg-zinc-800"
                          aria-label={`View notes for ${deleteLabel}`}
                        >
                          <StickyNote className="h-4 w-4 shrink-0" aria-hidden />
                        </button>
                        <button
                          type="button"
                          onClick={() => onQuickTask(lead)}
                          disabled={editingId !== null}
                          title="Quick task"
                          className="inline-flex items-center justify-center rounded-md p-1.5 text-zinc-600 transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-40 dark:text-zinc-400 dark:hover:bg-zinc-800"
                          aria-label={`Add task for ${deleteLabel}`}
                        >
                          <ListTodo className="h-4 w-4 shrink-0" aria-hidden />
                        </button>
                        <button
                          type="button"
                          onClick={() => startEdit(lead)}
                          disabled={Boolean(editingId && editingId !== lead.id)}
                          className="inline-flex items-center justify-center rounded-md p-1.5 text-accent transition-colors hover:bg-accent/10 disabled:cursor-not-allowed disabled:opacity-40"
                          aria-label={`Edit ${deleteLabel}`}
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4 shrink-0" aria-hidden />
                        </button>
                        <button
                          type="button"
                          disabled={
                            deletingId === lead.id ||
                            Boolean(editingId && editingId !== lead.id)
                          }
                          onClick={() => void handleDeleteLead(lead)}
                          aria-busy={deletingId === lead.id}
                          className="inline-flex items-center justify-center rounded-md p-1.5 text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50 dark:text-red-400 dark:hover:bg-red-950/40"
                          aria-label={`Delete ${deleteLabel}`}
                        >
                          {deletingId === lead.id ? (
                            <Loader2
                              className="h-4 w-4 shrink-0 animate-spin"
                              aria-hidden
                            />
                          ) : (
                            <Trash2 className="h-4 w-4 shrink-0" aria-hidden />
                          )}
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function LeadNotesModal({
  lead,
  onClose,
}: {
  lead: Lead;
  onClose: () => void;
}) {
  const router = useRouter();
  const label = lead.name?.trim() || lead.email?.trim() || "Lead";
  const [draft, setDraft] = useState(lead.notes ?? "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDraft(lead.notes ?? "");
    setError(null);
  }, [lead.id, lead.notes]);

  async function handleSave() {
    setError(null);
    setPending(true);
    const res = await updateLeadNotes(lead.id, draft);
    setPending(false);
    if ("error" in res && res.error) {
      setError(res.error);
      return;
    }
    router.refresh();
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 p-4 backdrop-blur-sm sm:items-center"
      onClick={onClose}
      onKeyDown={(e) => e.key === "Escape" && !pending && onClose()}
      role="presentation"
    >
      <div
        className="max-h-[min(85vh,32rem)] w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-white shadow-xl dark:border-zinc-700 dark:bg-zinc-950"
        role="dialog"
        onClick={(e) => e.stopPropagation()}
        aria-modal="true"
        aria-labelledby="lead-notes-title"
      >
        <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4 dark:border-zinc-700">
          <div className="min-w-0">
            <h2
              id="lead-notes-title"
              className="text-lg font-bold text-text-primary dark:text-zinc-50"
            >
              Notes
            </h2>
            <p className="mt-0.5 truncate text-sm text-text-secondary dark:text-zinc-400">
              {label}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="shrink-0 rounded-lg p-1 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-800 disabled:opacity-50 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
            aria-label="Close"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>
        <div className="px-5 py-4">
          {error && (
            <p
              className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200"
              role="alert"
            >
              {error}
            </p>
          )}
          <label htmlFor="lead-notes-body" className="sr-only">
            Notes for {label}
          </label>
          <textarea
            id="lead-notes-body"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={8}
            placeholder="Add notes about this lead…"
            disabled={pending}
            className={`${inlineInputClass} min-h-[10rem] w-full resize-y`}
          />
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border px-5 py-3 dark:border-zinc-700">
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="rounded-xl border border-border bg-white px-4 py-2 text-sm font-semibold text-text-primary hover:bg-surface disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => void handleSave()}
            className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-60"
          >
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : null}
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

function NewLeadModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const fd = new FormData(e.currentTarget);
    const res = await createLead(fd);
    setPending(false);
    if ("error" in res && res.error) {
      setError(res.error);
      return;
    }
    router.refresh();
    onClose();
  }

  const inputClass =
    "w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm text-text-primary outline-none focus:border-accent focus:ring-2 focus:ring-accent/15";

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 p-4 sm:items-center"
      onClick={onClose}
      onKeyDown={(e) => e.key === "Escape" && onClose()}
      role="presentation"
    >
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-border bg-white p-6 shadow-xl"
        role="dialog"
        onClick={(e) => e.stopPropagation()}
        aria-modal="true"
        aria-labelledby="new-lead-title"
      >
        <h2
          id="new-lead-title"
          className="text-sm font-bold uppercase tracking-wider text-text-secondary"
        >
          New lead
        </h2>

        {error && (
          <p className="mt-3 text-sm text-red-700" role="alert">
            {error}
          </p>
        )}

        <form onSubmit={onSubmit} className="mt-5 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-text-primary">
                Name
              </label>
              <input name="name" type="text" className={inputClass} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-text-primary">
                Email
              </label>
              <input name="email" type="email" className={inputClass} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-text-primary">
                Company
              </label>
              <input name="company" type="text" className={inputClass} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-text-primary">
                Phone
              </label>
              <input name="phone" type="tel" className={inputClass} />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-text-primary">
              Project type
            </label>
            <select
              name="project_type"
              required
              defaultValue=""
              className={inputClass}
            >
              <option value="" disabled>
                Select project type…
              </option>
              {LEAD_PROJECT_TYPE_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-text-primary">
              Source
            </label>
            <input
              name="source"
              type="text"
              placeholder="e.g. website, referral"
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-text-primary">
              Notes
            </label>
            <textarea name="notes" rows={3} className={inputClass} />
          </div>
          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={pending}
              className="rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-60"
            >
              {pending ? "Saving…" : "Add lead"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-text-primary hover:bg-surface"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
