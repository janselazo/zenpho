"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  SALES_PROPOSAL_STATUSES,
  type SalesProposalStatus,
} from "@/lib/crm/sales-proposal-types";
import { sanitizePlacesSearchPlace } from "@/lib/crm/places-google-shared";
import type { PlacesSearchPlace } from "@/lib/crm/places-types";

const STATUS_SET = new Set<string>(SALES_PROPOSAL_STATUSES);

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
    client_id: cid,
    about_us: body.about_us,
    our_story: body.our_story,
    services_overview: body.services_overview,
    closing_notes: body.closing_notes,
    updated_at: new Date().toISOString(),
  };
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
