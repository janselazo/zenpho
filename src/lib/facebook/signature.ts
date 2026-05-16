import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Verify Meta's `X-Hub-Signature-256` header against the raw request body.
 *
 * Meta signs the payload with HMAC-SHA256 using the App Secret, and sends
 * `sha256=<hex>` in the header. We compare with `timingSafeEqual` to avoid
 * leaking the result via timing.
 *
 * Returns false on any malformed input rather than throwing — the webhook
 * route logs the rejection in `facebook_lead_event_log` and returns 401.
 */
export function verifyMetaSignature(
  rawBody: string,
  header: string | null | undefined,
  appSecret: string | null | undefined
): boolean {
  if (!header || !appSecret) return false;
  const trimmed = header.trim();
  const expectedPrefix = "sha256=";
  if (!trimmed.startsWith(expectedPrefix)) return false;

  const provided = trimmed.slice(expectedPrefix.length).toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(provided)) return false;

  const computed = createHmac("sha256", appSecret).update(rawBody, "utf8").digest("hex");
  if (computed.length !== provided.length) return false;

  try {
    return timingSafeEqual(Buffer.from(computed, "hex"), Buffer.from(provided, "hex"));
  } catch {
    return false;
  }
}
