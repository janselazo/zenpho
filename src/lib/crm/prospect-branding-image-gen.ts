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

async function generateOne(
  openai: OpenAI,
  model: string,
  plan: SlotPlan,
  spec: BrandingSpec,
  quality: ImageQuality,
): Promise<{ slot: BrandingImageSlot; buffer: Buffer | null; error?: string }> {
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
    return { slot: plan.slot, buffer: null, error: msg };
  }
}

/**
 * Generate all 7 brand-book images in parallel using OpenAI `gpt-image-2` (or the
 * model configured via `OPENAI_BRANDING_IMAGE_MODEL`). Any individual failure is
 * reported via `errors[slot]` and surfaces as a vector placeholder in the PDF, so
 * one bad image never kills the whole book.
 *
 * Defaults: model `gpt-image-2-latest`, quality `medium`, 180 s per-request timeout.
 * Requires the OpenAI org to be verified for `gpt-image-2` access.
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
    return empty;
  }

  const model =
    process.env.OPENAI_BRANDING_IMAGE_MODEL?.trim() || DEFAULT_MODEL;
  const openai = new OpenAI({ apiKey, timeout: timeoutMs() });
  const quality = qualityFromEnv();

  const results = await Promise.all(
    SLOTS.map((plan) => generateOne(openai, model, plan, spec, quality)),
  );

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
