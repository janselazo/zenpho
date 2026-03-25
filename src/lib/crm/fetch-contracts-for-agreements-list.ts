import { createClient } from "@/lib/supabase/server";
import {
  type ContractStatus,
  parseContractStatus,
} from "@/lib/crm/proposal-types";

function lineTotal(q: number, p: number): number {
  return Math.round(q * p * 100) / 100;
}

export type AgreementListRow = {
  contractId: string;
  proposalId: string;
  proposalNumber: number;
  title: string;
  clientName: string;
  status: ContractStatus;
  total: number;
  updatedAt: string;
};

export async function fetchContractsForAgreementsList(): Promise<
  AgreementListRow[]
> {
  const supabase = await createClient();
  const { data: contracts, error } = await supabase
    .from("contract")
    .select("id, proposal_id, status, updated_at")
    .order("updated_at", { ascending: false })
    .limit(500);

  if (error || !contracts?.length) return [];

  const proposalIds = [...new Set(contracts.map((c) => c.proposal_id as string))];

  const { data: proposals } = await supabase
    .from("proposal")
    .select("id, client_id, title, proposal_number, discount_amount")
    .in("id", proposalIds);

  if (!proposals?.length) return [];

  const clientIds = [...new Set(proposals.map((p) => p.client_id as string))];

  const [{ data: clients }, { data: lineItems }] = await Promise.all([
    supabase.from("client").select("id, name, email, company").in("id", clientIds),
    supabase
      .from("proposal_line_item")
      .select("proposal_id, quantity, unit_price")
      .in("proposal_id", proposalIds),
  ]);

  const clientById = new Map((clients ?? []).map((c) => [c.id, c]));
  const proposalById = new Map(proposals.map((p) => [p.id, p]));

  const subtotalByProposal = new Map<string, number>();
  for (const row of lineItems ?? []) {
    const pid = row.proposal_id as string;
    const q = Number(row.quantity) || 0;
    const up = Number(row.unit_price) || 0;
    subtotalByProposal.set(
      pid,
      (subtotalByProposal.get(pid) ?? 0) + lineTotal(q, up)
    );
  }

  const rows: AgreementListRow[] = [];

  for (const c of contracts) {
    const proposalId = c.proposal_id as string;
    const p = proposalById.get(proposalId);
    if (!p) continue;

    const client = clientById.get(p.client_id as string);
    const clientName =
      client?.name?.trim() ||
      client?.company?.trim() ||
      client?.email?.trim() ||
      "Client";

    const sub = subtotalByProposal.get(proposalId) ?? 0;
    const disc = Number(p.discount_amount) || 0;
    const total = Math.max(0, Math.round((sub - disc) * 100) / 100);

    rows.push({
      contractId: c.id as string,
      proposalId,
      proposalNumber: Number(p.proposal_number) || 0,
      title: (p.title as string)?.trim() || "Untitled",
      clientName,
      status: parseContractStatus(c.status as string),
      total,
      updatedAt: (c.updated_at as string) ?? "",
    });
  }

  return rows;
}
