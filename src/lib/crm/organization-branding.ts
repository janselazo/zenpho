import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchCurrentOrganizationId } from "@/lib/organization";

export type OrganizationCompanyProfile = {
  companyName: string | null;
  companyEmail: string | null;
  companyCategory: string | null;
  companyPhone: string | null;
  companyAddress: string | null;
  logoUrl: string | null;
};

export type CrmSidebarBranding = {
  displayName: string;
  logoUrl: string;
  logoAlt: string;
};

export const DEFAULT_CRM_BRAND_NAME = "Zenpho";
export const DEFAULT_CRM_LOGO_URL = "/zenpho-mark.png";

function asNullableString(v: unknown): string | null {
  if (v == null) return null;
  if (typeof v === "string") {
    const t = v.trim();
    return t ? t : null;
  }
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return null;
}

export function resolveCrmSidebarBranding(
  profile: OrganizationCompanyProfile | null | undefined
): CrmSidebarBranding {
  const companyName = profile?.companyName?.trim() ?? "";
  const logoUrl = profile?.logoUrl?.trim() ?? "";

  return {
    displayName: companyName || DEFAULT_CRM_BRAND_NAME,
    logoUrl: logoUrl || DEFAULT_CRM_LOGO_URL,
    logoAlt: companyName || DEFAULT_CRM_BRAND_NAME,
  };
}

export async function fetchOrganizationCompanyProfile(
  supabase: SupabaseClient,
  organizationId?: string | null
): Promise<OrganizationCompanyProfile | null> {
  const orgId =
    organizationId ?? (await fetchCurrentOrganizationId(supabase));
  if (!orgId) return null;

  const { data, error } = await supabase
    .from("organization")
    .select(
      "company_name, company_email, company_category, company_phone, company_address, logo_url"
    )
    .eq("id", orgId)
    .maybeSingle();

  if (error || !data) return null;

  return {
    companyName: asNullableString(data.company_name),
    companyEmail: asNullableString(data.company_email),
    companyCategory: asNullableString(data.company_category),
    companyPhone: asNullableString(data.company_phone),
    companyAddress: asNullableString(data.company_address),
    logoUrl: asNullableString(data.logo_url),
  };
}

export async function fetchCrmSidebarBranding(
  supabase: SupabaseClient
): Promise<CrmSidebarBranding> {
  const profile = await fetchOrganizationCompanyProfile(supabase);
  return resolveCrmSidebarBranding(profile);
}
