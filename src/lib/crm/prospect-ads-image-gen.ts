/**
 * Generates the 6 paid-ads + landing-page hero images that drive the new
 * "Sales Funnel" section of the Brand Kit PDF.
 *
 * Mirrors the architecture of `prospect-branding-image-gen.ts`: sequential
 * calls with a 13s gap, retries on 429, fallback model on `model_unavailable`,
 * and per-slot error capture so one failure never blocks the rest.
 *
 * Slots (size shown is the closest gpt-image-2 supports):
 *   - landingHero        1536x1024  editorial landing-page mockup
 *   - adFbFeed           1024x1024  Meta feed creative
 *   - adIgFeed           1024x1024  IG feed creative
 *   - adIgStory          1024x1536  IG/FB Story 9:16-ish creative
 *   - adGoogleDisplay    1024x1024  Google Display creative
 *   - adHeroBanner       1536x1024  generic large hero/display banner
 *
 * All prompts hard-restrict to the extracted brand palette + secondary,
 * forbid readable text in the image (the PDF overlays the real type), and
 * include vertical-specific imagery direction.
 */
import OpenAI from "openai";
import type { BrandingSpec } from "@/lib/crm/prospect-branding-spec-llm";
import type { AdsFunnelSpec } from "@/lib/crm/prospect-ads-funnel-spec-llm";
import {
  type ProspectVertical,
  verticalImageryDirection,
} from "@/lib/crm/prospect-vertical-classify";
import {
  parseImageMaxPerMinute,
  runOpenAiImageJobs,
} from "@/lib/crm/openai-image-rate-limit";

const DEFAULT_MODEL = "gpt-image-2";
const DEFAULT_TIMEOUT_MS = 180_000;

type ImageSize = "1024x1024" | "1536x1024" | "1024x1536";
type ImageQuality = "low" | "medium" | "high" | "auto";

export type AdsImageSlot =
  | "landingHero"
  | "adFbFeed"
  | "adIgFeed"
  | "adIgStory"
  | "adGoogleDisplay"
  | "adHeroBanner";

export type AdsImages = {
  landingHero: Buffer | null;
  adFbFeed: Buffer | null;
  adIgFeed: Buffer | null;
  adIgStory: Buffer | null;
  adGoogleDisplay: Buffer | null;
  adHeroBanner: Buffer | null;
  errors: Partial<Record<AdsImageSlot, string>>;
};

type PromptCtx = {
  spec: BrandingSpec;
  funnel: AdsFunnelSpec;
  vertical: ProspectVertical;
};

type SlotPlan = {
  slot: AdsImageSlot;
  size: ImageSize;
  prompt: (ctx: PromptCtx) => string;
};

function paletteLine(spec: BrandingSpec): string {
  const primary = spec.primaryColors.map((c) => `${c.name} ${c.hex}`).join(", ");
  const secondary = spec.secondaryColors
    .map((c) => `${c.name} ${c.hex}`)
    .join(", ");
  const pieces = [
    primary ? `Primary palette: ${primary}.` : "",
    secondary ? `Secondary palette: ${secondary}.` : "",
  ].filter(Boolean);
  return pieces.join(" ");
}

function strictPaletteRule(spec: BrandingSpec): string {
  const hexes = [
    ...spec.primaryColors.map((c) => c.hex),
    ...spec.secondaryColors.map((c) => c.hex),
  ];
  if (hexes.length === 0) return "";
  return `Use ONLY these colors: ${hexes.join(", ")}. Reject any other hue.`;
}

const NO_TEXT_RULE =
  "Do NOT render any readable text, letters, words, numbers, watermarks, captions, UI labels, or hashtags inside the image. Real copy is overlaid as actual type in the PDF.";

const SLOTS: SlotPlan[] = [
  {
    slot: "landingHero",
    size: "1536x1024",
    prompt: ({ spec, funnel, vertical }) => `Editorial hero image for the top of a landing page mockup.
Brand: ${spec.brandName}. Industry: ${spec.industry || "general"}.
Vertical vibe: ${verticalImageryDirection(vertical)}.
Direction: ${funnel.landingPage.imageDirection || "soft modern editorial composition with calm geometry"}.
${paletteLine(spec)}
${strictPaletteRule(spec)}
Composition leaves the upper-left third uncluttered so headline + CTA can be overlaid on top in the PDF.
${NO_TEXT_RULE}
Print-quality. No people-with-faces unless central to the brand. No logos. No UI screenshots.`,
  },
  {
    slot: "adFbFeed",
    size: "1024x1024",
    prompt: ({ spec, funnel, vertical }) => `Square Facebook feed advert creative for ${spec.brandName}.
Vertical vibe: ${verticalImageryDirection(vertical)}.
Direction: ${funnel.facebook.imageDirection || "centered subject with strong silhouette"}.
${paletteLine(spec)}
${strictPaletteRule(spec)}
Strong center-of-frame focal point that survives a thumbnail in a busy feed. Leave a quiet area in the lower-third where a real CTA chip can be overlaid in the PDF.
${NO_TEXT_RULE}
Editorial photography or clean illustration as appropriate for the vertical.`,
  },
  {
    slot: "adIgFeed",
    size: "1024x1024",
    prompt: ({ spec, funnel, vertical }) => `Square Instagram feed advert creative for ${spec.brandName}.
Vertical vibe: ${verticalImageryDirection(vertical)}.
Direction: ${funnel.instagram.imageDirection || "lifestyle vignette in branded palette"}.
${paletteLine(spec)}
${strictPaletteRule(spec)}
Style is more lifestyle / aspirational than the Facebook ad — think Instagram aesthetic. Quiet headroom at the top OR bottom for overlaid copy in the PDF.
${NO_TEXT_RULE}`,
  },
  {
    slot: "adIgStory",
    size: "1024x1536",
    prompt: ({ spec, funnel, vertical }) => `Vertical 9:16 Instagram / Facebook Story advert creative for ${spec.brandName}.
Vertical vibe: ${verticalImageryDirection(vertical)}.
Direction: ${funnel.instagram.imageDirection || "vertical-first lifestyle vignette"}.
${paletteLine(spec)}
${strictPaletteRule(spec)}
Vertical composition optimized for full-screen mobile. Strong subject in the middle third, quiet upper third for a "${(funnel.instagram.storyHook || "hook").slice(0, 40)}" overlay and quiet lower third for a CTA chip — both will be drawn in the PDF as real type.
${NO_TEXT_RULE}`,
  },
  {
    slot: "adGoogleDisplay",
    size: "1024x1024",
    prompt: ({ spec, funnel, vertical }) => `Square Google Display Network advert creative for ${spec.brandName}.
Vertical vibe: ${verticalImageryDirection(vertical)}.
Direction: ${funnel.google.imageDirection || "graphic editorial composition that reads at small sizes"}.
${paletteLine(spec)}
${strictPaletteRule(spec)}
Bolder graphic / editorial look — these creatives need to read on small placements across the GDN. Solid color blocks and strong shapes welcome.
${NO_TEXT_RULE}`,
  },
  {
    slot: "adHeroBanner",
    size: "1536x1024",
    prompt: ({ spec, vertical }) => `Wide hero banner artwork for ${spec.brandName} — a flagship brand visual usable as a website hero, email banner, or out-of-home placement.
Vertical vibe: ${verticalImageryDirection(vertical)}.
${paletteLine(spec)}
${strictPaletteRule(spec)}
Confident, full-bleed editorial composition with a strong horizontal rhythm. Leave the left third quieter so the headline + CTA can be overlaid as real type in the PDF.
${NO_TEXT_RULE}`,
  },
];

function timeoutMs(): number {
  const raw = process.env.OPENAI_BRANDING_IMAGE_TIMEOUT_MS?.trim();
  if (raw) {
    const n = Number.parseInt(raw, 10);
    if (Number.isFinite(n) && n >= 30_000) return n;
  }
  return DEFAULT_TIMEOUT_MS;
}

function qualityFromEnv(): ImageQuality {
  const raw = (process.env.OPENAI_ADS_IMAGE_QUALITY || "").trim().toLowerCase();
  if (raw === "low" || raw === "medium" || raw === "high" || raw === "auto") {
    return raw;
  }
  return "medium";
}

function isModelUnavailableError(msg: string): boolean {
  const m = msg.toLowerCase();
  return (
    m.includes("model") &&
    (m.includes("does not exist") ||
      m.includes("not found") ||
      m.includes("no access") ||
      m.includes("not supported") ||
      m.includes("invalid model") ||
      m.includes("must be verified") ||
      m.includes("unknown model"))
  );
}

function extract429WaitSecs(msg: string): number | null {
  const m = msg.match(/try again in (\d+)s/i);
  return m ? parseInt(m[1], 10) : null;
}

function is429(msg: string): boolean {
  return msg.includes("429") || /rate.?limit/i.test(msg);
}

const MAX_RETRIES = 3;
const DEFAULT_429_WAIT_MS = 15_000;
const INTER_REQUEST_DELAY_MS = 13_000;

async function generateOne(
  openai: OpenAI,
  model: string,
  plan: SlotPlan,
  ctx: PromptCtx,
  quality: ImageQuality,
): Promise<{ slot: AdsImageSlot; buffer: Buffer | null; error?: string }> {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await openai.images.generate({
        model,
        prompt: plan.prompt(ctx),
        size: plan.size,
        quality,
        n: 1,
        output_format: "png",
      });
      const b64 = res.data?.[0]?.b64_json;
      if (!b64) {
        return {
          slot: plan.slot,
          buffer: null,
          error: "OpenAI returned no image data.",
        };
      }
      return { slot: plan.slot, buffer: Buffer.from(b64, "base64") };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Image generation failed.";

      if (is429(msg) && attempt < MAX_RETRIES) {
        const secs = extract429WaitSecs(msg) ?? DEFAULT_429_WAIT_MS / 1000;
        const waitMs = (secs + 2) * 1000;
        console.warn(
          `[ads-images] slot=${plan.slot} 429 hit (attempt ${attempt + 1}/${MAX_RETRIES + 1}), waiting ${waitMs}ms`,
        );
        await new Promise((r) => setTimeout(r, waitMs));
        continue;
      }

      if (isModelUnavailableError(msg) && attempt === 0) {
        return { slot: plan.slot, buffer: null, error: msg };
      }

      return { slot: plan.slot, buffer: null, error: msg };
    }
  }
  return { slot: plan.slot, buffer: null, error: "Max retries exceeded." };
}

function useFastMode(): boolean {
  const raw = (process.env.OPENAI_ADS_IMAGE_FAST_MODE || "").trim().toLowerCase();
  return raw !== "false";
}

function maxImagesPerMinute(): number {
  return parseImageMaxPerMinute(process.env.OPENAI_ADS_IMAGE_MAX_PER_MINUTE);
}

/**
 * Generate all 6 ad-funnel images. Fast mode shares the same process-level
 * limiter as brand-book image generation so the full PDF respects OpenAI's
 * gpt-image per-minute cap.
 */
export async function generateAdsFunnelImages(
  spec: BrandingSpec,
  funnel: AdsFunnelSpec,
  vertical: ProspectVertical,
): Promise<AdsImages> {
  return generateAdsFunnelImagesForSlots(
    spec,
    funnel,
    vertical,
    SLOTS.map((plan) => plan.slot),
    "ads-images",
  );
}

export async function generateAdsFunnelImageSubset(
  spec: BrandingSpec,
  funnel: AdsFunnelSpec,
  vertical: ProspectVertical,
  slots: AdsImageSlot[],
): Promise<AdsImages> {
  return generateAdsFunnelImagesForSlots(
    spec,
    funnel,
    vertical,
    slots,
    "ads-images-subset",
  );
}

async function generateAdsFunnelImagesForSlots(
  spec: BrandingSpec,
  funnel: AdsFunnelSpec,
  vertical: ProspectVertical,
  slots: AdsImageSlot[],
  label: string,
): Promise<AdsImages> {
  const empty: AdsImages = {
    landingHero: null,
    adFbFeed: null,
    adIgFeed: null,
    adIgStory: null,
    adGoogleDisplay: null,
    adHeroBanner: null,
    errors: {},
  };

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    const err = "OPENAI_API_KEY is not configured.";
    for (const plan of SLOTS) empty.errors[plan.slot] = err;
    console.warn(`[${label}] ${err}`);
    return empty;
  }

  const slotSet = new Set(slots);
  const plans = SLOTS.filter((plan) => slotSet.has(plan.slot));
  if (plans.length === 0) return empty;

  const requested =
    process.env.OPENAI_BRANDING_IMAGE_MODEL?.trim() || DEFAULT_MODEL;
  const fallback =
    process.env.OPENAI_BRANDING_IMAGE_MODEL_FALLBACK?.trim() || "gpt-image-1";
  const openai = new OpenAI({ apiKey, timeout: timeoutMs() });
  const quality = qualityFromEnv();
  const ctx: PromptCtx = { spec, funnel, vertical };

  let model = requested;
  console.info(
    `[${label}] starting generation with model=${model} quality=${quality} vertical=${vertical} fast=${useFastMode()} maxPerMinute=${maxImagesPerMinute()} slots=${plans.length}`,
  );

  let results: { slot: AdsImageSlot; buffer: Buffer | null; error?: string }[];

  if (useFastMode()) {
    results = await runOpenAiImageJobs({
      label,
      jobs: plans,
      maxPerMinute: maxImagesPerMinute(),
      run: (plan, i) => {
        console.info(
          `[${label}] fast generating slot=${plan.slot} (${i + 1}/${plans.length}) model=${model}`,
        );
        return generateOne(openai, model, plan, ctx, quality);
      },
    });
  } else {
    results = [];
    for (let i = 0; i < plans.length; i++) {
      const plan = plans[i];

      if (i > 0) {
        console.info(`[${label}] waiting ${INTER_REQUEST_DELAY_MS}ms before slot=${plan.slot}`);
        await new Promise((r) => setTimeout(r, INTER_REQUEST_DELAY_MS));
      }

      console.info(
        `[${label}] generating slot=${plan.slot} (${i + 1}/${plans.length}) model=${model}`,
      );
      const r = await generateOne(openai, model, plan, ctx, quality);
      results.push(r);

      if (r.error) {
        console.warn(`[${label}] slot=${r.slot} model=${model} error=${r.error}`);
        if (
          i === 0 &&
          r.error &&
          isModelUnavailableError(r.error) &&
          fallback &&
          fallback !== model
        ) {
          console.warn(`[${label}] switching from ${model} to ${fallback} for remaining images`);
          model = fallback;
        }
      } else {
        console.info(`[${label}] slot=${r.slot} ok`);
      }
    }
  }

  const out: AdsImages = { ...empty };
  for (const r of results) {
    if (r.error) out.errors[r.slot] = r.error;
    switch (r.slot) {
      case "landingHero":
        out.landingHero = r.buffer;
        break;
      case "adFbFeed":
        out.adFbFeed = r.buffer;
        break;
      case "adIgFeed":
        out.adIgFeed = r.buffer;
        break;
      case "adIgStory":
        out.adIgStory = r.buffer;
        break;
      case "adGoogleDisplay":
        out.adGoogleDisplay = r.buffer;
        break;
      case "adHeroBanner":
        out.adHeroBanner = r.buffer;
        break;
    }
  }

  return out;
}
