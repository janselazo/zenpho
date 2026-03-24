/** Prefill payload when creating a project from a deal (Supabase). */
export type NewProjectDealPrefill = {
  clientId: string | null;
  title: string;
  budget: string;
  website: string;
  projectType: string | null;
  missingClientNote: boolean;
};
