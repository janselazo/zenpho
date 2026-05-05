"use server";

import { revalidatePath } from "next/cache";
import { ensureClientIdForProposalFromLead } from "@/app/(crm)/actions/crm";
import { createClient } from "@/lib/supabase/server";
import {
  PROPOSAL_STATUSES,
  type ProposalStatus,
  parseProposalStatus,
} from "@/lib/crm/proposal-types";

const STATUS_SET = new Set<string>(PROPOSAL_STATUSES);

/** PostgREST when tables or RPC are missing from the remote DB. */
function humanizeProposalDbError(message: string): string {
  const m = message.toLowerCase();
  const looksMissing =
    m.includes("schema cache") ||
    m.includes("does not exist") ||
    m.includes("pgrst202") ||
    m.includes("pgrst205");
  if (
    looksMissing &&
    (m.includes("proposal") ||
      m.includes("contract") ||
      m.includes("line_item") ||
      m.includes("accept_proposal"))
  ) {
    return (
      "Invoices are not set up on this database yet. In Supabase → SQL Editor, run the SQL in " +
      "supabase/migrations/20260331120000_proposals_contracts.sql (or from the project folder run " +
      "`supabase link` then `supabase db push`)."
    );
  }
  return message;
}

export async function createProposal(clientId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const cid = clientId.trim();
  if (!cid) return { error: "Select a client" };

  const { data: client, error: clientErr } = await supabase
    .from("client")
    .select("id, name, email, company")
    .eq("id", cid)
    .maybeSingle();

  if (clientErr || !client) return { error: "Client not found" };

  const billing = {
    company: client.company?.trim() || "",
    email: client.email?.trim() || "",
  };

  const { data: row, error } = await supabase
    .from("proposal")
    .insert({
      client_id: cid,
      title: "New invoice",
      status: "draft",
      billing_snapshot: billing,
      agency_snapshot: {
        name: "Zenpho · Local Growth Platform",
      },
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error) return { error: humanizeProposalDbError(error.message) };

  const pid = row.id as string;
  const { error: lineErr } = await supabase.from("proposal_line_item").insert({
    proposal_id: pid,
    description: "",
    quantity: 1,
    unit_price: 0,
    sort_order: 0,
  });
  if (lineErr) return { error: humanizeProposalDbError(lineErr.message) };

  revalidatePath("/invoices");
  revalidatePath("/proposals"); // narrative module (optional)
  return { ok: true, id: pid };
}

/** Start a proposal from a lead. Reuses linked client when present; otherwise creates/links. */
export async function createProposalFromLead(leadId: string) {
  const ensured = await ensureClientIdForProposalFromLead(leadId);
  if ("error" in ensured) return ensured;
  return createProposal(ensured.clientId);
}

export type ProposalLineInput = {
  id?: string;
  description: string;
  quantity: number;
  unit_price: number;
  sort_order: number;
  catalog_item_id?: string | null;
};

export async function saveProposal(
  proposalId: string,
  input: {
    title: string;
    status: ProposalStatus;
    issuedAt: string;
    validUntil: string | null;
    discountAmount: number;
    notes: string | null;
    paymentInstructions: string | null;
    billing: Record<string, unknown>;
    agency: Record<string, unknown>;
    lineItems: ProposalLineInput[];
  }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const id = proposalId.trim();
  if (!id) return { error: "Missing invoice id" };

  if (!STATUS_SET.has(input.status)) {
    return { error: "Invalid status" };
  }

  const { data: existing } = await supabase
    .from("proposal")
    .select("status")
    .eq("id", id)
    .maybeSingle();

  if (!existing) return { error: "Invoice not found" };

  const current = parseProposalStatus(existing.status as string);
  if (current === "accepted") {
    return { error: "Accepted invoices cannot be edited" };
  }

  const discount =
    Number.isFinite(input.discountAmount) && input.discountAmount >= 0
      ? input.discountAmount
      : 0;

  const { error: upErr } = await supabase
    .from("proposal")
    .update({
      title: input.title.trim() || "Untitled",
      status: input.status,
      issued_at: input.issuedAt || new Date().toISOString().slice(0, 10),
      valid_until: input.validUntil?.trim() || null,
      discount_amount: discount,
      notes: input.notes?.trim() || null,
      payment_instructions: input.paymentInstructions?.trim() || null,
      billing_snapshot: input.billing,
      agency_snapshot: input.agency,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (upErr) return { error: humanizeProposalDbError(upErr.message) };

  await supabase.from("proposal_line_item").delete().eq("proposal_id", id);

  const rows = input.lineItems.map((li, i) => ({
    proposal_id: id,
    description: li.description.trim(),
    quantity: Math.max(0, li.quantity),
    unit_price: Math.max(0, li.unit_price),
    sort_order: li.sort_order ?? i,
    catalog_item_id: li.catalog_item_id?.trim() || null,
  }));

  if (rows.length > 0) {
    const { error: liErr } = await supabase
      .from("proposal_line_item")
      .insert(rows);
    if (liErr) return { error: humanizeProposalDbError(liErr.message) };
  }

  revalidatePath("/invoices");
  revalidatePath("/proposals"); // narrative module (optional)
  revalidatePath(`/invoices/${id}`);
  return { ok: true };
}

export async function updateProposalClient(
  proposalId: string,
  newClientId: string
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const pid = proposalId.trim();
  const cid = newClientId.trim();
  if (!pid || !cid) return { error: "Missing client or invoice" };

  const { data: proposal, error: pErr } = await supabase
    .from("proposal")
    .select("status, billing_snapshot")
    .eq("id", pid)
    .maybeSingle();

  if (pErr || !proposal) return { error: "Invoice not found" };
  if (parseProposalStatus(proposal.status as string) === "accepted") {
    return { error: "Cannot change client on an accepted invoice" };
  }

  const { data: client, error: cErr } = await supabase
    .from("client")
    .select("id, name, email, company")
    .eq("id", cid)
    .maybeSingle();

  if (cErr || !client) return { error: "Client not found" };

  const prev =
    proposal.billing_snapshot &&
    typeof proposal.billing_snapshot === "object" &&
    !Array.isArray(proposal.billing_snapshot)
      ? (proposal.billing_snapshot as Record<string, unknown>)
      : {};

  const billing_snapshot = {
    ...prev,
    company:
      client.company?.trim() ||
      client.name?.trim() ||
      (typeof prev.company === "string" ? prev.company : ""),
    email: client.email?.trim() || "",
  };

  const { error } = await supabase
    .from("proposal")
    .update({
      client_id: cid,
      billing_snapshot,
      updated_at: new Date().toISOString(),
    })
    .eq("id", pid);

  if (error) return { error: humanizeProposalDbError(error.message) };

  revalidatePath("/invoices");
  revalidatePath("/proposals"); // narrative module (optional)
  revalidatePath(`/invoices/${pid}`);
  return { ok: true };
}

export async function deleteProposal(proposalId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const id = proposalId.trim();
  if (!id) return { error: "Missing id" };

  const { data: existing } = await supabase
    .from("proposal")
    .select("status")
    .eq("id", id)
    .maybeSingle();

  if (!existing) return { error: "Not found" };
  if (parseProposalStatus(existing.status as string) === "accepted") {
    return { error: "Cannot delete an accepted invoice" };
  }

  const { error } = await supabase.from("proposal").delete().eq("id", id);
  if (error) return { error: humanizeProposalDbError(error.message) };

  revalidatePath("/invoices");
  revalidatePath("/proposals"); // narrative module (optional)
  return { ok: true };
}

export async function acceptProposal(proposalId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const id = proposalId.trim();
  if (!id) return { error: "Missing id" };

  const { data: contractId, error } = await supabase.rpc("accept_proposal", {
    p_proposal_id: id,
  });

  if (error) {
    const msg = error.message || "Could not accept proposal";
    if (msg.includes("invalid_status")) {
      return { error: "Only draft, sent, or pending invoices can be accepted" };
    }
    if (msg.includes("forbidden")) return { error: "Unauthorized" };
    if (msg.includes("not_found")) return { error: "Invoice not found" };
    return { error: humanizeProposalDbError(msg) };
  }

  const cid = contractId as string | null;
  revalidatePath("/invoices");
  revalidatePath("/proposals"); // narrative module (optional)
  revalidatePath(`/invoices/${id}`);
  if (cid) {
    revalidatePath(`/contracts/${cid}`);
    revalidatePath(`/invoices/agreements/${cid}`);
    revalidatePath("/invoices/agreements");
  }

  return { ok: true, contractId: cid };
}
