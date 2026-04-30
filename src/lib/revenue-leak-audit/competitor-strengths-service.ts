import type {
  BusinessProfile,
  BusinessReview,
  Competitor,
  CompetitorStrengthsInsight,
  CompetitorStrengthTheme,
} from "./types";

type ThemeDefinition = {
  theme: string;
  label: string;
  patterns: RegExp[];
  recommendation: string;
};

const THEME_DEFINITIONS: ThemeDefinition[] = [
  {
    theme: "speed",
    label: "Speed & responsiveness",
    patterns: [
      /\b(fast|quick|quickly|prompt|prompts?|same[-\s]?day|on[-\s]?time|right away|within (?:an?\s+)?hour|emergency|24\/?7|after[-\s]?hours)\b/i,
      /\bresponded? (?:fast|quickly|right away)/i,
      /\b(?:showed up|arrived) (?:on time|early|fast|quickly)\b/i,
    ],
    recommendation:
      "Lead with a response-time guarantee on the website (e.g. \"Reply within 30 minutes\" or \"Same-day service\") and follow through with SMS/auto-text on every inbound lead.",
  },
  {
    theme: "communication",
    label: "Communication & transparency",
    patterns: [
      /\b(communic\w+|kept (?:me|us) (?:informed|posted|updated)|explained|walked (?:me|us) through|easy to (?:reach|talk)|clear|transparent)\b/i,
      /\b(answered (?:all )?(?:my|our) questions|return(?:ed|s)? (?:my|our) calls?|texted? (?:me|us) updates?)\b/i,
    ],
    recommendation:
      "Add scripted update touchpoints: confirm the appointment, text on the way, send a recap with photos after the job.",
  },
  {
    theme: "pricing",
    label: "Pricing & value",
    patterns: [
      /\b(affordable|fair price|reasonable price|reasonably priced|honest price|transparent (?:price|pricing)|great value|worth (?:every|the) (?:penny|price))\b/i,
      /\b(saved (?:me|us) money|came in under (?:the )?(?:quote|estimate))\b/i,
    ],
    recommendation:
      "Publish transparent pricing or a \"Fair-Price Guarantee\" on the website, plus a written estimate before any work begins.",
  },
  {
    theme: "quality",
    label: "Quality of work",
    patterns: [
      /\b(quality|thorough|meticul\w+|attention to detail|craftsm\w+|well[-\s]?done|excellent work|great job|amazing job|top[-\s]?notch|perfect)\b/i,
    ],
    recommendation:
      "Showcase a before/after gallery and 3–5 detailed case studies with measurable outcomes on the most-visited service pages.",
  },
  {
    theme: "professionalism",
    label: "Professionalism",
    patterns: [
      /\b(professional|courteous|respectful|polite|knowledgeable|skilled|expert|expertise|experienced|licensed|insured)\b/i,
      /\b(in uniform|wore (?:masks?|booties|shoe covers))\b/i,
    ],
    recommendation:
      "Show licensing, insurance, certifications, and team photos on the homepage so the trust signals match what shoppers read in reviews.",
  },
  {
    theme: "cleanliness",
    label: "Cleanliness & care for the home",
    patterns: [
      /\b(clean(?:ed)? up|tidy|left (?:it|the (?:place|house|yard)) (?:clean|cleaner|spotless)|spotless|no mess)\b/i,
      /\b(shoe covers?|drop cloth(?:s|es)?|protected (?:my|our) (?:floor|carpet|home))\b/i,
    ],
    recommendation:
      "Promote a clean-jobsite policy (drop cloths, shoe covers, end-of-day clean-up) and call it out in the hero copy and review-request scripts.",
  },
  {
    theme: "reliability",
    label: "Reliability & follow-through",
    patterns: [
      /\b(reliab\w+|trust\w+|dependab\w+|stood (?:behind|by) (?:their|his|her) work|honored|kept (?:their|his|her) word|showed up when)\b/i,
      /\b(no[-\s]?show|never showed|never returned)\b/i,
    ],
    recommendation:
      "Add a written on-time / show-up guarantee with a make-good (e.g. \"$50 off if we're more than 15 min late\").",
  },
  {
    theme: "warranty",
    label: "Warranty & guarantees",
    patterns: [
      /\b(warrant\w+|guarantee\w+|stand behind (?:their|his|her) work|fixed (?:it|the issue) for free|no charge to come back)\b/i,
    ],
    recommendation:
      "Publish a clear written workmanship warranty / satisfaction guarantee and link it from the hero CTA.",
  },
  {
    theme: "friendliness",
    label: "Friendliness",
    patterns: [
      /\b(friendly|kind|nice|pleasant|great personality|easy to (?:work with|talk to))\b/i,
    ],
    recommendation:
      "Train the team on a 60-second \"first-impression\" script and include candid team photos / first-name intros on the website.",
  },
  {
    theme: "bilingual",
    label: "Bilingual / Spanish-speaking service",
    patterns: [
      /\b(bilingual|spanish[-\s]?speaking|hablan? espa(?:ñ|n)ol|en espa(?:ñ|n)ol|habla espa(?:ñ|n)ol)\b/i,
    ],
    recommendation:
      "If the team is bilingual, add a Spanish-language landing page, a \"Hablamos Español\" badge, and surface the option on the GBP profile and ads.",
  },
  {
    theme: "local",
    label: "Locally owned / family operated",
    patterns: [
      /\b(family[-\s]?(?:owned|operated|run)|local(?:ly)? (?:owned|operated)|small business|veteran[-\s]?owned|woman[-\s]?owned)\b/i,
    ],
    recommendation:
      "Lean into the locally-owned story: founder photo, the year founded, and a \"Why local matters\" section on the homepage.",
  },
];

const STOP_WORDS = new Set([
  "the",
  "and",
  "for",
  "you",
  "they",
  "with",
  "that",
  "this",
  "have",
  "are",
  "was",
  "were",
  "but",
  "not",
  "very",
  "just",
  "from",
  "their",
  "our",
  "his",
  "her",
  "all",
  "any",
  "had",
  "has",
  "did",
  "your",
  "what",
  "when",
  "would",
  "could",
  "about",
]);

function reviewCorpus(reviews: BusinessReview[] | undefined): string {
  if (!reviews || reviews.length === 0) return "";
  return reviews
    .map((r) => r.text)
    .filter((t): t is string => typeof t === "string" && t.length > 0)
    .join("\n");
}

function countMatches(corpus: string, patterns: RegExp[]): number {
  if (!corpus) return 0;
  let total = 0;
  for (const pattern of patterns) {
    const re = new RegExp(pattern.source, pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`);
    const matches = corpus.match(re);
    if (matches) total += matches.length;
  }
  return total;
}

function exampleQuote(reviews: BusinessReview[] | undefined, patterns: RegExp[]): string | null {
  if (!reviews) return null;
  for (const review of reviews) {
    if (!review.text) continue;
    if (patterns.some((p) => p.test(review.text!))) {
      return review.text.replace(/\s+/g, " ").trim().slice(0, 220);
    }
  }
  return null;
}

function topUnusedTheme(themes: CompetitorStrengthTheme[]): CompetitorStrengthTheme | null {
  const candidates = themes
    .filter((t) => t.competitorMentions >= 2 && t.competitorMentions > t.ownMentions * 1.5)
    .sort(
      (a, b) =>
        b.competitorMentions - a.competitorMentions ||
        a.ownMentions - b.ownMentions
    );
  return candidates[0] ?? null;
}

export function analyzeCompetitorStrengths(
  business: BusinessProfile,
  competitors: Competitor[]
): CompetitorStrengthsInsight {
  const top = competitors.slice(0, 3).filter((c) => c.reviews && c.reviews.length > 0);
  const ownCorpus = reviewCorpus(business.reviews);

  const themes: CompetitorStrengthTheme[] = THEME_DEFINITIONS.map((def) => {
    let competitorMentions = 0;
    const praised = new Set<string>();
    let example: string | null = null;
    for (const competitor of top) {
      const corpus = reviewCorpus(competitor.reviews);
      const hits = countMatches(corpus, def.patterns);
      if (hits > 0) {
        competitorMentions += hits;
        praised.add(competitor.name);
        if (!example) example = exampleQuote(competitor.reviews, def.patterns);
      }
    }
    return {
      theme: def.theme,
      label: def.label,
      competitorMentions,
      ownMentions: countMatches(ownCorpus, def.patterns),
      praisedCompetitors: Array.from(praised),
      exampleQuote: example,
    };
  });

  const ranked = themes
    .filter((t) => t.competitorMentions > 0)
    .sort((a, b) => b.competitorMentions - a.competitorMentions);

  const topGap = topUnusedTheme(themes);

  const warnings: string[] = [];
  if (top.length === 0) {
    warnings.push("Competitor reviews were unavailable for this market sample, so the strength comparison is limited.");
  }

  let summary: string;
  let recommendation: string;
  if (top.length === 0) {
    summary = "We could not pull review text for top competitors in this market, so the public praise comparison is unavailable.";
    recommendation = "Re-run the audit when Google returns review samples for the top three competitors to surface a precise strength comparison.";
  } else if (topGap) {
    const names = topGap.praisedCompetitors.slice(0, 3);
    const competitorList = names.join(", ");
    const ownNote =
      topGap.ownMentions === 0
        ? "this theme is essentially missing from your own public reviews"
        : `your own reviews mention it ~${topGap.ownMentions}x compared to ~${topGap.competitorMentions}x for competitors`;
    const summarySuffix = `) are repeatedly praised for ${topGap.label.toLowerCase()} — ${ownNote}.`;
    summary = `Top competitors (${competitorList}${summarySuffix}`;
    const def = THEME_DEFINITIONS.find((d) => d.theme === topGap.theme);
    recommendation = def?.recommendation ?? "Match this competitor strength on the website and in the review-request script.";
    return {
      themes: ranked,
      topGap,
      summary,
      summaryPrefix: "Top competitors (",
      summaryCompetitorNames: names,
      summarySuffix,
      recommendation,
      warnings,
    };
  } else if (ranked.length > 0) {
    const top3 = ranked.slice(0, 3).map((t) => t.label.toLowerCase()).join(", ");
    summary = `Top competitors are most often praised for ${top3}, and your own reviews already cover those themes.`;
    recommendation = "Hold the line on the praised themes and double down on the next highest gap as it appears.";
  } else {
    summary = "Top competitors do not show a clear public praise theme above your own.";
    recommendation = "Keep the current positioning and prioritize the other Revenue Leak Audit findings first.";
  }

  return {
    themes: ranked,
    topGap,
    summary,
    recommendation,
    warnings,
  };
}
