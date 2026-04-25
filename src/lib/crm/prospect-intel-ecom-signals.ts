/**
 * Fit Score for Ecom Brand rows returned by Apollo + the e-commerce platform fingerprint.
 *
 * Tuned for a "build them a custom/headless store or ecom growth web app" pitch:
 * verified Shopify/WooCommerce/Magento/BigCommerce stores score highest, with extra
 * weight on Shopify (top headless/Hydrogen upsell candidate).
 */

import type { TechStartupOrgRow } from "@/lib/crm/prospect-enrichment-types";
import type { EcomPlatform, EcomPlatformFingerprint } from "@/lib/crm/ecom-platform-fingerprint";
import {
  type FitTier,
  type TechFitScore,
  tierFromScore,
} from "@/lib/crm/prospect-intel-tech-signals";

export type { FitTier };

export type EcomFitScore = TechFitScore;

const ECOM_INDUSTRY_KEYWORDS = [
  "apparel",
  "fashion",
  "beauty",
  "cosmetic",
  "skincare",
  "consumer goods",
  "consumer electronics",
  "food",
  "beverage",
  "grocery",
  "home",
  "furniture",
  "decor",
  "jewelry",
  "accessories",
  "pet",
  "sport",
  "fitness",
  "wellness",
  "health",
  "supplement",
  "retail",
  "ecommerce",
  "e-commerce",
];

const EARLY_FUNDING_STAGES: ReadonlySet<string> = new Set([
  "seed",
  "pre_seed",
  "pre-seed",
  "angel",
  "series_a",
  "series a",
]);

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

function isEarlyFundingStage(stage: string | null): boolean {
  if (!stage) return false;
  return EARLY_FUNDING_STAGES.has(stage.toLowerCase().trim());
}

function platformLabel(p: EcomPlatform): string {
  switch (p) {
    case "shopify":
      return "Shopify";
    case "woocommerce":
      return "WooCommerce";
    case "magento":
      return "Magento";
    case "bigcommerce":
      return "BigCommerce";
    case "wix_stores":
      return "Wix Stores";
    case "squarespace_commerce":
      return "Squarespace Commerce";
    case "other":
      return "ecom signals";
    case "unknown":
      return "unknown platform";
  }
}

function looksLikeEcomIndustry(org: TechStartupOrgRow): boolean {
  const haystack = [
    org.industry ?? "",
    ...(org.industryTags ?? []),
    ...(org.technologies ?? []),
    org.shortDescription ?? "",
  ]
    .join(" ")
    .toLowerCase();
  if (!haystack) return false;
  return ECOM_INDUSTRY_KEYWORDS.some((kw) => haystack.includes(kw));
}

/**
 * Weighted fit score for "build them a custom/headless ecom store or growth web app" outreach.
 *
 * Weights are a first pass — tune here, not in the UI.
 */
export function computeEcomFitScore(
  org: TechStartupOrgRow,
  fingerprint?: EcomPlatformFingerprint | null
): EcomFitScore {
  const breakdown: { label: string; points: number }[] = [];

  if (fingerprint?.isVerifiedEcom) {
    breakdown.push({
      label: `Verified ecom platform (${platformLabel(fingerprint.platform)})`,
      points: 30,
    });
    if (fingerprint.platform === "shopify") {
      breakdown.push({
        label: "Shopify storefront (headless/Hydrogen upsell)",
        points: 10,
      });
    }
  } else if (fingerprint?.platform === "wix_stores" || fingerprint?.platform === "squarespace_commerce") {
    breakdown.push({
      label: `No-code ecom (${platformLabel(fingerprint.platform)})`,
      points: 20,
    });
  } else if (fingerprint?.platform === "other") {
    breakdown.push({ label: "Generic ecom signals on site", points: 10 });
  }

  if (org.employeeCount != null && org.employeeCount <= 20) {
    breakdown.push({
      label: `Small team (${org.employeeCount} employees)`,
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

  if (looksLikeEcomIndustry(org)) {
    breakdown.push({ label: "Ecom-friendly industry", points: 10 });
  }

  const age = yearsAgo(org.foundedYear);
  if (age != null && age <= 3) {
    breakdown.push({
      label: `Recently founded (${age === 0 ? "this year" : `${age} yr ago`})`,
      points: 5,
    });
  }

  const score = Math.min(
    100,
    breakdown.reduce((sum, b) => sum + b.points, 0)
  );

  return { score, breakdown, tier: tierFromScore(score) };
}
