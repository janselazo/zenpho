import { createClient } from "@/lib/supabase/server";
import {
  type ProposalListRow,
  type ProposalStatus,
  parseProposalStatus,
} from "@/lib/crm/proposal-types";
import { fetchCrmAccessContext } from "@/lib/crm/access-context";

function lineTotal(q: number, p: number): number {
  return Math.round(q * p * 100) / 100;
}

export type ProposalListKpis = {
  acceptedValue: number;
  acceptedCount: number;
  pendingCount: number;
  declinedCount: number;
};

export async function fetchProposalsForList(): Promise<{
  rows: ProposalListRow[];
  kpis: ProposalListKpis;
}> {
  const supabase = await createClient();
  const access = await fetchCrmAccessContext(supabase);
  let query = supabase
    .from("proposal")
    .select(
      "id, client_id, title, status, proposal_number, issued_at, valid_until, discount_amount, updated_at, owner_id, created_by"
    )
    .order("updated_at", { ascending: false })
    .limit(500);
  if (access && !access.canManageTeam) {
    query = query.or(`owner_id.eq.${access.userId},created_by.eq.${access.userId}`);
  }
  const { data: proposals, error } = await query;

  if (error || !proposals?.length) {
    return {
      rows: [],
      kpis: {
        acceptedValue: 0,
        acceptedCount: 0,
        pendingCount: 0,
        declinedCount: 0,
      },
    };
  }

  const clientIds = [...new Set(proposals.map((p) => p.client_id as string))];
  const proposalIds = proposals.map((p) => p.id as string);

  const [{ data: clients }, { data: lineItems }, { data: contracts }] =
    await Promise.all([
      supabase
        .from("client")
        .select("id, name, email, company")
        .in("id", clientIds),
      supabase
        .from("proposal_line_item")
        .select("proposal_id, quantity, unit_price")
        .in("proposal_id", proposalIds),
      supabase.from("contract").select("id, proposal_id").in("proposal_id", proposalIds),
    ]);

  const clientById = new Map((clients ?? []).map((c) => [c.id, c]));
  const contractByProposal = new Map(
    (contracts ?? []).map((c) => [c.proposal_id as string, c.id as string])
  );

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

  const rows: ProposalListRow[] = proposals.map((p) => {
    const cid = p.client_id as string;
    const client = clientById.get(cid);
    const sub = subtotalByProposal.get(p.id as string) ?? 0;
    const disc = Number(p.discount_amount) || 0;
    const total = Math.max(0, Math.round((sub - disc) * 100) / 100);
    const name =
      client?.name?.trim() ||
      client?.company?.trim() ||
      client?.email?.trim() ||
      "Client";
    const status = parseProposalStatus(p.status as string);
    return {
      id: p.id as string,
      clientId: cid,
      clientName: name,
      title: (p.title as string)?.trim() || "Untitled",
      status,
      proposalNumber: Number(p.proposal_number) || 0,
      issuedAt: p.issued_at
        ? String(p.issued_at).slice(0, 10)
        : "",
      validUntil: p.valid_until
        ? String(p.valid_until).slice(0, 10)
        : null,
      total,
      discountAmount: disc,
      updatedAt: (p.updated_at as string) ?? "",
      contractId: contractByProposal.get(p.id as string) ?? null,
    };
  });

  const kpis = computeKpis(rows);

  return { rows, kpis };
}

function computeKpis(rows: ProposalListRow[]): ProposalListKpis {
  let acceptedValue = 0;
  let acceptedCount = 0;
  let pendingCount = 0;
  let declinedCount = 0;

  for (const r of rows) {
    const st: ProposalStatus = r.status;
    if (st === "accepted") {
      acceptedValue += r.total;
      acceptedCount += 1;
    } else if (st === "sent" || st === "pending") {
      pendingCount += 1;
    } else if (st === "declined") {
      declinedCount += 1;
    }
  }

  return { acceptedValue, acceptedCount, pendingCount, declinedCount };
}
