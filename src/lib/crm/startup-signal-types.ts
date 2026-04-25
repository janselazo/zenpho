import type { FitTier, FitScoreBreakdownItem } from "@/lib/crm/prospect-intel-tech-signals";

export type StartupSignalSource =
  | "crunchbase"
  | "wellfound"
  | "product_hunt"
  | "techcrunch"
  | "reddit"
  | "x_twitter"
  | "linkedin_public"
  | "linkedin_activity"
  | "facebook_groups"
  | "indie_hackers";

export type StartupSignalChannel =
  | "funding"
  | "launches"
  | "social_intent"
  | "linkedin_activity";

export type StartupSignalStatus = "new" | "reviewed" | "lead_created" | "dismissed";

export type StartupSignalFitScore = {
  score: number;
  tier: FitTier;
  breakdown: FitScoreBreakdownItem[];
  intentKeys: string[];
};

export type StartupSignalHit = {
  source: StartupSignalSource;
  sourceLabel: string;
  channel: StartupSignalChannel;
  sourceItemId: string;
  title: string;
  excerpt: string | null;
  url: string;
  authorName: string | null;
  authorUrl: string | null;
  company: string | null;
  companyDomain: string | null;
  postedAt: string | null;
  detectedAt: string;
  rawPayload: Record<string, unknown>;
  fit: StartupSignalFitScore;
};

export type StartupSignalFilters = {
  channels?: StartupSignalChannel[];
  sources?: StartupSignalSource[];
  keywords?: string[];
  industries?: string[];
  locations?: string[];
  timeRange?: "day" | "week" | "month";
  limit?: number;
  persist?: boolean;
};

export type StartupSignalSearchWarning = {
  source: StartupSignalSource;
  message: string;
};

export type StartupSignalSearchResult = {
  hits: StartupSignalHit[];
  warnings: StartupSignalSearchWarning[];
};

export type StartupSignalAdapterContext = {
  filters: Required<Pick<StartupSignalFilters, "timeRange" | "limit">> &
    Omit<StartupSignalFilters, "timeRange" | "limit">;
  now: Date;
};

export type StartupSignalAdapterResult =
  | { ok: true; hits: Omit<StartupSignalHit, "fit" | "detectedAt">[]; warning?: string }
  | { ok: false; warning: string };
