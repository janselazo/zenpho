"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { createCrmChildProject } from "@/app/(crm)/actions/projects";
import { formatISODate } from "@/lib/crm/project-date-utils";
import {
  CRM_LABEL_PRESETS,
  crmLabelPickerChipClass,
} from "@/lib/crm/crm-label-presets";
import {
  resolveChildDeliveryPresentation,
  type ChildDeliveryStatusUiConfig,
} from "@/lib/crm/child-delivery-status-ui";
import {
  customStatusPresentation,
  isBuiltInTabGroupId,
  type CustomProjectStatusRow,
} from "@/lib/crm/custom-project-status";
import {
  CHILD_PROJECT_GROUP_ORDER,
  type ChildDeliveryStatus,
  type ChildProjectPriority,
} from "@/lib/crm/product-project-metadata";
import { PriorityFlagIcon } from "@/components/crm/product/PriorityFlagIcon";
import { getMembersForTeam, teamMembers } from "@/lib/crm/mock-data";
import {
  Calendar,
  Check,
  CheckCircle2,
  Circle,
  CircleDashed,
  Loader2,
  Tag,
  User,
  UserPlus,
  Users,
  X,
  XCircle,
} from "lucide-react";

const PRIORITIES: { id: ChildProjectPriority | ""; label: string }[] = [
  { id: "", label: "No priority" },
  { id: "urgent", label: "Urgent" },
  { id: "high", label: "High" },
  { id: "medium", label: "Medium" },
  { id: "low", label: "Low" },
];

type MenuKey =
  | null
  | "status"
  | "priority"
  | "lead"
  | "members"
  | "start"
  | "target"
  | "labels";

function addDaysISO(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return formatISODate(d);
}

function StatusGlyph({
  status,
  accent,
}: {
  status: ChildDeliveryStatus;
  accent: string;
}) {
  switch (status) {
    case "backlog":
      return (
        <CircleDashed
          className="h-3.5 w-3.5 shrink-0"
          style={{ color: accent }}
        />
      );
    case "planned":
      return (
        <Circle className="h-3.5 w-3.5 shrink-0" style={{ color: accent }} />
      );
    case "in_progress":
      return (
        <span className="inline-flex h-3.5 w-3.5 shrink-0" aria-hidden>
          <svg
            viewBox="0 0 16 16"
            className="h-3.5 w-3.5"
            style={{ color: accent }}
          >
            <circle
              cx="8"
              cy="8"
              r="6"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            <path
              d="M 8 2 A 6 6 0 0 1 8 14"
              fill="currentColor"
              opacity={0.55}
            />
          </svg>
        </span>
      );
    case "completed":
      return (
        <CheckCircle2
          className="h-3.5 w-3.5 shrink-0"
          style={{ color: accent }}
          aria-hidden
        />
      );
    case "canceled":
      return (
        <XCircle
          className="h-3.5 w-3.5 shrink-0"
          style={{ color: accent }}
          aria-hidden
        />
      );
    default:
      return (
        <Circle className="h-3.5 w-3.5 shrink-0" style={{ color: accent }} />
      );
  }
}

function TabGroupGlyph({
  groupId,
  accent,
}: {
  groupId: string;
  accent: string;
}) {
  if (isBuiltInTabGroupId(groupId)) {
    return <StatusGlyph status={groupId} accent={accent} />;
  }
  return (
    <Circle className="h-3.5 w-3.5 shrink-0" style={{ color: accent }} aria-hidden />
  );
}

type Props = {
  productId: string;
  teamId: string;
  open: boolean;
  /** Pre-select Projects tab column (built-in key or custom status id). */
  initialProjectsTabGroupId?: string | null;
  /** Product-level display overrides for built-in delivery columns. */
  childDeliveryStatusUi?: ChildDeliveryStatusUiConfig;
  customProjectStatuses?: CustomProjectStatusRow[];
  onClose: () => void;
  onCreated: (childId: string) => void;
};

export default function NewProductProjectModal({
  productId,
  teamId,
  open,
  initialProjectsTabGroupId,
  childDeliveryStatusUi = {},
  customProjectStatuses = [],
  onClose,
  onCreated,
}: Props) {
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [description, setDescription] = useState("");
  const [selectedGroupId, setSelectedGroupId] = useState<string>("completed");
  const [priority, setPriority] = useState<ChildProjectPriority | "">("");
  const [leadMemberId, setLeadMemberId] = useState("");
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [startDate, setStartDate] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [labels, setLabels] = useState<string[]>([]);
  const [labelDraft, setLabelDraft] = useState("");
  const [menu, setMenu] = useState<MenuKey>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const composerRef = useRef<HTMLFormElement>(null);

  const assigneeOptions = useMemo(() => {
    const fromTeam = getMembersForTeam(teamId);
    return fromTeam.length > 0 ? fromTeam : teamMembers;
  }, [teamId]);

  const deliveryPres = useMemo(() => {
    const m = {} as Record<
      ChildDeliveryStatus,
      ReturnType<typeof resolveChildDeliveryPresentation>
    >;
    for (const s of CHILD_PROJECT_GROUP_ORDER) {
      m[s] = resolveChildDeliveryPresentation(s, childDeliveryStatusUi);
    }
    return m;
  }, [childDeliveryStatusUi]);

  const selectedPres = useMemo(() => {
    if (isBuiltInTabGroupId(selectedGroupId)) {
      return deliveryPres[selectedGroupId];
    }
    const c = customProjectStatuses.find((x) => x.id === selectedGroupId);
    return c ? customStatusPresentation(c) : deliveryPres.backlog;
  }, [selectedGroupId, deliveryPres, customProjectStatuses]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!composerRef.current?.contains(e.target as Node)) setMenu(null);
    }
    if (menu) {
      document.addEventListener("mousedown", onDoc);
      return () => document.removeEventListener("mousedown", onDoc);
    }
  }, [menu]);

  useEffect(() => {
    if (!open) return;
    const init = initialProjectsTabGroupId?.trim();
    if (init) {
      const okCustom = customProjectStatuses.some((c) => c.id === init);
      if (isBuiltInTabGroupId(init) || okCustom) {
        setSelectedGroupId(init);
        return;
      }
    }
    setSelectedGroupId("completed");
  }, [open, initialProjectsTabGroupId, customProjectStatuses]);

  if (!open) return null;

  function reset() {
    setTitle("");
    setSummary("");
    setDescription("");
    setSelectedGroupId("completed");
    setPriority("");
    setLeadMemberId("");
    setMemberIds([]);
    setStartDate("");
    setTargetDate("");
    setLabels([]);
    setLabelDraft("");
    setMenu(null);
    setError(null);
  }

  function toggleMenu(key: Exclude<MenuKey, null>) {
    setMenu((m) => (m === key ? null : key));
  }

  function toggleMember(id: string) {
    setMemberIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  const pillClass =
    "inline-flex items-center gap-1.5 rounded-full border border-border bg-white px-2.5 py-1.5 text-xs font-medium text-text-primary shadow-sm transition-colors hover:bg-surface/80 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800";
  const menuClass =
    "absolute left-0 z-[70] mt-1 max-h-72 min-w-[240px] overflow-y-auto rounded-xl border border-border bg-white py-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-950";

  const leadLabel = leadMemberId
    ? assigneeOptions.find((m) => m.id === leadMemberId)?.name ?? "Lead"
    : "Lead";
  const membersLabel =
    memberIds.length === 0
      ? "Members"
      : memberIds.length === 1
        ? "1 member"
        : `${memberIds.length} members`;
  const startLabel = startDate
    ? new Intl.DateTimeFormat(undefined, {
        month: "short",
        day: "numeric",
      }).format(new Date(startDate + "T12:00:00"))
    : "Start";
  const targetLabel = targetDate
    ? new Intl.DateTimeFormat(undefined, {
        month: "short",
        day: "numeric",
      }).format(new Date(targetDate + "T12:00:00"))
    : "Target";
  const priorityLabel =
    PRIORITIES.find((p) => p.id === priority)?.label ?? "Priority";
  const labelsPillLabel =
    labels.length === 0
      ? "Labels"
      : labels.length === 1
        ? labels[0]
        : `${labels.length} labels`;

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
      projectsTabGroupId: selectedGroupId,
      deliveryStatus: isBuiltInTabGroupId(selectedGroupId)
        ? selectedGroupId
        : undefined,
      priority: priority || null,
      leadMemberId: leadMemberId || null,
      memberIds,
      start_date: startDate.trim() || null,
      target_date: targetDate.trim() || null,
      labels,
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
        ref={composerRef}
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

        <div className="space-y-4 px-6 py-5">
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

          <div className="relative flex flex-wrap gap-2">
            <div className="relative">
              <button
                type="button"
                className={pillClass}
                onClick={() => toggleMenu("status")}
                aria-expanded={menu === "status"}
              >
                <TabGroupGlyph
                  groupId={selectedGroupId}
                  accent={selectedPres.color}
                />
                {selectedPres.label}
              </button>
              {menu === "status" ? (
                <div className={menuClass} role="listbox">
                  <p className="border-b border-border px-3 py-2 text-xs text-text-secondary dark:border-zinc-800">
                    Change status…
                  </p>
                  {CHILD_PROJECT_GROUP_ORDER.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => {
                        setSelectedGroupId(s);
                        setMenu(null);
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-surface/80 dark:hover:bg-zinc-800"
                    >
                      <StatusGlyph status={s} accent={deliveryPres[s].color} />
                      <span className="flex-1">{deliveryPres[s].label}</span>
                      {selectedGroupId === s ? (
                        <Check className="h-4 w-4 text-accent" />
                      ) : null}
                    </button>
                  ))}
                  {customProjectStatuses.map((c) => {
                    const cp = customStatusPresentation(c);
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          setSelectedGroupId(c.id);
                          setMenu(null);
                        }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-surface/80 dark:hover:bg-zinc-800"
                      >
                        <TabGroupGlyph groupId={c.id} accent={cp.color} />
                        <span className="flex-1">{c.label}</span>
                        {selectedGroupId === c.id ? (
                          <Check className="h-4 w-4 text-accent" />
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>

            <div className="relative">
              <button
                type="button"
                className={pillClass}
                onClick={() => toggleMenu("priority")}
                aria-expanded={menu === "priority"}
              >
                <PriorityFlagIcon level={priority} />
                {priorityLabel}
              </button>
              {menu === "priority" ? (
                <div className={menuClass}>
                  <p className="border-b border-border px-3 py-2 text-xs text-text-secondary dark:border-zinc-800">
                    Set priority…
                  </p>
                  {PRIORITIES.map((p) => (
                    <button
                      key={p.id || "none"}
                      type="button"
                      onClick={() => {
                        setPriority(p.id);
                        setMenu(null);
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-surface/80 dark:hover:bg-zinc-800"
                    >
                      <PriorityFlagIcon level={p.id} />
                      <span className="min-w-0 flex-1">{p.label}</span>
                      {priority === p.id ? (
                        <Check className="h-4 w-4 text-accent" />
                      ) : null}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="relative">
              <button
                type="button"
                className={pillClass}
                onClick={() => toggleMenu("lead")}
                aria-expanded={menu === "lead"}
              >
                <UserPlus className="h-3.5 w-3.5 text-text-secondary" />
                {leadLabel}
              </button>
              {menu === "lead" ? (
                <div className={menuClass}>
                  <p className="border-b border-border px-3 py-2 text-xs text-text-secondary dark:border-zinc-800">
                    Project lead
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setLeadMemberId("");
                      setMenu(null);
                    }}
                    className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-surface/80 dark:hover:bg-zinc-800"
                  >
                    No lead
                    {!leadMemberId ? (
                      <Check className="h-4 w-4 text-accent" />
                    ) : null}
                  </button>
                  <p className="px-3 pt-2 text-[10px] font-medium uppercase tracking-wide text-text-secondary dark:text-zinc-500">
                    Team
                  </p>
                  {assigneeOptions.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        setLeadMemberId(m.id);
                        setMenu(null);
                      }}
                      className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-surface/80 dark:hover:bg-zinc-800"
                    >
                      {m.name}
                      {leadMemberId === m.id ? (
                        <Check className="h-4 w-4 text-accent" />
                      ) : null}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="relative">
              <button
                type="button"
                className={pillClass}
                onClick={() => toggleMenu("members")}
                aria-expanded={menu === "members"}
              >
                <Users className="h-3.5 w-3.5 text-text-secondary" />
                {membersLabel}
              </button>
              {menu === "members" ? (
                <div className={menuClass}>
                  <p className="border-b border-border px-3 py-2 text-xs text-text-secondary dark:border-zinc-800">
                    Members
                  </p>
                  {assigneeOptions.length === 0 ? (
                    <p className="px-3 py-2 text-sm text-text-secondary">
                      No team members in seed data.
                    </p>
                  ) : (
                    assigneeOptions.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => toggleMember(m.id)}
                        className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-surface/80 dark:hover:bg-zinc-800"
                      >
                        {m.name}
                        {memberIds.includes(m.id) ? (
                          <Check className="h-4 w-4 text-accent" />
                        ) : null}
                      </button>
                    ))
                  )}
                </div>
              ) : null}
            </div>

            <div className="relative">
              <button
                type="button"
                className={pillClass}
                onClick={() => toggleMenu("start")}
                aria-expanded={menu === "start"}
              >
                <Calendar className="h-3.5 w-3.5 text-text-secondary" />
                {startLabel}
              </button>
              {menu === "start" ? (
                <div className={menuClass}>
                  <p className="border-b border-border px-3 py-2 text-xs text-text-secondary dark:border-zinc-800">
                    Start date
                  </p>
                  <div className="px-3 py-2">
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full rounded-lg border border-border px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-800"
                    />
                  </div>
                  <div className="border-t border-border px-1 py-1 dark:border-zinc-800">
                    <button
                      type="button"
                      onClick={() => {
                        setStartDate(addDaysISO(0));
                        setMenu(null);
                      }}
                      className="w-full rounded-lg px-2 py-2 text-left text-sm hover:bg-surface/80 dark:hover:bg-zinc-800"
                    >
                      Today
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setStartDate(addDaysISO(1));
                        setMenu(null);
                      }}
                      className="w-full rounded-lg px-2 py-2 text-left text-sm hover:bg-surface/80 dark:hover:bg-zinc-800"
                    >
                      Tomorrow
                    </button>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="relative">
              <button
                type="button"
                className={pillClass}
                onClick={() => toggleMenu("target")}
                aria-expanded={menu === "target"}
              >
                <Calendar className="h-3.5 w-3.5 text-text-secondary" />
                {targetLabel}
              </button>
              {menu === "target" ? (
                <div className={menuClass}>
                  <p className="border-b border-border px-3 py-2 text-xs text-text-secondary dark:border-zinc-800">
                    Target date
                  </p>
                  <div className="px-3 py-2">
                    <input
                      type="date"
                      value={targetDate}
                      onChange={(e) => setTargetDate(e.target.value)}
                      className="w-full rounded-lg border border-border px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-800"
                    />
                  </div>
                  <div className="border-t border-border px-1 py-1 dark:border-zinc-800">
                    <button
                      type="button"
                      onClick={() => {
                        setTargetDate(addDaysISO(7));
                        setMenu(null);
                      }}
                      className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-left text-sm hover:bg-surface/80 dark:hover:bg-zinc-800"
                    >
                      <span>In one week</span>
                      <span className="text-xs text-text-secondary dark:text-zinc-500">
                        {addDaysISO(7)}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setTargetDate(addDaysISO(14));
                        setMenu(null);
                      }}
                      className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-left text-sm hover:bg-surface/80 dark:hover:bg-zinc-800"
                    >
                      <span>In two weeks</span>
                      <span className="text-xs text-text-secondary dark:text-zinc-500">
                        {addDaysISO(14)}
                      </span>
                    </button>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="relative">
              <button
                type="button"
                className={pillClass}
                onClick={() => toggleMenu("labels")}
                aria-expanded={menu === "labels"}
              >
                <Tag className="h-3.5 w-3.5 text-text-secondary" />
                <span className="max-w-[120px] truncate">{labelsPillLabel}</span>
              </button>
              {menu === "labels" ? (
                <div className={menuClass}>
                  <p className="border-b border-border px-3 py-2 text-xs text-text-secondary dark:border-zinc-800">
                    Add labels…
                  </p>
                  <div className="flex flex-wrap gap-1 border-b border-border p-2 dark:border-zinc-800">
                    {CRM_LABEL_PRESETS.map((tag) => {
                      const on = labels.includes(tag);
                      return (
                        <button
                          key={tag}
                          type="button"
                          onClick={() =>
                            setLabels((prev) =>
                              on ? prev.filter((x) => x !== tag) : [...prev, tag]
                            )
                          }
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${crmLabelPickerChipClass(tag, on)}`}
                        >
                          {tag}
                        </button>
                      );
                    })}
                  </div>
                  <form
                    className="flex gap-1 p-2"
                    onSubmit={(e) => {
                      e.preventDefault();
                      const s = labelDraft.trim();
                      if (s && !labels.includes(s)) {
                        setLabels((prev) => [...prev, s]);
                        setLabelDraft("");
                      }
                    }}
                  >
                    <input
                      value={labelDraft}
                      onChange={(e) => setLabelDraft(e.target.value)}
                      placeholder="Custom label"
                      className="min-w-0 flex-1 rounded-lg border border-border px-2 py-1 text-xs dark:border-zinc-600 dark:bg-zinc-800"
                    />
                    <button
                      type="submit"
                      className="rounded-lg bg-accent px-2 py-1 text-xs font-medium text-white dark:bg-blue-600"
                    >
                      Add
                    </button>
                  </form>
                </div>
              ) : null}
            </div>
          </div>

          <div className="border-t border-border pt-4 dark:border-zinc-800">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="w-full border-0 bg-transparent text-sm text-text-primary outline-none placeholder:text-zinc-500 dark:text-zinc-200"
              placeholder="Write a description, a project brief, or collect ideas…"
            />
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
