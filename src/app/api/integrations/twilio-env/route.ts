import { NextResponse } from "next/server";
import { requireAgencyStaff } from "@/app/(crm)/actions/prospect-preview-agency";
import { isIntegrationSecretsKeyConfigured } from "@/lib/crypto/integration-secrets";
import { getTwilioEnvVarPresence } from "@/lib/twilio/agency-credentials";

export const runtime = "nodejs";

/**
 * Which Twilio-related env vars the **current deployment** sees (truthy after trim).
 * Agency staff only. Use on production to verify Vercel → Environment Variables + redeploy.
 */
export async function GET() {
  const auth = await requireAgencyStaff();
  if (auth.error || !auth.user) {
    return NextResponse.json({ ok: false as const, error: auth.error ?? "Unauthorized" }, { status: 401 });
  }

  const env = getTwilioEnvVarPresence();
  const fullyConfigured = env.accountSid && env.authToken && env.fromPhone;

  return NextResponse.json({
    ok: true as const,
    env,
    envFullyConfigured: fullyConfigured,
    /** Required to save Twilio/SendGrid tokens under Settings → Integrations. */
    integrationSecretsKeyConfigured: isIntegrationSecretsKeyConfigured(),
    /** Needed if env trio is incomplete and the app falls back to Settings → Integrations (DB). */
    supabaseServiceRoleConfigured: Boolean(process.env["SUPABASE_SERVICE_ROLE_KEY"]?.trim()),
    vercelEnv: process.env.VERCEL_ENV ?? null,
    nodeEnv: process.env.NODE_ENV,
  });
}
