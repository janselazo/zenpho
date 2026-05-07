import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import twilio from "twilio";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  decryptIntegrationSecret,
  isIntegrationSecretsKeyConfigured,
} from "@/lib/crypto/integration-secrets";
import { LEGACY_ORGANIZATION_ID } from "@/lib/organization";
import { getPublicOriginFromRequest } from "@/lib/site-public-url";

export type TwilioValidationResult =
  | { valid: true; params: Record<string, string>; organizationId: string }
  | { valid: false; response: NextResponse };

/**
 * Validates a Twilio inbound webhook signature and returns the parsed form params on success.
 * Callers can then read params.Body, params.From, params.MessageSid, etc.
 *
 * Supports multiple workspaces: tries each saved `agency_twilio_integration` auth token until
 * Twilio signature validation succeeds, then associates the webhook with that row's organization.
 */
export async function validateTwilioSignature(
  req: NextRequest,
  pathname: string,
): Promise<TwilioValidationResult> {
  const body = await req.text();
  const params = Object.fromEntries(new URLSearchParams(body));
  const signature = req.headers.get("x-twilio-signature");
  if (!signature) {
    return {
      valid: false,
      response: NextResponse.json({ error: "Missing signature" }, { status: 403 }),
    };
  }

  const origin = getPublicOriginFromRequest(req);
  const url = `${origin}${pathname}`;

  if (signature && isIntegrationSecretsKeyConfigured()) {
    try {
      const admin = createAdminClient();
      const { data: rows, error } = await admin
        .from("agency_twilio_integration")
        .select("organization_id, auth_token_encrypted")
        .not("auth_token_encrypted", "is", null);

      if (!error && rows?.length) {
        for (const row of rows) {
          if (!row.auth_token_encrypted || !row.organization_id) continue;
          try {
            const token = decryptIntegrationSecret(row.auth_token_encrypted);
            if (
              twilio.validateRequest(token.trim(), signature, url, params)
            ) {
              return {
                valid: true,
                params,
                organizationId: row.organization_id,
              };
            }
          } catch {
            /* skip row */
          }
        }
      }
    } catch {
      /* fall through */
    }
  }

  const envToken =
    process.env["TWILIO_AUTH_TOKEN"]?.trim() || process.env["TWILIO_SECRET_KEY"]?.trim();
  if (envToken && twilio.validateRequest(envToken, signature, url, params)) {
    return {
      valid: true,
      params,
      organizationId: LEGACY_ORGANIZATION_ID,
    };
  }

  return {
    valid: false,
    response: NextResponse.json({ error: "Invalid signature" }, { status: 403 }),
  };
}

/**
 * Legacy helper that validates and returns a simple 200 OK response.
 * Used by webhooks that only need signature validation (e.g. WhatsApp).
 */
export async function validateTwilioInboundWebhook(
  req: NextRequest,
  pathname: string,
): Promise<NextResponse> {
  const result = await validateTwilioSignature(req, pathname);
  if (!result.valid) return result.response;

  return new NextResponse("OK", {
    status: 200,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
