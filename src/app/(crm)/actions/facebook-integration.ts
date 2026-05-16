"use server";

import { revalidatePath } from "next/cache";
import { randomBytes } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchCrmAccessContext } from "@/lib/crm/access-context";
import {
  encryptIntegrationSecret,
  INTEGRATION_SECRETS_KEY_HELP,
  isIntegrationSecretsKeyConfigured,
} from "@/lib/crypto/integration-secrets";
import { fetchPageProfile } from "@/lib/facebook/graph";
import { getPublicOriginFromHeaders } from "@/lib/site-public-url";

type AdminGateOk = {
  ok: true;
  userId: string;
  organizationId: string;
};

type AdminGateDenied = {
  ok: false;
  reason: "no_user" | "forbidden" | "no_org";
};

type AdminGate = AdminGateOk | AdminGateDenied;

async function requireAdminGate(): Promise<AdminGate> {
  const supabase = await createClient();
  const ctx = await fetchCrmAccessContext(supabase);
  if (!ctx) return { ok: false, reason: "no_user" };
  if (ctx.role !== "super_admin" && ctx.role !== "admin") {
    return { ok: false, reason: "forbidden" };
  }
  if (!ctx.organizationId) return { ok: false, reason: "no_org" };
  return { ok: true, userId: ctx.userId, organizationId: ctx.organizationId };
}

function gateError(gate: AdminGateDenied): { error: string } {
  if (gate.reason === "no_user") return { error: "Sign in required." };
  if (gate.reason === "forbidden")
    return {
      error:
        "Only Admins or Super Admins can manage the Facebook integration. Ask an Admin to configure it.",
    };
  return { error: "Your profile has no workspace; cannot configure integrations." };
}

export type FacebookIntegrationFormState = {
  appId: string;
  hasAppSecret: boolean;
  verifyToken: string;
  webhookSecret: string;
  defaultLeadOwnerId: string | null;
  defaultLeadSource: string;
  isActive: boolean;
};

export type FacebookConnectedPageRow = {
  id: string;
  pageId: string;
  pageName: string | null;
  hasAccessToken: boolean;
  isActive: boolean;
};

export type FacebookOwnerOption = {
  userId: string;
  fullName: string | null;
  email: string | null;
  role: string | null;
};

export type FacebookEventLogRow = {
  id: string;
  createdAt: string;
  status: string;
  pageId: string | null;
  formId: string | null;
  leadgenId: string | null;
  leadId: string | null;
  errorMessage: string | null;
};

export type LoadFacebookIntegrationPageResult =
  | {
      status: "ok";
      integration: FacebookIntegrationFormState;
      pages: FacebookConnectedPageRow[];
      owners: FacebookOwnerOption[];
      webhookUrl: string;
      events: FacebookEventLogRow[];
      integrationKeyConfigured: boolean;
    }
  | { status: "no_user" }
  | { status: "forbidden" }
  | { status: "no_org" };

const EVENT_LOG_LIMIT = 25;

export async function loadFacebookIntegrationPage(): Promise<LoadFacebookIntegrationPageResult> {
  const gate = await requireAdminGate();
  if (!gate.ok) {
    return { status: gate.reason };
  }

  const admin = createAdminClient();

  const { data: integRow } = await admin
    .from("agency_facebook_integration")
    .select(
      "app_id, app_secret_encrypted, verify_token_encrypted, webhook_secret, default_lead_owner_id, default_lead_source, is_active"
    )
    .eq("organization_id", gate.organizationId)
    .maybeSingle();

  let webhookSecret = (integRow?.webhook_secret as string | null) ?? null;
  let verifyTokenPlain: string | null = null;
  if (integRow?.verify_token_encrypted) {
    try {
      const { decryptIntegrationSecret } = await import(
        "@/lib/crypto/integration-secrets"
      );
      verifyTokenPlain = decryptIntegrationSecret(
        integRow.verify_token_encrypted as string
      );
    } catch {
      verifyTokenPlain = null;
    }
  }

  if (!integRow || !webhookSecret || !verifyTokenPlain) {
    if (!isIntegrationSecretsKeyConfigured()) {
      // Skip auto-generation when encryption is not available; surface helper UI.
    } else {
      const newSecret = webhookSecret ?? randomHex(20);
      const newVerify = verifyTokenPlain ?? randomHex(16);
      let verifyEncrypted: string | null = null;
      try {
        verifyEncrypted = encryptIntegrationSecret(newVerify);
      } catch {
        verifyEncrypted = null;
      }
      await admin
        .from("agency_facebook_integration")
        .upsert(
          {
            organization_id: gate.organizationId,
            webhook_secret: newSecret,
            verify_token_encrypted: verifyEncrypted ?? null,
            updated_at: new Date().toISOString(),
            updated_by: gate.userId,
          },
          { onConflict: "organization_id" }
        );
      webhookSecret = newSecret;
      verifyTokenPlain = newVerify;
    }
  }

  const integration: FacebookIntegrationFormState = {
    appId: (integRow?.app_id as string | null)?.trim() ?? "",
    hasAppSecret: Boolean(integRow?.app_secret_encrypted),
    verifyToken: verifyTokenPlain ?? "",
    webhookSecret: webhookSecret ?? "",
    defaultLeadOwnerId:
      (integRow?.default_lead_owner_id as string | null) ?? null,
    defaultLeadSource:
      (integRow?.default_lead_source as string | null)?.trim() || "Facebook Lead Ads",
    isActive: integRow?.is_active !== false,
  };

  const { data: pageRows } = await admin
    .from("agency_facebook_page")
    .select("id, page_id, page_name, page_access_token_encrypted, is_active, created_at")
    .eq("organization_id", gate.organizationId)
    .order("created_at", { ascending: true });

  const pages: FacebookConnectedPageRow[] = (pageRows ?? []).map((row) => ({
    id: row.id as string,
    pageId: row.page_id as string,
    pageName: (row.page_name as string | null) ?? null,
    hasAccessToken: Boolean(row.page_access_token_encrypted),
    isActive: row.is_active !== false,
  }));

  const { data: ownerRows } = await admin
    .from("profiles")
    .select("id, full_name, email, role")
    .eq("organization_id", gate.organizationId)
    .neq("role", "client")
    .order("full_name", { ascending: true });

  const owners: FacebookOwnerOption[] = (ownerRows ?? []).map((row) => ({
    userId: row.id as string,
    fullName: (row.full_name as string | null) ?? null,
    email: (row.email as string | null) ?? null,
    role: (row.role as string | null) ?? null,
  }));

  const origin = (await getPublicOriginFromHeaders()).replace(/\/$/, "");
  const webhookUrl = `${origin}/api/webhooks/facebook/leads?token=${
    encodeURIComponent(integration.webhookSecret) || "YOUR_WEBHOOK_SECRET"
  }`;

  const { data: eventRows } = await admin
    .from("facebook_lead_event_log")
    .select(
      "id, created_at, status, page_id, form_id, leadgen_id, lead_id, error_message"
    )
    .eq("organization_id", gate.organizationId)
    .order("created_at", { ascending: false })
    .limit(EVENT_LOG_LIMIT);

  const events: FacebookEventLogRow[] = (eventRows ?? []).map((row) => ({
    id: row.id as string,
    createdAt: row.created_at as string,
    status: row.status as string,
    pageId: (row.page_id as string | null) ?? null,
    formId: (row.form_id as string | null) ?? null,
    leadgenId: (row.leadgen_id as string | null) ?? null,
    leadId: (row.lead_id as string | null) ?? null,
    errorMessage: (row.error_message as string | null) ?? null,
  }));

  return {
    status: "ok",
    integration,
    pages,
    owners,
    webhookUrl,
    events,
    integrationKeyConfigured: isIntegrationSecretsKeyConfigured(),
  };
}

export async function saveFacebookIntegration(formData: FormData) {
  const gate = await requireAdminGate();
  if (!gate.ok) return gateError(gate);

  if (!isIntegrationSecretsKeyConfigured()) {
    return { error: INTEGRATION_SECRETS_KEY_HELP };
  }

  const appId = String(formData.get("app_id") ?? "").trim();
  const appSecretRaw = String(formData.get("app_secret") ?? "").trim();
  const verifyTokenRaw = String(formData.get("verify_token") ?? "").trim();
  const defaultOwnerRaw = String(formData.get("default_lead_owner_id") ?? "").trim();
  const defaultSourceRaw =
    String(formData.get("default_lead_source") ?? "").trim() || "Facebook Lead Ads";
  const isActive = formData.get("is_active") === "on";

  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("agency_facebook_integration")
    .select(
      "app_secret_encrypted, verify_token_encrypted, webhook_secret"
    )
    .eq("organization_id", gate.organizationId)
    .maybeSingle();

  let appSecretEncrypted: string | null =
    (existing?.app_secret_encrypted as string | null) ?? null;
  if (appSecretRaw) {
    try {
      appSecretEncrypted = encryptIntegrationSecret(appSecretRaw);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Encryption failed.";
      return {
        error:
          msg === "INTEGRATION_SECRETS_KEY_MISSING"
            ? INTEGRATION_SECRETS_KEY_HELP
            : msg,
      };
    }
  }

  let verifyTokenEncrypted: string | null =
    (existing?.verify_token_encrypted as string | null) ?? null;
  if (verifyTokenRaw) {
    try {
      verifyTokenEncrypted = encryptIntegrationSecret(verifyTokenRaw);
    } catch {
      verifyTokenEncrypted = null;
    }
  }

  const webhookSecret =
    (existing?.webhook_secret as string | null) ?? randomHex(20);

  const { error } = await admin.from("agency_facebook_integration").upsert(
    {
      organization_id: gate.organizationId,
      app_id: appId || null,
      app_secret_encrypted: appSecretEncrypted,
      verify_token_encrypted: verifyTokenEncrypted,
      webhook_secret: webhookSecret,
      default_lead_owner_id: defaultOwnerRaw || null,
      default_lead_source: defaultSourceRaw,
      is_active: isActive,
      updated_at: new Date().toISOString(),
      updated_by: gate.userId,
    },
    { onConflict: "organization_id" }
  );

  if (error) return { error: error.message };
  revalidatePath("/settings/integrations/facebook");
  return { ok: true as const };
}

export async function rotateFacebookSecrets() {
  const gate = await requireAdminGate();
  if (!gate.ok) return gateError(gate);

  if (!isIntegrationSecretsKeyConfigured()) {
    return { error: INTEGRATION_SECRETS_KEY_HELP };
  }

  const admin = createAdminClient();
  const newSecret = randomHex(20);
  const newVerify = randomHex(16);
  let verifyEncrypted: string;
  try {
    verifyEncrypted = encryptIntegrationSecret(newVerify);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Encryption failed.";
    return {
      error:
        msg === "INTEGRATION_SECRETS_KEY_MISSING"
          ? INTEGRATION_SECRETS_KEY_HELP
          : msg,
    };
  }

  const { error } = await admin
    .from("agency_facebook_integration")
    .upsert(
      {
        organization_id: gate.organizationId,
        webhook_secret: newSecret,
        verify_token_encrypted: verifyEncrypted,
        updated_at: new Date().toISOString(),
        updated_by: gate.userId,
      },
      { onConflict: "organization_id" }
    );

  if (error) return { error: error.message };
  revalidatePath("/settings/integrations/facebook");
  return { ok: true as const };
}

export async function addFacebookPage(formData: FormData) {
  const gate = await requireAdminGate();
  if (!gate.ok) return gateError(gate);

  if (!isIntegrationSecretsKeyConfigured()) {
    return { error: INTEGRATION_SECRETS_KEY_HELP };
  }

  const pageId = String(formData.get("page_id") ?? "").trim();
  const pageName = String(formData.get("page_name") ?? "").trim();
  const tokenRaw = String(formData.get("page_access_token") ?? "").trim();

  if (!pageId) return { error: "Page ID is required." };
  if (!tokenRaw) return { error: "Page access token is required." };

  let tokenEncrypted: string;
  try {
    tokenEncrypted = encryptIntegrationSecret(tokenRaw);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Encryption failed.";
    return {
      error:
        msg === "INTEGRATION_SECRETS_KEY_MISSING"
          ? INTEGRATION_SECRETS_KEY_HELP
          : msg,
    };
  }

  const admin = createAdminClient();
  const { data: clash } = await admin
    .from("agency_facebook_page")
    .select("organization_id")
    .eq("page_id", pageId)
    .maybeSingle();
  if (clash && clash.organization_id !== gate.organizationId) {
    return {
      error:
        "This Page is already connected to a different workspace. Disconnect it there first or use a different Meta Page.",
    };
  }

  const { error } = await admin
    .from("agency_facebook_page")
    .upsert(
      {
        organization_id: gate.organizationId,
        page_id: pageId,
        page_name: pageName || null,
        page_access_token_encrypted: tokenEncrypted,
        is_active: true,
        updated_at: new Date().toISOString(),
        updated_by: gate.userId,
      },
      { onConflict: "page_id" }
    );

  if (error) return { error: error.message };
  revalidatePath("/settings/integrations/facebook");
  return { ok: true as const };
}

export async function removeFacebookPage(formData: FormData) {
  const gate = await requireAdminGate();
  if (!gate.ok) return gateError(gate);

  const id = String(formData.get("id") ?? "").trim();
  if (!id) return { error: "Missing page row id." };

  const admin = createAdminClient();
  const { error } = await admin
    .from("agency_facebook_page")
    .delete()
    .eq("id", id)
    .eq("organization_id", gate.organizationId);

  if (error) return { error: error.message };
  revalidatePath("/settings/integrations/facebook");
  return { ok: true as const };
}

export async function testFacebookPage(formData: FormData) {
  const gate = await requireAdminGate();
  if (!gate.ok) return gateError(gate);

  const id = String(formData.get("id") ?? "").trim();
  if (!id) return { error: "Missing page row id." };

  const admin = createAdminClient();
  const { data } = await admin
    .from("agency_facebook_page")
    .select("page_id, page_access_token_encrypted")
    .eq("id", id)
    .eq("organization_id", gate.organizationId)
    .maybeSingle();

  if (!data) return { error: "Page not found." };
  if (!data.page_access_token_encrypted) {
    return { error: "No saved access token for this Page." };
  }

  let token: string;
  try {
    const { decryptIntegrationSecret } = await import(
      "@/lib/crypto/integration-secrets"
    );
    token = decryptIntegrationSecret(data.page_access_token_encrypted as string);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Decryption failed.";
    return {
      error:
        msg === "INTEGRATION_SECRETS_KEY_MISSING"
          ? INTEGRATION_SECRETS_KEY_HELP
          : msg,
    };
  }

  const result = await fetchPageProfile(data.page_id as string, token);
  if (!result.ok) {
    return { error: result.error.message || "Graph API error." };
  }
  if (result.name && result.name.trim()) {
    await admin
      .from("agency_facebook_page")
      .update({ page_name: result.name, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("organization_id", gate.organizationId);
  }
  revalidatePath("/settings/integrations/facebook");
  return {
    ok: true as const,
    message: result.name
      ? `Connected to “${result.name}”.`
      : "Page access token is valid.",
  };
}

function randomHex(byteLen: number): string {
  return randomBytes(byteLen).toString("hex");
}
