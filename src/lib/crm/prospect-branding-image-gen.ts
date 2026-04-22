import OpenAI from "openai";
import type { BrandingSpec } from "@/lib/crm/prospect-branding-spec-llm";

const DEFAULT_MODEL = "gpt-image-2-latest";
const DEFAULT_TIMEOUT_MS = 180_000;

type ImageSize = "1024x1024" | "1536x1024" | "1024x1536";
type ImageQuality = "low" | "medium" | "high" | "auto";

/** Shape returned by `generateBrandingImages`. All values may be `null` when an
 * individual generation fails — the PDF renderer falls back to vector placeholders. */
export type BrandingImages = {
  cover: Buffer | null;
  logos: [Buffer | null, Buffer | null, Buffer | null];
  moodboard: Buffer | null;
  pattern: Buffer | null;
  merch: Buffer | null;
  /** Per-slot error strings, for debugging / surfacing on the client. */
  errors: Partial<Record<BrandingImageSlot, string>>;
};

export type BrandingImageSlot =
  | "cover"
  | "logo-wordmark"
  | "logo-icon"
  | "logo-emblem"
  | "moodboard"
  | "pattern"
  | "merch";

type SlotPlan = {
  slot: BrandingImageSlot;
  size: ImageSize;
  prompt: (spec: BrandingSpec) => string;
};

function paletteLine(spec: BrandingSpec): string {
  const primary = spec.primaryColors
    .map((c) => `${c.name} ${c.hex}`)
    .join(", ");
  const secondary = spec.secondaryColors
    .map((c) => `${c.name} ${c.hex}`)
    .join(", ");
  const pieces = [
    primary ? `Primary palette: ${primary}.` : "",
    secondary ? `Secondary palette: ${secondary}.` : "",
  ].filter(Boolean);
  return pieces.join(" ");
}

function personalityLine(spec: BrandingSpec): string {
  const traits = spec.brandPersonality.slice(0, 4).join(", ");
  return traits ? `Brand personality: ${traits}.` : "";
}

function brandLine(spec: BrandingSpec): string {
  return `Brand: ${spec.brandName}. Industry: ${spec.industry || "local business"}.`;
}

const SLOTS: SlotPlan[] = [
  {
    slot: "cover",
    size: "1536x1024",
    prompt: (spec) => `Editorial cover artwork for a Brand Guidelines book.
${brandLine(spec)}
${personalityLine(spec)}
${paletteLine(spec)}
Mood: ${spec.imageryStyle || "clean, modern, confident"}.
Composition: large uncluttered negative space, abstract or evocative imagery (NOT a literal logo, NOT any readable text). Think of a magazine cover background — it should complement overlaid typography. Use only the colors from the palette above; avoid unrelated hues. Print-quality, no watermarks, no ui, no captions.`,
  },
  {
    slot: "logo-wordmark",
    size: "1024x1024",
    prompt: (spec) => `A clean ${spec.fontPairingId.includes("serif") ? "serif" : "sans-serif"} WORDMARK logo for "${spec.brandName}".
${personalityLine(spec)}
Single-color execution in ${spec.primaryColors[0]?.hex || "#111111"} on a pure solid ${spec.secondaryColors.find((c) => /white|cream|ivory/i.test(c.name))?.hex || "#FFFFFF"} background. Centered, generous padding, vector-style, crisp edges. ONLY the brand name as text. No taglines, no icons, no shadows, no 3D, no textures, no busy decoration.`,
  },
  {
    slot: "logo-icon",
    size: "1024x1024",
    prompt: (spec) => `A minimalist ICON / symbol logo for "${spec.brandName}".
${personalityLine(spec)}
Key visual motifs to consider: ${spec.keyVisualElements.slice(0, 3).join("; ") || "simple geometric shapes"}.
Single-color execution in ${spec.primaryColors[0]?.hex || "#111111"} on solid ${spec.secondaryColors.find((c) => /white|cream|ivory/i.test(c.name))?.hex || "#FFFFFF"} background. Strong silhouette, balanced, scalable. No text. No gradients, no 3D, no shadows. Vector-style.`,
  },
  {
    slot: "logo-emblem",
    size: "1024x1024",
    prompt: (spec) => `An EMBLEM / badge logo for "${spec.brandName}" — circular or shield-shaped seal with the brand name on it.
${personalityLine(spec)}
Colors: primary ${spec.primaryColors[0]?.hex || "#111111"}, accent ${spec.primaryColors[1]?.hex || spec.primaryColors[0]?.hex || "#444444"}, on solid white background. Tight composition, self-contained. Vector-style, two-color max, no 3D, no photo-realism, no intricate illustration.`,
  },
  {
    slot: "moodboard",
    size: "1024x1024",
    prompt: (spec) => `Photographic moodboard for a brand imagery direction.
${brandLine(spec)}
${personalityLine(spec)}
Imagery style: ${spec.imageryStyle || "natural light, human-centered, authentic"}.
Target audience: ${spec.targetAudience || "local customers"}.
Composition: a 2x2 photography collage of FOUR distinct but stylistically consistent scenes representing the brand's world (environments, people, textures, details). Cohesive color grading aligned with ${paletteLine(spec)}. NO text, NO graphics overlays, NO logos. Magazine editorial quality.`,
  },
  {
    slot: "pattern",
    size: "1024x1024",
    prompt: (spec) => `A seamless tileable repeat PATTERN swatch for secondary brand usage.
${brandLine(spec)}
Motifs: ${spec.keyVisualElements.slice(0, 3).join("; ") || "simple geometric marks"}.
Colors: use ONLY ${spec.primaryColors.map((c) => c.hex).join(" and ")} ${spec.secondaryColors.length ? `with ${spec.secondaryColors[0].hex} ground` : "on white"}. Even coverage edge-to-edge so the image can tile. Flat / vector-style, medium density, no gradients, no photography. No text.`,
  },
  {
    slot: "merch",
    size: "1024x1024",
    prompt: (spec) => `A clean flat-lay product mockup showcasing brand merchandise.
${brandLine(spec)}
${personalityLine(spec)}
Compose three items on a neutral studio backdrop: a folded t-shirt, a ceramic mug, and a canvas tote bag. Each item carries a minimal abstract brand mark in ${spec.primaryColors[0]?.hex || "#111111"} (NOT readable real text). Background tinted ${spec.secondaryColors[0]?.hex || "#F5F5F0"}. Overhead angle, soft shadows, product-catalog quality, no people, no logos with real letters, no captions.`,
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
  const raw = (process.env.OPENAI_BRANDING_IMAGE_QUALITY || "").trim().toLowerCase();
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

async function generateOne(
  openai: OpenAI,
  model: string,
  plan: SlotPlan,
  spec: BrandingSpec,
  quality: ImageQuality,
): Promise<{ slot: BrandingImageSlot; buffer: Buffer | null; error?: string }> {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await openai.images.generate({
        model,
        prompt: plan.prompt(spec),
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
          `[branding-images] slot=${plan.slot} 429 hit (attempt ${attempt + 1}/${MAX_RETRIES + 1}), waiting ${waitMs}ms`,
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

/** Minimum pause between sequential image requests (ms). Keeps us under most
 * org-level rate limits (typically 5/min). */
const INTER_REQUEST_DELAY_MS = 13_000;

/**
 * Generate all 7 brand-book images **sequentially** using OpenAI image models.
 * Sequential + inter-request delay avoids 429 rate limits (most orgs have a
 * 5 images/min cap). Each call retries up to 3× on 429 with the server-
 * suggested wait time.
 *
 * If the primary model fails on the first image with a "model unavailable"
 * error, all remaining images fall back to OPENAI_BRANDING_IMAGE_MODEL_FALLBACK.
 */
export async function generateBrandingImages(
  spec: BrandingSpec,
): Promise<BrandingImages> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  const empty: BrandingImages = {
    cover: null,
    logos: [null, null, null],
    moodboard: null,
    pattern: null,
    merch: null,
    errors: {},
  };

  if (!apiKey) {
    const err = "OPENAI_API_KEY is not configured.";
    for (const plan of SLOTS) empty.errors[plan.slot] = err;
    console.warn("[branding-images] " + err);
    return empty;
  }

  const requested =
    process.env.OPENAI_BRANDING_IMAGE_MODEL?.trim() || DEFAULT_MODEL;
  const fallback =
    process.env.OPENAI_BRANDING_IMAGE_MODEL_FALLBACK?.trim() || "gpt-image-1";
  const openai = new OpenAI({ apiKey, timeout: timeoutMs() });
  const quality = qualityFromEnv();

  let model = requested;
  console.info(`[branding-images] starting sequential generation with model=${model} quality=${quality}`);

  const results: { slot: BrandingImageSlot; buffer: Buffer | null; error?: string }[] = [];

  for (let i = 0; i < SLOTS.length; i++) {
    const plan = SLOTS[i];

    if (i > 0) {
      console.info(`[branding-images] waiting ${INTER_REQUEST_DELAY_MS}ms before slot=${plan.slot}`);
      await new Promise((r) => setTimeout(r, INTER_REQUEST_DELAY_MS));
    }

    console.info(`[branding-images] generating slot=${plan.slot} (${i + 1}/${SLOTS.length}) model=${model}`);
    const r = await generateOne(openai, model, plan, spec, quality);
    results.push(r);

    if (r.error) {
      console.warn(`[branding-images] slot=${r.slot} model=${model} error=${r.error}`);

      if (i === 0 && r.error && isModelUnavailableError(r.error) && fallback && fallback !== model) {
        console.warn(`[branding-images] switching from ${model} to ${fallback} for remaining images`);
        model = fallback;
      }
    } else {
      console.info(`[branding-images] slot=${r.slot} ok`);
    }
  }

  const images: BrandingImages = {
    cover: null,
    logos: [null, null, null],
    moodboard: null,
    pattern: null,
    merch: null,
    errors: {},
  };

  for (const r of results) {
    if (r.error) images.errors[r.slot] = r.error;
    switch (r.slot) {
      case "cover":
        images.cover = r.buffer;
        break;
      case "logo-wordmark":
        images.logos[0] = r.buffer;
        break;
      case "logo-icon":
        images.logos[1] = r.buffer;
        break;
      case "logo-emblem":
        images.logos[2] = r.buffer;
        break;
      case "moodboard":
        images.moodboard = r.buffer;
        break;
      case "pattern":
        images.pattern = r.buffer;
        break;
      case "merch":
        images.merch = r.buffer;
        break;
    }
  }

  return images;
}
