"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import Link from "next/link";
import {
  Search,
  FolderKanban,
  Mail,
  ChevronDown,
  X,
} from "lucide-react";
import {
  type MockTeamMember,
  type MockProject,
  type MockTask,
  teams as allTeams,
  projects as allProjects,
  tasks as allTasks,
  PLAN_LABELS,
  PLAN_COLORS,
  SUGGESTED_TEAM_TAGS,
} from "@/lib/crm/mock-data";

const ROLE_COLORS: Record<string, string> = {
  "Founder / Lead": "bg-amber-100 text-amber-800",
  "Full-stack Dev": "bg-blue-100 text-blue-800",
  "UX Designer": "bg-violet-100 text-violet-800",
  "Frontend Dev": "bg-sky-100 text-sky-800",
  "Backend Dev": "bg-emerald-100 text-emerald-800",
  "QA Engineer": "bg-orange-100 text-orange-800",
};

function getRoleClasses(role: string) {
  return ROLE_COLORS[role] ?? "bg-gray-100 text-gray-700";
}

function slugTag(tag: string) {
  const s = tag
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return s || "group";
}

/** Keeps project teamId in sync when using tag-based groups */
function tagsToTeamId(tags: string[]) {
  if (tags.length === 0) return "team-general";
  return `tag-${slugTag(tags[0])}`;
}

function colorForTagLabel(tag: string) {
  let h = 0;
  for (let i = 0; i < tag.length; i += 1) {
    h = tag.charCodeAt(i) + ((h << 5) - h);
  }
  const hue = Math.abs(h) % 360;
  return `hsl(${hue} 52% 42%)`;
}

function normalizeMember(m: MockTeamMember): MockTeamMember {
  return { ...m, tags: m.tags ?? [] };
}

function initials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function getAssignedProjects(
  member: MockTeamMember,
  projects: MockProject[],
  tasks: MockTask[]
) {
  const projectIds = new Set<string>();
  // Projects the member is on via teamId
  for (const p of projects) {
    if (p.teamId === member.teamId) projectIds.add(p.id);
  }
  // Projects the member has tasks assigned to them
  for (const t of tasks) {
    if (t.assigneeId === member.id) projectIds.add(t.projectId);
  }
  return projects.filter((p) => projectIds.has(p.id));
}

export default function TeamsView({
  members: initialMembers,
}: {
  members: MockTeamMember[];
}) {
  const [members, setMembers] = useState(() =>
    initialMembers.map(normalizeMember)
  );
  const [search, setSearch] = useState("");
  const [tagFilter, setTagFilter] = useState<string>("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const tagsInUse = useMemo(() => {
    const s = new Set<string>();
    for (const m of members) {
      for (const t of m.tags) s.add(t);
    }
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  }, [members]);

  const filtered = useMemo(() => {
    return members.filter((m) => {
      if (tagFilter !== "all" && !m.tags.includes(tagFilter)) return false;
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        m.name.toLowerCase().includes(q) ||
        m.role.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q) ||
        m.tags.some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [members, search, tagFilter]);

  function handleAdd(member: MockTeamMember) {
    setMembers((prev) => [...prev, member]);
    setModalOpen(false);
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Team</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Manage your agency team and view project assignments
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
            + Add Member
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <FilterPill
          active={tagFilter === "all"}
          onClick={() => setTagFilter("all")}
        >
          All ({members.length})
        </FilterPill>
        {tagsInUse.map((tag) => {
          const count = members.filter((m) => m.tags.includes(tag)).length;
          return (
            <FilterPill
              key={tag}
              active={tagFilter === tag}
              onClick={() => setTagFilter(tag)}
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: colorForTagLabel(tag) }}
              />
              {tag} ({count})
            </FilterPill>
          );
        })}
      </div>

      {/* Member Cards */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {filtered.map((m) => {
          const team = allTeams.find((t) => t.id === m.teamId);
          const avatarColor =
            team?.color ??
            (m.tags[0] ? colorForTagLabel(m.tags[0]) : "#6b7280");
          const assigned = getAssignedProjects(m, allProjects, allTasks);
          const expanded = expandedId === m.id;

          return (
            <div
              key={m.id}
              className="rounded-2xl border border-border bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
            >
              {/* Top row: avatar, name, role */}
              <div className="flex items-start gap-3">
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                  style={{ backgroundColor: avatarColor }}
                >
                  {m.avatarFallback}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-text-primary">
                    {m.name}
                  </p>
                  <span
                    className={`mt-0.5 inline-block rounded-full px-2 py-0.5 text-[11px] font-medium ${getRoleClasses(m.role)}`}
                  >
                    {m.role}
                  </span>
                  {m.tags.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {m.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-md px-2 py-0.5 text-[10px] font-semibold text-white"
                          style={{ backgroundColor: colorForTagLabel(tag) }}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Meta */}
              <div className="mt-3 flex items-center gap-4 text-xs text-text-secondary">
                <span className="flex items-center gap-1">
                  <Mail className="h-3 w-3" />
                  {m.email}
                </span>
              </div>

              {/* Stats */}
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-surface px-3 py-2">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-text-secondary/60">
                    Utilization
                  </p>
                  <p className="mt-0.5 text-lg font-bold text-text-primary">
                    {m.utilization}%
                  </p>
                </div>
                <div className="rounded-xl bg-surface px-3 py-2">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-text-secondary/60">
                    Projects
                  </p>
                  <p className="mt-0.5 text-lg font-bold text-text-primary">
                    {assigned.length}
                  </p>
                </div>
              </div>

              {/* Project assignments */}
              {assigned.length > 0 && (
                <div className="mt-3">
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedId(expanded ? null : m.id)
                    }
                    className="flex w-full items-center gap-1 text-xs font-medium text-text-secondary hover:text-accent"
                  >
                    <FolderKanban className="h-3 w-3" />
                    Assigned projects
                    <ChevronDown
                      className={`ml-auto h-3 w-3 transition-transform ${expanded ? "" : "-rotate-90"}`}
                    />
                  </button>

                  {expanded && (
                    <div className="mt-2 space-y-1.5">
                      {assigned.map((p) => (
                        <Link
                          key={p.id}
                          href={`/projects/${p.id}`}
                          className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs hover:bg-surface"
                        >
                          <span
                            className="h-2 w-2 shrink-0 rounded-full"
                            style={{ backgroundColor: p.color }}
                          />
                          <span className="truncate font-medium text-text-primary">
                            {p.title}
                          </span>
                          <span
                            className="ml-auto shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold text-white"
                            style={{
                              backgroundColor: PLAN_COLORS[p.plan],
                            }}
                          >
                            {PLAN_LABELS[p.plan]}
                          </span>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="mt-6 rounded-2xl border border-dashed border-border bg-white py-16 text-center text-sm text-text-secondary">
          No team members found.
        </div>
      )}

      {modalOpen && (
        <NewMemberModal
          onClose={() => setModalOpen(false)}
          onAdd={handleAdd}
        />
      )}
    </div>
  );
}

function FilterPill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
        active
          ? "border-accent bg-accent/10 text-accent"
          : "border-border bg-white text-text-secondary hover:border-accent/40 hover:text-accent"
      }`}
    >
      {children}
    </button>
  );
}

function TeamTagsField({
  tags,
  onChange,
  id,
}: {
  tags: string[];
  onChange: (tags: string[]) => void;
  id: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [input, setInput] = useState("");
  const [open, setOpen] = useState(false);

  const suggestions = useMemo(() => {
    const q = input.trim().toLowerCase();
    const pool = [...SUGGESTED_TEAM_TAGS];
    const seen = new Set(tags.map((t) => t.toLowerCase()));
    return pool.filter(
      (s) =>
        !seen.has(s.toLowerCase()) &&
        (!q || s.toLowerCase().includes(q))
    );
  }, [input, tags]);

  const addTag = (raw: string) => {
    const t = raw.trim();
    if (!t) return;
    if (tags.some((x) => x.toLowerCase() === t.toLowerCase())) return;
    onChange([...tags, t]);
    setInput("");
  };

  const removeTag = (index: number) => {
    onChange(tags.filter((_, i) => i !== index));
  };

  const startEditTag = (index: number) => {
    const v = tags[index];
    onChange(tags.filter((_, i) => i !== index));
    setInput(v);
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const root = inputRef.current?.closest("[data-team-tags-root]");
      if (root && !root.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div className="relative" data-team-tags-root>
      <label
        htmlFor={id}
        className="mb-1 block text-sm font-medium text-text-primary"
      >
        Team
      </label>
      <p className="mb-2 text-xs text-text-secondary">
        Assign groups (e.g. Developers): type and press Enter, pick a suggestion,
        click a tag to edit, or ✕ to remove.
      </p>
      <div
        className={`flex min-h-[46px] flex-wrap items-center gap-1.5 rounded-xl border border-border bg-white px-2 py-1.5 focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/15 ${
          open && suggestions.length > 0 ? "rounded-b-none border-b-0" : ""
        }`}
      >
        {tags.map((tag, i) => (
          <span
            key={`${tag}-${i}`}
            className="inline-flex max-w-full items-center gap-0.5 rounded-lg bg-accent/12 pl-2 text-xs font-medium text-accent"
          >
            <button
              type="button"
              title="Edit tag"
              className="max-w-[160px] truncate py-1.5 text-left hover:underline"
              onClick={() => startEditTag(i)}
            >
              {tag}
            </button>
            <button
              type="button"
              title={`Remove ${tag}`}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-text-secondary hover:bg-accent/10 hover:text-text-primary"
              onMouseDown={(e) => {
                e.preventDefault();
                removeTag(i);
              }}
            >
              <X className="h-3.5 w-3.5" aria-hidden />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          id={id}
          type="text"
          value={input}
          autoComplete="off"
          placeholder={
            tags.length === 0
              ? "e.g. Developers — type and press Enter"
              : "Add another group…"
          }
          className="min-w-[8rem] flex-1 border-0 bg-transparent px-1 py-2 text-sm text-text-primary outline-none placeholder:text-text-secondary/50"
          onChange={(e) => {
            setInput(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addTag(input);
            }
            if (e.key === "Backspace" && !input && tags.length > 0) {
              removeTag(tags.length - 1);
            }
            if (e.key === "Escape") setOpen(false);
          }}
        />
      </div>
      {open && suggestions.length > 0 && (
        <ul
          className="absolute z-10 max-h-40 w-full overflow-auto rounded-b-xl border border-t-0 border-border bg-white py-1 shadow-lg"
          role="listbox"
        >
          {suggestions.map((s) => (
            <li key={s}>
              <button
                type="button"
                role="option"
                className="w-full px-3 py-2 text-left text-sm text-text-primary hover:bg-surface"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  addTag(s);
                  setOpen(true);
                }}
              >
                {s}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function NewMemberModal({
  onClose,
  onAdd,
}: {
  onClose: () => void;
  onAdd: (m: MockTeamMember) => void;
}) {
  const [teamTags, setTeamTags] = useState<string[]>([]);
  const inputClass =
    "w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm text-text-primary outline-none focus:border-accent focus:ring-2 focus:ring-accent/15";

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const name = (fd.get("name") as string) || "New Member";
    onAdd({
      id: `m-${Date.now()}`,
      name,
      email: (fd.get("email") as string) || "",
      role: (fd.get("role") as string) || "Developer",
      teamId: tagsToTeamId(teamTags),
      tags: teamTags,
      utilization: 0,
      activeProjects: 0,
      avatarFallback: initials(name),
    });
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 p-4 sm:items-center"
      onClick={onClose}
      onKeyDown={(e) => e.key === "Escape" && onClose()}
      role="presentation"
    >
      <div
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-border bg-white p-6 shadow-xl"
        role="dialog"
        onClick={(e) => e.stopPropagation()}
        aria-modal="true"
        aria-labelledby="new-member-title"
      >
        <h2
          id="new-member-title"
          className="text-sm font-bold uppercase tracking-wider text-text-secondary"
        >
          Add Team Member
        </h2>

        <form onSubmit={onSubmit} className="mt-5 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-text-primary">
              Name
            </label>
            <input name="name" type="text" required className={inputClass} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-text-primary">
              Email
            </label>
            <input
              name="email"
              type="email"
              required
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-text-primary">
              Role
            </label>
            <input
              name="role"
              type="text"
              placeholder="e.g. Frontend Dev"
              required
              className={inputClass}
            />
          </div>
          <TeamTagsField
            id="team-tags-input"
            tags={teamTags}
            onChange={setTeamTags}
          />
          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              className="rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-white hover:bg-accent-hover"
            >
              Add member
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
