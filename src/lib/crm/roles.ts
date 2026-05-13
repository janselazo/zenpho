export const SUPER_ADMIN_EMAIL = "janse.lazo@gmail.com" as const;
export const SUPER_ADMIN_DOMAIN = "zenpho.com" as const;

export type InternalRole = "super_admin" | "admin" | "user";
export type ProfileRole = InternalRole | "agency_admin" | "agency_member" | "client";

export function isSuperAdminEmail(email: string | null | undefined): boolean {
  const e = (email ?? "").trim().toLowerCase();
  return e === SUPER_ADMIN_EMAIL || e.endsWith(`@${SUPER_ADMIN_DOMAIN}`);
}

export function normalizeInternalRole(
  role: string | null | undefined,
  email?: string | null
): InternalRole {
  if (isSuperAdminEmail(email)) return "super_admin";
  switch ((role ?? "").trim()) {
    case "super_admin":
      return "super_admin";
    case "admin":
    case "agency_admin":
      return "admin";
    default:
      return "user";
  }
}

export function isInternalStaffRole(
  role: string | null | undefined,
  email?: string | null
): boolean {
  if (isSuperAdminEmail(email)) return true;
  return role === "super_admin" || role === "admin" || role === "user" || role === "agency_admin" || role === "agency_member";
}
