/**
 * Signal mapping + Fit Score for Tech Startup rows returned by Apollo.
 *
 * `signalsFromTechStartup` plugs into the existing heuristic report (`buildMarketIntelReport`).
 * `computeTechFitScore` returns a 0..100 score with a breakdown, tuned for "replace a no-code
 * landing page / build the MVP" outreach.
 */

import type { IntelSignals } from "@/lib/crm/prospect-intel-report";
import type { TechStartupOrgRow } from "@/lib/crm/prospect-enrichment-types";
import type { StackFingerprint, StackKind } from "@/lib/crm/tech-stack-fingerprint";

export type FitTier = "hot" | "warm" | "cold";

export type FitScoreBreakdownItem = {
  label: string;
  points: number;
};

export type TechFitScore = {
  score: number;
  breakdown: FitScoreBreakdownItem[];
  tier: FitTier;
};

export function tierFromScore(score: number): FitTier {
  if (score >= 65) return "hot";
  if (score >= 40) return "warm";
  return "cold";
}

/**
 * Map Apollo org row + stack fingerprint onto the shared IntelSignals shape so the
 * existing `buildMarketIntelReport` pipeline can render highlights for tech startups.
 *
 * We overload `placeTypes` with funding / stack tokens so the rule-based report can
 * still add context-sensitive bullets without needing a parallel report builder.
 */
export function signalsFromTechStartup(
  org: TechStartupOrgRow,
  fingerprint?: StackFingerprint | null
): IntelSignals {
  const hasWebsite = Boolean(org.websiteUrl || org.domain);
  const website = org.websiteUrl ?? (org.domain ? `https://${org.domain}` : null);
  let https: boolean | undefined;
  if (website) {
    try {
      https = new URL(website).protocol === "https:";
    } catch {
      https = undefined;
    }
  }

  const placeTypes: string[] = [];
  if (org.industry) placeTypes.push(org.industry.toLowerCase().replace(/\s+/g, "_"));
  for (const tag of org.industryTags) {
    placeTypes.push(tag.toLowerCase().replace(/\s+/g, "_"));
  }
  if (fingerprint?.kind && fingerprint.kind !== "unknown") {
    placeTypes.push(`stack_${fingerprint.kind}`);
  }
  if (org.latestFundingStage) {
    placeTypes.push(`funding_${org.latestFundingStage.toLowerCase()}`);
  }

  const addressParts = [org.city, org.state, org.country].filter(Boolean).join(", ");

  return {
    name: org.name,
    hasWebsite,
    websiteUrl: website,
    https,
    pageTitle: org.shortDescription ?? null,
    metaDescription: org.shortDescription ?? null,
    rating: null,
    reviewCount: null,
    placeTypes,
    formattedAddress: addressParts || null,
  };
}

function yearsAgo(year: number | null): number | null {
  if (!year || !Number.isFinite(year)) return null;
  const now = new Date().getUTCFullYear();
  return now - year;
}

function monthsSinceIso(iso: string | null): number | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return null;
  const diffMs = Date.now() - t;
  return diffMs / (1000 * 60 * 60 * 24 * 30.44);
}

function fundingStageLabel(stage: string | null): string | null {
  if (!stage) return null;
  return stage
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

const EARLY_FUNDING_STAGES: ReadonlySet<string> = new Set([
  "seed",
  "pre_seed",
  "pre-seed",
  "angel",
  "series_a",
  "series a",
]);

function isEarlyFundingStage(stage: string | null): boolean {
  if (!stage) return false;
  return EARLY_FUNDING_STAGES.has(stage.toLowerCase().trim());
}

/**
 * Weighted fit score for "build them a custom web app" outreach.
 *
 * Weights are a first pass — tune here, not in UI.
 */
export function computeTechFitScore(
  org: TechStartupOrgRow,
  fingerprint?: StackFingerprint | null
): TechFitScore {
  const breakdown: FitScoreBreakdownItem[] = [];

  if (fingerprint?.isNoCode) {
    breakdown.push({
      label: `No-code landing page (${fingerprint.kind})`,
      points: 40,
    });
  }

  const age = yearsAgo(org.foundedYear);
  const smallTeam = org.employeeCount != null && org.employeeCount <= 10;
  if (smallTeam) {
    breakdown.push({
      label: `Small team (${org.employeeCount ?? "?"} employees)`,
      points: 15,
    });
  }
  if (age != null && age <= 2) {
    breakdown.push({
      label: `Recently founded (${age === 0 ? "this year" : `${age} yr ago`})`,
      points: 10,
    });
  }

  const months = monthsSinceIso(org.latestFundedAt);
  if (months != null && months <= 12) {
    breakdown.push({
      label: `Funded in the last ${Math.max(1, Math.round(months))} mo`,
      points: 15,
    });
  } else if (isEarlyFundingStage(org.latestFundingStage)) {
    breakdown.push({
      label: `Early funding stage (${fundingStageLabel(org.latestFundingStage) ?? "seed"})`,
      points: 10,
    });
  }

  if (org.openJobsCount != null && org.openJobsCount > 0) {
    breakdown.push({
      label: `Hiring (${org.openJobsCount} open ${
        org.openJobsCount === 1 ? "role" : "roles"
      })`,
      points: 10,
    });
  }

  const score = Math.min(
    100,
    breakdown.reduce((sum, b) => sum + b.points, 0)
  );

  return { score, breakdown, tier: tierFromScore(score) };
}

export const STACK_KIND_PILL_COLOR: Record<StackKind, string> = {
  framer: "bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-300",
  webflow: "bg-indigo-100 text-indigo-800 dark:bg-indigo-500/15 dark:text-indigo-300",
  carrd: "bg-pink-100 text-pink-800 dark:bg-pink-500/15 dark:text-pink-300",
  wix: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
  squarespace: "bg-zinc-100 text-zinc-800 dark:bg-zinc-500/15 dark:text-zinc-300",
  bubble: "bg-purple-100 text-purple-800 dark:bg-purple-500/15 dark:text-purple-300",
  notion: "bg-stone-100 text-stone-800 dark:bg-stone-500/15 dark:text-stone-300",
  wordpress: "bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-300",
  custom: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300",
  unknown: "bg-zinc-100 text-zinc-600 dark:bg-zinc-700/40 dark:text-zinc-400",
};

export const TIER_PILL_COLOR: Record<FitTier, string> = {
  hot: "bg-rose-100 text-rose-800 dark:bg-rose-500/15 dark:text-rose-300",
  warm: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
  cold: "bg-zinc-100 text-zinc-600 dark:bg-zinc-700/40 dark:text-zinc-400",
};
