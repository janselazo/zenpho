"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import Link from "next/link";
import {
  Search,
  Mail,
  ChevronDown,
  X,
  List,
  ListFilter,
  Share2,
  UserCircle2,
  Layers,
  UserPlus,
  Send,
  Pencil,
  Trash2,
} from "lucide-react";
import {
  type MockTeamMember,
  type MockProject,
  type MockTask,
  type TeamMemberPermission,
  teams as allTeams,
  projects as seedProjects,
  tasks as allTasks,
  SUGGESTED_TEAM_TAGS,
  slugTeamTag,
  parseTeamMemberPermission,
  TEAM_MEMBER_PERMISSION_LABELS,
  TEAM_MEMBER_PERMISSION_ORDER,
  getProjectTeamSelectOptions,
} from "@/lib/crm/mock-data";
import {
  readStoredTeamMembers,
  writeStoredTeamMembers,
} from "@/lib/crm/team-members-storage";
import { readStoredProjects } from "@/lib/crm/projects-storage";

const INVITE_ROLE_OPTIONS = [
  "Owner",
  "Product",
  "Engineer",
  "Design",
  "Marketing",
  "Finance",
  "QA",
] as const;

const DEMO_LOCATIONS = [
  "Miami, FL, USA",
  "Paris, France",
  "Berlin, Germany",
  "Lisbon, Portugal",
  "Austin, TX, USA",
  "Toronto, Canada",
];

function hashId(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i += 1) {
    h = id.charCodeAt(i) + ((h << 5) - h);
  }
  return Math.abs(h);
}

function displayLocation(m: MockTeamMember) {
  const loc = m.location?.trim();
  if (loc) return loc;
  return DEMO_LOCATIONS[hashId(m.id) % DEMO_LOCATIONS.length];
}

const projectTeamOptions = getProjectTeamSelectOptions();

function displayTeamName(m: MockTeamMember) {
  const fromCatalog = allTeams.find((t) => t.id === m.teamId);
  if (fromCatalog?.name) return fromCatalog.name;
  const fromOptions = projectTeamOptions.find((t) => t.id === m.teamId);
  if (fromOptions?.name) return fromOptions.name;
  if (m.tags.length > 0) return m.tags.join(", ");
  return "—";
}

function memberOnline(m: MockTeamMember) {
  return hashId(m.id) % 4 !== 0;
}

function mergeProjectsCatalog(): MockProject[] {
  const map = new Map<string, MockProject>();
  for (const p of seedProjects) map.set(p.id, p);
  for (const p of readStoredProjects()) map.set(p.id, p);
  return Array.from(map.values());
}

/** Keeps project teamId in sync when using tag-based groups */
function tagsToTeamId(tags: string[]) {
  if (tags.length === 0) return "team-general";
  return `tag-${slugTeamTag(tags[0])}`;
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
  return {
    ...m,
    tags: m.tags ?? [],
    location: m.location ?? null,
    permission: parseTeamMemberPermission(m.permission),
  };
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

type SortKey = "name-asc" | "name-desc" | "role-asc" | "role-desc";

export default function TeamsView({
  members: initialMembers,
}: {
  members: MockTeamMember[];
}) {
  const [members, setMembers] = useState(() => {
    const stored = readStoredTeamMembers();
    if (stored.length > 0) return stored.map(normalizeMember);
    return initialMembers.map(normalizeMember);
  });
  const [projectsCatalog, setProjectsCatalog] = useState<MockProject[]>([]);
  const [search, setSearch] = useState("");
  const [tagFilter, setTagFilter] = useState<string>("all");
  const [sortKey, setSortKey] = useState<SortKey>("name-asc");
  const [modalOpen, setModalOpen] = useState(false);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [memberActionsOpen, setMemberActionsOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<MockTeamMember | null>(
    null
  );
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const skipPersistRef = useRef(true);
  const selectAllRef = useRef<HTMLInputElement>(null);
  const memberActionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const syncProjects = () => setProjectsCatalog(mergeProjectsCatalog());
    syncProjects();
    window.addEventListener("crm-projects-changed", syncProjects);
    window.addEventListener("storage", syncProjects);
    return () => {
      window.removeEventListener("crm-projects-changed", syncProjects);
      window.removeEventListener("storage", syncProjects);
    };
  }, []);

  useEffect(() => {
    if (skipPersistRef.current) {
      skipPersistRef.current = false;
      return;
    }
    writeStoredTeamMembers(members);
  }, [members]);

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
        m.tags.some((t) => t.toLowerCase().includes(q)) ||
        displayTeamName(m).toLowerCase().includes(q)
      );
    });
  }, [members, search, tagFilter]);

  const sortedFiltered = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      switch (sortKey) {
        case "name-desc":
          return b.name.localeCompare(a.name);
        case "role-asc":
          return a.role.localeCompare(b.role);
        case "role-desc":
          return b.role.localeCompare(a.role);
        default:
          return a.name.localeCompare(b.name);
      }
    });
    return arr;
  }, [filtered, sortKey]);

  const allVisibleSelected =
    sortedFiltered.length > 0 &&
    sortedFiltered.every((m) => selectedIds.has(m.id));
  const someVisibleSelected =
    sortedFiltered.some((m) => selectedIds.has(m.id)) && !allVisibleSelected;

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = someVisibleSelected;
    }
  }, [someVisibleSelected]);

  useEffect(() => {
    if (!memberActionsOpen) return;
    const close = (e: MouseEvent) => {
      if (!memberActionsRef.current?.contains(e.target as Node)) {
        setMemberActionsOpen(false);
      }
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [memberActionsOpen]);

  function toggleSelectAll() {
    if (allVisibleSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        sortedFiltered.forEach((m) => next.delete(m.id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        sortedFiltered.forEach((m) => next.add(m.id));
        return next;
      });
    }
  }

  function toggleRowSelected(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function addMember(member: MockTeamMember) {
    setMembers((prev) => [...prev, normalizeMember(member)]);
  }

  function updateMemberPermission(
    id: string,
    permission: TeamMemberPermission
  ) {
    setMembers((prev) =>
      prev.map((m) => (m.id === id ? { ...m, permission } : m))
    );
  }

  function removeMember(m: MockTeamMember) {
    if (
      !confirm(
        `Remove ${m.name} from the team? This cannot be undone from here.`
      )
    ) {
      return;
    }
    setMembers((prev) => prev.filter((x) => x.id !== m.id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(m.id);
      return next;
    });
  }

  const outlineControl =
    "inline-flex h-10 items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-800 shadow-sm dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          Team members
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Manage team members.{" "}
          <Link
            href="/settings"
            className="font-medium text-sky-600 hover:underline dark:text-sky-400"
          >
            Learn more
          </Link>
          .
        </p>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative min-w-0 flex-1 max-w-xl">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            type="search"
            placeholder="Search member…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 w-full rounded-lg border border-zinc-200 bg-white py-2 pl-9 pr-3 text-sm text-zinc-900 shadow-sm outline-none placeholder:text-zinc-400 focus:border-zinc-300 focus:ring-2 focus:ring-zinc-900/10 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:ring-white/10"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className={outlineControl}>
            <List className="h-4 w-4 text-zinc-500" aria-hidden />
            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as SortKey)}
              className="cursor-pointer border-0 bg-transparent py-0 pl-0 pr-6 text-sm font-medium text-zinc-800 outline-none dark:text-zinc-100"
              aria-label="Sort members"
            >
              <option value="name-asc">Default sort · Name A–Z</option>
              <option value="name-desc">Name Z–A</option>
              <option value="role-asc">Role A–Z</option>
              <option value="role-desc">Role Z–A</option>
            </select>
          </div>
          <div className={outlineControl}>
            <ListFilter className="h-4 w-4 text-zinc-500" aria-hidden />
            <select
              value={tagFilter}
              onChange={(e) => setTagFilter(e.target.value)}
              className="max-w-[10rem] cursor-pointer border-0 bg-transparent py-0 pl-0 pr-6 text-sm font-medium text-zinc-800 outline-none dark:text-zinc-100 sm:max-w-none"
              aria-label="Filter by team tag"
            >
              <option value="all">Default filter · All tags</option>
              {tagsInUse.map((tag) => (
                <option key={tag} value={tag}>
                  {tag}
                </option>
              ))}
            </select>
          </div>
          <div ref={memberActionsRef} className="relative shrink-0">
            <button
              type="button"
              aria-expanded={memberActionsOpen}
              aria-haspopup="menu"
              onClick={() => setMemberActionsOpen((o) => !o)}
              className="inline-flex h-10 items-center gap-1.5 rounded-full bg-blue-600 pl-4 pr-2.5 text-sm font-semibold text-white shadow-md transition-colors hover:bg-blue-700 dark:bg-blue-600 dark:text-white dark:hover:bg-blue-500"
            >
              Add / Invite
              <ChevronDown
                className={`h-4 w-4 opacity-80 transition-transform ${memberActionsOpen ? "rotate-180" : ""}`}
                aria-hidden
              />
            </button>
            {memberActionsOpen ? (
              <div
                className="absolute right-0 z-30 mt-1.5 w-52 overflow-hidden rounded-lg border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-600 dark:bg-zinc-900"
                role="menu"
              >
                <button
                  type="button"
                  role="menuitem"
                  className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-medium text-zinc-800 hover:bg-zinc-50 dark:text-zinc-100 dark:hover:bg-zinc-800"
                  onClick={() => {
                    setMemberActionsOpen(false);
                    setModalOpen(true);
                  }}
                >
                  <UserPlus className="h-4 w-4 text-zinc-500" aria-hidden />
                  Add member
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-medium text-zinc-800 hover:bg-zinc-50 dark:text-zinc-100 dark:hover:bg-zinc-800"
                  onClick={() => {
                    setMemberActionsOpen(false);
                    setInviteModalOpen(true);
                  }}
                >
                  <Send className="h-4 w-4 text-zinc-500" aria-hidden />
                  Invite member
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900/40">
        <table className="w-full min-w-[960px] text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-200 dark:border-zinc-700">
              <th className="w-10 px-3 py-3">
                <input
                  ref={selectAllRef}
                  type="checkbox"
                  checked={allVisibleSelected}
                  onChange={toggleSelectAll}
                  className="h-4 w-4 rounded border-zinc-300 text-zinc-900"
                  aria-label="Select all members in view"
                />
              </th>
              <th className="px-3 py-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Member
              </th>
              <th className="px-3 py-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Role
              </th>
              <th className="px-3 py-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Team
              </th>
              <th className="px-3 py-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Current projects
              </th>
              <th className="px-3 py-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Location
              </th>
              <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {sortedFiltered.map((m) => {
              const team = allTeams.find((t) => t.id === m.teamId);
              const avatarColor =
                team?.color ??
                (m.tags[0] ? colorForTagLabel(m.tags[0]) : "#6b7280");
              const assigned = getAssignedProjects(
                m,
                projectsCatalog,
                allTasks
              );
              const online = memberOnline(m);
              const selected = selectedIds.has(m.id);

              return (
                <tr
                  key={m.id}
                  className={
                    selected
                      ? "bg-sky-50/80 dark:bg-sky-950/20"
                      : "hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40"
                  }
                >
                  <td className="px-3 py-3 align-middle">
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => toggleRowSelected(m.id)}
                      className="h-4 w-4 rounded border-zinc-300 text-zinc-900"
                      aria-label={`Select ${m.name}`}
                    />
                  </td>
                  <td className="px-3 py-3 align-middle">
                    <div className="flex items-center gap-3">
                      <div className="relative shrink-0">
                        <span
                          className="flex h-10 w-10 items-center justify-center rounded-full text-xs font-bold text-white"
                          style={{ backgroundColor: avatarColor }}
                        >
                          {m.avatarFallback}
                        </span>
                        <span
                          className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white dark:border-zinc-900 ${
                            online ? "bg-emerald-500" : "bg-red-500"
                          }`}
                          title={online ? "Online" : "Away"}
                          aria-hidden
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-zinc-900 dark:text-zinc-100">
                          {m.name}
                        </p>
                        <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                          {m.email}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3 align-middle text-zinc-700 dark:text-zinc-300">
                    {m.role}
                  </td>
                  <td className="max-w-[14rem] px-3 py-3 align-middle text-zinc-700 dark:text-zinc-300">
                    <span className="line-clamp-2" title={displayTeamName(m)}>
                      {displayTeamName(m)}
                    </span>
                  </td>
                  <td className="px-3 py-3 align-middle">
                    <ProjectAvatarStack projects={assigned} />
                  </td>
                  <td className="px-3 py-3 align-middle text-zinc-600 dark:text-zinc-400">
                    {displayLocation(m)}
                  </td>
                  <td className="px-3 py-3 align-middle">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingMember(m)}
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-600 shadow-sm transition-colors hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
                        aria-label={`Edit ${m.name}`}
                      >
                        <Pencil className="h-4 w-4" aria-hidden />
                      </button>
                      <div className="relative shrink-0">
                        <select
                          value={m.permission}
                          onChange={(e) =>
                            updateMemberPermission(
                              m.id,
                              e.target.value as TeamMemberPermission
                            )
                          }
                          className="h-9 min-w-[7.25rem] cursor-pointer appearance-none rounded-lg border border-zinc-200 bg-white py-1.5 pl-2.5 pr-8 text-sm font-medium text-slate-700 shadow-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 dark:border-zinc-600 dark:bg-zinc-900 dark:text-slate-200"
                          aria-label={`Permission for ${m.name}`}
                        >
                          {TEAM_MEMBER_PERMISSION_ORDER.map((key) => (
                            <option key={key} value={key}>
                              {TEAM_MEMBER_PERMISSION_LABELS[key]}
                            </option>
                          ))}
                        </select>
                        <ChevronDown
                          className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500"
                          aria-hidden
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeMember(m)}
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-rose-50 text-rose-600 transition-colors hover:bg-rose-100 dark:bg-rose-950/50 dark:text-rose-400 dark:hover:bg-rose-950/80"
                        aria-label={`Remove ${m.name}`}
                      >
                        <Trash2 className="h-4 w-4" strokeWidth={2} aria-hidden />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {sortedFiltered.length === 0 ? (
          <p className="py-14 text-center text-sm text-zinc-500">
            No team members found.
          </p>
        ) : null}
      </div>

      {modalOpen && (
        <NewMemberModal
          onClose={() => setModalOpen(false)}
          onAdd={(m) => {
            addMember(m);
            setModalOpen(false);
          }}
        />
      )}

      {inviteModalOpen && (
        <InviteMemberModal
          projectsCatalog={projectsCatalog}
          onClose={() => setInviteModalOpen(false)}
          onAddMember={addMember}
          onSwitchToAddMember={() => {
            setInviteModalOpen(false);
            setModalOpen(true);
          }}
        />
      )}

      {editingMember ? (
        <EditMemberModal
          member={editingMember}
          onClose={() => setEditingMember(null)}
          onSave={(updated) => {
            setMembers((prev) =>
              prev.map((x) =>
                x.id === updated.id ? normalizeMember(updated) : x
              )
            );
            setEditingMember(null);
          }}
        />
      ) : null}
    </div>
  );
}

function EditMemberModal({
  member,
  onClose,
  onSave,
}: {
  member: MockTeamMember;
  onClose: () => void;
  onSave: (m: MockTeamMember) => void;
}) {
  const [teamTags, setTeamTags] = useState(member.tags);
  const [permission, setPermission] = useState<TeamMemberPermission>(
    member.permission
  );

  useEffect(() => {
    setTeamTags(member.tags);
    setPermission(member.permission);
  }, [member]);

  const inputClass =
    "w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm text-text-primary outline-none focus:border-accent focus:ring-2 focus:ring-accent/15";

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const name = (fd.get("name") as string) || member.name;
    onSave({
      ...member,
      name,
      email: (fd.get("email") as string) || member.email,
      role: (fd.get("role") as string) || member.role,
      permission,
      teamId: tagsToTeamId(teamTags),
      tags: teamTags,
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
        key={member.id}
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-border bg-white p-6 shadow-xl"
        role="dialog"
        onClick={(e) => e.stopPropagation()}
        aria-modal="true"
        aria-labelledby="edit-member-title"
      >
        <h2
          id="edit-member-title"
          className="text-sm font-bold uppercase tracking-wider text-text-secondary"
        >
          Edit team member
        </h2>
        <p className="mt-1 text-sm text-text-secondary">
          Update profile, job role, permission, and groups.
        </p>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-text-primary">
              Name
            </label>
            <input
              name="name"
              type="text"
              required
              defaultValue={member.name}
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-text-primary">
              Email
            </label>
            <input
              name="email"
              type="email"
              required
              defaultValue={member.email}
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
              defaultValue={member.role}
              className={inputClass}
            />
          </div>
          <div>
            <label
              htmlFor="edit-member-permission"
              className="mb-1 block text-sm font-medium text-text-primary"
            >
              Permission
            </label>
            <div className="relative">
              <select
                id="edit-member-permission"
                value={permission}
                onChange={(e) =>
                  setPermission(e.target.value as TeamMemberPermission)
                }
                className={`${inputClass} w-full cursor-pointer appearance-none pr-10`}
              >
                {TEAM_MEMBER_PERMISSION_ORDER.map((key) => (
                  <option key={key} value={key}>
                    {TEAM_MEMBER_PERMISSION_LABELS[key]}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary/60" />
            </div>
          </div>
          <TeamTagsField
            id="edit-team-tags-input"
            tags={teamTags}
            onChange={setTeamTags}
          />
          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              className="rounded-full bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-colors hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500"
            >
              Save changes
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

function InviteMemberModal({
  projectsCatalog,
  onClose,
  onAddMember,
  onSwitchToAddMember,
}: {
  projectsCatalog: MockProject[];
  onClose: () => void;
  onAddMember: (m: MockTeamMember) => void;
  onSwitchToAddMember: () => void;
}) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [projectIds, setProjectIds] = useState<string[]>([]);
  const [linkCopied, setLinkCopied] = useState(false);

  async function copyInviteLink() {
    const base =
      typeof window !== "undefined" ? window.location.origin : "";
    const url = `${base}/register?invite=team`;
    try {
      await navigator.clipboard.writeText(url);
      setLinkCopied(true);
      window.setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }

  function toggleProject(id: string) {
    setProjectIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed || !role) return;
    const localPart = trimmed.split("@")[0] ?? "member";
    const name =
      localPart
        .replace(/[._-]+/g, " ")
        .split(/\s+/)
        .filter(Boolean)
        .map(
          (w) =>
            w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
        )
        .join(" ") || "New member";
    let teamId = "team-general";
    if (projectIds.length > 0) {
      const p = projectsCatalog.find((x) => x.id === projectIds[0]);
      if (p) teamId = p.teamId;
    }
    onAddMember({
      id: `m-${Date.now()}`,
      name,
      email: trimmed,
      role,
      teamId,
      tags: [],
      utilization: 0,
      activeProjects: projectIds.length,
      avatarFallback: initials(name),
      permission: "member",
    });
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/45 p-4 backdrop-blur-[2px] sm:items-center"
      onClick={onClose}
      onKeyDown={(e) => e.key === "Escape" && onClose()}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="invite-member-title"
        className="max-h-[min(92vh,36rem)] w-full max-w-2xl overflow-y-auto rounded-2xl border border-zinc-200 bg-white p-5 shadow-2xl dark:border-zinc-700 dark:bg-zinc-900 sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2
              id="invite-member-title"
              className="text-lg font-semibold text-zinc-900 dark:text-zinc-50"
            >
              Invite new members
            </h2>
            <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
              Assign role to member via invite link.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void copyInviteLink()}
            className="inline-flex shrink-0 items-center gap-2 self-start rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-md transition-colors hover:bg-blue-700 dark:bg-blue-600 dark:text-white dark:hover:bg-blue-500"
          >
            <Share2 className="h-4 w-4" aria-hidden />
            {linkCopied ? "Copied!" : "Invite link"}
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end"
        >
          <div className="relative min-w-0 flex-1 sm:min-w-[200px]">
            <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <input
              autoFocus
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter an email… (user@example.com)"
              className="h-11 w-full rounded-lg border border-zinc-200 bg-white py-2 pl-9 pr-3 text-sm text-zinc-900 shadow-sm outline-none placeholder:text-zinc-400 focus:border-zinc-300 focus:ring-2 focus:ring-zinc-900/10 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
            />
          </div>
          <div className="relative min-w-0 sm:w-44">
            <UserCircle2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="h-11 w-full cursor-pointer appearance-none rounded-lg border border-zinc-200 bg-white py-2 pl-9 pr-8 text-sm font-medium text-zinc-900 shadow-sm outline-none focus:border-zinc-300 focus:ring-2 focus:ring-zinc-900/10 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
              aria-label="Role for invite"
            >
              <option value="">Select role</option>
              {INVITE_ROLE_OPTIONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          </div>
          <div className="relative min-w-0 sm:min-w-[180px] sm:flex-1">
            <Layers className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-zinc-400" />
            <div className="max-h-32 overflow-y-auto rounded-lg border border-zinc-200 bg-white py-1 pl-9 pr-2 shadow-sm dark:border-zinc-600 dark:bg-zinc-900">
              {projectsCatalog.length === 0 ? (
                <p className="py-2 text-xs text-zinc-400">
                  No projects yet — add projects to assign here.
                </p>
              ) : (
                <ul className="space-y-0.5 py-1">
                  {projectsCatalog.map((p) => (
                    <li key={p.id}>
                      <label className="flex cursor-pointer items-center gap-2 px-2 py-1.5 text-sm text-zinc-800 hover:bg-zinc-50 dark:text-zinc-200 dark:hover:bg-zinc-800/60">
                        <input
                          type="checkbox"
                          checked={projectIds.includes(p.id)}
                          onChange={() => toggleProject(p.id)}
                          className="h-3.5 w-3.5 rounded border-zinc-300"
                        />
                        <span
                          className="h-2 w-2 shrink-0 rounded-full"
                          style={{ backgroundColor: p.color }}
                        />
                        <span className="truncate">{p.title}</span>
                      </label>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <p className="mt-1 text-[11px] text-zinc-400">Select projects</p>
          </div>
          <button
            type="submit"
            disabled={!email.trim() || !role}
            className="h-11 shrink-0 rounded-full bg-zinc-200 px-5 text-sm font-semibold text-zinc-600 transition-colors enabled:bg-blue-600 enabled:text-white enabled:hover:bg-blue-700 enabled:shadow-md disabled:cursor-not-allowed dark:enabled:bg-blue-600 dark:enabled:text-white dark:enabled:hover:bg-blue-500"
          >
            Send invite
          </button>
        </form>

        <p className="mt-5 border-t border-zinc-100 pt-4 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
          <button
            type="button"
            onClick={onSwitchToAddMember}
            className="font-medium text-sky-600 hover:underline dark:text-sky-400"
          >
            Add member manually
          </button>{" "}
          instead of email invite.
        </p>

        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function ProjectAvatarStack({ projects }: { projects: MockProject[] }) {
  if (projects.length === 0) {
    return <span className="text-xs text-zinc-400">—</span>;
  }
  const show = projects.slice(0, 5);
  return (
    <div className="flex items-center pl-1">
      <div className="flex -space-x-2">
        {show.map((p) => (
          <Link
            key={p.id}
            href={`/products/${p.id}`}
            title={p.title}
            className="relative z-0 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-white text-[10px] font-bold text-white shadow-sm ring-0 transition-transform hover:z-10 hover:scale-105 dark:border-zinc-900"
            style={{ backgroundColor: p.color }}
            aria-label={p.title}
          >
            {(p.title?.slice(0, 1) || "?").toUpperCase()}
          </Link>
        ))}
      </div>
      {projects.length > 5 ? (
        <span className="ml-2 text-xs font-medium text-zinc-500">
          +{projects.length - 5}
        </span>
      ) : null}
    </div>
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
  const [permission, setPermission] =
    useState<TeamMemberPermission>("member");
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
      permission,
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
          <div>
            <label
              htmlFor="new-member-permission"
              className="mb-1 block text-sm font-medium text-text-primary"
            >
              Permission
            </label>
            <div className="relative">
              <select
                id="new-member-permission"
                value={permission}
                onChange={(e) =>
                  setPermission(e.target.value as TeamMemberPermission)
                }
                className={`${inputClass} w-full cursor-pointer appearance-none pr-10`}
              >
                {TEAM_MEMBER_PERMISSION_ORDER.map((key) => (
                  <option key={key} value={key}>
                    {TEAM_MEMBER_PERMISSION_LABELS[key]}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary/60" />
            </div>
          </div>
          <TeamTagsField
            id="team-tags-input"
            tags={teamTags}
            onChange={setTeamTags}
          />
          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              className="rounded-full bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-colors hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500"
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
