export const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  user: "User",
  agency_admin: "Agency admin",
  agency_member: "Agency member",
  client: "Client",
};

export const ROLE_DESCRIPTIONS: Record<string, string> = {
  super_admin:
    "Platform owner access. For now this behaves like Admin, and is future-ready for all teams, projects, users, and revenue.",
  admin:
    "Workspace admin. Can manage integrations and settings; leads and CRM records are limited to what they own.",
  user:
    "Team member. Can access records they own, are assigned to, or are explicitly shared with them.",
  agency_admin:
    "Legacy Admin role. This maps to Admin in the new role model.",
  agency_member:
    "Legacy team member role. This maps to User in the new role model.",
  client: "Client portal access. This remains separate from internal team roles.",
};
