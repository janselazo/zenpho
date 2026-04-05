import { createAdminClient } from "@/lib/supabase/admin";
import { decryptIntegrationSecret } from "@/lib/crypto/integration-secrets";

export type AgencyTwilioCreds = {
  accountSid: string;
  authToken: string;
  fromPhone: string | null;
};

/**
 * Service-role load for webhooks and server jobs. Returns null if not configured.
 */
export async function getAgencyTwilioCredentials(): Promise<AgencyTwilioCreds | null> {
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
