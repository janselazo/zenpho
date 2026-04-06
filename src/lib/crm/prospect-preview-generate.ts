import OpenAI from "openai";
import {
  buildProspectPreviewDocument,
  sanitizeProspectPreviewBodyHtml,
  sanitizeProspectPreviewFullDocumentHtml,
} from "@/lib/crm/prospect-preview-sanitize";

export type ProspectPreviewGenerateInput = {
  businessName: string;
  /** Full formatted address when known (e.g. Google listing). */
  businessAddress: string | null;
  /** City or region for local flavor (derived or explicit). */
  city: string | null;
  /** What they offer — categories, vertical, or homepage positioning. */
  services: string;
  /** Mood / palette direction for the concept page. */
  colorVibe: string;
  primaryCategory: string | null;
  websiteUrl: string | null;
  listingPhone: string | null;
};

const ANTHROPIC_MESSAGES_URL = "https://api.anthropic.com/v1/messages";
const DEFAULT_ANTHROPIC_MODEL = "claude-sonnet-4-20250514";
const DEFAULT_OPENAI_PREVIEW_MODEL = "gpt-4o-mini";
/** Stay under CRM `maxDuration`; fail with a clear error instead of a platform timeout. */
const LLM_FETCH_TIMEOUT_MS = 110_000;
const PREVIEW_MAX_TOKENS = 8192;

type LlmJson = { fullHtml?: string; bodyHtml?: string };

function parseJsonFromModelText(raw: string): LlmJson | null {
  let t = raw.trim();
  const fence = /^```(?:json)?\s*([\s\S]*?)```$/m.exec(t);
  if (fence) t = fence[1].trim();
  try {
    return JSON.parse(t) as LlmJson;
  } catch {
    const start = t.indexOf("{");
    const end = t.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(t.slice(start, end + 1)) as LlmJson;
      } catch {
        return null;
      }
    }
    return null;
  }
}

function isFullDocumentHtml(s: string): boolean {
  const x = s.trim().toLowerCase();
  return x.startsWith("<!doctype") || x.startsWith("<html");
}

function buildPreviewPrompts(input: ProspectPreviewGenerateInput): {
  userPrompt: string;
  system: string;
} {
  const lines = [
    `Business name: ${input.businessName}`,
    `Services / focus: ${input.services}`,
    input.city ? `City / area: ${input.city}` : null,
    input.businessAddress ? `Full address: ${input.businessAddress}` : null,
    input.primaryCategory ? `Primary Google category: ${input.primaryCategory}` : null,
    input.websiteUrl ? `Existing website (reference only): ${input.websiteUrl}` : null,
    input.listingPhone ? `Phone on listing (optional to echo in CTA): ${input.listingPhone}` : null,
    `Color & mood direction: ${input.colorVibe}`,
  ].filter(Boolean);

  const userPrompt = `${lines.join("\n")}

You are generating a **single conceptual landing page** an agency might show a local business owner — not their real production site.

Return **only** a JSON object with one key \`fullHtml\` whose value is a **complete HTML5 document string**:
- Include \`<!DOCTYPE html>\`, \`<html lang="en">\`, \`<head>\` and \`<body>\`.
- Put layout and typography CSS in a \`<style>\` block in \`<head>\` (no external stylesheets, no @import).
- No JavaScript, no forms that submit, no iframes, no external tracking.
- Use semantic HTML. One hero, clear value props, one primary CTA (e.g. “Book” / “Get a quote” — placeholder #).
- Respect the color/mood direction; keep contrast accessible.
- Do not invent phone numbers or emails except you may repeat the listing phone above if provided.

Output format: {"fullHtml": "<!DOCTYPE html>..."} with properly escaped JSON (no markdown fences).`;

  const system =
    "You output only valid JSON with a single string field fullHtml containing a full HTML document. No markdown, no commentary.";

  return { userPrompt, system };
}

async function finalizeFromModelText(
  raw: string,
  providerLabel: string
): Promise<{ ok: true; html: string } | { ok: false; error: string }> {
  if (!raw.trim()) {
    return { ok: false, error: `${providerLabel} returned an empty response.` };
  }

  const parsed = parseJsonFromModelText(raw);
  let fullHtml =
    typeof parsed?.fullHtml === "string" ? parsed.fullHtml.trim() : "";
  if (!fullHtml && typeof parsed?.bodyHtml === "string") {
    const body = parsed.bodyHtml.trim();
    if (body) {
      try {
        const sanitizedBody = sanitizeProspectPreviewBodyHtml(body);
        fullHtml = buildProspectPreviewDocument(sanitizedBody);
      } catch (e) {
        console.error("[prospectPreview] body fallback sanitize failed", e);
      }
    }
  }

  if (!fullHtml) {
    return {
      ok: false,
      error: "Model returned no fullHtml (or invalid JSON).",
    };
  }

  try {
    const html = isFullDocumentHtml(fullHtml)
      ? sanitizeProspectPreviewFullDocumentHtml(fullHtml)
      : buildProspectPreviewDocument(
          sanitizeProspectPreviewBodyHtml(fullHtml),
        );
    return { ok: true, html };
  } catch (e) {
    console.error("[prospectPreview] sanitize full document failed", e);
    return {
      ok: false,
      error:
        e instanceof Error
          ? `Preview sanitization failed: ${e.message}`
          : "Preview sanitization failed.",
    };
  }
}

async function generateWithAnthropic(
  input: ProspectPreviewGenerateInput
): Promise<{ ok: true; html: string } | { ok: false; error: string }> {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) {
    return { ok: false, error: "ANTHROPIC_API_KEY is not configured." };
  }

  const model =
    process.env.ANTHROPIC_PROSPECT_PREVIEW_MODEL?.trim() ||
    DEFAULT_ANTHROPIC_MODEL;
  const { userPrompt, system } = buildPreviewPrompts(input);

  try {
    const res = await fetch(ANTHROPIC_MESSAGES_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      signal: AbortSignal.timeout(LLM_FETCH_TIMEOUT_MS),
      body: JSON.stringify({
        model,
        max_tokens: PREVIEW_MAX_TOKENS,
        system,
        messages: [{ role: "user", content: userPrompt }],
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

    if (data.error?.message) {
      return { ok: false, error: data.error.message };
    }

    const block = data.content?.find((c) => c.type === "text");
    const raw = block?.text?.trim() ?? "";
    return finalizeFromModelText(raw, "Anthropic");
  } catch (e) {
    const msg =
      e instanceof Error ? e.message : "Anthropic request failed unexpectedly.";
    if (msg.includes("abort") || msg.includes("TimeoutError")) {
      return {
        ok: false,
        error:
          "Anthropic request timed out. On Vercel, ensure this app uses a plan/limit that allows long server actions (see CRM maxDuration) or try again.",
      };
    }
    return { ok: false, error: msg };
  }
}

async function generateWithOpenAI(
  input: ProspectPreviewGenerateInput
): Promise<{ ok: true; html: string } | { ok: false; error: string }> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return { ok: false, error: "OPENAI_API_KEY is not configured." };
  }

  const model =
    process.env.OPENAI_PROSPECT_PREVIEW_MODEL?.trim() ||
    DEFAULT_OPENAI_PREVIEW_MODEL;
  const { userPrompt, system } = buildPreviewPrompts(input);
  const openai = new OpenAI({ apiKey, timeout: LLM_FETCH_TIMEOUT_MS });

  try {
    const completion = await openai.chat.completions.create({
      model,
      temperature: 0.7,
      max_tokens: PREVIEW_MAX_TOKENS,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: userPrompt },
      ],
    });
    const raw = completion.choices[0]?.message?.content?.trim() ?? "";
    return finalizeFromModelText(raw, "OpenAI");
  } catch (e) {
    const msg =
      e instanceof Error ? e.message : "OpenAI request failed unexpectedly.";
    if (/timeout|timed out|ETIMEDOUT|abort/i.test(msg)) {
      return {
        ok: false,
        error:
          "OpenAI request timed out. On Vercel, use a deployment tier with enough function duration for LLM calls, or try again.",
      };
    }
    return { ok: false, error: msg };
  }
}

/**
 * Produces a full HTML page (with optional &lt;style&gt; in &lt;head&gt;) for the hosted preview + screenshot flow.
 *
 * Provider order: **Anthropic** if `ANTHROPIC_API_KEY` is set, otherwise **OpenAI** if `OPENAI_API_KEY` is set.
 * (There is no server HTTP API for Cursor Composer in production; use OpenAI when Anthropic is not configured.)
 */
export async function generateProspectPreviewDocument(
  input: ProspectPreviewGenerateInput
): Promise<{ ok: true; html: string } | { ok: false; error: string }> {
  const preferAnthropic = Boolean(process.env.ANTHROPIC_API_KEY?.trim());

  if (preferAnthropic) {
    const r = await generateWithAnthropic(input);
    if (r.ok) return r;
    const openaiFallback = process.env.OPENAI_API_KEY?.trim();
    if (openaiFallback) {
      console.warn("[prospectPreview] Anthropic failed, falling back to OpenAI:", r.error);
      return generateWithOpenAI(input);
    }
    return r;
  }

  if (process.env.OPENAI_API_KEY?.trim()) {
    return generateWithOpenAI(input);
  }

  return {
    ok: false,
    error:
      "No LLM configured for preview. Set ANTHROPIC_API_KEY and/or OPENAI_API_KEY (e.g. in Vercel env).",
  };
}
