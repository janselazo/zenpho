export const SALES_PROPOSAL_STATUSES = ["draft", "sent"] as const;
export type SalesProposalStatus =
  (typeof SALES_PROPOSAL_STATUSES)[number];

export function parseSalesProposalStatus(
  raw: string | null | undefined
): SalesProposalStatus {
  const s = (raw ?? "draft").trim().toLowerCase();
  return (SALES_PROPOSAL_STATUSES as readonly string[]).includes(s)
    ? (s as SalesProposalStatus)
    : "draft";
}

export type SalesProposalListRow = {
  id: string;
  title: string;
  status: SalesProposalStatus;
  clientName: string | null;
  updatedAt: string;
};

export type SalesProposalCatalogLineRow = {
  id: string;
  catalog_item_id: string | null;
  description_snapshot: string;
  unit_price_snapshot: number;
  sort_order: number;
};

export type SalesProposalDetail = {
  id: string;
  clientId: string | null;
  clientName: string | null;
  title: string;
  status: SalesProposalStatus;
  about_us: string;
  our_story: string;
  services_overview: string;
  closing_notes: string;
  catalogLines: SalesProposalCatalogLineRow[];
  updatedAt: string;
};
