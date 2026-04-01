/** Shared shapes for prospect website + vendor enrichment (client + server). */

export type PageContactHints = {
  pageLabel: string;
  url: string;
  emails: string[];
  phones: string[];
  founderName: string | null;
};

export type MergedWebsiteContacts = {
  byPage: PageContactHints[];
  emailsRanked: string[];
  phones: string[];
  founderName: string | null;
};

export type OutscraperPlaceRow = {
  name: string;
  address?: string;
  phone?: string;
  site?: string;
};

export type ApolloPersonRow = {
  name: string;
  email: string | null;
  phone: string | null;
  linkedinUrl: string | null;
  title: string | null;
  source: "apollo";
};

export type HunterEmailRow = {
  email: string;
  firstName?: string;
  lastName?: string;
  position?: string;
  confidence?: number;
  source: "hunter";
};
