/**
 * Synthetic BrandingSpec + parsers for narrative proposal PDFs (buyer palette + landscape brand-book layout).
 */

import type { BrandingFontPairingId } from "@/lib/crm/branding-font-pairings";
import {
  hasProspectBrandVisualCues,
  ZENPHO_PDF_ACCENT_HEX,
  ZENPHO_PDF_MUTED_HEX,
  ZENPHO_PDF_PAPER_HEX,
  ZENPHO_PDF_PRIMARY_HEX,
  ZENPHO_PDF_SURFACE_HEX,
} from "@/lib/crm/proposal-brand-cues";
import type { ResolvedBrandAssets } from "@/lib/crm/prospect-branding-asset-resolve";
import {
  stripMarkdownForProposalPdf,
} from "@/lib/crm/proposal-enrichment-context";
import type { BrandingSpec } from "@/lib/crm/prospect-branding-spec-llm";

/** Neutral fallback when a scrape yields no cues (Zenpho blues used instead elsewhere). */
const DEFAULT_PRIMARY = "#14532D";
const DEFAULT_ACCENT = "#2D6A4F";
const DEFAULT_NEUTRAL = "#F7F6F2";

function truncate(s: string, max: number): string {
  const t = s.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

function humanizePlaceType(t: string): string {
  return t
    .split("_")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/** One line for cover footer from Google place types. */
export function industryLineFromPlaceTypes(
  types: string[] | null | undefined,
): string {
  const skip = new Set(["point_of_interest", "establishment", "geocode"]);
  const picked = (types ?? []).filter((x) => !skip.has(x)).slice(0, 4);
  const s = picked.map(humanizePlaceType).join(" · ");
  return s || "Local business";
}

export function extractProposalTagline(
  markdownBody: string,
  proposalTitleFallback: string,
): string {
  const md = markdownBody.replace(/\r\n/g, "\n");
  const re = /\n##\s+Executive Summary\s*\n([\s\S]*?)(?=\n## |\n#[^#]|$)/i;
  const m = md.match(re);
  if (!m?.[1]) return truncate(proposalTitleFallback, 200);
  const flat = stripMarkdownForProposalPdf(m[1])
    .replace(/\n+/g, " ")
    .trim();
  const end = flat.search(/[.!?]\s/);
  const first =
    end > 80
      ? flat.slice(0, end + 1)
      : flat.slice(0, 280);
  return truncate(first || proposalTitleFallback, 320);
}

export type ProposalH2Section = { title: string; body: string };

/**
 * Split `##` sections from proposal markdown (images stripped for text flow).
 */
export function parseProposalH2Sections(markdownBody: string): ProposalH2Section[] {
  const md = stripMarkdownForProposalPdf(
    markdownBody.replace(/\r\n/g, "\n"),
  ).trim();
  if (!md) return [];

  const lines = md.split("\n");
  const out: ProposalH2Section[] = [];
  let curTitle: string | null = null;
  const curBody: string[] = [];

  const flush = () => {
    if (!curTitle) return;
    out.push({
      title: curTitle,
      body: curBody.join("\n").trim(),
    });
    curTitle = null;
    curBody.length = 0;
  };

  for (const line of lines) {
    const hm = /^##\s+(.+)$/.exec(line);
    if (hm) {
      flush();
      curTitle = hm[1].trim();
    } else if (curTitle) {
      curBody.push(line);
    }
  }
  flush();
  return out;
}

function paletteToBrandingColors(
  palette: string[],
): { name: string; hex: string }[] {
  return palette.slice(0, 6).map((hex, i) => ({
    name: i === 0 ? "Primary" : `Accent ${i}`,
    hex: hex.startsWith("#") ? hex.toUpperCase() : `#${hex}`.toUpperCase(),
  }));
}

/**
 * Build a BrandingSpec suitable for `buildContext` + brand-book fonts (proposal PDF only).
 */
export function buildSyntheticProposalBrandingSpec(input: {
  buyerDisplayName: string;
  proposalTitle: string;
  markdownBody: string;
  industryLine: string;
  brandAssets: ResolvedBrandAssets | null;
  fontPairingId?: BrandingFontPairingId;
}): BrandingSpec {
  const tagline = extractProposalTagline(
    input.markdownBody,
    input.proposalTitle,
  );
  const assets = input.brandAssets;
  const useZenphoFallback = !hasProspectBrandVisualCues(assets);

  const paletteHexes =
    assets?.palette?.length && !useZenphoFallback ? assets.palette : [];

  const primaryColors = paletteToBrandingColors(
    useZenphoFallback
      ? [
          ZENPHO_PDF_PRIMARY_HEX,
          ZENPHO_PDF_ACCENT_HEX,
          ZENPHO_PDF_MUTED_HEX,
        ]
      : paletteHexes.length
        ? (() => {
            const primaryHex = assets?.primary?.trim() || DEFAULT_PRIMARY;
            const accentHexCandidate =
              assets?.accent?.trim() ||
              paletteHexes.find(
                (h) => h.toUpperCase() !== primaryHex.toUpperCase(),
              );
            const accentHex =
              accentHexCandidate || DEFAULT_ACCENT;
            const rest = paletteHexes.filter(
              (h) => h !== primaryHex && h !== accentHex,
            );
            return [primaryHex, accentHex, ...rest];
          })()
        : [
            assets?.primary?.trim() || DEFAULT_PRIMARY,
            assets?.accent?.trim() || DEFAULT_ACCENT,
          ],
  );

  const secondaryColors = useZenphoFallback
    ? [
        { name: "Surface", hex: ZENPHO_PDF_SURFACE_HEX },
        { name: "Paper", hex: ZENPHO_PDF_PAPER_HEX },
      ]
    : [
        { name: "Paper", hex: DEFAULT_NEUTRAL },
        { name: "Ink hint", hex: "#E8E6E0" },
      ];

  const pairing: BrandingFontPairingId =
    input.fontPairingId ??
    (useZenphoFallback ? "modern-sans" : "editorial-serif");


  return {
    brandName: truncate(input.buyerDisplayName, 120),
    tagline: truncate(tagline, 400),
    industry: truncate(input.industryLine, 200),
    brandStory:
      "This document outlines recommended services, scope, and commercial context for your organization.",
    mission: truncate(input.proposalTitle, 480),
    brandPersonality: ["Professional", "Clear", "Outcome-led"],
    targetAudience:
      "Decision-makers evaluating a services partnership with Zenpho.",
    primaryColors,
    secondaryColors,
    colorRatio: { primaryPct: 60, secondaryPct: 30, accentPct: 10 },
    fontPairingId: pairing,
    logoStyle: "combination",
    keyVisualElements: ["Photography", "Clean typography", "Trust signals"],
    imageryStyle:
      "Authentic business context — professional, well-lit, no stock clichés.",
    toneOfVoice: "Consultative and precise.",
    toneExamples: {
      headline: "—",
      socialPost: "—",
      supportReply: "—",
    },
    weSay: ["We will", "Deliverables", "Timeline"],
    weDontSay: ["Guarantee viral", "Cheap"],
    dos: ["Anchor recommendations in catalog pricing when shown."],
    donts: ["Invent factual claims not sourced from enrichment."],
    merchIdeas: [],
  };
}
