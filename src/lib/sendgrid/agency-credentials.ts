import { createAdminClient } from "@/lib/supabase/admin";
import { decryptIntegrationSecret } from "@/lib/crypto/integration-secrets";

export type AgencySendGridCreds = {
  apiKey: string;
  fromEmail: string;
  fromName: string | null;
  replyTo: string | null;
};

/**
 * SendGrid for outbound mail.
 *
 * Resolution order (per field):
 * 1. Vercel env (`SENDGRID_API_KEY`, `SENDGRID_FROM_EMAIL`, `SENDGRID_FROM_NAME`, `SENDGRID_REPLY_TO`)
 * 2. Encrypted row in `agency_sendgrid_integration` (saved via Settings → Integrations)
 *
 * Reply-To and From-Name are typically only set in Settings, so we always read the DB row to fill
 * in any field the env vars didn't provide. Without this merge, saving "Reply-to" in the UI has
 * no effect when env vars are set on Vercel — outbound mail gets no Reply-To header and replies
 * default to the From address (which lives on a non-inbound domain and bounces).
 */
export async function getAgencySendGridCredentials(): Promise<AgencySendGridCreds | null> {
  const envKey = process.env.SENDGRID_API_KEY?.trim() || null;
  const envFromEmail = process.env.SENDGRID_FROM_EMAIL?.trim() || null;
  const envFromName = process.env.SENDGRID_FROM_NAME?.trim() || null;
  const envReplyTo = process.env.SENDGRID_REPLY_TO?.trim() || null;

  let dbApiKey: string | null = null;
  let dbFromEmail: string | null = null;
  let dbFromName: string | null = null;
  let dbReplyTo: string | null = null;

  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("agency_sendgrid_integration")
      .select("api_key_encrypted, from_email, from_name, reply_to")
      .eq("id", 1)
      .maybeSingle();

    if (!error && data) {
      if (data.api_key_encrypted) {
        try {
          dbApiKey = decryptIntegrationSecret(data.api_key_encrypted);
        } catch {
          dbApiKey = null;
        }
      }
      dbFromEmail = data.from_email?.trim() || null;
      dbFromName = data.from_name?.trim() || null;
      dbReplyTo = data.reply_to?.trim() || null;
    }
  } catch {
    // Ignore DB errors and rely on whatever env provides.
  }

  const apiKey = envKey ?? dbApiKey;
  const fromEmail = envFromEmail ?? dbFromEmail;
  if (!apiKey || !fromEmail) {
    return null;
  }

  return {
    apiKey,
    fromEmail,
    fromName: envFromName ?? dbFromName,
    replyTo: envReplyTo ?? dbReplyTo,
  };
}
