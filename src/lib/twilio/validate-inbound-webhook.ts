import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import twilio from "twilio";
import { getAgencyTwilioCredentials } from "@/lib/twilio/agency-credentials";
import { getPublicOriginFromRequest } from "@/lib/site-public-url";

export type TwilioValidationResult =
  | { valid: true; params: Record<string, string> }
  | { valid: false; response: NextResponse };

/**
 * Validates a Twilio inbound webhook signature and returns the parsed form params on success.
 * Callers can then read params.Body, params.From, params.MessageSid, etc.
 */
export async function validateTwilioSignature(
  req: NextRequest,
  pathname: string,
): Promise<TwilioValidationResult> {
  const creds = await getAgencyTwilioCredentials();
  if (!creds) {
    return {
      valid: false,
      response: NextResponse.json({ error: "Twilio integration not configured" }, { status: 503 }),
    };
  }

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

  const isValid = twilio.validateRequest(creds.authToken, signature, url, params);
  if (!isValid) {
    return {
      valid: false,
      response: NextResponse.json({ error: "Invalid signature" }, { status: 403 }),
    };
  }

  return { valid: true, params };
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
