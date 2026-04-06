import { createAdminClient } from "@/lib/supabase/admin";
import { decryptIntegrationSecret } from "@/lib/crypto/integration-secrets";

export type AgencySendGridCreds = {
  apiKey: string;
  fromEmail: string;
  fromName: string | null;
  replyTo: string | null;
};

/**
 * SendGrid for outbound mail. When `SENDGRID_API_KEY` and `SENDGRID_FROM_EMAIL` are set (e.g. on Vercel),
 * those are used. Otherwise loads encrypted row via service role (Settings → Integrations).
 */
export async function getAgencySendGridCredentials(): Promise<AgencySendGridCreds | null> {
  const envKey = process.env.SENDGRID_API_KEY?.trim();
  const envFromEmail = process.env.SENDGRID_FROM_EMAIL?.trim();
  if (envKey && envFromEmail) {
    return {
      apiKey: envKey,
      fromEmail: envFromEmail,
      fromName: process.env.SENDGRID_FROM_NAME?.trim() || null,
      replyTo: process.env.SENDGRID_REPLY_TO?.trim() || null,
    };
  }

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
