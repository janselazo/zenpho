import { createAdminClient } from "@/lib/supabase/admin";
import { decryptIntegrationSecret } from "@/lib/crypto/integration-secrets";

const DEFAULT_GRAPH_VERSION = "v21.0";

export function facebookGraphVersion(): string {
  const v = process.env["FACEBOOK_GRAPH_VERSION"]?.trim();
  return v && /^v\d+\.\d+$/.test(v) ? v : DEFAULT_GRAPH_VERSION;
}

export type AgencyFacebookIntegration = {
  organizationId: string;
  appId: string | null;
  appSecret: string | null;
  verifyToken: string | null;
  systemUserToken: string | null;
  webhookSecret: string | null;
  defaultLeadOwnerId: string | null;
  defaultLeadSource: string;
  isActive: boolean;
};

export type AgencyFacebookPage = {
  id: string;
  organizationId: string;
  pageId: string;
  pageName: string | null;
  pageAccessToken: string | null;
  isActive: boolean;
};

function tryDecrypt(stored: string | null | undefined): string | null {
  if (!stored?.trim()) return null;
  try {
    return decryptIntegrationSecret(stored);
  } catch {
    return null;
  }
}

/**
 * Resolve the Facebook integration row for one org. Webhook URL handshake +
 * App secret signature verification needs this to find the right credentials
 * without trusting query string callers.
 */
export async function getAgencyFacebookIntegration(
  organizationId: string
): Promise<AgencyFacebookIntegration | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("agency_facebook_integration")
    .select(
      "organization_id, app_id, app_secret_encrypted, verify_token_encrypted, system_user_token_encrypted, webhook_secret, default_lead_owner_id, default_lead_source, is_active"
    )
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (error || !data) return null;

  return {
    organizationId: data.organization_id as string,
    appId: data.app_id ?? null,
    appSecret: tryDecrypt(data.app_secret_encrypted),
    verifyToken: tryDecrypt(data.verify_token_encrypted),
    systemUserToken: tryDecrypt(data.system_user_token_encrypted),
    webhookSecret: data.webhook_secret ?? null,
    defaultLeadOwnerId: (data.default_lead_owner_id as string | null) ?? null,
    defaultLeadSource: (data.default_lead_source as string) || "Facebook Lead Ads",
    isActive: data.is_active !== false,
  };
}

/**
 * Find the integration row that owns a given webhook secret. Used by the GET
 * verification handshake when Meta calls /api/webhooks/facebook/leads?token=...
 */
export async function findFacebookIntegrationByWebhookSecret(
  secret: string
): Promise<AgencyFacebookIntegration | null> {
  if (!secret.trim()) return null;
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("agency_facebook_integration")
    .select(
      "organization_id, app_id, app_secret_encrypted, verify_token_encrypted, system_user_token_encrypted, webhook_secret, default_lead_owner_id, default_lead_source, is_active"
    )
    .eq("webhook_secret", secret)
    .maybeSingle();

  if (error || !data) return null;

  return {
    organizationId: data.organization_id as string,
    appId: data.app_id ?? null,
    appSecret: tryDecrypt(data.app_secret_encrypted),
    verifyToken: tryDecrypt(data.verify_token_encrypted),
    systemUserToken: tryDecrypt(data.system_user_token_encrypted),
    webhookSecret: data.webhook_secret ?? null,
    defaultLeadOwnerId: (data.default_lead_owner_id as string | null) ?? null,
    defaultLeadSource: (data.default_lead_source as string) || "Facebook Lead Ads",
    isActive: data.is_active !== false,
  };
}

/**
 * Reverse-lookup the org for a Page ID that arrived in a Meta webhook payload.
 * Meta sends `entry[].id = Page ID` for `leadgen` subscriptions, so we use the
 * connected Pages table as the source of truth.
 */
export async function findFacebookPageByPageId(
  pageId: string
): Promise<AgencyFacebookPage | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("agency_facebook_page")
    .select(
      "id, organization_id, page_id, page_name, page_access_token_encrypted, is_active"
    )
    .eq("page_id", pageId)
    .maybeSingle();

  if (error || !data) return null;

  return {
    id: data.id as string,
    organizationId: data.organization_id as string,
    pageId: data.page_id as string,
    pageName: (data.page_name as string | null) ?? null,
    pageAccessToken: tryDecrypt(data.page_access_token_encrypted),
    isActive: data.is_active !== false,
  };
}

export async function getFacebookPagesForOrg(
  organizationId: string
): Promise<AgencyFacebookPage[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("agency_facebook_page")
    .select(
      "id, organization_id, page_id, page_name, page_access_token_encrypted, is_active, created_at"
    )
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: true });

  if (error || !data) return [];

  return data.map((row) => ({
    id: row.id as string,
    organizationId: row.organization_id as string,
    pageId: row.page_id as string,
    pageName: (row.page_name as string | null) ?? null,
    pageAccessToken: tryDecrypt(row.page_access_token_encrypted),
    isActive: row.is_active !== false,
  }));
}
