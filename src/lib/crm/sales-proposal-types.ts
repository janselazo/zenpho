export const SALES_PROPOSAL_STATUSES = [
  "draft",
  "generated",
  "final",
  "sent",
] as const;
export type SalesProposalStatus = (typeof SALES_PROPOSAL_STATUSES)[number];

export function parseSalesProposalStatus(
  raw: string | null | undefined
): SalesProposalStatus {
  const s = (raw ?? "draft").trim().toLowerCase();
  return (SALES_PROPOSAL_STATUSES as readonly string[]).includes(s)
    ? (s as SalesProposalStatus)
    : "draft";
}

export function salesProposalStatusLabel(status: SalesProposalStatus): string {
  switch (status) {
    case "draft":
      return "Draft";
    case "generated":
      return "Generated";
    case "final":
      return "Final";
    case "sent":
      return "Sent";
    default:
      return status;
  }
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
  /** Effective line price (promotional when discounted). */
  unit_price_snapshot: number;
  /** Original list price when a discount applies; null otherwise. */
  list_unit_price_snapshot: number | null;
  sort_order: number;
};

import type { PlacesSearchPlace } from "@/lib/crm/places-types";
import type { SalesProposalStrategySpec } from "@/lib/crm/sales-proposal-llm";

export type SalesProposalAiVisualRow = {
  path: string;
  caption: string;
};

/** CRM snapshot for the linked sales-proposal party (lead or client). */
export type SalesProposalPartyContact = {
  name: string;
  email: string | null;
  company: string | null;
  phone: string | null;
  notes: string | null;
};

export type SalesProposalDetail = {
  id: string;
  /** When set, proposal targets an open CRM lead (see proposal wizard picker). */
  leadId: string | null;
  clientId: string | null;
  clientName: string | null;
  /** Joined CRM fields for the linked lead or client (wizard sidebar + legacy rows). */
  partyContact: SalesProposalPartyContact | null;
  title: string;
  status: SalesProposalStatus;
  /** Markdown / plain document from Proposal Generation wizard. */
  proposal_body: string;
  /** Optional Google Places snapshot powering listing categories, photos, and website-derived branding scrape. */
  google_place_snapshot: PlacesSearchPlace | null;
  selected_catalog_item_ids: string[];
  wizard_notes: string;
  total_price_estimate: number | null;
  /** Layer-1 strategy JSON last run (may be null for legacy rows). */
  strategy: SalesProposalStrategySpec | null;
  /** Stored Supabase Storage paths (+ captions) for AI illustrations. */
  ai_visuals: SalesProposalAiVisualRow[];
  about_us: string;
  our_story: string;
  services_overview: string;
  closing_notes: string;
  catalogLines: SalesProposalCatalogLineRow[];
  updatedAt: string;
  /** Storage path under prospect-attachments for PDF signature stamp. */
  signature_image_path: string | null;
  signature_signer_name: string | null;
  signature_signed_at: string | null;
};
