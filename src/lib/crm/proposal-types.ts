export const PROPOSAL_STATUSES = [
  "draft",
  "sent",
  "pending",
  "accepted",
  "declined",
  "expired",
] as const;

export type ProposalStatus = (typeof PROPOSAL_STATUSES)[number];

export const CONTRACT_STATUSES = ["draft", "sent", "signed"] as const;
export type ContractStatus = (typeof CONTRACT_STATUSES)[number];

/** Billing / "To" block stored on proposal (JSON). */
export type BillingSnapshot = {
  company?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  taxId?: string;
  email?: string;
};

/** Agency / "From" block stored on proposal (JSON). */
export type AgencySnapshot = {
  name?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  taxId?: string;
  email?: string;
};

export type ProposalLineItemRow = {
  id: string;
  proposal_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  line_total?: number;
  sort_order: number;
  /** Optional link to `crm_product_service`; snapshot stays in description/price. */
  catalog_item_id: string | null;
};

export type ProposalListRow = {
  id: string;
  clientId: string;
  clientName: string;
  title: string;
  status: ProposalStatus;
  proposalNumber: number;
  issuedAt: string;
  validUntil: string | null;
  total: number;
  discountAmount: number;
  updatedAt: string;
  contractId: string | null;
};

export type ProposalDetail = {
  id: string;
  clientId: string;
  clientName: string;
  clientEmail: string | null;
  clientCompany: string | null;
  title: string;
  status: ProposalStatus;
  proposalNumber: number;
  issuedAt: string;
  validUntil: string | null;
  discountAmount: number;
  notes: string | null;
  paymentInstructions: string | null;
  billing: BillingSnapshot;
  agency: AgencySnapshot;
  lineItems: ProposalLineItemRow[];
  contractId: string | null;
  /** Server `updated_at` — use as React `key` to reset local form after refresh. */
  updatedAt: string;
};

export type ContractDetail = {
  id: string;
  proposalId: string;
  status: ContractStatus;
  termsSnapshot: string | null;
  signedAt: string | null;
  signerName: string | null;
  proposalNumber: number;
  proposalTitle: string;
  clientName: string;
  total: number;
  issuedAt: string;
};

export function parseProposalStatus(raw: string | null | undefined): ProposalStatus {
  const s = (raw ?? "draft").trim().toLowerCase();
  if ((PROPOSAL_STATUSES as readonly string[]).includes(s)) {
    return s as ProposalStatus;
  }
  return "draft";
}

export function parseContractStatus(raw: string | null | undefined): ContractStatus {
  const s = (raw ?? "draft").trim().toLowerCase();
  if ((CONTRACT_STATUSES as readonly string[]).includes(s)) {
    return s as ContractStatus;
  }
  return "draft";
}

export function formatProposalId(num: number): string {
  return `PROP-${String(num).padStart(5, "0")}`;
}
