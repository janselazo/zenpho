import {
  type MockTeamMember,
  parseTeamMemberPermission,
} from "@/lib/crm/mock-data";

export const CRM_TEAM_MEMBERS_STORAGE_KEY = "crm_team_members_v1";

function normalizeMember(m: MockTeamMember): MockTeamMember {
  const url =
    typeof m.avatarUrl === "string" && m.avatarUrl.trim().length > 0
      ? m.avatarUrl.trim()
      : null;
  return {
    ...m,
    tags: Array.isArray(m.tags) ? m.tags : [],
    location: m.location ?? null,
    permission: parseTeamMemberPermission(m.permission),
    avatarUrl: url,
  };
}

export function readStoredTeamMembers(): MockTeamMember[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CRM_TEAM_MEMBERS_STORAGE_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw) as unknown;
    if (!Array.isArray(data)) return [];
    return data.map((x) => normalizeMember(x as MockTeamMember));
  } catch {
    return [];
  }
}

export function writeStoredTeamMembers(members: MockTeamMember[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      CRM_TEAM_MEMBERS_STORAGE_KEY,
      JSON.stringify(members)
    );
    window.dispatchEvent(new Event("crm-team-members-changed"));
  } catch {
    /* quota / private mode */
  }
}

/** Row shape from `profiles` for merging CRM-visible avatars onto the local roster. */
export type ProfileAvatarRow = {
  id: string;
  email: string | null;
  avatar_url: string | null;
};

/**
 * Prefer each member’s stored `avatarUrl` (Team page upload). Otherwise use
 * `profiles.avatar_url` when `member.id` or `member.email` matches.
 */
export function mergeTeamMembersWithProfileAvatars(
  members: MockTeamMember[],
  profiles: ProfileAvatarRow[]
): MockTeamMember[] {
  const byId = new Map<string, string>();
  const byEmail = new Map<string, string>();
  for (const r of profiles) {
    const url =
      typeof r.avatar_url === "string" && r.avatar_url.trim().length > 0
        ? r.avatar_url.trim()
        : null;
    if (!url) continue;
    byId.set(r.id, url);
    const em =
      typeof r.email === "string" && r.email.trim().length > 0
        ? r.email.trim().toLowerCase()
        : null;
    if (em) byEmail.set(em, url);
  }
  return members.map((m) => {
    const base = normalizeMember(m);
    if (base.avatarUrl) return base;
    const fromId = byId.get(base.id);
    if (fromId) return { ...base, avatarUrl: fromId };
    const em = base.email?.trim().toLowerCase();
    if (em) {
      const fromEmail = byEmail.get(em);
      if (fromEmail) return { ...base, avatarUrl: fromEmail };
    }
    return base;
  });
}
