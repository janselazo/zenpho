import { fetchCrmAccessContext } from "@/lib/crm/access-context";
import { fetchCurrentOrganizationId } from "@/lib/organization";
import { createClient } from "@/lib/supabase/server";
import type {
  SalesProposalDetail,
  SalesProposalPartyContact,
} from "@/lib/crm/sales-proposal-types";

/** Wizard party row: open CRM lead (`partyKind: lead`) or legacy client-linked draft snapshot. */
export type ProposalWizardPartyOption = {
  id: string;
  partyKind: "lead" | "client";
  name: string;
  email: string | null;
  company: string | null;
  phone: string | null;
  notes: string | null;
};

/**
 * All CRM leads — used where conversion may attach to a client (`/invoices/new`, etc.).
 */
export async function fetchLeadsForProposalPicker(): Promise<
  ProposalWizardPartyOption[]
> {
  const supabase = await createClient();
  const access = await fetchCrmAccessContext(supabase);
  const organizationId = access?.organizationId ?? (await fetchCurrentOrganizationId(supabase));
  if (!organizationId) return [];

  let query = supabase
    .from("lead")
    .select("id, name, email, company, phone, notes")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(400);
  if (access && !access.canViewAllOrgLeads) {
    query = query.eq("owner_id", access.userId);
  }

  const { data, error } = await query;

  if (error || !data) return [];

  return data.map(mapRowToWizardPartyLead);
}

/**
 * Narrative proposal wizard step 1: open leads only (not yet converted to a client).
 */
export async function fetchOpenLeadsForNarrativeProposalWizard(): Promise<
  ProposalWizardPartyOption[]
> {
  const supabase = await createClient();
  const access = await fetchCrmAccessContext(supabase);
  const organizationId = access?.organizationId ?? (await fetchCurrentOrganizationId(supabase));
  if (!organizationId) return [];

  let query = supabase
    .from("lead")
    .select("id, name, email, company, phone, notes")
    .eq("organization_id", organizationId)
    .is("converted_client_id", null)
    .order("created_at", { ascending: false })
    .limit(400);
  if (access && !access.canViewAllOrgLeads) {
    query = query.eq("owner_id", access.userId);
  }

  const { data, error } = await query;

  if (error || !data) return [];

  return data.map(mapRowToWizardPartyLead);
}

function mapRowToWizardPartyLead(row: Record<string, unknown>): ProposalWizardPartyOption {
  return {
    id: row.id as string,
    partyKind: "lead" as const,
    name:
      (row.name as string | null)?.trim() ||
      (row.company as string | null)?.trim() ||
      (row.email as string | null)?.trim() ||
      "Unnamed lead",
    email: (row.email as string | null) ?? null,
    company: (row.company as string | null) ?? null,
    phone:
      typeof row.phone === "string" ? row.phone.trim() || null : null,
    notes: typeof row.notes === "string" ? row.notes.trim() || null : null,
  };
}

function wizardPartyFromLegacyClient(
  id: string,
  contact: SalesProposalPartyContact,
): ProposalWizardPartyOption {
  return {
    id,
    partyKind: "client",
    name: contact.name,
    email: contact.email,
    company: contact.company,
    phone: contact.phone,
    notes: contact.notes,
  };
}

/** Prepend legacy client-linked draft so in-flight wizard rows stay selectable. */
export function mergeLegacyClientIntoProposalParties(
  leads: ProposalWizardPartyOption[],
  resume: SalesProposalDetail | null,
): ProposalWizardPartyOption[] {
  if (
    !resume?.clientId?.trim() ||
    resume.leadId?.trim() ||
    !resume.partyContact
  ) {
    return leads;
  }
  const cid = resume.clientId.trim();
  if (leads.some((l) => l.id === cid)) return leads;
  return [wizardPartyFromLegacyClient(cid, resume.partyContact), ...leads];
}
