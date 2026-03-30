/** Row shape for the Clients CRM table (server + client). */
export type ClientTableRow = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  notes: string | null;
  created_at: string | null;
  /** Most recent lead that converted to this client, if any */
  linkedLead: {
    id: string;
    name: string | null;
    email: string | null;
    company: string | null;
    /** Same `lead.source` as on the Leads table */
    source: string | null;
  } | null;
  /** Latest non-empty deal title for the linked lead (by deal.updated_at) */
  dealName: string | null;
};
