import { createAdminClient } from "@/lib/supabase/admin";
import { decryptIntegrationSecret } from "@/lib/crypto/integration-secrets";

export type AgencySendGridCreds = {
  apiKey: string;
  fromEmail: string;
  fromName: string | null;
  replyTo: string | null;
};

/**
 * Service-role load for server actions. Returns null if not configured or decrypt fails.
 */
export async function getAgencySendGridCredentials(): Promise<AgencySendGridCreds | null> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("agency_sendgrid_integration")
      .select("api_key_encrypted, from_email, from_name, reply_to")
      .eq("id", 1)
      .maybeSingle();

    if (error || !data?.api_key_encrypted || !data.from_email?.trim()) {
      return null;
    }
    const apiKey = decryptIntegrationSecret(data.api_key_encrypted);
    return {
      apiKey,
      fromEmail: data.from_email.trim(),
      fromName: data.from_name?.trim() || null,
      replyTo: data.reply_to?.trim() || null,
    };
  } catch {
    return null;
  }
}
