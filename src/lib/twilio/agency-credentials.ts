import { createAdminClient } from "@/lib/supabase/admin";
import { decryptIntegrationSecret } from "@/lib/crypto/integration-secrets";

export type AgencyTwilioCreds = {
  accountSid: string;
  authToken: string;
  fromPhone: string | null;
};

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
 * When `TWILIO_ACCOUNT_SID`, auth token (`TWILIO_AUTH_TOKEN` or alias `TWILIO_SECRET_KEY`), and
 * `TWILIO_FROM_PHONE` are all set (e.g. on Vercel), those are used. Otherwise loads encrypted row
 * via service role (Settings → Integrations).
 */
export async function getAgencyTwilioCredentials(): Promise<AgencyTwilioCreds | null> {
  const envSid = process.env["TWILIO_ACCOUNT_SID"]?.trim();
  const envToken =
    process.env["TWILIO_AUTH_TOKEN"]?.trim() || process.env["TWILIO_SECRET_KEY"]?.trim();
  const envFrom = process.env["TWILIO_FROM_PHONE"]?.trim();
  if (envSid && envToken && envFrom) {
    return {
      accountSid: envSid,
      authToken: envToken,
      fromPhone: envFrom,
    };
  }

  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("agency_twilio_integration")
      .select("account_sid, auth_token_encrypted, from_phone")
      .eq("id", 1)
      .maybeSingle();

    if (error || !data?.account_sid || !data.auth_token_encrypted) {
      return null;
    }
    const authToken = decryptIntegrationSecret(data.auth_token_encrypted);
    return {
      accountSid: data.account_sid.trim(),
      authToken,
      fromPhone: data.from_phone?.trim() || null,
    };
  } catch {
    return null;
  }
}
