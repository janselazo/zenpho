import { promises as dns } from "node:dns";

/**
 * Result of resolving the MX records for a Reply-To address's domain.
 *
 * `pointsToSendGrid` is true only when the most-preferred MX records
 * (lowest priority value) are on `sendgrid.net`. Senders try the lowest
 * priority first and do NOT fall back to higher priorities on SMTP 5xx
 * rejects — so a SendGrid MX listed as a backup behind Microsoft 365 or
 * Google Workspace is effectively dead weight.
 */
export type ReplyToMxCheck = {
  /** The lowercased domain part of the Reply-To address (after the `@`). */
  replyToDomain: string;
  /** True when DNS returned at least one MX record. False on NXDOMAIN, timeout, or empty. */
  resolved: boolean;
  /** True when ALL most-preferred MX exchanges are on `sendgrid.net`. */
  pointsToSendGrid: boolean;
  /**
   * True when SendGrid is in the MX list but is not the most-preferred record,
   * which is silently broken in practice. Surfaced separately so the UI can
   * show a more pointed error message.
   */
  sendgridIsBackupOnly: boolean;
  /** Lowest-priority (most preferred) MX exchange, with trailing dot stripped. */
  topMx: string | null;
  /** All MX exchanges in priority order, for diagnostic display. */
  mxHosts: string[];
  /** Error message when `resolved` is false. */
  error: string | null;
};

const DNS_TIMEOUT_MS = 3000;

/**
 * Resolve MX records for the domain part of a Reply-To address. Returns `null`
 * if the address is empty or unparseable. Never throws — DNS failures are
 * captured in `error` and `resolved: false`.
 *
 * Used by the SendGrid integration settings page to surface a clear red banner
 * when Reply-To points at a domain whose MX is not SendGrid (e.g. Microsoft
 * 365), which would silently bounce every prospect reply at SMTP.
 */
export async function checkReplyToMx(
  replyTo: string | null | undefined
): Promise<ReplyToMxCheck | null> {
  const trimmed = (replyTo ?? "").trim();
  if (!trimmed) return null;
  const at = trimmed.lastIndexOf("@");
  if (at <= 0 || at === trimmed.length - 1) return null;
  const domain = trimmed.slice(at + 1).toLowerCase();
  if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(domain)) return null;

  let timer: ReturnType<typeof setTimeout> | null = null;
  type MxRecord = { exchange: string; priority: number };
  try {
    const records = await Promise.race<MxRecord[]>([
      dns.resolveMx(domain),
      new Promise<MxRecord[]>((_, rej) => {
        timer = setTimeout(() => rej(new Error("DNS timeout")), DNS_TIMEOUT_MS);
      }),
    ]);
    if (!Array.isArray(records) || records.length === 0) {
      return {
        replyToDomain: domain,
        resolved: false,
        pointsToSendGrid: false,
        sendgridIsBackupOnly: false,
        topMx: null,
        mxHosts: [],
        error: "No MX records returned for this domain.",
      };
    }
    const sortedRecords = [...records].sort((a, b) => a.priority - b.priority);
    const sortedHosts = sortedRecords.map((r) =>
      r.exchange.replace(/\.$/, "").toLowerCase()
    );
    const isSendGridHost = (host: string) =>
      /(^|\.)sendgrid\.net$/i.test(host);
    const minPriority = sortedRecords[0]?.priority ?? 0;
    const topPreferred = sortedRecords.filter(
      (r) => r.priority === minPriority
    );
    const pointsToSendGrid =
      topPreferred.length > 0 &&
      topPreferred.every((r) =>
        isSendGridHost(r.exchange.replace(/\.$/, "").toLowerCase())
      );
    const sendgridIsBackupOnly =
      !pointsToSendGrid && sortedHosts.some(isSendGridHost);
    return {
      replyToDomain: domain,
      resolved: true,
      pointsToSendGrid,
      sendgridIsBackupOnly,
      topMx: sortedHosts[0] ?? null,
      mxHosts: sortedHosts,
      error: null,
    };
  } catch (e) {
    const code =
      e && typeof e === "object" && "code" in e
        ? String((e as { code?: unknown }).code)
        : "";
    const message = e instanceof Error ? e.message : "DNS lookup failed";
    const friendly =
      code === "ENOTFOUND" || code === "ENODATA"
        ? "Domain has no MX records (NXDOMAIN/ENODATA)."
        : message;
    return {
      replyToDomain: domain,
      resolved: false,
      pointsToSendGrid: false,
      sendgridIsBackupOnly: false,
      topMx: null,
      mxHosts: [],
      error: friendly,
    };
  } finally {
    if (timer) clearTimeout(timer);
  }
}
