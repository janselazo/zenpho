"use server";

import { revalidatePath } from "next/cache";
import twilio from "twilio";
import { createClient } from "@/lib/supabase/server";
import {
  encryptIntegrationSecret,
  decryptIntegrationSecret,
  INTEGRATION_SECRETS_KEY_HELP,
} from "@/lib/crypto/integration-secrets";

const ROW_ID = 1;

type StaffGate =
  | { ok: true; user: { id: string }; supabase: Awaited<ReturnType<typeof createClient>> }
  | { ok: false; reason: "no_user" | "forbidden" };

async function requireAgencyStaff(): Promise<StaffGate> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, reason: "no_user" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (
    !profile ||
    (profile.role !== "agency_admin" && profile.role !== "agency_member")
  ) {
    return { ok: false, reason: "forbidden" };
  }

  return { ok: true, user, supabase };
}

function gateErrorMessage(gate: Extract<StaffGate, { ok: false }>) {
  return gate.reason === "no_user"
    ? "Sign in required."
    : "You do not have access to integration settings.";
}

export type TwilioIntegrationFormState = {
  accountSid: string;
  fromPhone: string;
  testDestinationPhone: string;
  whatsappFrom: string;
  whatsappSandbox: boolean;
  hasAuthToken: boolean;
};

export type LoadTwilioIntegrationPageResult =
  | { status: "ok"; initial: TwilioIntegrationFormState }
  | { status: "no_user" }
  | { status: "forbidden" };

export async function loadTwilioIntegrationPage(): Promise<LoadTwilioIntegrationPageResult> {
  const gate = await requireAgencyStaff();
  if (!gate.ok) {
    return { status: gate.reason === "no_user" ? "no_user" : "forbidden" };
  }

  const { data } = await gate.supabase
    .from("agency_twilio_integration")
    .select(
      "account_sid, from_phone, test_destination_phone, whatsapp_from, whatsapp_sandbox, auth_token_encrypted",
    )
    .eq("id", ROW_ID)
    .maybeSingle();

  const initial: TwilioIntegrationFormState = !data
    ? {
        accountSid: "",
        fromPhone: "",
        testDestinationPhone: "",
        whatsappFrom: "",
        whatsappSandbox: false,
        hasAuthToken: false,
      }
    : {
        accountSid: data.account_sid?.trim() ?? "",
        fromPhone: data.from_phone?.trim() ?? "",
        testDestinationPhone: data.test_destination_phone?.trim() ?? "",
        whatsappFrom: data.whatsapp_from?.trim() ?? "",
        whatsappSandbox: Boolean(data.whatsapp_sandbox),
        hasAuthToken: Boolean(data.auth_token_encrypted),
      };

  return { status: "ok", initial };
}

export async function saveTwilioIntegration(formData: FormData) {
  const gate = await requireAgencyStaff();
  if (!gate.ok) return { error: gateErrorMessage(gate) };

  const accountSid = String(formData.get("account_sid") ?? "").trim();
  const authTokenRaw = String(formData.get("auth_token") ?? "").trim();
  const fromPhone = String(formData.get("from_phone") ?? "").trim();
  const testDestinationPhone = String(formData.get("test_destination_phone") ?? "").trim();
  const whatsappFrom = String(formData.get("whatsapp_from") ?? "").trim();
  const whatsappSandbox = formData.get("whatsapp_sandbox") === "true";

  if (!accountSid) {
    return { error: "Account SID is required." };
  }

  let authTokenEncrypted: string;
  try {
    if (authTokenRaw) {
      authTokenEncrypted = encryptIntegrationSecret(authTokenRaw);
    } else {
      const { data: existing } = await gate.supabase
        .from("agency_twilio_integration")
        .select("auth_token_encrypted")
        .eq("id", ROW_ID)
        .maybeSingle();
      if (!existing?.auth_token_encrypted) {
        return { error: "Auth Token is required on first save." };
      }
      authTokenEncrypted = existing.auth_token_encrypted;
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Encryption failed.";
    return {
      error:
        msg === "INTEGRATION_SECRETS_KEY_MISSING" || msg.includes("INTEGRATION_SECRETS_KEY")
          ? INTEGRATION_SECRETS_KEY_HELP
          : msg,
    };
  }

  const { error } = await gate.supabase.from("agency_twilio_integration").upsert(
    {
      id: ROW_ID,
      account_sid: accountSid,
      auth_token_encrypted: authTokenEncrypted,
      from_phone: fromPhone || null,
      test_destination_phone: testDestinationPhone || null,
      whatsapp_from: whatsappFrom || null,
      whatsapp_sandbox: whatsappSandbox,
      updated_at: new Date().toISOString(),
      updated_by: gate.user.id,
    },
    { onConflict: "id" },
  );

  if (error) return { error: error.message };
  revalidatePath("/settings");
  revalidatePath("/settings/integrations/twilio");
  return { ok: true as const };
}

export async function testTwilioConnection(formData: FormData) {
  const gate = await requireAgencyStaff();
  if (!gate.ok) return { error: gateErrorMessage(gate) };

  const accountSid = String(formData.get("account_sid") ?? "").trim();
  const authTokenInput = String(formData.get("auth_token") ?? "").trim();
  const fromPhone = String(formData.get("from_phone") ?? "").trim();
  const testDestinationPhone = String(formData.get("test_destination_phone") ?? "").trim();

  let authToken: string;
  if (authTokenInput) {
    authToken = authTokenInput;
  } else {
    const { data: existing } = await gate.supabase
      .from("agency_twilio_integration")
      .select("auth_token_encrypted")
      .eq("id", ROW_ID)
      .maybeSingle();
    if (!existing?.auth_token_encrypted) {
      return { error: "Enter an Auth Token or save credentials first." };
    }
    try {
      authToken = decryptIntegrationSecret(existing.auth_token_encrypted);
    } catch (e) {
      const m = e instanceof Error ? e.message : "";
      if (m === "INTEGRATION_SECRETS_KEY_MISSING") {
        return { error: INTEGRATION_SECRETS_KEY_HELP };
      }
      return { error: "Could not decrypt stored token. Check INTEGRATION_SECRETS_KEY matches the key used when saving, then re-save." };
    }
  }

  if (!accountSid) {
    return { error: "Account SID is required to test." };
  }

  const client = twilio(accountSid, authToken);

  try {
    await client.api.accounts(accountSid).fetch();
  } catch (e: unknown) {
    const msg = e && typeof e === "object" && "message" in e ? String((e as { message: string }).message) : "Twilio rejected the credentials.";
    return { error: msg };
  }

  if (testDestinationPhone && fromPhone) {
    try {
      await client.messages.create({
        body: "Zenpho CRM: Twilio test message — your integration is working.",
        from: fromPhone,
        to: testDestinationPhone,
      });
      return { ok: true as const, message: "Account verified and test SMS sent." };
    } catch (e: unknown) {
      const msg = e && typeof e === "object" && "message" in e ? String((e as { message: string }).message) : "Failed to send test SMS.";
      return { ok: true as const, message: `Account OK, but test SMS failed: ${msg}` };
    }
  }

  return { ok: true as const, message: "Twilio credentials are valid. Add From + test numbers to send an SMS." };
}
