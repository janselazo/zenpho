import { createClient } from "@/lib/supabase/server";
import {
  type AgencySnapshot,
  type BillingSnapshot,
  type ProposalDetail,
  type ProposalLineItemRow,
  parseProposalStatus,
} from "@/lib/crm/proposal-types";

function asBilling(raw: unknown): BillingSnapshot {
  if (!raw || typeof raw !== "object") return {};
  return raw as BillingSnapshot;
}

function asAgency(raw: unknown): AgencySnapshot {
  if (!raw || typeof raw !== "object") return {};
  return raw as AgencySnapshot;
}

export async function fetchProposalDetail(
  id: string
): Promise<ProposalDetail | null> {
  const supabase = await createClient();
  const { data: p, error } = await supabase
    .from("proposal")
    .select(
      "id, client_id, title, status, proposal_number, issued_at, valid_until, discount_amount, notes, payment_instructions, billing_snapshot, agency_snapshot, updated_at"
    )
    .eq("id", id)
    .maybeSingle();

  if (error || !p) return null;

  const clientId = p.client_id as string;
  const [{ data: client }, { data: lines }, { data: contract }] =
    await Promise.all([
      supabase
        .from("client")
        .select("id, name, email, company")
        .eq("id", clientId)
        .maybeSingle(),
      supabase
        .from("proposal_line_item")
        .select(
          "id, proposal_id, description, quantity, unit_price, line_total, sort_order, catalog_item_id"
        )
        .eq("proposal_id", id)
        .order("sort_order", { ascending: true }),
      supabase.from("contract").select("id").eq("proposal_id", id).maybeSingle(),
    ]);

  const lineItems: ProposalLineItemRow[] = (lines ?? []).map((row) => ({
    id: row.id as string,
    proposal_id: row.proposal_id as string,
    description: (row.description as string) ?? "",
    quantity: Number(row.quantity) || 0,
    unit_price: Number(row.unit_price) || 0,
    line_total:
      row.line_total != null ? Number(row.line_total) : undefined,
    sort_order: Number(row.sort_order) || 0,
    catalog_item_id: (row.catalog_item_id as string | null)?.trim() || null,
  }));

  const clientName =
    client?.name?.trim() ||
    client?.company?.trim() ||
    client?.email?.trim() ||
    "Client";

  return {
    id: p.id as string,
    clientId,
    clientName,
    clientEmail: client?.email ?? null,
    clientCompany: client?.company ?? null,
    title: (p.title as string)?.trim() || "Untitled",
    status: parseProposalStatus(p.status as string),
    proposalNumber: Number(p.proposal_number) || 0,
    issuedAt: p.issued_at ? String(p.issued_at).slice(0, 10) : "",
    validUntil: p.valid_until
      ? String(p.valid_until).slice(0, 10)
      : null,
    discountAmount: Number(p.discount_amount) || 0,
    notes: (p.notes as string) ?? null,
    paymentInstructions: (p.payment_instructions as string) ?? null,
    billing: asBilling(p.billing_snapshot),
    agency: asAgency(p.agency_snapshot),
    lineItems,
    contractId: (contract?.id as string) ?? null,
    updatedAt: (p.updated_at as string) ?? "",
  };
}
