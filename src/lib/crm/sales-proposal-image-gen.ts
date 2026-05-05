/**
 * GPT Image generation for Proposal Generation wizard only.
 * Does not modify prospect-ads-image-gen / branding funnel code.
 */

import OpenAI from "openai";
import type { SalesProposalStrategySpec } from "@/lib/crm/sales-proposal-llm";
import {
  parseImageMaxPerMinute,
  runOpenAiImageJobs,
} from "@/lib/crm/openai-image-rate-limit";
import {
  verticalImageryDirection,
  type ProspectVertical,
} from "@/lib/crm/prospect-vertical-classify";

type ImageQuality = "low" | "medium" | "high" | "auto";

const DEFAULT_MODEL = "gpt-image-2";
const DEFAULT_TIMEOUT_MS = 180_000;

const NO_TEXT_RULE =
  "Do NOT render readable text, letters, words, numbers, watermarks, logos, QR codes, or UI labels inside the image. Conceptual imagery only.";

export type ProposalAiImageGenInput = {
  strategy: SalesProposalStrategySpec | null;
  vertical: ProspectVertical;
  paletteHexes: string[];
  businessName: string;
  industryLabels: string;
  serviceNamesLine: string;
};

export type ProposalAiGeneratedImage = {
  slotIndex: number;
  caption: string;
  buffer: Buffer | null;
};

export type ProposalAiGenerateOutcome = {
  images: ProposalAiGeneratedImage[];
  errors: string[];
};

function proposalImageTimeoutMs(): number {
  const raw =
    process.env.PROPOSAL_AI_IMAGE_TIMEOUT_MS?.trim() ||
    process.env.OPENAI_BRANDING_IMAGE_TIMEOUT_MS?.trim();
  if (raw) {
    const n = Number.parseInt(raw, 10);
    if (Number.isFinite(n) && n >= 30_000) return n;
  }
  return DEFAULT_TIMEOUT_MS;
}

function qualityFromEnv(): ImageQuality {
  const raw =
    (
      process.env.OPENAI_PROPOSAL_IMAGE_QUALITY ||
      process.env.OPENAI_ADS_IMAGE_QUALITY ||
      ""
    )
      .trim()
      .toLowerCase();
  if (raw === "low" || raw === "medium" || raw === "high" || raw === "auto") {
    return raw;
  }
  return "medium";
}

function imageCount(): number {
  const raw = process.env.PROPOSAL_AI_IMAGE_COUNT?.trim();
  if (raw) {
    const n = Number.parseInt(raw, 10);
    if (Number.isFinite(n)) return Math.max(1, Math.min(3, n));
  }
  return 2;
}

function useFastMode(): boolean {
  const raw = (process.env.OPENAI_ADS_IMAGE_FAST_MODE || "").trim().toLowerCase();
  return raw !== "false";
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

function strategyDigest(spec: SalesProposalStrategySpec | null): string {
  if (!spec) return "Industry-led creative treatment for a bespoke services proposal.";
  return [
    `Angle: ${spec.executiveThesis.slice(0, 420)}`,
    `Offer story: ${spec.serviceBundleStory.slice(0, 320)}`,
  ].join("\n");
}

function paletteLine(hexes: string[]): string {
  const h = hexes.slice(0, 6).filter(Boolean);
  if (!h.length) return "";
  return `Prefer cohesive color mood using only these hues where possible (not strict): ${h.join(", ")}.`;
}

function buildPrompt(
  slotIndex: number,
  input: ProposalAiImageGenInput,
): string {
  const vibe = verticalImageryDirection(input.vertical);
  const strat = strategyDigest(input.strategy);
  const palette = paletteLine(input.paletteHexes);

  if (slotIndex === 0) {
    return `High-end editorial illustration for an agency proposal deck cover-band visual.
Buyer context: ${input.businessName}.
Industry/category vibe: ${input.industryLabels || "professional services"}.
Services context (no readable words in-image): ${input.serviceNamesLine.slice(0, 240)}.

Narrative direction:
${strat}

Visual direction: abstract outcomes, teamwork energy, craftsmanship, growth geometry — credible B2B, not stock-photo clichés.
Vertical mood: ${vibe}.
${palette}
Wide composition with calm negative space in one third for typography overlay outside this image.

${NO_TEXT_RULE}
Professional print-ready lighting. Avoid real trademark logos or celebrity likenesses.`;
  }

  return `Secondary cohesive illustration matching the hero for the same buyer proposal (${input.businessName}).
Industry: ${input.industryLabels || "general"}.
Supporting theme: momentum, measurable lift, dependable delivery systems — metaphorical shapes, light gradients, calibrated depth.
${strat}
Vertical mood: ${vibe}.
${palette}
Square-balanced composition readable at modest sizes beside proposal copy.

${NO_TEXT_RULE}`;
}

async function generateOnePng(
  openai: OpenAI,
  model: string,
  prompt: string,
  slotIndex: number,
  quality: ImageQuality,
): Promise<{ slotIndex: number; buffer: Buffer | null; error?: string }> {
  const size =
    slotIndex === 0 ? ("1536x1024" as const) : ("1024x1024" as const);

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await openai.images.generate({
        model,
        prompt,
        size,
        quality,
        n: 1,
        output_format: "png",
      });
      const b64 = res.data?.[0]?.b64_json;
      if (!b64) {
        return {
          slotIndex,
          buffer: null,
          error: "OpenAI returned no image data.",
        };
      }
      return { slotIndex, buffer: Buffer.from(b64, "base64") };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Image generation failed.";

      if (is429(msg) && attempt < MAX_RETRIES) {
        const secs = extract429WaitSecs(msg) ?? DEFAULT_429_WAIT_MS / 1000;
        const waitMs = (secs + 2) * 1000;
        console.warn(
          `[proposal-ai-images] slot=${slotIndex} 429; waiting ${waitMs}ms (attempt ${attempt + 1})`,
        );
        await new Promise((r) => setTimeout(r, waitMs));
        continue;
      }

      if (isModelUnavailableError(msg) && attempt === 0) {
        return { slotIndex, buffer: null, error: msg };
      }

      return { slotIndex, buffer: null, error: msg };
    }
  }
  return { slotIndex, buffer: null, error: "Max retries exceeded." };
}

/**
 * Sequential / rate-limited proposal illustrations (concept only).
 */
export async function generateProposalAiImages(
  input: ProposalAiImageGenInput,
): Promise<ProposalAiGenerateOutcome> {
  const out: ProposalAiGeneratedImage[] = [];
  const errors: string[] = [];

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    errors.push("OPENAI_API_KEY is not configured.");
    return { images: out, errors };
  }

  const n = imageCount();
  const jobs = Array.from({ length: n }, (_, i) => i);

  let model =
    process.env.OPENAI_PROPOSAL_IMAGE_MODEL?.trim() || DEFAULT_MODEL;
  const fallback =
    process.env.OPENAI_PROPOSAL_IMAGE_MODEL_FALLBACK?.trim() || "gpt-image-1";
  const quality = qualityFromEnv();
  const openai = new OpenAI({ apiKey, timeout: proposalImageTimeoutMs() });

  const labels = [
    "Primary concept visualization",
    "Secondary supporting visual",
    "Tertiary supporting visual",
  ];

  const pushResult = (
    r: {
      slotIndex: number;
      buffer: Buffer | null;
      error?: string;
    },
    switchedModel?: string,
  ) => {
    if (r.error) {
      errors.push(`slot ${r.slotIndex}: ${r.error}`);
    }
    const caption =
      labels[r.slotIndex] ?? `Visualization ${r.slotIndex + 1}`;
    out.push({
      slotIndex: r.slotIndex,
      caption,
      buffer: r.buffer,
    });
    return switchedModel;
  };

  if (useFastMode()) {
    const results = await runOpenAiImageJobs({
      label: "proposal-ai-images",
      jobs,
      maxPerMinute: parseImageMaxPerMinute(
        process.env.OPENAI_ADS_IMAGE_MAX_PER_MINUTE,
      ),
      run: async (slotIndex) =>
        generateOnePng(
          openai,
          model,
          buildPrompt(slotIndex, input),
          slotIndex,
          quality,
        ),
    });

    let currentModel = model;
    for (const r of results) {
      if (
        r.slotIndex === 0 &&
        r.error &&
        isModelUnavailableError(r.error) &&
        fallback &&
        fallback !== currentModel
      ) {
        currentModel = fallback;
        console.warn(
          `[proposal-ai-images] switching to fallback model=${currentModel} (limited — already ran batch); future runs use env.`,
        );
      }
      pushResult(r);
    }
    return { images: out, errors };
  }

  for (let i = 0; i < jobs.length; i++) {
    const slotIndex = jobs[i]!;
    if (i > 0) {
      await new Promise((r) => setTimeout(r, INTER_REQUEST_DELAY_MS));
    }
    const r = await generateOnePng(
      openai,
      model,
      buildPrompt(slotIndex, input),
      slotIndex,
      quality,
    );
    if (
      slotIndex === 0 &&
      r.error &&
      isModelUnavailableError(r.error) &&
      fallback &&
      fallback !== model
    ) {
      console.warn(`[proposal-ai-images] switched to fallback model=${fallback}`);
      model = fallback;
    }
    pushResult(r);
  }

  return { images: out, errors };
}

export function paletteHexesFromBrand(
  palette: string[],
  primary: string | null,
  accent: string | null,
): string[] {
  const merged = [
    ...(primary ? [primary] : []),
    ...(accent ? [accent] : []),
  ];
  const rest = [...palette].filter(Boolean);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const h of [...merged, ...rest]) {
    const t = h.trim();
    if (!t || seen.has(t)) continue;
    seen.add(t);
    out.push(t);
    if (out.length >= 8) break;
  }
  return out;
}
