"use server";

import { Buffer } from "node:buffer";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  SALES_PROPOSAL_STATUSES,
  type SalesProposalStatus,
} from "@/lib/crm/sales-proposal-types";
import { sanitizePlacesSearchPlace } from "@/lib/crm/places-google-shared";
import type { PlacesSearchPlace } from "@/lib/crm/places-types";
import { buildSalesProposalPdfForDelivery } from "@/lib/crm/sales-proposal-pdf-build";
import { getAgencySendGridCredentials } from "@/lib/sendgrid/agency-credentials";
import { sendSendGridMail } from "@/lib/sendgrid/mail-send";

const STATUS_SET = new Set<string>(SALES_PROPOSAL_STATUSES);
const SENDGRID_PROPOSAL_ATTACHMENT_MAX_BYTES = 18 * 1024 * 1024;
const PROPOSAL_PDF_BUCKET = "prospect-attachments";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function createProposalPdfSignedLink(params: {
  proposalId: string;
  filename: string;
  bytes: Buffer;
}): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  let admin;
  try {
    admin = createAdminClient();
  } catch (e) {
    return {
      ok: false,
      error:
        e instanceof Error
          ? e.message
          : "Server storage is not configured (SUPABASE_SERVICE_ROLE_KEY).",
    };
  }

  const safeName =
    params.filename.replace(/[^A-Za-z0-9._-]/g, "_").slice(0, 160) ||
    "proposal.pdf";
  const path = `sales-proposals/${params.proposalId}/${Date.now()}-${safeName}`;
  const { error: uploadErr } = await admin.storage
    .from(PROPOSAL_PDF_BUCKET)
    .upload(path, params.bytes, {
      contentType: "application/pdf",
      upsert: true,
    });
  if (uploadErr) return { ok: false, error: uploadErr.message };

  const { data, error: signedErr } = await admin.storage
    .from(PROPOSAL_PDF_BUCKET)
    .createSignedUrl(path, 60 * 60 * 24 * 7, {
      download: safeName,
    });
  if (signedErr || !data?.signedUrl) {
    return {
      ok: false,
      error: signedErr?.message || "Could not create proposal download link.",
    };
  }

  return { ok: true, url: data.signedUrl };
}

export type SalesCatalogLineInput = {
  catalog_item_id?: string | null;
  description_snapshot: string;
  unit_price_snapshot: number;
};

export async function createSalesProposalDraft(input?: {
  title?: string;
  clientId?: string | null;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const title = input?.title?.trim() || "Untitled proposal";
  const cid = input?.clientId?.trim() || null;

  const { data, error } = await supabase
    .from("sales_proposal")
    .insert({
      title,
      status: "draft",
      client_id: cid || null,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  const id = data.id as string;
  revalidatePath("/proposals");
  revalidatePath(`/proposals/new`);
  return { ok: true, id };
}

export async function patchSalesProposalWizardDraft(
  proposalId: string,
  patch: {
    clientId?: string | null;
    leadId?: string | null;
    selectedCatalogItemIds?: string[];
    wizardNotes?: string;
    totalPriceEstimate?: number | null;
    title?: string;
    /** Clear with `null` to remove enrichment. */
    googlePlaceSnapshot?: PlacesSearchPlace | null;
  }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const id = proposalId.trim();
  if (!id) return { error: "Missing id" };

  const update: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (patch.clientId !== undefined) {
    update.client_id = patch.clientId?.trim() || null;
  }
  if (patch.leadId !== undefined) {
    update.lead_id = patch.leadId?.trim() || null;
  }
  if (patch.selectedCatalogItemIds !== undefined) {
    update.selected_catalog_item_ids = patch.selectedCatalogItemIds;
  }
  if (patch.wizardNotes !== undefined) {
    update.wizard_notes = patch.wizardNotes;
  }
  if (patch.totalPriceEstimate !== undefined) {
    update.total_price_estimate =
      patch.totalPriceEstimate == null ||
      !Number.isFinite(patch.totalPriceEstimate)
        ? null
        : patch.totalPriceEstimate;
  }
  if (patch.title !== undefined) {
    update.title = patch.title.trim() || "Untitled proposal";
  }
  if (patch.googlePlaceSnapshot !== undefined) {
    update.google_place_snapshot =
      patch.googlePlaceSnapshot == null
        ? null
        : sanitizePlacesSearchPlace(patch.googlePlaceSnapshot);
  }

  const { error } = await supabase
    .from("sales_proposal")
    .update(update)
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/proposals");
  revalidatePath(`/proposals/${id}`);
  revalidatePath(`/proposals/new`);
  return { ok: true };
}

export async function updateSalesProposalBodyAndStatus(
  proposalId: string,
  body: {
    title: string;
    proposal_body: string;
    status: SalesProposalStatus;
  }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const id = proposalId.trim();
  if (!id) return { error: "Missing id" };

  if (!STATUS_SET.has(body.status)) {
    return { error: "Invalid status" };
  }

  const { error } = await supabase
    .from("sales_proposal")
    .update({
      title: body.title.trim() || "Untitled proposal",
      proposal_body: body.proposal_body,
      status: body.status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/proposals");
  revalidatePath(`/proposals/${id}`);
  revalidatePath(`/proposals/new`);
  return { ok: true };
}

export async function saveSalesProposal(
  proposalId: string,
  body: {
    title: string;
    status: SalesProposalStatus;
    clientId: string | null;
    about_us: string;
    our_story: string;
    services_overview: string;
    closing_notes: string;
    proposal_body?: string;
    catalogLines: SalesCatalogLineInput[];
  }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const id = proposalId.trim();
  if (!id) return { error: "Missing id" };

  if (!STATUS_SET.has(body.status)) {
    return { error: "Invalid status" };
  }

  const cid = body.clientId?.trim() || null;

  const updatePayload: Record<string, unknown> = {
    title: body.title.trim() || "Untitled",
    status: body.status,
    about_us: body.about_us,
    our_story: body.our_story,
    services_overview: body.services_overview,
    closing_notes: body.closing_notes,
    updated_at: new Date().toISOString(),
  };

  if (cid) {
    updatePayload.client_id = cid;
    updatePayload.lead_id = null;
  } else {
    updatePayload.client_id = null;
  }
  if (body.proposal_body !== undefined) {
    updatePayload.proposal_body = body.proposal_body;
  }

  const { error: upErr } = await supabase
    .from("sales_proposal")
    .update(updatePayload)
    .eq("id", id);

  if (upErr) return { error: upErr.message };

  await supabase
    .from("sales_proposal_catalog_line")
    .delete()
    .eq("sales_proposal_id", id);

  const rows = body.catalogLines.map((li, i) => ({
    sales_proposal_id: id,
    catalog_item_id: li.catalog_item_id?.trim() || null,
    description_snapshot: li.description_snapshot.trim(),
    unit_price_snapshot: Math.max(0, li.unit_price_snapshot),
    sort_order: i,
  }));

  if (rows.length > 0) {
    const { error: liErr } = await supabase
      .from("sales_proposal_catalog_line")
      .insert(rows);
    if (liErr) return { error: liErr.message };
  }

  revalidatePath("/proposals");
  revalidatePath(`/proposals/${id}`);
  return { ok: true };
}

export async function sendSalesProposalEmail(proposalId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const id = proposalId.trim();
  if (!id) return { error: "Missing proposal id" };

  const creds = await getAgencySendGridCredentials();
  if (!creds) {
    return {
      error:
        "SendGrid is not configured. Add your SendGrid API key and verified sender in Settings → Integrations → SendGrid.",
    };
  }

  const built = await buildSalesProposalPdfForDelivery({ supabase, proposalId: id });
  if (!built.ok) return { error: built.error };
  if (!built.recipientEmail?.trim()) {
    return {
      error: "The linked lead/client does not have an email address.",
    };
  }

  const subject = `${built.title || "Proposal"} from Zenpho`;
  let linkUrl: string | null = null;
  const attachments =
    built.bytes.length <= SENDGRID_PROPOSAL_ATTACHMENT_MAX_BYTES
      ? [
          {
            contentBase64: built.bytes.toString("base64"),
            filename: built.filename,
            type: "application/pdf",
            disposition: "attachment" as const,
          },
        ]
      : undefined;

  if (!attachments) {
    const signed = await createProposalPdfSignedLink({
      proposalId: id,
      filename: built.filename,
      bytes: built.bytes,
    });
    if (!signed.ok) return { error: signed.error };
    linkUrl = signed.url;
  }

  const greeting = built.buyerName?.trim()
    ? `Hi ${built.buyerName.trim()},`
    : "Hi,";
  const text =
    `${greeting}\n\n` +
    `Attached is the proposal we prepared for you.` +
    (linkUrl ? `\n\nDownload the proposal here: ${linkUrl}` : "") +
    `\n\nBest,\nZenpho`;

  const html =
    `<p>${escapeHtml(greeting)}</p>` +
    `<p>Attached is the proposal we prepared for you.</p>` +
    (linkUrl
      ? `<p><a href="${escapeHtml(linkUrl)}">Download the proposal PDF</a></p>`
      : "") +
    `<p>Best,<br/>Zenpho</p>`;

  const sent = await sendSendGridMail({
    apiKey: creds.apiKey,
    to: built.recipientEmail.trim(),
    from: { email: creds.fromEmail, name: creds.fromName },
    replyTo: creds.replyTo,
    subject,
    text,
    html,
    attachments,
  });

  if (!sent.ok) return { error: sent.error };

  const { error: updateErr } = await supabase
    .from("sales_proposal")
    .update({
      status: "sent",
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (updateErr) return { error: updateErr.message };

  revalidatePath("/proposals");
  revalidatePath(`/proposals/${id}`);
  revalidatePath(`/proposals/new`);
  return { ok: true as const };
}

export async function deleteSalesProposal(proposalId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const id = proposalId.trim();
  if (!id) return { error: "Missing id" };

  const { error } = await supabase.from("sales_proposal").delete().eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/proposals");
  revalidatePath(`/proposals/new`);
  return { ok: true };
}
