/**
 * Sales-funnel spec generator for the Brand Kits + Sales Funnel PDF.
 *
 * Mirrors the dual-provider pattern in `prospect-branding-spec-llm.ts`
 * (Anthropic primary, OpenAI fallback, JSON only, shared limits) and
 * produces an `AdsFunnelSpec` shaped to drive the new PDF section.
 *
 * The prompt receives the brand spec, vertical, place + intel context so the
 * resulting copy is on-brand AND tailored to the right buyer (local-biz vs
 * tech-startup vs ecommerce).
 */
import OpenAI from "openai";
import type { MarketIntelReport } from "@/lib/crm/prospect-intel-report";
import type { PlacesSearchPlace } from "@/lib/crm/places-types";
import {
  automationReportLlmTimeoutMs,
  automationReportMaxOutputTokens,
} from "@/lib/crm/prospect-automation-report-limits";
import type { BrandingSpec } from "@/lib/crm/prospect-branding-spec-llm";
import {
  type ProspectVertical,
  verticalImageryDirection,
  verticalKpiDirection,
  verticalLabel,
} from "@/lib/crm/prospect-vertical-classify";

const ANTHROPIC_MESSAGES_URL = "https://api.anthropic.com/v1/messages";
const DEFAULT_ANTHROPIC_MODEL = "claude-sonnet-4-20250514";
const DEFAULT_OPENAI_MODEL = "gpt-4o-mini";

const MAX_STRING = 480;
const MAX_PARAGRAPH = 900;
const MAX_ARRAY = 6;

export type AdsFunnelSpec = {
  funnelStrategy: { awareness: string; consideration: string; conversion: string };
  audiences: { name: string; description: string }[];
  facebook: {
    objective: string;
    targeting: string;
    primaryText: string;
    headline: string;
    description: string;
    cta: string;
    imageDirection: string;
  };
  instagram: {
    feedPrimaryText: string;
    feedHeadline: string;
    feedCta: string;
    storyHook: string;
    storyCta: string;
    imageDirection: string;
  };
  google: {
    searchHeadlines: string[];
    searchDescriptions: string[];
    displayHeadline: string;
    displayDescription: string;
    displayCta: string;
    imageDirection: string;
  };
  landingPage: {
    hero: string;
    subhero: string;
    valueProps: string[];
    ctaPrimary: string;
    ctaSecondary: string;
    sections: string[];
    imageDirection: string;
  };
  budgetGuidance: { dailyMin: number; dailyMax: number; rationale: string };
  kpis: string[];
};

function truncate(s: string, max = MAX_STRING): string {
  const t = s.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

function strField(
  o: Record<string, unknown>,
  k: string,
  alt?: string,
  max = MAX_PARAGRAPH,
): string {
  const v = o[k] ?? (alt ? o[alt] : undefined);
  return typeof v === "string" ? truncate(v, max) : "";
}

function arrFieldStr(
  o: Record<string, unknown>,
  k: string,
  alt?: string,
  maxItems = MAX_ARRAY,
): string[] {
  const v = o[k] ?? (alt ? o[alt] : undefined);
  if (!Array.isArray(v)) return [];
  return v
    .filter((x): x is string => typeof x === "string")
    .map((x) => truncate(x, MAX_STRING))
    .filter(Boolean)
    .slice(0, maxItems);
}

const CPL_KPI_LINE = /cpl\b|cost[- ]per[- ]lead/i;

/** Brand kit PDF product target: CPL must read as under $15 in printed KPIs. */
function normalizeBrandingCplKpis(kpis: string[]): string[] {
  return kpis.map((k) => {
    if (!CPL_KPI_LINE.test(k)) return k;
    let o = k.replace(/\$[\d,]+(?:\.\d{2})?/g, "$15");
    o = o.replace(/≤|<=/g, "<");
    return o;
  });
}

function audiencesField(raw: unknown): { name: string; description: string }[] {
  if (!Array.isArray(raw)) return [];
  const out: { name: string; description: string }[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const o = entry as Record<string, unknown>;
    const name = strField(o, "name", "title", 120);
    const description = strField(o, "description", "desc", 360);
    if (!name && !description) continue;
    out.push({
      name: name || `Audience ${out.length + 1}`,
      description: description || "",
    });
    if (out.length >= 3) break;
  }
  return out;
}

function clampInt(n: number, min: number, max: number, def: number): number {
  if (!Number.isFinite(n)) return def;
  return Math.round(Math.max(min, Math.min(max, n)));
}

function budgetField(raw: unknown): {
  dailyMin: number;
  dailyMax: number;
  rationale: string;
} {
  const fallback = { dailyMin: 25, dailyMax: 75, rationale: "" };
  if (!raw || typeof raw !== "object") return fallback;
  const o = raw as Record<string, unknown>;
  const dailyMin = clampInt(
    Number(o.dailyMin ?? o.daily_min ?? fallback.dailyMin),
    5,
    5_000,
    fallback.dailyMin,
  );
  const dailyMaxRaw = clampInt(
    Number(o.dailyMax ?? o.daily_max ?? fallback.dailyMax),
    5,
    10_000,
    fallback.dailyMax,
  );
  const dailyMax = Math.max(dailyMaxRaw, dailyMin + 5);
  const rationale = strField(o, "rationale", undefined, 480);
  return { dailyMin, dailyMax, rationale };
}

function objectField(raw: unknown): Record<string, unknown> {
  return raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
}

function coerceFunnelSpec(o: Record<string, unknown>): AdsFunnelSpec {
  const fs = objectField(o.funnelStrategy ?? o.funnel_strategy);
  const fb = objectField(o.facebook);
  const ig = objectField(o.instagram);
  const ga = objectField(o.google);
  const lp = objectField(o.landingPage ?? o.landing_page);
  return {
    funnelStrategy: {
      awareness: strField(fs, "awareness", undefined, 480),
      consideration: strField(fs, "consideration", undefined, 480),
      conversion: strField(fs, "conversion", undefined, 480),
    },
    audiences: audiencesField(o.audiences ?? o.audience_segments),
    facebook: {
      objective: strField(fb, "objective", undefined, 120),
      targeting: strField(fb, "targeting", undefined, 360),
      primaryText: strField(fb, "primaryText", "primary_text", 480),
      headline: strField(fb, "headline", undefined, 120),
      description: strField(fb, "description", undefined, 240),
      cta: strField(fb, "cta", undefined, 60),
      imageDirection: strField(fb, "imageDirection", "image_direction", 360),
    },
    instagram: {
      feedPrimaryText: strField(ig, "feedPrimaryText", "feed_primary_text", 480),
      feedHeadline: strField(ig, "feedHeadline", "feed_headline", 120),
      feedCta: strField(ig, "feedCta", "feed_cta", 60),
      storyHook: strField(ig, "storyHook", "story_hook", 240),
      storyCta: strField(ig, "storyCta", "story_cta", 60),
      imageDirection: strField(ig, "imageDirection", "image_direction", 360),
    },
    google: {
      searchHeadlines: arrFieldStr(ga, "searchHeadlines", "search_headlines", 5),
      searchDescriptions: arrFieldStr(
        ga,
        "searchDescriptions",
        "search_descriptions",
        4,
      ),
      displayHeadline: strField(ga, "displayHeadline", "display_headline", 120),
      displayDescription: strField(
        ga,
        "displayDescription",
        "display_description",
        240,
      ),
      displayCta: strField(ga, "displayCta", "display_cta", 60),
      imageDirection: strField(ga, "imageDirection", "image_direction", 360),
    },
    landingPage: {
      hero: strField(lp, "hero", undefined, 240),
      subhero: strField(lp, "subhero", "sub_hero", 360),
      valueProps: arrFieldStr(lp, "valueProps", "value_props", 4),
      ctaPrimary: strField(lp, "ctaPrimary", "cta_primary", 60),
      ctaSecondary: strField(lp, "ctaSecondary", "cta_secondary", 60),
      sections: arrFieldStr(lp, "sections", undefined, 6),
      imageDirection: strField(lp, "imageDirection", "image_direction", 360),
    },
    budgetGuidance: budgetField(o.budgetGuidance ?? o.budget_guidance),
    kpis: normalizeBrandingCplKpis(arrFieldStr(o, "kpis", "metrics", 6)),
  };
}

function parseFunnelJson(raw: string): AdsFunnelSpec | null {
  let t = raw.trim();
  const fence = /^```(?:json)?\s*([\s\S]*?)```$/m.exec(t);
  if (fence) t = fence[1].trim();
  const tryParse = (s: string): AdsFunnelSpec | null => {
    try {
      const o = JSON.parse(s) as Record<string, unknown>;
      return coerceFunnelSpec(o);
    } catch {
      return null;
    }
  };
  const direct = tryParse(t);
  if (direct) return direct;
  const start = t.indexOf("{");
  const end = t.lastIndexOf("}");
  if (start >= 0 && end > start) return tryParse(t.slice(start, end + 1));
  return null;
}

function placeContext(place: PlacesSearchPlace | null | undefined): string {
  if (!place) return "";
  return JSON.stringify(
    {
      name: place.name,
      address: place.formattedAddress,
      website: place.websiteUri,
      types: (place.types ?? []).slice(0, 6).map((t) => t.replace(/_/g, " ")),
      rating: place.rating,
      reviewCount: place.userRatingCount,
    },
    null,
    0,
  );
}

function reportContext(report: MarketIntelReport | null | undefined): string {
  if (!report) return "";
  return JSON.stringify(
    {
      summary: truncate(report.summary || "", MAX_STRING * 2),
      customWebsites: report.customWebsites.slice(0, 4).map((s) => truncate(s)),
      webApps: report.webApps.slice(0, 4).map((s) => truncate(s)),
    },
    null,
    0,
  );
}

function brandSpecContext(spec: BrandingSpec): string {
  return JSON.stringify(
    {
      brandName: spec.brandName,
      tagline: spec.tagline,
      industry: spec.industry,
      mission: spec.mission,
      brandPersonality: spec.brandPersonality,
      targetAudience: spec.targetAudience,
      toneOfVoice: spec.toneOfVoice,
      primaryColors: spec.primaryColors,
    },
    null,
    0,
  );
}

function verticalRules(vertical: ProspectVertical): string {
  switch (vertical) {
    case "ecommerce":
      return `- Primary objective on Meta is "Sales" with catalog/DPA-style targeting (interest + lookalikes from purchasers).
- Google bias: Performance Max + Shopping > Search; copy lean on AOV-friendly offers, free shipping thresholds, bestsellers.
- Audiences focus on existing customers, lookalikes, intent shoppers in adjacent categories.
- KPIs include ROAS, AOV, cost-per-acquisition, add-to-cart rate, repeat purchase rate.`;
    case "tech-startup":
      return `- Primary objective on Meta is "Leads" or "Conversions" (book demo / start trial). LinkedIn-style targeting cues.
- Google bias: Search ads on commercial-intent keywords + branded protect; consider Demand Gen for top funnel.
- Audiences focus on ICP role/industry/company-size cohorts; nurture-friendly mid-funnel content.
- KPIs include MQL→SQL conversion, demos booked, CAC, payback period, activation rate.`;
    case "local-business":
      return `- Primary objective on Meta is "Leads", "Engagement", or "Store visits" with a local geo radius.
- Google bias: Local Service Ads + Search on commercial-intent local queries; Google Business Profile updates.
- Audiences focus on geo + life-stage/interest cohorts within drive-time radius.
- KPIs include calls, store visits, bookings, cost-per-lead, review volume, repeat customers.`;
    default:
      return `- Choose the simplest objective that matches what they sell. Default to "Leads" with a clear single CTA.
- Audiences: a primary mainstream cohort, a high-intent niche, and a retargeting list.
- KPIs: cost-per-lead, click-through rate, landing-page conversion, brand search lift.`;
  }
}

function buildPrompts(
  spec: BrandingSpec,
  vertical: ProspectVertical,
  placeJson: string,
  reportJson: string,
): { system: string; user: string } {
  const system =
    "You are a senior performance-marketing strategist. You output only valid JSON. No markdown fences, no commentary before or after the JSON object.";

  const imageryHint = verticalImageryDirection(vertical);
  const kpiHint = verticalKpiDirection(vertical);

  const user = `You are scoping a paid-media sales funnel proposal for the prospect "${spec.brandName}". The JSON you return drives a printable Sales Funnel section inside a Brand Kit PDF and feeds copy + ad-image direction to ${"`gpt-image-2`"}, so be specific.

Vertical: ${verticalLabel(vertical).toUpperCase()}
Vertical-specific rules:
${verticalRules(vertical)}

Imagery vibe (use this to craft each "imageDirection"): ${imageryHint}
Suggested KPI direction: ${kpiHint}

Brand spec context:
${brandSpecContext(spec)}

Google Places context (may be empty):
${placeJson || "(none provided)"}

Market intel context (may be empty):
${reportJson || "(none provided)"}

Return a single JSON object with EXACTLY these keys:

- "funnelStrategy": object {"awareness","consideration","conversion"} — one short paragraph each (1-3 sentences) describing the play at that stage of the funnel.
- "audiences": array of EXACTLY 3 objects {"name","description"} — name is 2-5 words, description is 1-2 sentences explaining who they are and why they convert.
- "facebook": object with:
   - "objective": one of "Awareness" | "Engagement" | "Leads" | "Sales" | "Traffic" | "Store visits".
   - "targeting": 1-2 sentences describing interest/behavior/lookalike targeting.
   - "primaryText": <= 125 characters of body copy (the message above the creative).
   - "headline": <= 40 characters.
   - "description": <= 30 characters (the small line under the headline).
   - "cta": one of "Book Now" | "Shop Now" | "Learn More" | "Sign Up" | "Get Quote" | "Get Offer" | "Contact Us" | "Get Directions".
   - "imageDirection": <= 240 characters describing the FB feed creative composition (no readable text — copy is overlaid in the PDF).
- "instagram": object with:
   - "feedPrimaryText": <= 125 chars (caption).
   - "feedHeadline": <= 40 chars.
   - "feedCta": same enum as Facebook.cta.
   - "storyHook": <= 60 chars (used as overlaid text in the Story creative concept).
   - "storyCta": same enum as Facebook.cta.
   - "imageDirection": <= 240 chars describing IG feed AND a 9:16 story creative (mention both compositions).
- "google": object with:
   - "searchHeadlines": array of 3-5 entries, each <= 30 characters (RSA headlines).
   - "searchDescriptions": array of 2-4 entries, each <= 90 characters.
   - "displayHeadline": <= 30 characters.
   - "displayDescription": <= 90 characters.
   - "displayCta": short CTA string.
   - "imageDirection": <= 240 chars for the Display creative.
- "landingPage": object with:
   - "hero": one short headline <= 80 chars.
   - "subhero": 1-2 sentences <= 240 chars.
   - "valueProps": array of EXACTLY 3 short phrases <= 80 chars each.
   - "ctaPrimary": short CTA string (matches Facebook.cta enum vibe).
   - "ctaSecondary": short secondary CTA (e.g. "See how it works", "View pricing", "Watch the demo").
   - "sections": array of 3-5 short labels for landing page sections (e.g. ["Hero", "Social proof", "How it works", "Pricing", "FAQ"]).
   - "imageDirection": <= 240 chars describing a hero illustration / hero photograph for the landing-page top.
- "budgetGuidance": object {"dailyMin","dailyMax","rationale"} — integer USD daily spend per platform (combined). Realistic for an SMB. Rationale 1-2 sentences.
- "kpis": array of EXACTLY 4-6 vertical-appropriate metrics; short labels like "ROAS >= 2.5x" or "Cost-per-lead < $15".
- Include exactly one cost-per-lead KPI, written as "Cost-per-lead < $15" (strictly under fifteen USD per lead—not $25, $35, or higher).
- Every imageDirection must FORBID readable text in the image (we overlay real type in the PDF).
- Restrict imagery palette suggestions to the brand primary/accent (no off-brand colors).
- Use ASCII-friendly punctuation.
- Keep copy in English.`;

  return { system, user };
}

async function generateWithAnthropic(
  spec: BrandingSpec,
  vertical: ProspectVertical,
  placeJson: string,
  reportJson: string,
): Promise<{ ok: true; data: AdsFunnelSpec } | { ok: false; error: string }> {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) return { ok: false, error: "ANTHROPIC_API_KEY is not configured." };

  const model =
    process.env.ANTHROPIC_BRANDING_MODEL?.trim() || DEFAULT_ANTHROPIC_MODEL;
  const { system, user } = buildPrompts(spec, vertical, placeJson, reportJson);
  const llmMs = automationReportLlmTimeoutMs();
  const maxTokens = automationReportMaxOutputTokens();

  try {
    const res = await fetch(ANTHROPIC_MESSAGES_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      signal: AbortSignal.timeout(llmMs),
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        system,
        messages: [{ role: "user", content: user }],
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      return {
        ok: false,
        error: `Anthropic API error (${res.status}): ${errText.slice(0, 400) || res.statusText}`,
      };
    }

    const data = (await res.json()) as {
      content?: Array<{ type: string; text?: string }>;
      error?: { message?: string };
    };
    if (data.error?.message) return { ok: false, error: data.error.message };

    const block = data.content?.find((c) => c.type === "text");
    const raw = block?.text?.trim() ?? "";
    const parsed = parseFunnelJson(raw);
    if (!parsed) {
      return { ok: false, error: "Anthropic returned invalid JSON for funnel spec." };
    }
    return { ok: true, data: parsed };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Anthropic request failed unexpectedly.";
    if (msg.includes("abort") || msg.includes("TimeoutError")) {
      return { ok: false, error: `Anthropic request timed out (${llmMs}ms).` };
    }
    return { ok: false, error: msg };
  }
}

async function generateWithOpenAI(
  spec: BrandingSpec,
  vertical: ProspectVertical,
  placeJson: string,
  reportJson: string,
): Promise<{ ok: true; data: AdsFunnelSpec } | { ok: false; error: string }> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return { ok: false, error: "OPENAI_API_KEY is not configured." };

  const model =
    process.env.OPENAI_BRANDING_TEXT_MODEL?.trim() || DEFAULT_OPENAI_MODEL;
  const { system, user } = buildPrompts(spec, vertical, placeJson, reportJson);
  const llmMs = automationReportLlmTimeoutMs();
  const maxTokens = automationReportMaxOutputTokens();

  try {
    const openai = new OpenAI({ apiKey, timeout: llmMs });
    const completion = await openai.chat.completions.create({
      model,
      temperature: 0.6,
      max_tokens: maxTokens,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    });
    const raw = completion.choices[0]?.message?.content?.trim() ?? "";
    const parsed = parseFunnelJson(raw);
    if (!parsed) {
      return { ok: false, error: "OpenAI returned invalid JSON for funnel spec." };
    }
    return { ok: true, data: parsed };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "OpenAI request failed unexpectedly.";
    if (/timeout|timed out|ETIMEDOUT|abort/i.test(msg)) {
      return { ok: false, error: `OpenAI request timed out (${llmMs}ms).` };
    }
    return { ok: false, error: msg };
  }
}

/**
 * Anthropic first when `ANTHROPIC_API_KEY` is set; falls back to OpenAI.
 */
export async function generateAdsFunnelSpec(input: {
  spec: BrandingSpec;
  vertical: ProspectVertical;
  place?: PlacesSearchPlace | null;
  report?: MarketIntelReport | null;
}): Promise<{ ok: true; data: AdsFunnelSpec } | { ok: false; error: string }> {
  const placeJson = placeContext(input.place ?? null);
  const reportJson = reportContext(input.report ?? null);

  const hasAnthropic = Boolean(process.env.ANTHROPIC_API_KEY?.trim());
  const hasOpenAI = Boolean(process.env.OPENAI_API_KEY?.trim());

  if (!hasAnthropic && !hasOpenAI) {
    return {
      ok: false,
      error: "No LLM API keys configured (set ANTHROPIC_API_KEY or OPENAI_API_KEY).",
    };
  }

  if (hasAnthropic) {
    const r = await generateWithAnthropic(
      input.spec,
      input.vertical,
      placeJson,
      reportJson,
    );
    if (r.ok) return r;
    if (hasOpenAI) {
      console.warn("[adsFunnelSpec] Anthropic failed, falling back to OpenAI:", r.error);
      return generateWithOpenAI(input.spec, input.vertical, placeJson, reportJson);
    }
    return r;
  }

  return generateWithOpenAI(input.spec, input.vertical, placeJson, reportJson);
}
