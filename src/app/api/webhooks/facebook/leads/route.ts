import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  findFacebookIntegrationByWebhookSecret,
  findFacebookPageByPageId,
  getAgencyFacebookIntegration,
  type AgencyFacebookIntegration,
  type AgencyFacebookPage,
} from "@/lib/facebook/agency-credentials";
import { verifyMetaSignature } from "@/lib/facebook/signature";
import { fetchLeadgen } from "@/lib/facebook/graph";
import { mapFacebookLeadFields } from "@/lib/facebook/mapping";
import { notifyNewLead } from "@/lib/notifications/lead";

/**
 * Facebook Lead Ads webhook.
 *
 *   GET  /api/webhooks/facebook/leads?token=<webhook_secret>&hub.mode=subscribe&...
 *   POST /api/webhooks/facebook/leads?token=<webhook_secret>
 *
 * GET handles Meta's subscription handshake — when the Meta App dashboard verifies
 * the webhook URL it sends `hub.mode=subscribe`, `hub.verify_token=<your token>`,
 * and `hub.challenge=<random>`. We must echo `hub.challenge` if the verify token
 * matches what the org saved in `agency_facebook_integration.verify_token`.
 *
 * POST receives leadgen events. Meta signs the raw body with the App secret and
 * sends `X-Hub-Signature-256: sha256=<hex>`. We verify, then for each `entry[]`:
 *   - look up the org via `agency_facebook_page.page_id = entry.id`
 *   - for each `change` with field `leadgen`, fetch the leadgen via Graph API
 *     using the Page access token, map fields to a CRM `lead` row, insert it,
 *     and call `notifyNewLead()`.
 *
 * Idempotency: every `leadgen_id` is inserted into `facebook_lead_event_log`
 * with a unique constraint, so retries by Meta won't create duplicate leads.
 */
export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const mode = params.get("hub.mode");
  const verifyToken = params.get("hub.verify_token");
  const challenge = params.get("hub.challenge");
  const token = (params.get("token") ?? "").trim();

  if (mode !== "subscribe" || !verifyToken || !challenge) {
    return NextResponse.json(
      { error: "Missing or invalid hub.* parameters." },
      { status: 400 }
    );
  }
  if (!token) {
    return NextResponse.json(
      {
        error:
          "Missing ?token=<webhook_secret>. Use the URL shown in Settings → Integrations → Facebook.",
      },
      { status: 401 }
    );
  }

  const integ = await findFacebookIntegrationByWebhookSecret(token);
  if (!integ) {
    return NextResponse.json({ error: "Unknown webhook token." }, { status: 401 });
  }
  if (!integ.verifyToken) {
    return NextResponse.json(
      {
        error:
          "Verify token not configured for this organization. Set it in Settings → Integrations → Facebook.",
      },
      { status: 400 }
    );
  }
  if (verifyToken !== integ.verifyToken) {
    return NextResponse.json(
      { error: "hub.verify_token does not match." },
      { status: 401 }
    );
  }

  return new Response(challenge, {
    status: 200,
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}

export async function POST(req: NextRequest) {
  const supabase = createAdminClient();
  const rawBody = await req.text();
  const token = (req.nextUrl.searchParams.get("token") ?? "").trim();

  let scopedIntegration: AgencyFacebookIntegration | null = null;
  if (token) {
    scopedIntegration = await findFacebookIntegrationByWebhookSecret(token);
    if (!scopedIntegration) {
      await logEvent(supabase, {
        organizationId: null,
        status: "unauthorized",
        errorMessage: "Unknown webhook token in POST query string.",
        payload: safeParseJsonForLog(rawBody),
      });
      return NextResponse.json(
        { error: "Unknown webhook token." },
        { status: 401 }
      );
    }
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    await logEvent(supabase, {
      organizationId: scopedIntegration?.organizationId ?? null,
      status: "error",
      errorMessage: "Invalid JSON body on Facebook webhook.",
    });
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const envelope = (payload ?? {}) as {
    object?: string;
    entry?: Array<{
      id?: string;
      time?: number;
      changes?: Array<{
        field?: string;
        value?: {
          leadgen_id?: string | number;
          page_id?: string | number;
          form_id?: string | number;
          ad_id?: string | number;
          campaign_id?: string | number;
          created_time?: number;
        };
      }>;
    }>;
  };

  if (!envelope.entry || envelope.entry.length === 0) {
    return NextResponse.json({ ok: true, ignored: "no_entries" });
  }

  let processedCount = 0;
  let duplicateCount = 0;
  const errors: string[] = [];

  for (const entry of envelope.entry) {
    const pageId = entry.id ? String(entry.id) : null;
    if (!pageId) continue;

    const page = await findFacebookPageByPageId(pageId);
    if (!page) {
      await logEvent(supabase, {
        organizationId: scopedIntegration?.organizationId ?? null,
        pageId,
        status: "unknown_page",
        errorMessage: `No connected Page row for page_id=${pageId}.`,
        payload: entry,
      });
      continue;
    }

    if (scopedIntegration && page.organizationId !== scopedIntegration.organizationId) {
      await logEvent(supabase, {
        organizationId: page.organizationId,
        pageId,
        status: "unauthorized",
        errorMessage:
          "Webhook token belongs to a different org than the Page that delivered the event.",
        payload: entry,
      });
      continue;
    }

    const integ =
      scopedIntegration ??
      (await getAgencyFacebookIntegration(page.organizationId));
    if (!integ) {
      await logEvent(supabase, {
        organizationId: page.organizationId,
        pageId,
        status: "error",
        errorMessage: "Page is connected but no integration row exists for the org.",
        payload: entry,
      });
      continue;
    }
    if (!integ.appSecret) {
      await logEvent(supabase, {
        organizationId: page.organizationId,
        pageId,
        status: "invalid_signature",
        errorMessage: "App secret is not configured; cannot verify webhook signature.",
        payload: entry,
      });
      continue;
    }

    const signatureHeader = req.headers.get("x-hub-signature-256");
    if (!verifyMetaSignature(rawBody, signatureHeader, integ.appSecret)) {
      await logEvent(supabase, {
        organizationId: page.organizationId,
        pageId,
        status: "invalid_signature",
        errorMessage:
          "X-Hub-Signature-256 missing or did not match the org's App secret.",
        payload: entry,
      });
      errors.push("invalid_signature");
      continue;
    }

    if (!integ.isActive) {
      await logEvent(supabase, {
        organizationId: page.organizationId,
        pageId,
        status: "error",
        errorMessage: "Facebook integration is paused for this org.",
        payload: entry,
      });
      continue;
    }

    if (!page.pageAccessToken) {
      await logEvent(supabase, {
        organizationId: page.organizationId,
        pageId,
        status: "error",
        errorMessage:
          "Connected Page has no access token; cannot fetch leadgen_id via Graph API.",
        payload: entry,
      });
      continue;
    }

    for (const change of entry.changes ?? []) {
      if (change.field !== "leadgen") continue;
      const value = change.value ?? {};
      const leadgenId = value.leadgen_id != null ? String(value.leadgen_id) : null;
      const formId = value.form_id != null ? String(value.form_id) : null;
      const adId = value.ad_id != null ? String(value.ad_id) : null;
      const campaignId = value.campaign_id != null ? String(value.campaign_id) : null;

      if (!leadgenId) {
        await logEvent(supabase, {
          organizationId: page.organizationId,
          pageId,
          formId,
          adId,
          campaignId,
          status: "error",
          errorMessage: "Change has field=leadgen but no leadgen_id.",
          payload: change,
        });
        continue;
      }

      const dedupe = await supabase
        .from("facebook_lead_event_log")
        .insert({
          organization_id: page.organizationId,
          leadgen_id: leadgenId,
          page_id: pageId,
          form_id: formId,
          ad_id: adId,
          campaign_id: campaignId,
          status: "received",
          payload: change,
        })
        .select("id")
        .maybeSingle();

      if (dedupe.error) {
        const isDuplicate =
          /duplicate/i.test(dedupe.error.message) ||
          dedupe.error.code === "23505";
        if (isDuplicate) {
          duplicateCount += 1;
          continue;
        }
        errors.push(dedupe.error.message);
        continue;
      }
      const logId = dedupe.data?.id as string | undefined;

      const fetchResult = await fetchLeadgen(leadgenId, page.pageAccessToken);
      if (!fetchResult.ok) {
        await updateLogStatus(supabase, logId, {
          status: "graph_error",
          errorMessage: `Graph error: ${fetchResult.error.message}${
            fetchResult.error.fbtraceId ? ` (trace ${fetchResult.error.fbtraceId})` : ""
          }`,
        });
        errors.push(`graph_error:${leadgenId}`);
        continue;
      }

      const mapped = mapFacebookLeadFields(fetchResult.lead.fieldData);

      let formMapOwnerId: string | null = null;
      let formMapSourceLabel: string | null = null;
      if (formId) {
        const { data: formMap } = await supabase
          .from("agency_facebook_form_map")
          .select("default_owner_id, default_source_label")
          .eq("organization_id", page.organizationId)
          .eq("form_id", formId)
          .maybeSingle();
        formMapOwnerId = (formMap?.default_owner_id as string | null) ?? null;
        formMapSourceLabel = (formMap?.default_source_label as string | null) ?? null;
      }

      const ownerId = formMapOwnerId ?? integ.defaultLeadOwnerId ?? null;
      const sourceLabel =
        formMapSourceLabel?.trim() ||
        integ.defaultLeadSource ||
        "Facebook Lead Ads";

      const insertPayload: Record<string, unknown> = {
        organization_id: page.organizationId,
        owner_id: ownerId,
        name: mapped.name,
        email: mapped.email,
        phone: mapped.phone,
        company: mapped.company,
        notes: mapped.notes,
        source: sourceLabel,
        stage: "new",
      };

      const inserted = await supabase
        .from("lead")
        .insert(insertPayload)
        .select("id")
        .single();

      if (inserted.error || !inserted.data) {
        await updateLogStatus(supabase, logId, {
          status: "error",
          errorMessage: `lead insert failed: ${inserted.error?.message ?? "unknown"}`,
        });
        errors.push(`insert:${leadgenId}`);
        continue;
      }

      const leadId = inserted.data.id as string;

      let notifySummary: string | null = null;
      try {
        const notifyResult = await notifyNewLead({
          organizationId: page.organizationId,
          leadId,
        });
        notifySummary = `recipients=${notifyResult.recipientCount}, ok=${notifyResult.ok}`;
        if (!notifyResult.ok) {
          notifySummary += `, errors=${notifyResult.errors.join(" | ")}`;
        }
      } catch (e) {
        notifySummary = `notify exception: ${e instanceof Error ? e.message : String(e)}`;
      }

      await updateLogStatus(supabase, logId, {
        status: "processed",
        leadId,
        errorMessage: notifySummary,
      });
      processedCount += 1;
    }
  }

  return NextResponse.json({
    ok: errors.length === 0,
    processed: processedCount,
    duplicates: duplicateCount,
    errors,
  });
}

async function logEvent(
  supabase: SupabaseClient,
  row: {
    organizationId: string | null;
    leadgenId?: string | null;
    pageId?: string | null;
    formId?: string | null;
    adId?: string | null;
    campaignId?: string | null;
    status:
      | "received"
      | "processed"
      | "duplicate"
      | "unauthorized"
      | "invalid_signature"
      | "unknown_page"
      | "graph_error"
      | "error";
    payload?: unknown;
    errorMessage?: string | null;
    leadId?: string | null;
  }
): Promise<void> {
  try {
    await supabase.from("facebook_lead_event_log").insert({
      organization_id: row.organizationId,
      leadgen_id: row.leadgenId ?? null,
      page_id: row.pageId ?? null,
      form_id: row.formId ?? null,
      ad_id: row.adId ?? null,
      campaign_id: row.campaignId ?? null,
      lead_id: row.leadId ?? null,
      status: row.status,
      payload: row.payload ?? null,
      error_message: row.errorMessage ?? null,
      processed_at:
        row.status === "processed" || row.status === "duplicate"
          ? new Date().toISOString()
          : null,
    });
  } catch (e) {
    console.error("facebook_lead_event_log insert failed", e);
  }
}

async function updateLogStatus(
  supabase: SupabaseClient,
  logId: string | undefined,
  patch: {
    status:
      | "processed"
      | "duplicate"
      | "graph_error"
      | "error";
    leadId?: string | null;
    errorMessage?: string | null;
  }
): Promise<void> {
  if (!logId) return;
  try {
    await supabase
      .from("facebook_lead_event_log")
      .update({
        status: patch.status,
        lead_id: patch.leadId ?? null,
        error_message: patch.errorMessage ?? null,
        processed_at: new Date().toISOString(),
      })
      .eq("id", logId);
  } catch (e) {
    console.error("facebook_lead_event_log update failed", e);
  }
}

function safeParseJsonForLog(raw: string): unknown {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return raw.slice(0, 500);
  }
}
