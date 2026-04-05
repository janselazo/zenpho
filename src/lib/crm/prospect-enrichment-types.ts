/** Shared shapes for prospect website + vendor enrichment (client + server). */

/** Profile URLs discovered from public website HTML (href resolution). */
export type ProspectSocialUrls = {
  facebook: string | null;
  instagram: string | null;
  linkedin: string | null;
  twitter: string | null;
  tiktok: string | null;
};

export const EMPTY_PROSPECT_SOCIAL_URLS: ProspectSocialUrls = {
  facebook: null,
  instagram: null,
  linkedin: null,
  twitter: null,
  tiktok: null,
};

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
  /** Best-effort profile links merged across crawled pages. */
  socialUrls: ProspectSocialUrls;
};

export type OutscraperPlaceRow = {
  name: string;
  address?: string;
  phone?: string;
  site?: string;
};

/** Passed to `/people/match` with `id` for better disambiguation (Apollo recommends extra fields). */
export type ApolloPersonEnrichDescriptor = {
  id: string;
  firstName?: string | null;
  organizationName?: string | null;
};

/** Merged keyed by Apollo person id after `/people/match`. */
export type ApolloEnrichmentById = {
  email: string | null;
  phone: string | null;
  linkedinUrl: string | null;
  emailStatus: string | null;
  headline: string | null;
};

export type ApolloPersonRow = {
  /** Apollo person id from People Search — used for `/people/match` enrichment. */
  apolloPersonId: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  linkedinUrl: string | null;
  title: string | null;
  source: "apollo";
  /** Search: given name (also sent to People Enrichment). */
  firstName?: string | null;
  /** Search: employer display name from `organization.name`. */
  organizationName?: string | null;
  /** Search: Apollo indicates it has an email on file (search does not return the address). */
  hasEmail?: boolean | null;
  /** Search: e.g. `Yes` or `Maybe: please request direct dial…`. */
  hasDirectPhone?: string | null;
  lastRefreshedAt?: string | null;
  personCity?: string | null;
  personState?: string | null;
  personCountry?: string | null;
  /** Enrichment: `person.email_status` when present. */
  emailStatus?: string | null;
  /** Enrichment: Apollo headline when present. */
  headline?: string | null;
};

export type HunterEmailRow = {
  email: string;
  firstName?: string;
  lastName?: string;
  position?: string;
  confidence?: number;
  source: "hunter";
};
