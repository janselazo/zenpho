import OpenAI from "openai";
import {
  automationReportLlmTimeoutMs,
  automationReportMaxOutputTokens,
} from "@/lib/crm/prospect-automation-report-limits";
import type { MetaAdCreative } from "@/lib/crm/meta-ad-intel-types";

const ANTHROPIC_MESSAGES_URL = "https://api.anthropic.com/v1/messages";
const DEFAULT_ANTHROPIC_MODEL = "claude-sonnet-4-20250514";
const DEFAULT_OPENAI_MODEL = "gpt-4o-mini";

export type VideoHookCopy = {
  hookText: string;
  ctaText: string;
};

export type VideoHookInput = {
  businessName: string;
  googleCategory?: string | null;
  city?: string | null;
  sampleAdCreatives?: MetaAdCreative[] | null;
  locale?: "en" | "es";
};

function truncate(value: string, max: number): string {
  const text = value.trim();
  return text.length > max ? text.slice(0, max - 1) : text;
}

function fallbackCopy(input: VideoHookInput): VideoHookCopy {
  const businessName = input.businessName.trim() || "this business";
  if (input.locale === "es") {
    return {
      hookText: truncate(`${businessName}: consigue mas clientes esta semana`, 72),
      ctaText: "Agenda hoy",
    };
  }
  return {
    hookText: truncate(`${businessName}: get more qualified leads this week`, 72),
    ctaText: "Book now",
  };
}

function creativeContext(creatives: MetaAdCreative[] | null | undefined): string {
  if (!creatives?.length) return "(none)";
  return JSON.stringify(
    creatives.slice(0, 4).map((creative) => ({
      body: creative.body,
      linkTitle: creative.linkTitle,
      platforms: creative.platforms,
      startTime: creative.startTime,
    })),
  );
}

function buildPrompts(input: VideoHookInput): { system: string; user: string } {
  const locale = input.locale === "es" ? "Spanish" : "English";
  return {
    system:
      "You write concise paid social video ad hooks. Return only valid JSON with keys hookText and ctaText.",
    user: `Create one short vertical video ad thumbnail hook for this prospect.

Business: ${input.businessName || "Business"}
Category: ${input.googleCategory || "(unknown)"}
City/area: ${input.city || "(unknown)"}
Language: ${locale}
Existing Meta ad creative context:
${creativeContext(input.sampleAdCreatives)}

Rules:
- hookText: 5-10 words, direct-response but not spammy.
- ctaText: 1-3 words, suitable for a button/chip.
- No emojis.
- Do not invent exact discounts, guarantees, awards, or review counts.
- Output JSON only, for example {"hookText":"...","ctaText":"..."}.`,
  };
}

function parseHookJson(raw: string): VideoHookCopy | null {
  let text = raw.trim();
  const fence = /^```(?:json)?\s*([\s\S]*?)```$/m.exec(text);
  if (fence) text = fence[1].trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start >= 0 && end > start) text = text.slice(start, end + 1);
  try {
    const parsed = JSON.parse(text) as Record<string, unknown>;
    const hookText = typeof parsed.hookText === "string" ? parsed.hookText.trim() : "";
    const ctaText = typeof parsed.ctaText === "string" ? parsed.ctaText.trim() : "";
    if (!hookText || !ctaText) return null;
    return {
      hookText: truncate(hookText, 90),
      ctaText: truncate(ctaText, 28),
    };
  } catch {
    return null;
  }
}

async function generateWithAnthropic(
  input: VideoHookInput,
): Promise<{ ok: true; data: VideoHookCopy } | { ok: false; error: string }> {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) return { ok: false, error: "ANTHROPIC_API_KEY is not configured." };

  const { system, user } = buildPrompts(input);
  const llmMs = automationReportLlmTimeoutMs();
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
        model: process.env.ANTHROPIC_VIDEO_HOOK_MODEL?.trim() || DEFAULT_ANTHROPIC_MODEL,
        max_tokens: Math.min(automationReportMaxOutputTokens(), 512),
        system,
        messages: [{ role: "user", content: user }],
      }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { ok: false, error: `Anthropic API error (${res.status}): ${text.slice(0, 240)}` };
    }
    const data = (await res.json()) as { content?: Array<{ type: string; text?: string }> };
    const raw = data.content?.find((block) => block.type === "text")?.text ?? "";
    const parsed = parseHookJson(raw);
    return parsed ? { ok: true, data: parsed } : { ok: false, error: "Anthropic returned invalid hook JSON." };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Anthropic request failed." };
  }
}

async function generateWithOpenAI(
  input: VideoHookInput,
): Promise<{ ok: true; data: VideoHookCopy } | { ok: false; error: string }> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return { ok: false, error: "OPENAI_API_KEY is not configured." };

  const { system, user } = buildPrompts(input);
  const llmMs = automationReportLlmTimeoutMs();
  try {
    const openai = new OpenAI({ apiKey, timeout: llmMs });
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_VIDEO_HOOK_MODEL?.trim() || DEFAULT_OPENAI_MODEL,
      temperature: 0.6,
      max_tokens: 512,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    });
    const parsed = parseHookJson(completion.choices[0]?.message?.content ?? "");
    return parsed ? { ok: true, data: parsed } : { ok: false, error: "OpenAI returned invalid hook JSON." };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "OpenAI request failed." };
  }
}

export async function generateVideoHookCopy(input: VideoHookInput): Promise<VideoHookCopy> {
  const hasAnthropic = Boolean(process.env.ANTHROPIC_API_KEY?.trim());
  const hasOpenAI = Boolean(process.env.OPENAI_API_KEY?.trim());

  if (hasAnthropic) {
    const result = await generateWithAnthropic(input);
    if (result.ok) return result.data;
    if (!hasOpenAI) {
      console.warn("[videoHook] Anthropic failed:", result.error);
    }
  }

  if (hasOpenAI) {
    const result = await generateWithOpenAI(input);
    if (result.ok) return result.data;
    console.warn("[videoHook] OpenAI failed:", result.error);
  }

  return fallbackCopy(input);
}
