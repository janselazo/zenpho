import { createAdminClient } from "@/lib/supabase/admin";
import { decryptIntegrationSecret } from "@/lib/crypto/integration-secrets";

export type AgencyTwilioCreds = {
  accountSid: string;
  authToken: string;
  fromPhone: string | null;
};

function normalizeTwilioSender(raw: string | null | undefined): string | null {
  const t = raw?.trim();
  if (!t) return null;
  if (t.startsWith("+")) {
    const digits = t.replace(/[^\d]/g, "");
    return digits ? `+${digits}` : null;
  }
  const digits = t.replace(/[^\d]/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return t;
}

/** Booleans only — for staff diagnostics; never log secret values. */
export function getTwilioEnvVarPresence(): {
  accountSid: boolean;
  authToken: boolean;
  fromPhone: boolean;
} {
  return {
    accountSid: Boolean(process.env["TWILIO_ACCOUNT_SID"]?.trim()),
    authToken: Boolean(
      process.env["TWILIO_AUTH_TOKEN"]?.trim() || process.env["TWILIO_SECRET_KEY"]?.trim(),
    ),
    fromPhone: Boolean(process.env["TWILIO_FROM_PHONE"]?.trim()),
  };
}

/**
 * Twilio for outbound SMS and inbound webhook validation.
 * Settings → Integrations takes priority so admins can change sender numbers without
 * redeploying Vercel. Env vars are the fallback when no saved integration exists.
 */
export async function getAgencyTwilioCredentials(): Promise<AgencyTwilioCreds | null> {
  const envSid = process.env["TWILIO_ACCOUNT_SID"]?.trim();
  const envToken =
    process.env["TWILIO_AUTH_TOKEN"]?.trim() || process.env["TWILIO_SECRET_KEY"]?.trim();
  const envFrom = normalizeTwilioSender(process.env["TWILIO_FROM_PHONE"]);

  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("agency_twilio_integration")
      .select("account_sid, auth_token_encrypted, from_phone")
      .eq("id", 1)
      .maybeSingle();

    if (!error && data?.account_sid && data.auth_token_encrypted) {
      const authToken = decryptIntegrationSecret(data.auth_token_encrypted);
      return {
        accountSid: data.account_sid.trim(),
        authToken,
        fromPhone: normalizeTwilioSender(data.from_phone),
      };
    }
  } catch {
    // Fall back to env credentials below.
  }

  if (envSid && envToken && envFrom) {
    return {
      accountSid: envSid,
      authToken: envToken,
      fromPhone: envFrom,
    };
  }

  return null;
}
