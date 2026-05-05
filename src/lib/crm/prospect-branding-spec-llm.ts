import OpenAI from "openai";
import type { MarketIntelReport } from "@/lib/crm/prospect-intel-report";
import type { PlacesSearchPlace } from "@/lib/crm/places-types";
import {
  automationReportLlmTimeoutMs,
  automationReportMaxOutputTokens,
} from "@/lib/crm/prospect-automation-report-limits";
import {
  BRANDING_FONT_PAIRING_IDS,
  BRANDING_FONT_PAIRINGS,
  type BrandingFontPairingId,
} from "@/lib/crm/branding-font-pairings";
import type { ProspectVertical } from "@/lib/crm/prospect-vertical-classify";

export type ExtractedBrandPalette = {
  primary: string;
  accent: string | null;
  palette: string[];
};

const ANTHROPIC_MESSAGES_URL = "https://api.anthropic.com/v1/messages";
const DEFAULT_ANTHROPIC_MODEL = "claude-sonnet-4-20250514";
const DEFAULT_OPENAI_MODEL = "gpt-4o-mini";

const MAX_ITEMS_PER_ARRAY = 8;
const MAX_STRING_LEN = 480;
const MAX_PARAGRAPH_LEN = 900;
const LOGO_STYLES = ["wordmark", "icon", "emblem", "combination"] as const;
type LogoStyle = (typeof LOGO_STYLES)[number];

export type BrandingColor = { name: string; hex: string };

export type BrandingSpec = {
  brandName: string;
  tagline: string;
  industry: string;
  brandStory: string;
  mission: string;
  brandPersonality: string[];
  targetAudience: string;
  primaryColors: BrandingColor[];
  secondaryColors: BrandingColor[];
  colorRatio: { primaryPct: number; secondaryPct: number; accentPct: number };
  fontPairingId: BrandingFontPairingId;
  logoStyle: LogoStyle;
  keyVisualElements: string[];
  imageryStyle: string;
  toneOfVoice: string;
  toneExamples: { headline: string; socialPost: string; supportReply: string };
  weSay: string[];
  weDontSay: string[];
  dos: string[];
  donts: string[];
  merchIdeas: string[];
};

function truncate(s: string, max = MAX_STRING_LEN): string {
  const t = s.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

function normalizeHex(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const m = raw.trim().match(/^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/);
  if (!m) return null;
  let hex = m[1];
  if (hex.length === 3) {
    hex = hex
      .split("")
      .map((c) => c + c)
      .join("");
  }
  return `#${hex.toUpperCase()}`;
}

function arrField(o: Record<string, unknown>, k: string, alt?: string): string[] {
  const v = o[k] ?? (alt ? o[alt] : undefined);
  if (!Array.isArray(v)) return [];
  return v
    .filter((x) => typeof x === "string")
    .map((x) => truncate(x as string))
    .filter(Boolean)
    .slice(0, MAX_ITEMS_PER_ARRAY);
}

function strField(
  o: Record<string, unknown>,
  k: string,
  alt?: string,
  max = MAX_PARAGRAPH_LEN,
): string {
  const v = o[k] ?? (alt ? o[alt] : undefined);
  return typeof v === "string" ? truncate(v, max) : "";
}

function colorArray(raw: unknown): BrandingColor[] {
  if (!Array.isArray(raw)) return [];
  const out: BrandingColor[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const o = entry as Record<string, unknown>;
    const hex = normalizeHex(o.hex ?? o.value ?? o.code);
    if (!hex) continue;
    const name =
      typeof o.name === "string" && o.name.trim()
        ? truncate(o.name, 60)
        : `Color ${out.length + 1}`;
    out.push({ name, hex });
    if (out.length >= 4) break;
  }
  return out;
}

function clampPct(n: number, def: number): number {
  if (!Number.isFinite(n)) return def;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function colorRatio(
  raw: unknown,
): { primaryPct: number; secondaryPct: number; accentPct: number } {
  const fallback = { primaryPct: 60, secondaryPct: 30, accentPct: 10 };
  if (!raw || typeof raw !== "object") return fallback;
  const o = raw as Record<string, unknown>;
  const primaryPct = clampPct(
    Number(o.primaryPct ?? o.primary ?? fallback.primaryPct),
    fallback.primaryPct,
  );
  const secondaryPct = clampPct(
    Number(o.secondaryPct ?? o.secondary ?? fallback.secondaryPct),
    fallback.secondaryPct,
  );
  const accentPct = clampPct(
    Number(o.accentPct ?? o.accent ?? fallback.accentPct),
    fallback.accentPct,
  );
  const total = primaryPct + secondaryPct + accentPct;
  if (total === 0) return fallback;
  const scale = 100 / total;
  return {
    primaryPct: Math.round(primaryPct * scale),
    secondaryPct: Math.round(secondaryPct * scale),
    accentPct: Math.max(
      0,
      100 - Math.round(primaryPct * scale) - Math.round(secondaryPct * scale),
    ),
  };
}

function logoStyle(raw: unknown): LogoStyle {
  if (typeof raw !== "string") return "wordmark";
  const t = raw.trim().toLowerCase();
  if ((LOGO_STYLES as readonly string[]).includes(t)) return t as LogoStyle;
  if (t.includes("combo") || t.includes("combin")) return "combination";
  if (t.includes("icon")) return "icon";
  if (t.includes("emblem") || t.includes("crest") || t.includes("badge")) {
    return "emblem";
  }
  return "wordmark";
}

function fontPairingId(raw: unknown): BrandingFontPairingId {
  if (typeof raw === "string") {
    const t = raw.trim();
    if ((BRANDING_FONT_PAIRING_IDS as readonly string[]).includes(t)) {
      return t as BrandingFontPairingId;
    }
  }
  return "modern-sans";
}

function toneExamples(raw: unknown): {
  headline: string;
  socialPost: string;
  supportReply: string;
} {
  if (!raw || typeof raw !== "object") {
    return { headline: "", socialPost: "", supportReply: "" };
  }
  const o = raw as Record<string, unknown>;
  return {
    headline: strField(o, "headline", "title", 180),
    socialPost: strField(o, "socialPost", "social_post", 400),
    supportReply: strField(o, "supportReply", "support_reply", 400),
  };
}

function applyExtractedPalette(
  primary: BrandingColor[],
  secondary: BrandingColor[],
  extracted: ExtractedBrandPalette | null,
): { primary: BrandingColor[]; secondary: BrandingColor[] } {
  if (!extracted) return { primary, secondary };

  const extractedHexes = new Set<string>();
  const ensure = (hex: string | null | undefined): string | null => {
    const norm = normalizeHex(hex);
    if (norm) extractedHexes.add(norm);
    return norm;
  };

  const primHex = ensure(extracted.primary);
  const accHex = ensure(extracted.accent);
  for (const h of extracted.palette) ensure(h);

  // Force the first primary color to the extracted brand primary. Keep the
  // LLM-supplied name (cleaner than "Color 1") when available.
  const nextPrimary: BrandingColor[] = [];
  if (primHex) {
    const name = primary[0]?.name?.trim() || "Brand primary";
    nextPrimary.push({ name, hex: primHex });
  }
  // Second primary slot prefers the extracted accent (otherwise next palette
  // hex) so the running PDF "accent" feels native to the brand.
  if (accHex && accHex !== primHex) {
    const name = primary[1]?.name?.trim() || "Brand accent";
    nextPrimary.push({ name, hex: accHex });
  } else {
    const fallback = extracted.palette
      .map((h) => normalizeHex(h))
      .filter((h): h is string => Boolean(h && h !== primHex))
      .find(Boolean);
    if (fallback) {
      const name = primary[1]?.name?.trim() || "Brand accent";
      nextPrimary.push({ name, hex: fallback });
    } else if (primary[1]) {
      nextPrimary.push(primary[1]);
    }
  }
  // Keep any additional LLM-suggested primaries that don't collide.
  for (const p of primary.slice(nextPrimary.length)) {
    if (!extractedHexes.has(p.hex)) nextPrimary.push(p);
    if (nextPrimary.length >= 3) break;
  }

  // Secondary: keep LLM neutrals/supports but drop hexes that already appear
  // in the primary list.
  const usedPrimary = new Set(nextPrimary.map((p) => p.hex));
  const nextSecondary = secondary.filter((s) => !usedPrimary.has(s.hex));

  return { primary: nextPrimary, secondary: nextSecondary };
}

function coerceBrandingSpec(
  o: Record<string, unknown>,
  extractedPalette: ExtractedBrandPalette | null = null,
): BrandingSpec {
  const primaryRaw = colorArray(o.primaryColors ?? o.primary_colors);
  const secondaryRaw = colorArray(o.secondaryColors ?? o.secondary_colors);
  const { primary, secondary } = applyExtractedPalette(
    primaryRaw,
    secondaryRaw,
    extractedPalette,
  );
  return {
    brandName: strField(o, "brandName", "brand_name", 120),
    tagline: strField(o, "tagline", undefined, 180),
    industry: strField(o, "industry", undefined, 120),
    brandStory: strField(o, "brandStory", "brand_story"),
    mission: strField(o, "mission", undefined, 400),
    brandPersonality: arrField(o, "brandPersonality", "brand_personality"),
    targetAudience: strField(o, "targetAudience", "target_audience", 280),
    primaryColors: primary,
    secondaryColors: secondary,
    colorRatio: colorRatio(o.colorRatio ?? o.color_ratio),
    fontPairingId: fontPairingId(o.fontPairingId ?? o.font_pairing_id),
    logoStyle: logoStyle(o.logoStyle ?? o.logo_style),
    keyVisualElements: arrField(o, "keyVisualElements", "key_visual_elements"),
    imageryStyle: strField(o, "imageryStyle", "imagery_style"),
    toneOfVoice: strField(o, "toneOfVoice", "tone_of_voice"),
    toneExamples: toneExamples(o.toneExamples ?? o.tone_examples),
    weSay: arrField(o, "weSay", "we_say"),
    weDontSay: arrField(o, "weDontSay", "we_dont_say"),
    dos: arrField(o, "dos"),
    donts: arrField(o, "donts", "dont"),
    merchIdeas: arrField(o, "merchIdeas", "merch_ideas"),
  };
}

function parseSpecJson(
  raw: string,
  extractedPalette: ExtractedBrandPalette | null = null,
): BrandingSpec | null {
  let t = raw.trim();
  const fence = /^```(?:json)?\s*([\s\S]*?)```$/m.exec(t);
  if (fence) t = fence[1].trim();
  const tryParse = (s: string): BrandingSpec | null => {
    try {
      const o = JSON.parse(s) as Record<string, unknown>;
      return coerceBrandingSpec(o, extractedPalette);
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
  const types = (place.types ?? [])
    .slice(0, 6)
    .map((t) => t.replace(/_/g, " "))
    .join(", ");
  return JSON.stringify(
    {
      name: place.name,
      address: place.formattedAddress,
      rating: place.rating,
      ratingCount: place.userRatingCount,
      website: place.websiteUri,
      phone: place.nationalPhoneNumber,
      types,
      status: place.businessStatus,
    },
    null,
    0,
  );
}

function reportContext(
  report: MarketIntelReport | null | undefined,
): string {
  if (!report) return "";
  const take = (arr: string[]) =>
    arr.slice(0, MAX_ITEMS_PER_ARRAY).map((x) => truncate(x, MAX_STRING_LEN));
  return JSON.stringify(
    {
      summary: truncate(report.summary || "", MAX_STRING_LEN * 2),
      customWebsites: take(report.customWebsites),
      webApps: take(report.webApps),
      mobileApps: take(report.mobileApps),
      aiAutomations: take(report.aiAutomations),
    },
    null,
    0,
  );
}

function verticalGuidance(v: ProspectVertical | null): string {
  switch (v) {
    case "ecommerce":
      return `\nProspect vertical: ECOMMERCE BRAND.
- Bias merch ideas to packaging, unboxing, hangtags, and product photography.
- Imagery direction: product still life + lifestyle in-context, bright editorial styling.
- Tone is confident and conversion-aware without being pushy.`;
    case "tech-startup":
      return `\nProspect vertical: TECH STARTUP / SaaS.
- Bias merch ideas to founder swag, conference goods, dev-friendly stickers.
- Imagery direction: clean product fragments, abstract dashboard surfaces, soft gradients, modern editorial.
- Tone is precise, technically literate, and ambitious.`;
    case "local-business":
      return `\nProspect vertical: LOCAL BUSINESS / SERVICE.
- Bias merch ideas to signage, menus, uniforms, vehicle wraps, neighborhood print.
- Imagery direction: warm storefront detail, real human moments, golden-hour lighting.
- Tone is welcoming and trustworthy, neighbor-to-neighbor.`;
    default:
      return "";
  }
}

function buildPrompts(
  businessName: string,
  placeJson: string,
  reportJson: string,
  extractedPalette: ExtractedBrandPalette | null,
  vertical: ProspectVertical | null,
): { system: string; user: string } {
  const pairingList = BRANDING_FONT_PAIRING_IDS.map((id) => {
    const p = BRANDING_FONT_PAIRINGS[id];
    return `  - "${id}" — ${p.label} — ${p.vibe} (${p.displayFamily} / ${p.bodyFamily})`;
  }).join("\n");

  const paletteBlock = extractedPalette
    ? `\nExtracted brand palette (from the prospect's live website — USE THESE EXACT HEXES):
- primary: ${extractedPalette.primary}
- accent: ${extractedPalette.accent ?? "(none — choose a complementary brand accent from the palette below if useful)"}
- full palette: ${extractedPalette.palette.length ? extractedPalette.palette.join(", ") : "(none)"}\n
HARD RULE: When you populate "primaryColors", set the FIRST entry's "hex" EXACTLY to "${extractedPalette.primary}".${
        extractedPalette.accent
          ? ` The SECOND entry's "hex" must be EXACTLY "${extractedPalette.accent}".`
          : ""
      } You may invent the "name" labels, but never invent the hex values. The post-processor will overwrite invented hexes with these anyway, so save effort and use them directly.`
    : "";

  const system =
    "You are a senior brand strategist. You output only valid JSON. No markdown fences, no commentary before or after the JSON object.";

  const user = `You are drafting a professional Brand Guidelines book for a business prospect: "${businessName}". The JSON you return drives a printable brand-book PDF, so treat it like real strategic work, not marketing filler.
${verticalGuidance(vertical)}${paletteBlock}

Ground your recommendations in the provided context only. Do not invent addresses, review counts, or claims you can't infer from the inputs. If the inputs are thin, make sensible choices appropriate for the industry and audience and keep the tone neutral.

Business listing (Google Places, may be empty):
${placeJson || "(none provided)"}

Market intel research (may be empty):
${reportJson || "(none provided)"}

Return a single JSON object with EXACTLY these keys:

- "brandName": string. The display brand name (usually the business name, cleaned up).
- "tagline": string, <= 12 words. Aspirational but honest.
- "industry": string, 2-5 words (e.g. "Neighborhood pet bakery", "Commercial HVAC services").
- "brandStory": string, 2-4 sentences. A short narrative about who they serve, why they exist, and what makes them different.
- "mission": string, 1-2 sentences. A crisp mission statement.
- "brandPersonality": array of 3-5 short adjectives (e.g. "Warm", "Playful", "Confident").
- "targetAudience": string, 1-2 sentences describing the primary audience.
- "primaryColors": array of 2-3 objects {"name","hex"} where hex is a 6-digit #RRGGBB hex. Pick colors that fit the industry and personality.
- "secondaryColors": array of 1-3 objects {"name","hex"} supporting the primaries (neutrals, accents).
- "colorRatio": object {"primaryPct","secondaryPct","accentPct"} roughly summing to 100 — typical balance is 60/30/10 unless you have a reason to change it.
- "fontPairingId": string — pick exactly ONE id from this whitelist based on the brand personality:
${pairingList}
- "logoStyle": one of "wordmark" | "icon" | "emblem" | "combination".
- "keyVisualElements": array of 3-5 short descriptions of signature visual motifs (e.g. "Hand-drawn paw prints", "Geometric quarter-circles").
- "imageryStyle": string, 1-2 sentences describing the photography direction (lighting, subject, editorial feel).
- "toneOfVoice": string, 1-2 sentences describing how the brand speaks.
- "toneExamples": object {"headline","socialPost","supportReply"} — ONE real example in the brand's voice for each surface. Headline <= 10 words, social post <= 40 words, support reply <= 60 words.
- "weSay": array of 4-6 short phrases the brand would use.
- "weDontSay": array of 4-6 short phrases the brand avoids.
- "dos": array of 4-6 concrete rules, each starting with a verb ("Lead with the product, not the logo").
- "donts": array of 4-6 concrete rules, each starting with "Don't" or "Avoid".
- "merchIdeas": array of 3-6 short merch / application ideas (e.g. "Tote bags with repeating paw pattern").

Rules:
- Every bullet must be under 220 characters.
- Use ASCII-friendly punctuation — curly quotes, em dashes, and bullets are fine; avoid emoji.
- Keep copy in English unless the business is clearly bilingual, then use English with occasional bilingual flourishes.`;

  return { system, user };
}

async function generateWithAnthropic(
  businessName: string,
  placeJson: string,
  reportJson: string,
  extractedPalette: ExtractedBrandPalette | null,
  vertical: ProspectVertical | null,
): Promise<
  { ok: true; data: BrandingSpec } | { ok: false; error: string }
> {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) return { ok: false, error: "ANTHROPIC_API_KEY is not configured." };

  const model =
    process.env.ANTHROPIC_BRANDING_MODEL?.trim() || DEFAULT_ANTHROPIC_MODEL;
  const { system, user } = buildPrompts(
    businessName,
    placeJson,
    reportJson,
    extractedPalette,
    vertical,
  );
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
    const parsed = parseSpecJson(raw, extractedPalette);
    if (!parsed) {
      return { ok: false, error: "Anthropic returned invalid JSON for branding spec." };
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
  businessName: string,
  placeJson: string,
  reportJson: string,
  extractedPalette: ExtractedBrandPalette | null,
  vertical: ProspectVertical | null,
): Promise<
  { ok: true; data: BrandingSpec } | { ok: false; error: string }
> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return { ok: false, error: "OPENAI_API_KEY is not configured." };

  const model =
    process.env.OPENAI_BRANDING_TEXT_MODEL?.trim() || DEFAULT_OPENAI_MODEL;
  const { system, user } = buildPrompts(
    businessName,
    placeJson,
    reportJson,
    extractedPalette,
    vertical,
  );
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
    const parsed = parseSpecJson(raw, extractedPalette);
    if (!parsed) {
      return { ok: false, error: "OpenAI returned invalid JSON for branding spec." };
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
 * Mirrors the prospect automation report pattern.
 */
export async function generateBrandingSpec(input: {
  businessName: string;
  place?: PlacesSearchPlace | null;
  report?: MarketIntelReport | null;
  extractedPalette?: ExtractedBrandPalette | null;
  vertical?: ProspectVertical | null;
}): Promise<
  { ok: true; data: BrandingSpec } | { ok: false; error: string }
> {
  const businessName = input.businessName.trim() || "Business";
  const placeJson = placeContext(input.place ?? null);
  const reportJson = reportContext(input.report ?? null);
  const extractedPalette = input.extractedPalette ?? null;
  const vertical = input.vertical ?? null;

  const hasAnthropic = Boolean(process.env.ANTHROPIC_API_KEY?.trim());
  const hasOpenAI = Boolean(process.env.OPENAI_API_KEY?.trim());

  if (!hasAnthropic && !hasOpenAI) {
    return { ok: false, error: "No LLM API keys configured (set ANTHROPIC_API_KEY or OPENAI_API_KEY)." };
  }

  if (hasAnthropic) {
    const r = await generateWithAnthropic(
      businessName,
      placeJson,
      reportJson,
      extractedPalette,
      vertical,
    );
    if (r.ok) return r;
    if (hasOpenAI) {
      console.warn("[brandingSpec] Anthropic failed, falling back to OpenAI:", r.error);
      return generateWithOpenAI(
        businessName,
        placeJson,
        reportJson,
        extractedPalette,
        vertical,
      );
    }
    return r;
  }

  return generateWithOpenAI(
    businessName,
    placeJson,
    reportJson,
    extractedPalette,
    vertical,
  );
}
