"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type Dispatch,
  type SetStateAction,
} from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowUpDown,
  Briefcase,
  Building2,
  Check,
  ChevronDown,
  ExternalLink,
  FolderKanban,
  ListTodo,
  Loader2,
  Pencil,
  Plus,
  Search,
  Settings2,
  Table2,
  Tag,
  Trash2,
  X,
} from "lucide-react";
import type { MergedCrmFieldOptions } from "@/lib/crm/field-options";
import ClientsView from "@/components/crm/ClientsView";
import CrmNewProjectFromLeadModal from "@/components/crm/CrmNewProjectFromLeadModal";
import CrmQuickTaskModal from "@/components/crm/CrmQuickTaskModal";
import KanbanBoard, { type KanbanColumn } from "@/components/crm/KanbanBoard";
import ManageLeadTagsModal from "@/components/crm/ManageLeadTagsModal";
import LeadNotesGlyphIcon from "@/components/crm/LeadNotesGlyphIcon";
import LeadsPipelineSummary from "@/components/crm/LeadsPipelineSummary";
import PipelineSettingsModal from "@/components/crm/PipelineSettingsModal";
import {
  isLeadLostStage,
  leadStageLabelColor,
  mapLeadStageForPipelineKanban,
  normalizeLeadStageForPipeline,
  normalizePipelineHexColor,
  type PipelineColumnDef,
} from "@/lib/crm/pipeline-columns";
import {
  createLead,
  deleteLead,
  setLeadTagAssigned,
  updateLeadNotes,
  updateLeadProjectType,
  updateLeadRow,
  updateLeadSourceField,
  updateLeadStage,
} from "@/app/(crm)/actions/crm";
import type { ClientTableRow } from "@/lib/crm/client-table-row";
import type { LeadTagCatalogRow } from "@/lib/crm/lead-tag-catalog";
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
  contact_category?: string | null;
  created_at?: string | null;
  /** Latest project title for the lead’s converted client, if any */
  primaryProject?: { title: string | null } | null;
  /** Tags assigned to this lead (from `lead_tag` / `lead_tag_assignment`) */
  leadTags?: { id: string; name: string; color: string }[];
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

/** Table pills: single neutral treatment (readability over rainbow chips). */
const leadTableDataPillClass =
  "border border-zinc-200/80 bg-zinc-50 text-zinc-800 dark:border-zinc-600/55 dark:bg-zinc-800/55 dark:text-zinc-100";

const leadTableActionBarClass =
  "inline-flex shrink-0 flex-nowrap items-center gap-0 rounded-lg border border-zinc-200/90 bg-zinc-50/95 p-0.5 shadow-sm dark:border-zinc-700 dark:bg-zinc-900/55";

const leadTableActionBtnClass =
  "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-white hover:text-zinc-800 disabled:cursor-not-allowed disabled:opacity-40 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100";

const leadTableActionDangerClass =
  "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-red-950/45 dark:hover:text-red-400";

function getSourcePillClass(_source: string) {
  return leadTableDataPillClass;
}

function hexToRgba(hex: string, alpha: number): string {
  const norm = normalizePipelineHexColor(hex);
  const h = (norm ?? "#64748b").slice(1);
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function leadTagPillStyle(hex: string): CSSProperties {
  const c = normalizePipelineHexColor(hex) ?? "#2563eb";
  return {
    backgroundColor: hexToRgba(c, 0.14),
    borderColor: hexToRgba(c, 0.38),
    color: c,
  };
}

function LeadTableTagsCell({
  lead,
  catalog,
  disabled,
  pickerOpen,
  onOpenPicker,
  onClosePicker,
  onAssign,
  onRemove,
  rowBusy,
}: {
  lead: Lead;
  catalog: LeadTagCatalogRow[];
  disabled: boolean;
  pickerOpen: boolean;
  onOpenPicker: () => void;
  onClosePicker: () => void;
  onAssign: (tagId: string) => void;
  onRemove: (tagId: string) => void;
  rowBusy: boolean;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const tags = lead.leadTags ?? [];
  const assigned = new Set(tags.map((t) => t.id));
  const available = catalog.filter((t) => !assigned.has(t.id));

  useEffect(() => {
    if (!pickerOpen) return;
    function onDoc(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        onClosePicker();
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [pickerOpen, onClosePicker]);

  return (
    <div ref={rootRef} className="relative flex min-w-[7rem] max-w-[14rem] flex-col gap-1.5">
      <button
        type="button"
        disabled={disabled || rowBusy || catalog.length === 0}
        onClick={() => (pickerOpen ? onClosePicker() : onOpenPicker())}
        title={
          catalog.length === 0
            ? "Create tags from the Tags button first"
            : "Add tag"
        }
        className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-dashed border-zinc-300 text-zinc-500 transition hover:border-zinc-400 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-600 dark:hover:border-zinc-500 dark:hover:bg-zinc-800/80"
        aria-expanded={pickerOpen}
        aria-haspopup="listbox"
        aria-label={`Add tag to ${lead.name?.trim() || lead.email || "lead"}`}
      >
        {rowBusy ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
        ) : (
          <Plus className="h-3.5 w-3.5" aria-hidden />
        )}
      </button>
      {tags.map((t) => (
        <div
          key={t.id}
          className="inline-flex max-w-full items-center gap-0.5 rounded-full border px-2 py-0.5 text-xs font-semibold"
          style={leadTagPillStyle(t.color)}
        >
          <span className="min-w-0 truncate">{t.name}</span>
          <button
            type="button"
            disabled={disabled || rowBusy}
            onClick={() => onRemove(t.id)}
            className="shrink-0 rounded-full p-0.5 hover:bg-black/10 dark:hover:bg-white/15"
            aria-label={`Remove tag ${t.name}`}
          >
            <X className="h-3 w-3" aria-hidden />
          </button>
        </div>
      ))}
      {pickerOpen && available.length > 0 ? (
        <ul
          className="absolute left-0 top-8 z-20 max-h-48 min-w-[10rem] overflow-auto rounded-xl border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-600 dark:bg-zinc-900"
          role="listbox"
        >
          {available.map((t) => (
            <li key={t.id} role="option">
              <button
                type="button"
                disabled={rowBusy}
                onClick={() => {
                  onAssign(t.id);
                  onClosePicker();
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800"
              >
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: t.color }}
                  aria-hidden
                />
                <span className="font-medium text-zinc-900 dark:text-zinc-100">
                  {t.name}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {pickerOpen && available.length === 0 && catalog.length > 0 ? (
        <p className="absolute left-0 top-8 z-20 w-48 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-500 shadow-lg dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
          All tags are already on this lead.
        </p>
      ) : null}
    </div>
  );
}

const projectTypeTextClasses: Record<string, string> = {
  "custom websites": "text-cyan-700 dark:text-cyan-400",
  "websites development": "text-cyan-700 dark:text-cyan-400",
  "ai automations": "text-violet-700 dark:text-violet-400",
  "ai automation": "text-violet-700 dark:text-violet-400",
  "web apps": "text-sky-700 dark:text-sky-400",
  "mobile apps": "text-emerald-700 dark:text-emerald-400",
  "mvp dev": "text-cyan-700 dark:text-cyan-400",
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

function getProjectTypePillClass(_projectType: string) {
  return leadTableDataPillClass;
}

const contactCategoryTextClasses: Record<string, string> = {
  "local business owner": "text-amber-800 dark:text-amber-400",
  "tech founder": "text-indigo-700 dark:text-indigo-400",
  "ecommerce founder": "text-rose-700 dark:text-rose-400",
  /** Legacy values still on some lead rows */
  "saas founder": "text-fuchsia-700 dark:text-fuchsia-400",
  "ecommerce owner": "text-rose-700 dark:text-rose-400",
  "retail / dtc founder": "text-rose-700 dark:text-rose-400",
};

function getContactCategoryTextClass(category: string) {
  const key = category.trim().toLowerCase();
  return (
    contactCategoryTextClasses[key] ?? "text-zinc-700 dark:text-zinc-300"
  );
}

function getContactCategoryPillClass(_category: string) {
  return leadTableDataPillClass;
}

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
  contact_category: string;
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

function normalizeSourceForSelect(
  source: string,
  leadSources: readonly string[]
): string {
  const raw = source.trim();
  if (!raw) return "";
  const low = raw.toLowerCase();
  for (const o of leadSources) {
    if (o.toLowerCase() === low) return o;
  }
  return raw;
}

function leadToDraft(
  lead: Lead,
  pipeline: PipelineColumnDef[],
  fieldOptions: MergedCrmFieldOptions
): LeadDraft {
  const { first, last } = splitName(lead.name);
  return {
    nameFirst: first,
    nameLast: last,
    email: lead.email ?? "",
    phone: lead.phone ?? "",
    company: lead.company ?? "",
    source: normalizeSourceForSelect(lead.source ?? "", fieldOptions.leadSources),
    stage: normalizeLeadStageForPipeline(lead.stage, pipeline),
    project_type: lead.project_type ?? "",
    contact_category: lead.contact_category ?? "",
    notes: lead.notes ?? "",
  };
}

function sourceNotInConfiguredList(source: string, leadSources: readonly string[]) {
  const t = source.trim();
  if (!t) return false;
  return !leadSources.includes(t);
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
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  dotColor: string;
  textClassName: string;
  children: React.ReactNode;
  disabled?: boolean;
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
        disabled={disabled}
        className={`w-full appearance-none rounded-lg border-0 bg-white py-1.5 pl-7 pr-8 text-[11px] font-medium text-zinc-800 outline-none ring-1 ring-zinc-200/85 focus:ring-2 focus:ring-blue-400/20 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-900/95 dark:text-zinc-100 dark:ring-zinc-600 dark:focus:ring-blue-500/25 ${textClassName}`}
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
  return mapLeadStageForPipelineKanban(lead.stage, pipeline);
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

export type LeadsSectionTab = "pipeline" | "leads" | "clients";

const SECTION_TABS: { id: LeadsSectionTab; label: string }[] = [
  { id: "pipeline", label: "Pipeline" },
  { id: "leads", label: "Leads" },
  { id: "clients", label: "Clients" },
];

function leadsSectionSubtitle(tab: LeadsSectionTab): string {
  switch (tab) {
    case "pipeline":
      return "Drag cards between stages to update pipeline status. Project types reflect the work each contact is interested in.";
    case "leads":
      return "Track inbound inquiries and nurture them through qualification.";
    case "clients":
      return "Companies and contacts you work with.";
    default:
      return "";
  }
}

export default function LeadsView({
  leads,
  fieldOptions,
  leadPipelineColumns,
  leadTagCatalog = [],
  clientsForTab = [],
  clientsTabLoadError = null,
  initialSection,
  highlightClientId,
}: {
  leads: Lead[];
  fieldOptions: MergedCrmFieldOptions;
  leadPipelineColumns: PipelineColumnDef[];
  /** Tag definitions + lead counts for Manage Tags (requires DB migration). */
  leadTagCatalog?: LeadTagCatalogRow[];
  clientsForTab?: ClientTableRow[];
  clientsTabLoadError?: { message: string } | null;
  initialSection?: LeadsSectionTab;
  /** Deep link: scroll/highlight this client row on the Clients tab */
  highlightClientId?: string;
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [leadTableSort, setLeadTableSort] = useState<"newest" | "oldest">(
    "newest"
  );
  const [modalOpen, setModalOpen] = useState(false);
  const [view, setView] = useState<LeadsSectionTab>(
    initialSection ?? "pipeline"
  );
  const [leadsSnapshot, setLeadsSnapshot] = useState(leads);
  const [leadPipeline, setLeadPipeline] =
    useState<PipelineColumnDef[]>(leadPipelineColumns);
  const [pipelineSettingsOpen, setPipelineSettingsOpen] = useState(false);
  const [manageTagsOpen, setManageTagsOpen] = useState(false);
  const [lostReasonPrompt, setLostReasonPrompt] = useState<null | {
    lead: Lead;
    previousStageRaw: string | null;
    toStage: string;
  }>(null);

  useEffect(() => {
    setLeadsSnapshot(leads);
  }, [leads]);

  useEffect(() => {
    setLeadPipeline(leadPipelineColumns.map((c) => ({ ...c })));
  }, [leadPipelineColumns]);

  useEffect(() => {
    if (initialSection) setView(initialSection);
  }, [initialSection]);

  const filtered = leadsSnapshot.filter((l) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      l.name?.toLowerCase().includes(q) ||
      l.email?.toLowerCase().includes(q) ||
      l.company?.toLowerCase().includes(q) ||
      l.source?.toLowerCase().includes(q) ||
      l.project_type?.toLowerCase().includes(q) ||
      l.contact_category?.toLowerCase().includes(q) ||
      (l.primaryProject?.title?.toLowerCase().includes(q) ?? false) ||
      (l.leadTags ?? []).some((t) => t.name.toLowerCase().includes(q))
    );
  });

  const sortedLeadsForTable = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      const ta = new Date(a.created_at ?? 0).getTime();
      const tb = new Date(b.created_at ?? 0).getTime();
      return leadTableSort === "newest" ? tb - ta : ta - tb;
    });
    return arr;
  }, [filtered, leadTableSort]);

  const leadStageCounts = leadsSnapshot.reduce<Record<string, number>>(
    (acc, l) => {
      const s = (l.stage ?? "").trim() || "contacted";
      acc[s] = (acc[s] ?? 0) + 1;
      return acc;
    },
    {}
  );

  /**
   * Pipeline Kanban: hide legacy "New Lead" (folds into Contacted) and "Open"
   * (Leads table / detail only; those cards sit in the Contacted column).
   */
  const leadPipelineKanban = useMemo(
    () =>
      leadPipeline.filter((c) => c.slug !== "new" && c.slug !== "open"),
    [leadPipeline]
  );

  const pipelineColumns: KanbanColumn<Lead>[] = useMemo(() => {
    const configuredSlugs = new Set(leadPipelineKanban.map((c) => c.slug));
    const keys = new Set(
      filtered.map((l) => leadKanbanKey(l, leadPipeline))
    );
    const orphanSlugs = [...keys].filter((k) => !configuredSlugs.has(k));
    return [
      ...leadPipelineKanban.map((col) => ({
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
  }, [filtered, leadPipeline, leadPipelineKanban]);

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [quickPatchLeadId, setQuickPatchLeadId] = useState<string | null>(null);
  const [tagPickerLeadId, setTagPickerLeadId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<LeadDraft | null>(null);
  const [savePending, setSavePending] = useState(false);
  const [notesLead, setNotesLead] = useState<Lead | null>(null);
  const [newProjectLeadId, setNewProjectLeadId] = useState<string | null>(null);
  const [quickTaskLead, setQuickTaskLead] = useState<Lead | null>(null);
  const [pipelineEditLeadId, setPipelineEditLeadId] = useState<string | null>(
    null
  );

  const pipelineEditLead = useMemo(() => {
    if (!pipelineEditLeadId) return null;
    return leadsSnapshot.find((l) => l.id === pipelineEditLeadId) ?? null;
  }, [pipelineEditLeadId, leadsSnapshot]);

  useEffect(() => {
    if (
      pipelineEditLeadId &&
      !leadsSnapshot.some((l) => l.id === pipelineEditLeadId)
    ) {
      setPipelineEditLeadId(null);
    }
  }, [pipelineEditLeadId, leadsSnapshot]);

  function handlePipelineMove(
    itemId: string,
    fromCol: string,
    toCol: string
  ) {
    if (fromCol === toCol) return;
    const lead = leadsSnapshot.find((l) => l.id === itemId);
    const currentNorm = lead
      ? normalizeLeadStageForPipeline(lead.stage, leadPipeline)
      : fromCol;
    if (
      lead &&
      isLeadLostStage(toCol, leadPipeline) &&
      !isLeadLostStage(currentNorm, leadPipeline)
    ) {
      setLostReasonPrompt({
        lead,
        previousStageRaw: lead.stage,
        toStage: toCol,
      });
      return;
    }
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

  async function confirmMoveToLost(reason: string) {
    if (!lostReasonPrompt) return;
    const { lead, previousStageRaw, toStage } = lostReasonPrompt;
    const trimmed = reason.trim();
    if (!trimmed) return;
    setQuickPatchLeadId(lead.id);
    setLeadsSnapshot((prev) =>
      prev.map((l) => (l.id === lead.id ? { ...l, stage: toStage } : l))
    );
    const res = await updateLeadStage(lead.id, toStage, {
      lostReason: trimmed,
    });
    if ("error" in res && res.error) {
      window.alert(res.error);
      setLeadsSnapshot((prev) =>
        prev.map((l) =>
          l.id === lead.id ? { ...l, stage: previousStageRaw } : l
        )
      );
      setQuickPatchLeadId(null);
      return;
    }
    setLostReasonPrompt(null);
    router.refresh();
    setQuickPatchLeadId(null);
  }

  function startEdit(lead: Lead) {
    setPipelineEditLeadId(null);
    setTagPickerLeadId(null);
    setEditingId(lead.id);
    setDraft(leadToDraft(lead, leadPipeline, fieldOptions));
  }

  function cancelEdit() {
    setEditingId(null);
    setDraft(null);
  }

  const showLeadToolbar = view === "pipeline" || view === "leads";

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
    fd.set("contact_category", draft.contact_category);
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
        `Delete ${label}? This will remove the lead and related CRM links.`
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

  function handleQuickStageChange(lead: Lead, newStage: string) {
    if (editingId) return;
    const current = normalizeLeadStageForPipeline(lead.stage, leadPipeline);
    if (newStage === current) return;
    if (
      isLeadLostStage(newStage, leadPipeline) &&
      !isLeadLostStage(current, leadPipeline)
    ) {
      setLostReasonPrompt({
        lead,
        previousStageRaw: lead.stage,
        toStage: newStage,
      });
      return;
    }
    const previousStage = lead.stage;
    setQuickPatchLeadId(lead.id);
    setLeadsSnapshot((prev) =>
      prev.map((l) => (l.id === lead.id ? { ...l, stage: newStage } : l))
    );
    void (async () => {
      const res = await updateLeadStage(lead.id, newStage);
      if ("error" in res && res.error) {
        window.alert(res.error);
        setLeadsSnapshot((prev) =>
          prev.map((l) =>
            l.id === lead.id ? { ...l, stage: previousStage } : l
          )
        );
      } else {
        router.refresh();
      }
      setQuickPatchLeadId(null);
    })();
  }

  function handleQuickProjectTypeChange(lead: Lead, newValue: string) {
    if (editingId) return;
    const next = newValue.trim();
    const cur = (lead.project_type ?? "").trim();
    if (next === cur) return;
    const previous = lead.project_type ?? null;
    setQuickPatchLeadId(lead.id);
    setLeadsSnapshot((prev) =>
      prev.map((l) =>
        l.id === lead.id ? { ...l, project_type: next || null } : l
      )
    );
    void (async () => {
      const res = await updateLeadProjectType(lead.id, newValue);
      if ("error" in res && res.error) {
        window.alert(res.error);
        setLeadsSnapshot((prev) =>
          prev.map((l) =>
            l.id === lead.id ? { ...l, project_type: previous } : l
          )
        );
      } else {
        router.refresh();
      }
      setQuickPatchLeadId(null);
    })();
  }

  function handleQuickSourceChange(lead: Lead, newValue: string) {
    if (editingId) return;
    const next = newValue.trim();
    const cur = normalizeSourceForSelect(
      lead.source ?? "",
      fieldOptions.leadSources
    );
    if (next === cur) return;
    const previous = lead.source ?? null;
    setQuickPatchLeadId(lead.id);
    setLeadsSnapshot((prev) =>
      prev.map((l) =>
        l.id === lead.id ? { ...l, source: next === "" ? null : next } : l
      )
    );
    void (async () => {
      const res = await updateLeadSourceField(lead.id, newValue);
      if ("error" in res && res.error) {
        window.alert(res.error);
        setLeadsSnapshot((prev) =>
          prev.map((l) =>
            l.id === lead.id ? { ...l, source: previous } : l
          )
        );
      } else {
        router.refresh();
      }
      setQuickPatchLeadId(null);
    })();
  }

  function handleLeadTagMutate(lead: Lead, tagId: string, assign: boolean) {
    if (editingId) return;
    const prevTags = lead.leadTags ?? [];
    const catalogEntry = leadTagCatalog.find((t) => t.id === tagId);
    if (assign && !catalogEntry) return;
    setQuickPatchLeadId(lead.id);
    setLeadsSnapshot((prev) =>
      prev.map((l) => {
        if (l.id !== lead.id) return l;
        if (assign && catalogEntry) {
          if ((l.leadTags ?? []).some((t) => t.id === tagId)) return l;
          const next = [
            ...(l.leadTags ?? []),
            {
              id: catalogEntry.id,
              name: catalogEntry.name,
              color: catalogEntry.color,
            },
          ].sort((a, b) => a.name.localeCompare(b.name));
          return { ...l, leadTags: next };
        }
        return {
          ...l,
          leadTags: (l.leadTags ?? []).filter((t) => t.id !== tagId),
        };
      })
    );
    void (async () => {
      const res = await setLeadTagAssigned(lead.id, tagId, assign);
      if ("error" in res && res.error) {
        window.alert(res.error);
        setLeadsSnapshot((prev) =>
          prev.map((l) =>
            l.id === lead.id ? { ...l, leadTags: prevTags } : l
          )
        );
      } else {
        router.refresh();
      }
      setQuickPatchLeadId(null);
    })();
  }

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="heading-display text-2xl font-bold text-text-primary">
            Leads
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            {leadsSectionSubtitle(view)}
          </p>
        </div>
        {showLeadToolbar && view !== "leads" ? (
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
        ) : null}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-4">
        <div className="inline-flex rounded-lg border border-border bg-surface/50 p-0.5">
          {SECTION_TABS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                cancelEdit();
                setPipelineEditLeadId(null);
                setView(id);
              }}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                view === id
                  ? "bg-white text-text-primary shadow-sm"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        {showLeadToolbar ? (
          <>
            {view !== "leads" ? (
            <span className="text-sm text-text-secondary">
              {filtered.length} leads
            </span>
            ) : null}
            <button
              type="button"
              onClick={() => setPipelineSettingsOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-text-secondary hover:border-accent hover:text-accent dark:border-zinc-600"
            >
              <Settings2 className="h-3.5 w-3.5" />
              Pipeline stages
            </button>
          </>
        ) : null}
      </div>

      {showLeadToolbar ? (
        <LeadsPipelineSummary
          leads={leadsSnapshot}
          leadPipeline={leadPipeline}
          searchQuery={search}
        />
      ) : null}

      <div className="mt-6">
        {view === "leads" ? (
          <LeadsTable
            leads={sortedLeadsForTable}
            fieldOptions={fieldOptions}
            leadPipeline={leadPipeline}
            editingId={editingId}
            draft={draft}
            setDraft={setDraft}
            savePending={savePending}
            deletingId={deletingId}
            quickPatchLeadId={quickPatchLeadId}
            startEdit={startEdit}
            cancelEdit={cancelEdit}
            saveEdit={saveEdit}
            handleDeleteLead={handleDeleteLead}
            setNotesLead={setNotesLead}
            onCreateProject={(lead) => setNewProjectLeadId(lead.id)}
            onQuickTask={setQuickTaskLead}
            onQuickStageChange={handleQuickStageChange}
            onQuickProjectTypeChange={handleQuickProjectTypeChange}
            onQuickSourceChange={handleQuickSourceChange}
            leadTagCatalog={leadTagCatalog}
            tagPickerLeadId={tagPickerLeadId}
            setTagPickerLeadId={setTagPickerLeadId}
            onLeadTagMutate={handleLeadTagMutate}
            chrome={{
              leadCount: filtered.length,
              search,
              onSearchChange: setSearch,
              sort: leadTableSort,
              onSortChange: setLeadTableSort,
              onAddLead: () => setModalOpen(true),
              onOpenManageTags: () => setManageTagsOpen(true),
            }}
          />
        ) : null}
        {view === "pipeline" ? (
          <LeadsPipelineBoard
            columns={pipelineColumns}
            onMove={handlePipelineMove}
            editingId={editingId}
            deletingId={deletingId}
            pipelineModalOpenLeadId={pipelineEditLeadId}
            onNotes={setNotesLead}
            onCreateProject={(lead) => setNewProjectLeadId(lead.id)}
            onQuickTask={setQuickTaskLead}
            onEditFromPipeline={(l) => {
              cancelEdit();
              setPipelineEditLeadId(l.id);
            }}
            onDelete={handleDeleteLead}
          />
        ) : null}
        {view === "clients" ? (
          <div>
            {clientsTabLoadError ? (
              <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-100">
                {clientsTabLoadError.message}. Apply{" "}
                <code className="font-mono text-xs">supabase/migrations</code>.
              </p>
            ) : null}
            <div className="mb-4">
              <h2 className="heading-display text-xl font-bold text-text-primary">
                Clients
              </h2>
              <p className="mt-1 text-sm text-text-secondary">
                Companies and contacts you work with
              </p>
            </div>
            <ClientsView
              clients={clientsForTab}
              embedded
              highlightClientId={highlightClientId}
              fieldOptions={fieldOptions}
            />
          </div>
        ) : null}
      </div>

      {notesLead && (
        <LeadNotesModal lead={notesLead} onClose={() => setNotesLead(null)} />
      )}
      {lostReasonPrompt && (
        <LeadLostReasonModal
          lead={lostReasonPrompt.lead}
          onCancel={() => setLostReasonPrompt(null)}
          onConfirm={(reason) => void confirmMoveToLost(reason)}
        />
      )}
      {newProjectLeadId ? (
        <CrmNewProjectFromLeadModal
          leadId={newProjectLeadId}
          fieldOptions={fieldOptions}
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
      {modalOpen && (
        <NewLeadModal
          fieldOptions={fieldOptions}
          onClose={() => setModalOpen(false)}
        />
      )}
      {pipelineEditLead ? (
        <PipelineLeadEditModal
          lead={pipelineEditLead}
          fieldOptions={fieldOptions}
          leadPipeline={leadPipeline}
          leadTagCatalog={leadTagCatalog}
          quickPatchLeadId={quickPatchLeadId}
          onClose={() => setPipelineEditLeadId(null)}
          onOpenFullPage={(l) => {
            setPipelineEditLeadId(null);
            router.push(`/leads/${l.id}`);
          }}
          onTagMutate={handleLeadTagMutate}
          onSaved={() => {
            setPipelineEditLeadId(null);
            router.refresh();
          }}
        />
      ) : null}

      <PipelineSettingsModal
        open={pipelineSettingsOpen}
        onClose={() => setPipelineSettingsOpen(false)}
        kind="lead"
        columns={leadPipeline}
        stageCounts={leadStageCounts}
        onSaved={() => router.refresh()}
      />

      <ManageLeadTagsModal
        open={manageTagsOpen}
        onClose={() => setManageTagsOpen(false)}
        initialTags={leadTagCatalog}
        onChanged={() => router.refresh()}
      />
    </div>
  );
}

type LeadsTableChrome = {
  leadCount: number;
  search: string;
  onSearchChange: (v: string) => void;
  sort: "newest" | "oldest";
  onSortChange: (v: "newest" | "oldest") => void;
  onAddLead: () => void;
  onOpenManageTags?: () => void;
};

type LeadsTableProps = {
  leads: Lead[];
  fieldOptions: MergedCrmFieldOptions;
  leadPipeline: PipelineColumnDef[];
  editingId: string | null;
  draft: LeadDraft | null;
  setDraft: Dispatch<SetStateAction<LeadDraft | null>>;
  savePending: boolean;
  deletingId: string | null;
  quickPatchLeadId: string | null;
  startEdit: (lead: Lead) => void;
  cancelEdit: () => void;
  saveEdit: (leadId: string) => Promise<void>;
  handleDeleteLead: (lead: Lead) => Promise<void>;
  setNotesLead: Dispatch<SetStateAction<Lead | null>>;
  onCreateProject: (lead: Lead) => void;
  onQuickTask: (lead: Lead) => void;
  onQuickStageChange: (lead: Lead, stage: string) => void;
  onQuickProjectTypeChange: (lead: Lead, projectType: string) => void;
  onQuickSourceChange: (lead: Lead, source: string) => void;
  leadTagCatalog: LeadTagCatalogRow[];
  tagPickerLeadId: string | null;
  setTagPickerLeadId: Dispatch<SetStateAction<string | null>>;
  onLeadTagMutate: (lead: Lead, tagId: string, assign: boolean) => void;
  chrome?: LeadsTableChrome;
};

/** Won / Lost columns can collapse to a narrow strip (persisted in localStorage). */
const LEAD_OUTCOME_COLLAPSIBLE_IDS = new Set(["closed_won", "closed_lost"]);
const LEAD_PIPELINE_OUTCOME_COLLAPSED_KEY =
  "zenpho_leads_pipeline_outcome_collapsed";

function LeadsPipelineBoard({
  columns,
  onMove,
  editingId,
  deletingId,
  pipelineModalOpenLeadId,
  onNotes,
  onCreateProject,
  onQuickTask,
  onEditFromPipeline,
  onDelete,
}: {
  columns: KanbanColumn<Lead>[];
  onMove: (itemId: string, fromCol: string, toCol: string) => void;
  editingId: string | null;
  deletingId: string | null;
  /** When set, other cards’ edit buttons stay disabled while the pipeline edit modal is open. */
  pipelineModalOpenLeadId: string | null;
  onNotes: (lead: Lead) => void;
  onCreateProject: (lead: Lead) => void;
  onQuickTask: (lead: Lead) => void;
  onEditFromPipeline: (lead: Lead) => void;
  onDelete: (lead: Lead) => void;
}) {
  const stopDragMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const [collapsedOutcomeColumns, setCollapsedOutcomeColumns] = useState<
    Set<string>
  >(() => new Set());

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LEAD_PIPELINE_OUTCOME_COLLAPSED_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) return;
      setCollapsedOutcomeColumns(
        new Set(
          parsed.filter(
            (x): x is string =>
              typeof x === "string" && LEAD_OUTCOME_COLLAPSIBLE_IDS.has(x)
          )
        )
      );
    } catch {
      /* ignore */
    }
  }, []);

  function toggleOutcomeColumn(columnId: string) {
    if (!LEAD_OUTCOME_COLLAPSIBLE_IDS.has(columnId)) return;
    setCollapsedOutcomeColumns((prev) => {
      const next = new Set(prev);
      if (next.has(columnId)) next.delete(columnId);
      else next.add(columnId);
      try {
        localStorage.setItem(
          LEAD_PIPELINE_OUTCOME_COLLAPSED_KEY,
          JSON.stringify([...next])
        );
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  return (
    <KanbanBoard<Lead>
      columns={columns}
      emptyColumnLabel="No leads"
      onMove={onMove}
      collapsibleColumnIds={LEAD_OUTCOME_COLLAPSIBLE_IDS}
      collapsedColumnIds={collapsedOutcomeColumns}
      onToggleColumnCollapse={toggleOutcomeColumn}
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
            {lead.primaryProject ? (
              <Link
                href={`/leads/${lead.id}`}
                className="mt-1.5 block min-w-0 truncate text-xs font-medium text-accent hover:underline dark:text-blue-400"
              >
                {lead.primaryProject.title?.trim() || "Project"}
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
            {lead.contact_category?.trim() ? (
              <div className="mt-1.5 flex min-w-0 items-center gap-1.5 text-xs">
                <Tag
                  className="h-3.5 w-3.5 shrink-0 text-zinc-400"
                  aria-hidden
                />
                <span
                  className={`min-w-0 truncate font-medium ${getContactCategoryTextClass(lead.contact_category)}`}
                >
                  {lead.contact_category.trim()}
                </span>
              </div>
            ) : null}
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
                disabled={
                  editingId !== null ||
                  Boolean(
                    pipelineModalOpenLeadId &&
                      pipelineModalOpenLeadId !== lead.id
                  )
                }
                className="inline-flex items-center justify-center rounded-md p-1.5 text-violet-600 transition-colors hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-40 dark:text-violet-400 dark:hover:bg-violet-950/40"
                aria-label={`Create project for ${deleteLabel}`}
                title="Create project"
              >
                <FolderKanban className="h-4 w-4 shrink-0" aria-hidden />
              </button>
              <button
                type="button"
                onClick={() => onNotes(lead)}
                disabled={
                  editingId !== null ||
                  Boolean(
                    pipelineModalOpenLeadId &&
                      pipelineModalOpenLeadId !== lead.id
                  )
                }
                title="Notes"
                className="inline-flex items-center justify-center rounded-md p-1.5 text-accent-warm transition-colors hover:bg-accent-warm/10 disabled:cursor-not-allowed disabled:opacity-40 dark:text-amber-400 dark:hover:bg-amber-950/35"
                aria-label={`View notes for ${deleteLabel}`}
              >
                <LeadNotesGlyphIcon className="h-4 w-4 shrink-0" />
              </button>
              <button
                type="button"
                onClick={() => onQuickTask(lead)}
                disabled={
                  editingId !== null ||
                  Boolean(
                    pipelineModalOpenLeadId &&
                      pipelineModalOpenLeadId !== lead.id
                  )
                }
                title="Quick task"
                className="inline-flex items-center justify-center rounded-md p-1.5 text-zinc-600 transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-40 dark:text-zinc-400 dark:hover:bg-zinc-800"
                aria-label={`Add task for ${deleteLabel}`}
              >
                <ListTodo className="h-4 w-4 shrink-0" aria-hidden />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onEditFromPipeline(lead);
                }}
                disabled={Boolean(
                  (editingId && editingId !== lead.id) ||
                    (pipelineModalOpenLeadId &&
                      pipelineModalOpenLeadId !== lead.id)
                )}
                className="inline-flex items-center justify-center rounded-md p-1.5 text-accent transition-colors hover:bg-accent/10 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label={`Edit ${deleteLabel}`}
                title="Edit lead"
              >
                <Pencil className="h-4 w-4 shrink-0" aria-hidden />
              </button>
              <button
                type="button"
                disabled={
                  deletingId === lead.id ||
                  Boolean(
                    (editingId && editingId !== lead.id) ||
                      (pipelineModalOpenLeadId &&
                        pipelineModalOpenLeadId !== lead.id)
                  )
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
  fieldOptions,
  leadPipeline,
  editingId,
  draft,
  setDraft,
  savePending,
  deletingId,
  quickPatchLeadId,
  startEdit,
  cancelEdit,
  saveEdit,
  handleDeleteLead,
  setNotesLead,
  onCreateProject,
  onQuickTask,
  onQuickStageChange,
  onQuickProjectTypeChange,
  onQuickSourceChange,
  leadTagCatalog,
  tagPickerLeadId,
  setTagPickerLeadId,
  onLeadTagMutate,
  chrome,
}: LeadsTableProps) {
  const toolbar = chrome ? (
    <div className="flex flex-col gap-3 border-b border-zinc-100 bg-white px-4 py-3.5 dark:border-zinc-800 dark:bg-zinc-900 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-3">
        <span
          className="inline-flex items-center justify-center rounded-lg bg-zinc-100 p-1.5 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50"
          aria-label="Table view"
          title="Table view"
        >
          <Table2 className="h-4 w-4 text-zinc-500 dark:text-zinc-400" aria-hidden />
        </span>
        <span className="text-sm text-zinc-500 dark:text-zinc-400">
          {chrome.leadCount} leads
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
            aria-hidden
          />
          <input
            type="text"
            placeholder="Search…"
            value={chrome.search}
            onChange={(e) => chrome.onSearchChange(e.target.value)}
            className="h-9 w-full min-w-[10rem] rounded-lg border border-zinc-200 bg-zinc-50/80 py-1.5 pl-8 pr-3 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/15 dark:border-zinc-600 dark:bg-zinc-800/60 dark:text-zinc-100 sm:w-44"
          />
        </div>
        <div className="relative flex h-9 items-center gap-1 rounded-lg border border-zinc-200 bg-white px-2 pr-7 dark:border-zinc-600 dark:bg-zinc-900">
          <ArrowUpDown className="h-3.5 w-3.5 shrink-0 text-zinc-400" aria-hidden />
          <select
            value={chrome.sort}
            onChange={(e) =>
              chrome.onSortChange(e.target.value as "newest" | "oldest")
            }
            className="h-full min-w-[5.5rem] cursor-pointer appearance-none border-0 bg-transparent py-0 text-sm font-medium text-zinc-700 outline-none dark:text-zinc-200"
            aria-label="Sort leads by date"
          >
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
        </div>
        <button
          type="button"
          onClick={() => chrome.onOpenManageTags?.()}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-dashed border-zinc-300 bg-white px-3 text-sm font-medium text-zinc-600 hover:border-zinc-400 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-zinc-500 dark:hover:bg-zinc-800"
          title="Manage lead tags"
        >
          <Tag className="h-3.5 w-3.5" aria-hidden />
          Tags
        </button>
        <button
          type="button"
          onClick={chrome.onAddLead}
          className="inline-flex h-9 items-center gap-1 rounded-lg bg-blue-600 px-3.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500"
        >
          + Add Lead
          <ChevronDown className="h-4 w-4 opacity-90" aria-hidden />
        </button>
      </div>
    </div>
  ) : null;

  if (leads.length === 0) {
    return (
      <div className="overflow-hidden rounded-2xl border border-zinc-200/90 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        {toolbar}
        <div className="border-t border-dashed border-zinc-200 py-16 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
        No leads found.
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200/90 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      {toolbar}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[96rem] text-left text-xs leading-snug text-zinc-700 dark:text-zinc-300">
        <thead>
          <tr className="border-b border-zinc-100 bg-zinc-50/95 dark:border-zinc-800 dark:bg-zinc-800/40">
            <th className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Name
            </th>
            <th className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Phone
            </th>
            <th className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Email
            </th>
            <th className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Status
            </th>
            <th className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Service
            </th>
            <th className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Category
            </th>
            <th className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Company
            </th>
            <th className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Product
            </th>
            <th className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Tags
            </th>
            <th className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Source
            </th>
            <th className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Date
            </th>
            <th className="px-4 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
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
            const quickRowBusy = quickPatchLeadId === lead.id;
            const quickSelectDisabled = Boolean(editingId) || quickRowBusy;

            return (
              <tr
                key={lead.id}
                className={`transition-colors ${
                  isEditing
                    ? "bg-sky-50/70 dark:bg-sky-950/30"
                    : "hover:bg-zinc-50/80 dark:hover:bg-zinc-800/35"
                }`}
              >
                <td className="px-4 py-2.5 align-top">
                  <div className="flex items-center gap-2.5">
                    <span
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-200/90 text-[10px] font-bold text-zinc-700 dark:bg-zinc-700 dark:text-zinc-200"
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
                        className="min-w-0 font-medium text-blue-600 hover:text-blue-700 hover:underline dark:text-blue-400 dark:hover:text-blue-300"
                      >
                        {lead.name?.trim() || "—"}
                      </Link>
                    )}
                  </div>
                </td>
                <td className="px-4 py-2.5 align-top">
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
                    <span className="text-zinc-600 dark:text-zinc-400">
                      {formatLeadPhone(lead.phone)}
                    </span>
                  )}
                </td>
                <td className="px-4 py-2.5 align-top">
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
                    <span className="text-zinc-600 dark:text-zinc-400">
                      {lead.email ?? "—"}
                    </span>
                  )}
                </td>
                <td className="px-4 py-2.5 align-top">
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
                      disabled={savePending}
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
                    <PillSelect
                      value={stageKey}
                      onChange={(v) => onQuickStageChange(lead, v)}
                      dotColor={stageMeta.color}
                      textClassName="text-zinc-700 dark:text-zinc-300"
                      disabled={quickSelectDisabled}
                    >
                      {(() => {
                        const opts = leadPipeline.map((c) => ({ ...c }));
                        if (!opts.some((c) => c.slug === stageKey)) {
                          opts.unshift({
                            slug: stageKey,
                            label: stageMeta.label,
                            color: stageMeta.color,
                          });
                        }
                        return opts.map((c) => (
                          <option key={c.slug} value={c.slug}>
                            {c.label}
                          </option>
                        ));
                      })()}
                    </PillSelect>
                  )}
                </td>
                <td className="px-4 py-2.5 align-top">
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
                        {draft.project_type &&
                          !fieldOptions.leadProjectTypes.includes(
                            draft.project_type
                          ) && (
                          <option value={draft.project_type}>
                            {draft.project_type}
                          </option>
                        )}
                        {fieldOptions.leadProjectTypes.map((opt) => (
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
                  ) : (
                    <div className="relative min-w-[7rem] max-w-[12rem]">
                      <select
                        value={lead.project_type ?? ""}
                        onChange={(e) =>
                          onQuickProjectTypeChange(lead, e.target.value)
                        }
                        disabled={quickSelectDisabled}
                        aria-label={`Service for ${deleteLabel}`}
                        className={`w-full appearance-none rounded-lg border-0 py-1.5 pl-3 pr-8 text-[11px] font-medium capitalize outline-none ring-1 ring-zinc-200/85 focus:ring-2 focus:ring-blue-400/20 disabled:cursor-not-allowed disabled:opacity-60 dark:ring-zinc-600 dark:focus:ring-blue-500/25 ${
                          lead.project_type?.trim()
                            ? getProjectTypePillClass(lead.project_type)
                            : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
                        }`}
                      >
                        <option value="">Not set</option>
                        {lead.project_type &&
                          !fieldOptions.leadProjectTypes.includes(
                            lead.project_type
                          ) && (
                          <option value={lead.project_type}>
                      {lead.project_type}
                          </option>
                        )}
                        {fieldOptions.leadProjectTypes.map((opt) => (
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
                  )}
                </td>
                <td className="px-4 py-2.5 align-top">
                  {isEditing ? (
                    <div className="relative min-w-[7rem] max-w-[12rem]">
                      <select
                        value={draft.contact_category}
                        onChange={(e) =>
                          setDraft((d) =>
                            d ? { ...d, contact_category: e.target.value } : d
                          )
                        }
                        className={`${inlineInputClass} appearance-none pr-7`}
                      >
                        <option value="">Not set</option>
                        {draft.contact_category &&
                          !fieldOptions.leadContactCategories.includes(
                            draft.contact_category
                          ) && (
                          <option value={draft.contact_category}>
                            {draft.contact_category}
                          </option>
                        )}
                        {fieldOptions.leadContactCategories.map((opt) => (
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
                  ) : lead.contact_category?.trim() ? (
                    <span
                      className={`inline-flex max-w-full rounded-lg px-2.5 py-0.5 text-[11px] font-medium ${getContactCategoryPillClass(lead.contact_category)}`}
                    >
                      <span className="truncate">{lead.contact_category}</span>
                    </span>
                  ) : (
                    <span className="text-zinc-400 dark:text-zinc-500">—</span>
                  )}
                </td>
                <td className="px-4 py-2.5 align-top">
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
                      className={`inline-flex max-w-full rounded-lg px-2.5 py-0.5 text-[11px] font-medium ${leadTableDataPillClass}`}
                    >
                      <span className="truncate">{lead.company}</span>
                    </span>
                  ) : (
                    <span className="text-zinc-400 dark:text-zinc-500">—</span>
                  )}
                </td>
                <td className="px-4 py-2.5 align-top">
                  {lead.primaryProject ? (
                    <Link
                      href={`/leads/${lead.id}`}
                      className="inline-flex max-w-full min-w-0 items-center gap-1 font-medium text-blue-600 hover:text-blue-700 hover:underline dark:text-blue-400"
                    >
                      <span className="min-w-0 truncate">
                      {lead.primaryProject.title?.trim() || "Project"}
                      </span>
                      <ExternalLink
                        className="h-3.5 w-3.5 shrink-0 text-zinc-400 dark:text-zinc-500"
                        aria-hidden
                      />
                    </Link>
                  ) : (
                    <span className="text-zinc-400 dark:text-zinc-500">—</span>
                  )}
                </td>
                <td className="px-4 py-2.5 align-top">
                  {isEditing ? (
                    <div className="flex min-w-0 max-w-[14rem] flex-col gap-1">
                      {(lead.leadTags ?? []).length === 0 ? (
                        <span className="text-sm text-zinc-400 dark:text-zinc-500">
                          —
                        </span>
                      ) : (
                        (lead.leadTags ?? []).map((t) => (
                          <span
                            key={t.id}
                            className="inline-flex max-w-full truncate rounded-full border px-2 py-0.5 text-xs font-semibold"
                            style={leadTagPillStyle(t.color)}
                          >
                            {t.name}
                          </span>
                        ))
                      )}
                    </div>
                  ) : (
                    <LeadTableTagsCell
                      lead={lead}
                      catalog={leadTagCatalog}
                      disabled={Boolean(editingId)}
                      pickerOpen={tagPickerLeadId === lead.id}
                      onOpenPicker={() => setTagPickerLeadId(lead.id)}
                      onClosePicker={() => setTagPickerLeadId(null)}
                      onAssign={(tagId) =>
                        onLeadTagMutate(lead, tagId, true)
                      }
                      onRemove={(tagId) =>
                        onLeadTagMutate(lead, tagId, false)
                      }
                      rowBusy={quickPatchLeadId === lead.id}
                    />
                  )}
                </td>
                <td className="px-4 py-2.5 align-top">
                    {isEditing && draft ? (
                    <PillSelect
                      value={draft.source}
                      onChange={(v) =>
                        setDraft((d) => (d ? { ...d, source: v } : d))
                      }
                      dotColor="#0ea5e9"
                      textClassName="text-sky-800 dark:text-sky-300"
                      disabled={savePending}
                    >
                      <option value="">—</option>
                      {draft.source &&
                        sourceNotInConfiguredList(
                          draft.source,
                          fieldOptions.leadSources
                        ) && (
                        <option value={draft.source}>{draft.source}</option>
                      )}
                      {fieldOptions.leadSources.map((o) => (
                        <option key={o} value={o}>
                          {formatSourceOptionLabel(o)}
                        </option>
                      ))}
                    </PillSelect>
                  ) : (
                    <div className="relative min-w-[6.5rem] max-w-[11rem]">
                      <select
                        value={normalizeSourceForSelect(
                          lead.source ?? "",
                          fieldOptions.leadSources
                        )}
                        onChange={(e) =>
                          onQuickSourceChange(lead, e.target.value)
                        }
                        disabled={quickSelectDisabled}
                        aria-label={`Source for ${deleteLabel}`}
                        className={`w-full appearance-none rounded-lg border-0 py-1.5 pl-3 pr-8 text-[11px] font-medium capitalize outline-none ring-1 ring-zinc-200/85 focus:ring-2 focus:ring-blue-400/20 disabled:cursor-not-allowed disabled:opacity-60 dark:ring-zinc-600 dark:focus:ring-blue-500/25 ${getSourcePillClass(lead.source ?? "")}`}
                      >
                        <option value="">Not set</option>
                        {lead.source &&
                          sourceNotInConfiguredList(
                            lead.source,
                            fieldOptions.leadSources
                          ) && (
                          <option value={lead.source.trim()}>
                      {lead.source}
                          </option>
                        )}
                        {fieldOptions.leadSources.map((o) => (
                          <option key={o} value={o}>
                            {formatSourceOptionLabel(o)}
                          </option>
                        ))}
                      </select>
                      <ChevronDown
                        className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400"
                        aria-hidden
                      />
                    </div>
                  )}
                </td>
                <td className="px-4 py-2.5 align-top tabular-nums text-zinc-600 dark:text-zinc-400">
                  {formatDate(lead.created_at)}
                </td>
                <td className="px-4 py-2.5 align-top">
                  <div className="flex justify-end">
                    {isEditing ? (
                      <div
                        role="group"
                        aria-label="Save or discard edits"
                        className={`${leadTableActionBarClass} gap-0.5`}
                      >
                        <button
                          type="button"
                          disabled={savePending}
                          onClick={() => void saveEdit(lead.id)}
                          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-emerald-600 transition hover:bg-emerald-50 hover:text-emerald-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 disabled:opacity-55 dark:text-emerald-400 dark:hover:bg-emerald-950/35 dark:hover:text-emerald-300"
                          aria-label="Save changes"
                          title="Save"
                        >
                          {savePending ? (
                            <Loader2
                              className="h-3.5 w-3.5 shrink-0 animate-spin text-emerald-600 dark:text-emerald-400"
                              aria-hidden
                            />
                          ) : (
                            <Check
                              className="h-3.5 w-3.5 shrink-0"
                              aria-hidden
                              strokeWidth={2.5}
                            />
                          )}
                        </button>
                        <button
                          type="button"
                          disabled={savePending}
                          onClick={cancelEdit}
                          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-400 disabled:opacity-55 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                          aria-label="Discard changes"
                          title="Discard"
                        >
                          <X
                            className="h-3.5 w-3.5 shrink-0"
                            aria-hidden
                            strokeWidth={2.5}
                          />
                        </button>
                      </div>
                    ) : (
                      <div className={leadTableActionBarClass}>
                        <button
                          type="button"
                          onClick={() => onCreateProject(lead)}
                          disabled={editingId !== null}
                          className={leadTableActionBtnClass}
                          aria-label={`Create project for ${deleteLabel}`}
                          title="Create project"
                        >
                          <FolderKanban className="h-3.5 w-3.5 shrink-0" aria-hidden />
                        </button>
                        <button
                          type="button"
                          onClick={() => setNotesLead(lead)}
                          disabled={editingId !== null}
                          title="Notes"
                          className={leadTableActionBtnClass}
                          aria-label={`View notes for ${deleteLabel}`}
                        >
                          <LeadNotesGlyphIcon className="h-3.5 w-3.5 shrink-0" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onQuickTask(lead)}
                          disabled={editingId !== null}
                          title="Quick task"
                          className={leadTableActionBtnClass}
                          aria-label={`Add task for ${deleteLabel}`}
                        >
                          <ListTodo className="h-3.5 w-3.5 shrink-0" aria-hidden />
                        </button>
                        <button
                          type="button"
                          onClick={() => startEdit(lead)}
                          disabled={Boolean(editingId && editingId !== lead.id)}
                          className={leadTableActionBtnClass}
                          aria-label={`Edit ${deleteLabel}`}
                          title="Edit"
                        >
                          <Pencil className="h-3.5 w-3.5 shrink-0" aria-hidden />
                        </button>
                        <button
                          type="button"
                          disabled={
                            deletingId === lead.id ||
                            Boolean(editingId && editingId !== lead.id)
                          }
                          onClick={() => void handleDeleteLead(lead)}
                          aria-busy={deletingId === lead.id}
                          className={leadTableActionDangerClass}
                          aria-label={`Delete ${deleteLabel}`}
                        >
                          {deletingId === lead.id ? (
                            <Loader2
                              className="h-3.5 w-3.5 shrink-0 animate-spin"
                              aria-hidden
                            />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      </div>
    </div>
  );
}

const pipelineModalInputClass =
  "w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm text-text-primary outline-none focus:border-accent focus:ring-2 focus:ring-accent/15 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100";

function PipelineLeadEditModal({
  lead,
  fieldOptions,
  leadPipeline,
  leadTagCatalog,
  quickPatchLeadId,
  onClose,
  onOpenFullPage,
  onTagMutate,
  onSaved,
}: {
  lead: Lead;
  fieldOptions: MergedCrmFieldOptions;
  leadPipeline: PipelineColumnDef[];
  leadTagCatalog: LeadTagCatalogRow[];
  quickPatchLeadId: string | null;
  onClose: () => void;
  onOpenFullPage: (lead: Lead) => void;
  onTagMutate: (lead: Lead, tagId: string, assign: boolean) => void;
  onSaved: () => void;
}) {
  const label = lead.name?.trim() || lead.email?.trim() || "Lead";
  const [mounted, setMounted] = useState(false);
  const [draft, setDraft] = useState<LeadDraft>(() =>
    leadToDraft(lead, leadPipeline, fieldOptions)
  );
  const [savePending, setSavePending] = useState(false);
  const [tagPickerOpen, setTagPickerOpen] = useState(false);

  const rowBusy = quickPatchLeadId === lead.id;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setDraft(leadToDraft(lead, leadPipeline, fieldOptions));
    setTagPickerOpen(false);
    // Intentionally only when switching leads — not when `lead` object identity refreshes from the server.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- lead.id
  }, [lead.id]);

  useEffect(() => {
    if (!mounted) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !savePending) onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [mounted, savePending, onClose]);

  async function handleSave() {
    setSavePending(true);
    const fd = new FormData();
    fd.set("id", lead.id);
    fd.set("name", joinName(draft.nameFirst, draft.nameLast));
    fd.set("email", draft.email);
    fd.set("phone", draft.phone);
    fd.set("company", draft.company);
    fd.set("source", draft.source);
    fd.set("stage", draft.stage);
    fd.set("notes", draft.notes);
    fd.set("project_type", draft.project_type);
    fd.set("contact_category", draft.contact_category);
    const res = await updateLeadRow(fd);
    setSavePending(false);
    if ("error" in res && res.error) {
      window.alert(res.error);
      return;
    }
    onSaved();
  }

  const modal = (
    <div
      className="fixed inset-0 z-[200] flex items-end justify-center bg-black/40 p-4 backdrop-blur-sm sm:items-center"
      onClick={() => !savePending && onClose()}
      role="presentation"
    >
      <div
        className="flex max-h-[min(92vh,52rem)] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-border bg-white shadow-xl dark:border-zinc-700 dark:bg-zinc-950"
        role="dialog"
        onClick={(e) => e.stopPropagation()}
        aria-modal="true"
        aria-labelledby="pipeline-edit-lead-title"
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border px-5 py-4 dark:border-zinc-700">
          <div className="min-w-0">
            <h2
              id="pipeline-edit-lead-title"
              className="text-lg font-bold text-text-primary dark:text-zinc-50"
            >
              Edit lead
            </h2>
            <p className="mt-0.5 truncate text-sm text-text-secondary dark:text-zinc-400">
              {label}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={savePending}
            className="shrink-0 rounded-lg p-1 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-800 disabled:opacity-50 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
            aria-label="Close"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-text-secondary">
                First name
              </label>
              <input
                type="text"
                value={draft.nameFirst}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, nameFirst: e.target.value }))
                }
                className={pipelineModalInputClass}
                autoComplete="given-name"
                disabled={savePending}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-text-secondary">
                Last name
              </label>
              <input
                type="text"
                value={draft.nameLast}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, nameLast: e.target.value }))
                }
                className={pipelineModalInputClass}
                autoComplete="family-name"
                disabled={savePending}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-text-secondary">
                Phone
              </label>
              <input
                type="tel"
                value={draft.phone}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, phone: e.target.value }))
                }
                className={pipelineModalInputClass}
                disabled={savePending}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-text-secondary">
                Email
              </label>
              <input
                type="email"
                value={draft.email}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, email: e.target.value }))
                }
                className={pipelineModalInputClass}
                disabled={savePending}
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-text-secondary">
              Pipeline stage
            </label>
            <PillSelect
              value={draft.stage}
              onChange={(v) => setDraft((d) => ({ ...d, stage: v }))}
              dotColor={leadStageLabelColor(draft.stage, leadPipeline).color}
              textClassName="text-zinc-700 dark:text-zinc-300"
              disabled={savePending}
            >
              {(() => {
                const opts = leadPipeline.map((c) => ({ ...c }));
                if (!opts.some((c) => c.slug === draft.stage)) {
                  const m = leadStageLabelColor(draft.stage, leadPipeline);
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
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-text-secondary">
                Service / project type
              </label>
              <select
                value={draft.project_type}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, project_type: e.target.value }))
                }
                className={pipelineModalInputClass}
                disabled={savePending}
              >
                <option value="">Not set</option>
                {draft.project_type &&
                  !fieldOptions.leadProjectTypes.includes(draft.project_type) && (
                    <option value={draft.project_type}>{draft.project_type}</option>
                  )}
                {fieldOptions.leadProjectTypes.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-text-secondary">
                Contact category
              </label>
              <select
                value={draft.contact_category}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, contact_category: e.target.value }))
                }
                className={pipelineModalInputClass}
                disabled={savePending}
              >
                <option value="">Not set</option>
                {draft.contact_category &&
                  !fieldOptions.leadContactCategories.includes(
                    draft.contact_category
                  ) && (
                    <option value={draft.contact_category}>
                      {draft.contact_category}
                    </option>
                  )}
                {fieldOptions.leadContactCategories.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-4">
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-text-secondary">
              Company
            </label>
            <input
              type="text"
              value={draft.company}
              onChange={(e) =>
                setDraft((d) => ({ ...d, company: e.target.value }))
              }
              className={pipelineModalInputClass}
              disabled={savePending}
            />
          </div>

          <div className="mt-4">
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-text-secondary">
              Source
            </label>
            <PillSelect
              value={draft.source}
              onChange={(v) => setDraft((d) => ({ ...d, source: v }))}
              dotColor="#0ea5e9"
              textClassName="text-sky-800 dark:text-sky-300"
              disabled={savePending}
            >
              <option value="">Not set</option>
              {draft.source &&
                sourceNotInConfiguredList(draft.source, fieldOptions.leadSources) && (
                  <option value={draft.source}>{draft.source}</option>
                )}
              {fieldOptions.leadSources.map((o) => (
                <option key={o} value={o}>
                  {formatSourceOptionLabel(o)}
                </option>
              ))}
            </PillSelect>
          </div>

          <div className="mt-4">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-text-secondary">
              Tags
            </p>
            <LeadTableTagsCell
              lead={lead}
              catalog={leadTagCatalog}
              disabled={savePending}
              pickerOpen={tagPickerOpen}
              onOpenPicker={() => setTagPickerOpen(true)}
              onClosePicker={() => setTagPickerOpen(false)}
              onAssign={(tagId) => onTagMutate(lead, tagId, true)}
              onRemove={(tagId) => onTagMutate(lead, tagId, false)}
              rowBusy={rowBusy}
            />
          </div>

          <div className="mt-4">
            <label
              htmlFor="pipeline-lead-notes"
              className="mb-1 block text-xs font-semibold uppercase tracking-wide text-text-secondary"
            >
              Notes
            </label>
            <textarea
              id="pipeline-lead-notes"
              value={draft.notes}
              onChange={(e) =>
                setDraft((d) => ({ ...d, notes: e.target.value }))
              }
              rows={4}
              disabled={savePending}
              placeholder="Context, next steps, objections…"
              className={`${pipelineModalInputClass} min-h-[6rem] resize-y`}
            />
          </div>

          <button
            type="button"
            onClick={() => onOpenFullPage(lead)}
            disabled={savePending}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border py-2.5 text-sm font-medium text-text-secondary transition-colors hover:border-accent/40 hover:bg-accent/5 hover:text-accent disabled:opacity-50 dark:border-zinc-600 dark:hover:bg-accent/10"
          >
            <ExternalLink className="h-4 w-4 shrink-0" aria-hidden />
            Open full lead page (projects &amp; more)
          </button>
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-border px-5 py-3 dark:border-zinc-700">
          <button
            type="button"
            onClick={onClose}
            disabled={savePending}
            className="rounded-xl border border-border bg-white px-4 py-2 text-sm font-semibold text-text-primary hover:bg-surface disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={savePending}
            onClick={() => void handleSave()}
            className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-60"
          >
            {savePending ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : null}
            Save changes
          </button>
        </div>
      </div>
    </div>
  );

  if (!mounted) return null;
  return createPortal(modal, document.body);
}

function LeadLostReasonModal({
  lead,
  onCancel,
  onConfirm,
}: {
  lead: Lead;
  onCancel: () => void;
  onConfirm: (reason: string) => void | Promise<void>;
}) {
  const label = lead.name?.trim() || lead.email?.trim() || "Lead";
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    setReason("");
    setError(null);
  }, [lead.id]);

  async function handleSubmit() {
    const t = reason.trim();
    if (!t) {
      setError("Please enter a lost reason.");
      return;
    }
    setError(null);
    setPending(true);
    try {
      await onConfirm(t);
    } finally {
      setPending(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 p-4 backdrop-blur-sm sm:items-center"
      onClick={() => !pending && onCancel()}
      onKeyDown={(e) => e.key === "Escape" && !pending && onCancel()}
      role="presentation"
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-white shadow-xl dark:border-zinc-700 dark:bg-zinc-950"
        role="dialog"
        onClick={(e) => e.stopPropagation()}
        aria-modal="true"
        aria-labelledby="lead-lost-reason-title"
      >
        <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4 dark:border-zinc-700">
          <div className="min-w-0">
            <h2
              id="lead-lost-reason-title"
              className="text-lg font-bold text-text-primary dark:text-zinc-50"
            >
              Mark as lost
            </h2>
            <p className="mt-0.5 truncate text-sm text-text-secondary dark:text-zinc-400">
              {label}
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={pending}
            className="shrink-0 rounded-lg p-1 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-800 disabled:opacity-50 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
            aria-label="Close"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>
        <div className="px-5 py-4">
          <p className="mb-3 text-sm text-text-secondary dark:text-zinc-400">
            Add a short reason so your notes stay useful when you review this
            lead later.
          </p>
          {error && (
            <p
              className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200"
              role="alert"
            >
              {error}
            </p>
          )}
          <label htmlFor="lead-lost-reason-input" className="sr-only">
            Lost reason for {label}
          </label>
          <textarea
            id="lead-lost-reason-input"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={4}
            placeholder="e.g. Budget, timing, chose another vendor…"
            disabled={pending}
            className={`${inlineInputClass} min-h-[6rem] w-full resize-y`}
          />
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border px-5 py-3 dark:border-zinc-700">
          <button
            type="button"
            onClick={onCancel}
            disabled={pending}
            className="rounded-xl border border-border bg-white px-4 py-2 text-sm font-semibold text-text-primary hover:bg-surface disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => void handleSubmit()}
            className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-60"
          >
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : null}
            Save &amp; move to Lost
          </button>
        </div>
      </div>
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

function NewLeadModal({
  fieldOptions,
  onClose,
}: {
  fieldOptions: MergedCrmFieldOptions;
  onClose: () => void;
}) {
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
              {fieldOptions.leadProjectTypes.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-text-primary">
              Contact category
            </label>
            <select name="contact_category" defaultValue="" className={inputClass}>
              <option value="">Not set</option>
              {fieldOptions.leadContactCategories.map((opt) => (
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
            <select name="source" defaultValue="" className={inputClass}>
              <option value="">Not set</option>
              {fieldOptions.leadSources.map((o) => (
                <option key={o} value={o}>
                  {formatSourceOptionLabel(o)}
                </option>
              ))}
            </select>
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
