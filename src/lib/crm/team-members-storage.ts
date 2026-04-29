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
