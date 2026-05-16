import { facebookGraphVersion } from "./agency-credentials";

export type LeadgenFieldData = { name: string; values: string[] };

export type LeadgenFetchResult = {
  id: string;
  formId: string | null;
  adId: string | null;
  campaignId: string | null;
  createdTime: string | null;
  fieldData: LeadgenFieldData[];
};

export type FacebookGraphError = {
  message: string;
  type?: string;
  code?: number;
  fbtraceId?: string;
};

function parseGraphError(payload: unknown): FacebookGraphError {
  if (
    payload &&
    typeof payload === "object" &&
    "error" in payload &&
    payload.error &&
    typeof payload.error === "object"
  ) {
    const e = payload.error as Record<string, unknown>;
    return {
      message: typeof e.message === "string" ? e.message : "Facebook Graph error.",
      type: typeof e.type === "string" ? e.type : undefined,
      code: typeof e.code === "number" ? e.code : undefined,
      fbtraceId: typeof e.fbtrace_id === "string" ? e.fbtrace_id : undefined,
    };
  }
  return { message: "Facebook Graph error." };
}

/**
 * Fetch a leadgen by its `leadgen_id` using a Page access token.
 *
 * Meta only sends the leadgen_id in the webhook payload — we have to fetch the
 * actual field values from Graph API. Use a Page access token for the connected
 * Page (long-lived tokens are recommended for production).
 *
 * @see https://developers.facebook.com/docs/marketing-api/guides/lead-ads/retrieving
 */
export async function fetchLeadgen(
  leadgenId: string,
  pageAccessToken: string
): Promise<{ ok: true; lead: LeadgenFetchResult } | { ok: false; error: FacebookGraphError }> {
  const url = new URL(
    `https://graph.facebook.com/${facebookGraphVersion()}/${encodeURIComponent(leadgenId)}`
  );
  url.searchParams.set(
    "fields",
    "id,form_id,ad_id,campaign_id,created_time,field_data"
  );
  url.searchParams.set("access_token", pageAccessToken);

  let res: Response;
  try {
    res = await fetch(url.toString(), { method: "GET" });
  } catch (e) {
    return {
      ok: false,
      error: {
        message: e instanceof Error ? `fetchLeadgen: ${e.message}` : "fetchLeadgen failed.",
      },
    };
  }

  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }

  if (!res.ok) {
    return { ok: false, error: parseGraphError(body) };
  }

  const json = (body ?? {}) as Record<string, unknown>;
  const rawFieldData = Array.isArray(json.field_data) ? json.field_data : [];
  const fieldData: LeadgenFieldData[] = rawFieldData
    .map((row): LeadgenFieldData | null => {
      if (!row || typeof row !== "object") return null;
      const r = row as Record<string, unknown>;
      const name = typeof r.name === "string" ? r.name : null;
      if (!name) return null;
      const values = Array.isArray(r.values)
        ? r.values.map((v) => String(v ?? "")).filter((v) => v.length > 0)
        : [];
      return { name, values };
    })
    .filter((row): row is LeadgenFieldData => row !== null);

  return {
    ok: true,
    lead: {
      id: typeof json.id === "string" ? json.id : leadgenId,
      formId: typeof json.form_id === "string" ? json.form_id : null,
      adId: typeof json.ad_id === "string" ? json.ad_id : null,
      campaignId: typeof json.campaign_id === "string" ? json.campaign_id : null,
      createdTime: typeof json.created_time === "string" ? json.created_time : null,
      fieldData,
    },
  };
}

/**
 * Validate a Page access token by fetching the Page object.
 * Used by the "Test connection" button in the settings UI.
 */
export async function fetchPageProfile(
  pageId: string,
  pageAccessToken: string
): Promise<{ ok: true; name: string | null } | { ok: false; error: FacebookGraphError }> {
  const url = new URL(
    `https://graph.facebook.com/${facebookGraphVersion()}/${encodeURIComponent(pageId)}`
  );
  url.searchParams.set("fields", "id,name");
  url.searchParams.set("access_token", pageAccessToken);

  let res: Response;
  try {
    res = await fetch(url.toString(), { method: "GET" });
  } catch (e) {
    return {
      ok: false,
      error: {
        message: e instanceof Error ? `fetchPageProfile: ${e.message}` : "fetchPageProfile failed.",
      },
    };
  }

  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }

  if (!res.ok) {
    return { ok: false, error: parseGraphError(body) };
  }

  const json = (body ?? {}) as Record<string, unknown>;
  return {
    ok: true,
    name: typeof json.name === "string" ? json.name : null,
  };
}
