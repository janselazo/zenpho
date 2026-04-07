"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { sendSendGridMail } from "@/lib/sendgrid/mail-send";
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

export type SendGridIntegrationFormState = {
  fromEmail: string;
  fromName: string;
  replyTo: string;
  testDestinationEmail: string;
  hasApiKey: boolean;
};

export type LoadSendGridIntegrationPageResult =
  | { status: "ok"; initial: SendGridIntegrationFormState }
  | { status: "no_user" }
  | { status: "forbidden" };

export async function loadSendGridIntegrationPage(): Promise<LoadSendGridIntegrationPageResult> {
  const gate = await requireAgencyStaff();
  if (!gate.ok) {
    return { status: gate.reason === "no_user" ? "no_user" : "forbidden" };
  }

  const { data } = await gate.supabase
    .from("agency_sendgrid_integration")
    .select("from_email, from_name, reply_to, test_destination_email, api_key_encrypted")
    .eq("id", ROW_ID)
    .maybeSingle();

  const initial: SendGridIntegrationFormState = !data
    ? {
        fromEmail: "",
        fromName: "",
        replyTo: "",
        testDestinationEmail: "",
        hasApiKey: false,
      }
    : {
        fromEmail: data.from_email?.trim() ?? "",
        fromName: data.from_name?.trim() ?? "",
        replyTo: data.reply_to?.trim() ?? "",
        testDestinationEmail: data.test_destination_email?.trim() ?? "",
        hasApiKey: Boolean(data.api_key_encrypted),
      };

  return { status: "ok", initial };
}

export async function saveSendGridIntegration(formData: FormData) {
  const gate = await requireAgencyStaff();
  if (!gate.ok) return { error: gateErrorMessage(gate) };

  const apiKeyRaw = String(formData.get("api_key") ?? "").trim();
  const fromEmail = String(formData.get("from_email") ?? "").trim();
  const fromName = String(formData.get("from_name") ?? "").trim();
  const replyTo = String(formData.get("reply_to") ?? "").trim();
  const testDestinationEmail = String(formData.get("test_destination_email") ?? "").trim();

  if (!fromEmail) {
    return { error: "From email is required (use a verified sender in SendGrid)." };
  }

  let apiKeyEncrypted: string;
  try {
    if (apiKeyRaw) {
      apiKeyEncrypted = encryptIntegrationSecret(apiKeyRaw);
    } else {
      const { data: existing } = await gate.supabase
        .from("agency_sendgrid_integration")
        .select("api_key_encrypted")
        .eq("id", ROW_ID)
        .maybeSingle();
      if (!existing?.api_key_encrypted) {
        return { error: "API key is required on first save." };
      }
      apiKeyEncrypted = existing.api_key_encrypted;
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

  const { error } = await gate.supabase.from("agency_sendgrid_integration").upsert(
    {
      id: ROW_ID,
      api_key_encrypted: apiKeyEncrypted,
      from_email: fromEmail,
      from_name: fromName || null,
      reply_to: replyTo || null,
      test_destination_email: testDestinationEmail || null,
      updated_at: new Date().toISOString(),
      updated_by: gate.user.id,
    },
    { onConflict: "id" },
  );

  if (error) return { error: error.message };
  revalidatePath("/settings");
  revalidatePath("/settings/integrations/sendgrid");
  return { ok: true as const };
}

export async function testSendGridConnection(formData: FormData) {
  const gate = await requireAgencyStaff();
  if (!gate.ok) return { error: gateErrorMessage(gate) };

  const apiKeyInput = String(formData.get("api_key") ?? "").trim();
  const fromEmail = String(formData.get("from_email") ?? "").trim();
  const fromName = String(formData.get("from_name") ?? "").trim();
  const replyTo = String(formData.get("reply_to") ?? "").trim();
  const testTo = String(formData.get("test_destination_email") ?? "").trim();

  let apiKey: string;
  if (apiKeyInput) {
    apiKey = apiKeyInput;
  } else {
    const { data: existing } = await gate.supabase
      .from("agency_sendgrid_integration")
      .select("api_key_encrypted")
      .eq("id", ROW_ID)
      .maybeSingle();
    if (!existing?.api_key_encrypted) {
      return { error: "Enter an API key or save credentials first." };
    }
    try {
      apiKey = decryptIntegrationSecret(existing.api_key_encrypted);
    } catch (e) {
      const m = e instanceof Error ? e.message : "";
      if (m === "INTEGRATION_SECRETS_KEY_MISSING") {
        return { error: INTEGRATION_SECRETS_KEY_HELP };
      }
      return {
        error:
          "Could not decrypt stored API key. Check INTEGRATION_SECRETS_KEY matches the key used when saving, then re-save.",
      };
    }
  }

  if (!fromEmail) {
    return { error: "From email is required to test." };
  }

  const to = testTo.trim() || fromEmail;
  const sent = await sendSendGridMail({
    apiKey,
    to,
    from: { email: fromEmail, name: fromName || null },
    replyTo: replyTo || null,
    subject: testTo.trim()
      ? "Zenpho CRM: SendGrid test"
      : "Zenpho CRM: SendGrid test (self)",
    text: testTo.trim()
      ? "Your SendGrid integration is working."
      : "SendGrid API key accepted. Add “Send test email to” to verify delivery to another inbox.",
    html: testTo.trim()
      ? "<p>Your SendGrid integration is working.</p>"
      : "<p>SendGrid API key accepted. Add a test recipient to verify delivery to another inbox.</p>",
  });

  if (!sent.ok) return { error: sent.error };
  return {
    ok: true as const,
    message: testTo.trim()
      ? "SendGrid credentials are valid and test email sent."
      : "SendGrid accepted the request; test message sent to your From address.",
  };
}
