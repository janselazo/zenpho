"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Briefcase,
  Building2,
  CalendarDays,
  ChevronDown,
  Facebook,
  FolderKanban,
  Instagram,
  Layers,
  ListTodo,
  Loader2,
  Mail,
  Phone,
  Sparkles,
  User,
  UserCircle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { setLeadTagAssigned, updateLeadRow } from "@/app/(crm)/actions/crm";
import type { MergedCrmFieldOptions } from "@/lib/crm/field-options";
import CrmNewProjectFromLeadModal from "@/components/crm/CrmNewProjectFromLeadModal";
import CrmQuickTaskModal from "@/components/crm/CrmQuickTaskModal";
import type { LeadFollowUpAppointment } from "@/lib/crm/lead-follow-up-appointment";
import {
  DEFAULT_LEAD_PIPELINE_COLUMNS,
  leadStageLabelColor,
  normalizePipelineHexColor,
  type PipelineColumnDef,
} from "@/lib/crm/pipeline-columns";

function formatSourceOptionLabel(value: string) {
  return value
    .split(/[\s_-]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

function hexToRgba(hex: string, alpha: number): string {
  const norm = normalizePipelineHexColor(hex);
  const h = (norm ?? "#64748b").slice(1);
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

const sourceFieldTint: Record<string, string> = {
  website: "bg-sky-100/90 dark:bg-sky-950/40",
  referral: "bg-orange-100/90 dark:bg-orange-950/35",
  linkedin: "bg-blue-100/90 dark:bg-blue-950/40",
  "cold outreach": "bg-amber-100/90 dark:bg-amber-950/35",
  conference: "bg-violet-100/90 dark:bg-violet-950/40",
  facebook: "bg-purple-100/90 dark:bg-purple-950/40",
  direct: "bg-emerald-100/90 dark:bg-emerald-950/35",
  instagram: "bg-fuchsia-100/90 dark:bg-fuchsia-950/35",
};

function sourceTintClass(source: string) {
  return (
    sourceFieldTint[source.trim().toLowerCase()] ??
    "bg-zinc-100 dark:bg-zinc-800/80"
  );
}

const inputClass =
  "w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-900 outline-none transition-colors placeholder:text-zinc-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-blue-400";

const LEAD_TABS = [
  { id: "contact", label: "Contact", icon: UserCircle },
  { id: "tasks", label: "Tasks", icon: ListTodo },
  { id: "projects", label: "Projects", icon: FolderKanban },
] as const;

function formatFollowUpWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

type Lead = {
  id: string;
  name: string | null;
  email: string | null;
  company: string | null;
  phone: string | null;
  facebook: string | null;
  instagram: string | null;
  google_business_category: string | null;
  google_place_types: string[] | null;
  source: string | null;
  stage: string | null;
  notes: string | null;
  project_type: string | null;
  contact_category: string | null;
  created_at?: string | null;
};

export type ClientProjectRow = {
  id: string;
  title: string | null;
};

function leadInitials(name: string | null, email: string | null): string {
  const n = (name ?? "").trim();
  if (n) {
    const parts = n.split(/\s+/).filter(Boolean);
    const a = parts[0]?.[0] ?? "";
    const b = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
    return (a + b).toUpperCase() || "?";
  }
  const e = (email ?? "").trim();
  return e.slice(0, 2).toUpperCase() || "?";
}

function FieldRow({
  icon: Icon,
  label,
  children,
}: {
  icon: LucideIcon;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-3 sm:gap-4">
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
        aria-hidden
      >
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          {label}
        </p>
        <div className="mt-1.5">{children}</div>
      </div>
    </div>
  );
}

function PastelSelect({
  name,
  defaultValue,
  onPreviewChange,
  dotColor,
  tintClass,
  children,
}: {
  name: string;
  defaultValue: string;
  onPreviewChange: (v: string) => void;
  dotColor: string;
  tintClass?: string;
  children: React.ReactNode;
}) {
  const bgStyle = tintClass
    ? undefined
    : { backgroundColor: hexToRgba(dotColor, 0.14) };
  return (
    <div
      className={`relative rounded-full ring-1 ring-zinc-200/90 dark:ring-zinc-600 ${tintClass ?? ""}`}
      style={bgStyle}
    >
      <span
        className="pointer-events-none absolute left-3 top-1/2 z-10 h-2 w-2 -translate-y-1/2 rounded-full ring-2 ring-white dark:ring-zinc-900"
        style={{ backgroundColor: dotColor }}
        aria-hidden
      />
      <ChevronDown
        className="pointer-events-none absolute right-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-zinc-400"
        aria-hidden
      />
      <select
        name={name}
        defaultValue={defaultValue}
        onChange={(e) => onPreviewChange(e.target.value)}
        className="w-full cursor-pointer appearance-none rounded-full border-0 bg-transparent py-2.5 pl-8 pr-10 text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-400/25"
        style={{ color: dotColor }}
      >
        {children}
      </select>
    </div>
  );
}

function LeadDetailTagsField({
  leadId,
  catalog,
  initialIds,
}: {
  leadId: string;
  catalog: { id: string; name: string; color: string }[];
  initialIds: string[];
}) {
  const router = useRouter();
  const idsKey = initialIds.slice().sort().join(",");
  const [selected, setSelected] = useState(() => new Set(initialIds));
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    setSelected(new Set(initialIds));
  }, [idsKey]);

  async function toggle(tagId: string) {
    const on = !selected.has(tagId);
    setBusy(tagId);
    const res = await setLeadTagAssigned(leadId, tagId, on);
    setBusy(null);
    if ("error" in res && res.error) {
      window.alert(res.error);
      return;
    }
    setSelected((prev) => {
      const n = new Set(prev);
      if (on) n.add(tagId);
      else n.delete(tagId);
      return n;
    });
    router.refresh();
  }

  return (
    <div className="flex flex-wrap gap-2">
      {catalog.map((t) => {
        const on = selected.has(t.id);
        const isBusy = busy === t.id;
        return (
          <button
            key={t.id}
            type="button"
            disabled={busy !== null}
            onClick={() => void toggle(t.id)}
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold transition disabled:opacity-50 ${
              on
                ? "border-transparent text-white shadow-sm"
                : "border-dashed border-zinc-300 bg-white text-zinc-700 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200"
            }`}
            style={on ? { backgroundColor: t.color } : undefined}
          >
            {isBusy ? (
              <Loader2
                className={`h-3 w-3 shrink-0 animate-spin ${on ? "text-white" : "text-zinc-500"}`}
                aria-hidden
              />
            ) : (
              <span
                className="h-1.5 w-1.5 shrink-0 rounded-full"
                style={{
                  backgroundColor: on ? "#fff" : t.color,
                }}
                aria-hidden
              />
            )}
            {t.name}
          </button>
        );
      })}
    </div>
  );
}

export default function LeadEditForm({
  lead,
  clientProjects,
  convertedClientId,
  fieldOptions,
  leadPipelineColumns = DEFAULT_LEAD_PIPELINE_COLUMNS,
  leadTagCatalog = [],
  leadTagIds = [],
  followUpAppointments = [],
}: {
  lead: Lead;
  clientProjects: ClientProjectRow[];
  convertedClientId: string | null;
  fieldOptions: MergedCrmFieldOptions;
  leadPipelineColumns?: PipelineColumnDef[];
  leadTagCatalog?: { id: string; name: string; color: string }[];
  leadTagIds?: string[];
  followUpAppointments?: LeadFollowUpAppointment[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<string>("contact");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [quickTaskOpen, setQuickTaskOpen] = useState(false);

  const defaultStage =
    (lead.stage ?? "").trim() || leadPipelineColumns[0]?.slug || "contacted";
  const [stagePreview, setStagePreview] = useState(defaultStage);
  const currentSource = (lead.source ?? "").trim();
  const [sourcePreview, setSourcePreview] = useState(currentSource);

  const leadStageOptions: PipelineColumnDef[] = (() => {
    const list = leadPipelineColumns.map((c) => ({ ...c }));
    const s = (lead.stage ?? "").trim();
    if (s && !list.some((c) => c.slug === s)) {
      const m = leadStageLabelColor(s, leadPipelineColumns);
      list.unshift({ slug: s, label: m.label, color: m.color });
    }
    return list;
  })();

  const sourceOrphan =
    currentSource && !fieldOptions.leadSources.includes(currentSource);
  const currentProjectType = (lead.project_type ?? "").trim();
  const projectTypeOrphan =
    currentProjectType &&
    !fieldOptions.leadProjectTypes.includes(currentProjectType);
  const currentContactCategory = (lead.contact_category ?? "").trim();
  const contactCategoryOrphan =
    currentContactCategory &&
    !fieldOptions.leadContactCategories.includes(currentContactCategory);

  const stageMeta = leadStageLabelColor(stagePreview, leadPipelineColumns);
  const sourceTint = sourceTintClass(sourcePreview || " ");

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab === "deal" || tab === "projects") setActiveTab("projects");
    else if (tab === "tasks") setActiveTab("tasks");
  }, [searchParams]);

  useEffect(() => {
    setStagePreview(defaultStage);
  }, [defaultStage, lead.id]);

  useEffect(() => {
    setSourcePreview(currentSource);
  }, [currentSource, lead.id]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    setPending(true);
    const fd = new FormData(e.currentTarget);
    const res = await updateLeadRow(fd);
    setPending(false);
    if ("error" in res && res.error) {
      setError(res.error);
      return;
    }
    setSaved(true);
    router.refresh();
  }

  const displayName = lead.name?.trim() || lead.email?.trim() || "Lead";
  const addedLine = lead.created_at
    ? `Added ${new Date(lead.created_at).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })} at ${new Date(lead.created_at).toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      })}`
    : "—";

  return (
    <>
      <form
        onSubmit={onSubmit}
        className="mx-auto max-w-6xl"
      >
        <input type="hidden" name="id" value={lead.id} />
        <input
          type="hidden"
          name="google_place_types_json"
          value={JSON.stringify(lead.google_place_types ?? [])}
        />

        <Link
          href="/leads"
          className="inline-flex text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline dark:text-blue-400 dark:hover:text-blue-300"
        >
          ← All leads
        </Link>

        <header className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-start">
          <div className="flex items-start gap-4">
            <div
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-sky-100 text-base font-bold text-blue-600 dark:bg-sky-950/60 dark:text-sky-300"
              aria-hidden
            >
              {leadInitials(lead.name, lead.email)}
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                {displayName}
              </h1>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                {addedLine}
              </p>
            </div>
          </div>
        </header>

        <div
          className="mt-8 flex gap-1 border-b border-zinc-200 dark:border-zinc-800"
          role="tablist"
          aria-label="Lead sections"
        >
          {LEAD_TABS.map(({ id, label, icon: Icon }) => {
            const active = activeTab === id;
            return (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setActiveTab(id)}
                className={`relative flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
                  active
                    ? "text-blue-600 dark:text-blue-400"
                    : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
                }`}
              >
                <Icon
                  className={`h-4 w-4 ${active ? "text-blue-600 dark:text-blue-400" : "opacity-70"}`}
                  aria-hidden
                />
                {label}
                {active ? (
                  <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-blue-600 dark:bg-blue-400" />
                ) : null}
              </button>
            );
          })}
        </div>

        {error ? (
          <p className="mt-4 text-sm text-red-600 dark:text-red-400" role="alert">
            {error}
          </p>
        ) : null}
        {saved ? (
          <p className="mt-4 text-sm font-medium text-emerald-700 dark:text-emerald-400">
            Saved.
          </p>
        ) : null}

        <div
          className={`mt-6 ${
            activeTab === "contact"
              ? "grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]"
              : ""
          }`}
        >
          {/* Main column */}
          <div className="rounded-2xl border border-zinc-200/90 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/40 dark:shadow-none">
            <div
              className={activeTab === "contact" ? "space-y-8" : "hidden"}
              id="contact-panel"
              role="tabpanel"
              aria-hidden={activeTab !== "contact"}
            >
              <div>
                <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
                  Contact details
                </h2>
                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                  Reach-out info and company context for proposals and SOWs.
                </p>
                <div className="mt-6 space-y-6">
                  <FieldRow icon={User} label="Full name">
                    <input
                      name="name"
                      type="text"
                      defaultValue={lead.name ?? ""}
                      autoComplete="name"
                      className={inputClass}
                    />
                  </FieldRow>
                  <FieldRow icon={Mail} label="Email">
                    <input
                      name="email"
                      type="email"
                      defaultValue={lead.email ?? ""}
                      autoComplete="email"
                      className={inputClass}
                      placeholder="name@company.com"
                    />
                  </FieldRow>
                  <FieldRow icon={Phone} label="Phone">
                    <input
                      name="phone"
                      type="tel"
                      defaultValue={lead.phone ?? ""}
                      autoComplete="tel"
                      className={inputClass}
                      placeholder="(555) 000-0000"
                    />
                  </FieldRow>
                  <FieldRow icon={Building2} label="Company">
                    <input
                      name="company"
                      type="text"
                      defaultValue={lead.company ?? ""}
                      autoComplete="organization"
                      className={inputClass}
                    />
                  </FieldRow>
                  <FieldRow icon={Sparkles} label="Google business category">
                    <input
                      name="google_business_category"
                      type="text"
                      defaultValue={lead.google_business_category ?? ""}
                      className={inputClass}
                      placeholder="From Google Places listing"
                    />
                  </FieldRow>
                  <FieldRow icon={Facebook} label="Facebook">
                    <input
                      name="facebook"
                      type="url"
                      inputMode="url"
                      defaultValue={lead.facebook ?? ""}
                      className={inputClass}
                      placeholder="https://facebook.com/…"
                    />
                  </FieldRow>
                  <FieldRow icon={Instagram} label="Instagram">
                    <input
                      name="instagram"
                      type="url"
                      inputMode="url"
                      defaultValue={lead.instagram ?? ""}
                      className={inputClass}
                      placeholder="https://instagram.com/…"
                    />
                  </FieldRow>
                </div>
              </div>

              <div className="border-t border-zinc-100 pt-8 dark:border-zinc-800">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
                    Notes
                  </h2>
                  <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
                    Discovery & next steps
                  </span>
                </div>
                <textarea
                  name="notes"
                  rows={5}
                  defaultValue={lead.notes ?? ""}
                  className={`${inputClass} mt-3 resize-y`}
                  placeholder="Call outcomes, scope ideas, budget signals, links to briefs…"
                />
              </div>

              <button
                type="submit"
                disabled={pending}
                className="rounded-full bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-60 dark:bg-blue-600 dark:hover:bg-blue-500"
              >
                {pending ? "Saving…" : "Save changes"}
              </button>
            </div>

            <div
              className={activeTab === "tasks" ? "space-y-6" : "hidden"}
              id="tasks-panel"
              role="tabpanel"
              aria-hidden={activeTab !== "tasks"}
            >
              <div>
                <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
                  <ListTodo className="h-3.5 w-3.5" aria-hidden />
                  Follow-ups
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                  Scheduled calls and reminders tied to this lead appear on your{" "}
                  <Link
                    href="/calendar"
                    className="inline-flex items-center gap-1 font-medium text-blue-600 hover:underline dark:text-blue-400"
                  >
                    <CalendarDays className="h-3.5 w-3.5" aria-hidden />
                    Calendar
                  </Link>
                  .
                </p>
              </div>
              <button
                type="button"
                onClick={() => setQuickTaskOpen(true)}
                className="rounded-full bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500"
              >
                + Schedule follow-up
              </button>
              {followUpAppointments.length === 0 ? (
                <p className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50/80 px-4 py-6 text-sm text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800/40 dark:text-zinc-400">
                  No follow-ups yet. Add one to block time and keep the pipeline
                  moving.
                </p>
              ) : (
                <ul className="divide-y divide-zinc-100 rounded-xl border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-700">
                  {followUpAppointments.map((t) => (
                    <li key={t.id} className="px-4 py-3">
                      <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                        {t.title}
                      </p>
                      <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                        {formatFollowUpWhen(t.starts_at)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div
              className={activeTab === "projects" ? "space-y-5" : "hidden"}
              id="projects-panel"
              role="tabpanel"
              aria-hidden={activeTab !== "projects"}
            >
              <div>
                <h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  <Layers className="h-4 w-4 text-zinc-400" aria-hidden />
                  Active work
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                  Delivery runs on{" "}
                  <Link
                    href="/products"
                    className="font-medium text-blue-600 hover:underline dark:text-blue-400"
                  >
                    Projects
                  </Link>
                  — web builds, retainers, and productized services. Spin up a
                  project from this lead to track budget, timeline, and team on
                  the board.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setProjectModalOpen(true)}
                className="rounded-full bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500"
              >
                New project from this lead
              </button>
              {convertedClientId ? (
                <div className="rounded-xl border border-zinc-200 dark:border-zinc-700">
                  <p className="border-b border-zinc-100 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-400 dark:border-zinc-800 dark:text-zinc-500">
                    Client projects
                  </p>
                  {clientProjects.length === 0 ? (
                    <p className="px-4 py-6 text-sm text-zinc-500 dark:text-zinc-400">
                      No projects yet for this client.
                    </p>
                  ) : (
                    <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
                      {clientProjects.map((p) => (
                        <li key={p.id}>
                          <Link
                            href={`/products/${p.id}`}
                            className="block px-4 py-3 text-sm font-medium text-blue-600 hover:bg-zinc-50 hover:underline dark:text-blue-400 dark:hover:bg-zinc-800/60"
                          >
                            {p.title?.trim() || "Untitled project"}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : (
                <p className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50/80 px-4 py-3 text-sm text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800/40 dark:text-zinc-400">
                  No client record yet. Creating a project from this lead sets
                  up the client and links everything automatically.
                </p>
              )}
            </div>
          </div>

          {/* Sidebar — contact tab only */}
          <aside
            className={
              activeTab === "contact" ? "flex flex-col gap-6" : "hidden"
            }
            aria-hidden={activeTab !== "contact"}
          >
              <div className="rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/40 dark:shadow-none">
                <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
                  <Briefcase className="h-3.5 w-3.5" aria-hidden />
                  Pipeline & offer
                </h2>
                <p className="mt-2 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                  Source, stage, and what they&apos;re shopping for (sites,
                  apps, retainers).
                </p>
                <div className="mt-5 space-y-4">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                      Source
                    </p>
                    <div className={`mt-1.5 rounded-full ${sourceTint}`}>
                      <div className="relative">
                        <ChevronDown
                          className="pointer-events-none absolute right-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-zinc-400"
                          aria-hidden
                        />
                        <select
                          name="source"
                          defaultValue={currentSource}
                          onChange={(e) => setSourcePreview(e.target.value)}
                          className="w-full cursor-pointer appearance-none rounded-full border-0 bg-transparent py-2.5 pl-3 pr-10 text-sm font-semibold text-zinc-900 outline-none focus:ring-2 focus:ring-blue-500/20 dark:text-zinc-100"
                        >
                          <option value="">Not set</option>
                          {sourceOrphan ? (
                            <option value={currentSource}>{currentSource}</option>
                          ) : null}
                          {fieldOptions.leadSources.map((o) => (
                            <option key={o} value={o}>
                              {formatSourceOptionLabel(o)}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                      Status
                    </p>
                    <div className="mt-1.5">
                      <PastelSelect
                        name="stage"
                        defaultValue={defaultStage}
                        onPreviewChange={setStagePreview}
                        dotColor={stageMeta.color}
                      >
                        {leadStageOptions.map((c) => (
                          <option key={c.slug} value={c.slug}>
                            {c.label}
                          </option>
                        ))}
                      </PastelSelect>
                    </div>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                      Project type
                    </p>
                    <div className="mt-1.5">
                      <select
                        name="project_type"
                        defaultValue={currentProjectType}
                        className={inputClass}
                      >
                        <option value="">Not set</option>
                        {projectTypeOrphan ? (
                          <option value={currentProjectType}>
                            {currentProjectType}
                          </option>
                        ) : null}
                        {fieldOptions.leadProjectTypes.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  {leadTagCatalog.length > 0 ? (
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                        Tags
                      </p>
                      <div className="mt-2">
                        <LeadDetailTagsField
                          leadId={lead.id}
                          catalog={leadTagCatalog}
                          initialIds={leadTagIds}
                        />
                      </div>
                      <p className="mt-2 text-[11px] text-zinc-500 dark:text-zinc-400">
                        Create or remove tag definitions from the{" "}
                        <Link
                          href="/leads?section=leads"
                          className="font-medium text-blue-600 hover:underline dark:text-blue-400"
                        >
                          Leads
                        </Link>{" "}
                        table (Tags).
                      </p>
                    </div>
                  ) : null}
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                      Contact category
                    </p>
                    <div className="mt-1.5">
                      <select
                        id="lead-contact-category"
                        name="contact_category"
                        defaultValue={currentContactCategory}
                        className={inputClass}
                      >
                        <option value="">Not set</option>
                        {contactCategoryOrphan ? (
                          <option value={currentContactCategory}>
                            {currentContactCategory}
                          </option>
                        ) : null}
                        {fieldOptions.leadContactCategories.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/40 dark:shadow-none">
                <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
                  <Sparkles className="h-3.5 w-3.5" aria-hidden />
                  Recent activity
                </h2>
                <ul className="relative mt-4 space-y-4 border-l border-zinc-200 pl-4 dark:border-zinc-700">
                  <li className="relative">
                    <span
                      className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-blue-500 ring-4 ring-white dark:ring-zinc-900"
                      aria-hidden
                    />
                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                      Lead created
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      {lead.created_at
                        ? new Date(lead.created_at).toLocaleString()
                        : "—"}
                    </p>
                  </li>
                  {convertedClientId ? (
                    <li className="relative">
                      <span
                        className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-4 ring-white dark:ring-zinc-900"
                        aria-hidden
                      />
                      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                        Linked client
                      </p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        Ready for projects and billing on this account.
                      </p>
                    </li>
                  ) : null}
                  <li className="relative">
                    <span
                      className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-zinc-300 ring-4 ring-white dark:bg-zinc-600 dark:ring-zinc-900"
                      aria-hidden
                    />
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                      Open the{" "}
                      <button
                        type="button"
                        onClick={() => setActiveTab("tasks")}
                        className="font-medium text-blue-600 hover:underline dark:text-blue-400"
                      >
                        Tasks
                      </button>{" "}
                      tab for follow-ups; more activity types will appear here
                      later.
                    </p>
                  </li>
                </ul>
              </div>
          </aside>
        </div>
      </form>

      {projectModalOpen ? (
        <CrmNewProjectFromLeadModal
          leadId={lead.id}
          fieldOptions={fieldOptions}
          onClose={() => {
            setProjectModalOpen(false);
            router.refresh();
          }}
        />
      ) : null}
      {quickTaskOpen ? (
        <CrmQuickTaskModal
          leadId={lead.id}
          contextLabel={displayName}
          resetKey={lead.id}
          onClose={() => {
            setQuickTaskOpen(false);
            router.refresh();
          }}
        />
      ) : null}
    </>
  );
}
