/**
 * Intent-keyword presets and Fit Score for Reddit Communities posts.
 *
 * Designed to surface founders that explicitly want engineering help, just built
 * something on a no-code platform, or are actively shipping early versions — each
 * a strong hook for "replace your MVP with a custom web app" outreach.
 */

import type { RedditPost, RedditUserAbout } from "@/lib/integrations/reddit";
import {
  tierFromScore,
  type FitScoreBreakdownItem,
  type FitTier,
} from "@/lib/crm/prospect-intel-tech-signals";

export type IntentKey = "needs_dev" | "no_code_built" | "mvp_early" | "show_build";

export const INTENT_PRESETS: {
  key: IntentKey;
  label: string;
  description: string;
  pattern: RegExp;
}[] = [
  {
    key: "needs_dev",
    label: "Needs dev",
    description: "Posts explicitly hiring / looking for developer or technical co-founder.",
    pattern:
      /\blooking for (a )?(dev|developer|technical co[-\s]?founder|cto|engineer)|hiring (a )?dev|need (a )?(dev|developer|cto|technical co[-\s]?founder)/i,
  },
  {
    key: "no_code_built",
    label: "Built on no-code",
    description: "Authors who shipped their product on Framer / Webflow / Carrd / Bubble / Wix / Squarespace.",
    pattern:
      /built (it )?(with|on|using) (framer|webflow|carrd|bubble|wix|squarespace)|no[-\s]?code/i,
  },
  {
    key: "mvp_early",
    label: "MVP / early",
    description: "Founders shipping MVPs, prototypes, or v0s.",
    pattern: /\b(mvp|just shipped|just launched|building my first|prototype|v0|v0\.)/i,
  },
  {
    key: "show_build",
    label: "Show your build",
    description:
      "Announcement-style posts (Show HN-ish) — strong engagement signal for a recent launch.",
    pattern:
      /^(\[show\]|show\s*(hn|reddit)|i (just )?built|we (just )?built|finally launched|just launched)/i,
  },
];

const INTENT_BY_KEY: Record<IntentKey, RegExp> = Object.fromEntries(
  INTENT_PRESETS.map((p) => [p.key, p.pattern])
) as Record<IntentKey, RegExp>;

export function matchIntents(post: RedditPost): IntentKey[] {
  const haystack = `${post.title}\n${post.selftext}`;
  const matched: IntentKey[] = [];
  for (const { key, pattern } of INTENT_PRESETS) {
    if (pattern.test(haystack)) matched.push(key);
  }
  if (post.linkFlairText && /show/i.test(post.linkFlairText) && !matched.includes("show_build")) {
    matched.push("show_build");
  }
  return matched;
}

function hoursSinceUtc(epochSeconds: number): number {
  if (!epochSeconds) return Infinity;
  return (Date.now() / 1000 - epochSeconds) / 3600;
}

function authorHasUrl(about: RedditUserAbout | null | undefined): boolean {
  if (!about) return false;
  const desc = about.profileDescription ?? "";
  return /https?:\/\//i.test(desc);
}

export type RedditFitScore = {
  score: number;
  breakdown: FitScoreBreakdownItem[];
  tier: FitTier;
  intents: IntentKey[];
};

/**
 * First-pass scoring. Tune weights here; UI just renders what we return.
 */
export function computeRedditFitScore(
  post: RedditPost,
  about?: RedditUserAbout | null
): RedditFitScore {
  const intents = matchIntents(post);
  const breakdown: FitScoreBreakdownItem[] = [];

  if (intents.includes("needs_dev")) {
    breakdown.push({ label: "Actively looking for a dev", points: 30 });
  }
  if (intents.includes("no_code_built")) {
    breakdown.push({ label: "Built on a no-code platform", points: 20 });
  }
  if (intents.includes("mvp_early")) {
    breakdown.push({ label: "Shipping an early MVP", points: 10 });
  }
  if (intents.includes("show_build")) {
    breakdown.push({ label: "Announcing a recent build", points: 10 });
  }

  if (authorHasUrl(about)) {
    breakdown.push({ label: "Author profile links a site", points: 15 });
  } else if (post.externalUrls.length > 0) {
    breakdown.push({ label: "Post body links a site", points: 10 });
  }

  const hrs = hoursSinceUtc(post.createdUtc);
  if (hrs <= 24 * 7) {
    breakdown.push({ label: "Posted in the last 7 days", points: 15 });
  } else if (hrs <= 24 * 30) {
    breakdown.push({ label: "Posted in the last 30 days", points: 5 });
  }

  if (about?.totalKarma != null && about.totalKarma > 500) {
    breakdown.push({ label: "Author karma > 500", points: 10 });
  }

  if (post.score > 5 || post.numComments > 3) {
    breakdown.push({ label: "Post getting engagement", points: 10 });
  }

  const score = Math.min(
    100,
    breakdown.reduce((sum, b) => sum + b.points, 0)
  );
  return { score, breakdown, tier: tierFromScore(score), intents };
}

export function describeIntent(key: IntentKey): string {
  return INTENT_PRESETS.find((p) => p.key === key)?.label ?? key;
}

export function filterPatternForIntents(intents: IntentKey[]): RegExp | null {
  if (intents.length === 0) return null;
  const sources = intents
    .map((k) => INTENT_BY_KEY[k])
    .filter(Boolean)
    .map((r) => `(?:${r.source})`);
  if (sources.length === 0) return null;
  return new RegExp(sources.join("|"), "i");
}
