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
const DEFAULT_MODEL = "claude-sonnet-4-20250514";

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

/**
 * Calls Anthropic Messages API to produce a complete HTML page (with &lt;style&gt; allowed in &lt;head&gt;).
 * Uses fetch only — no OpenAI / Anthropic SDK.
 */
export async function generateProspectPreviewDocument(
  input: ProspectPreviewGenerateInput
): Promise<{ ok: true; html: string } | { ok: false; error: string }> {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) {
    return {
      ok: false,
      error: "ANTHROPIC_API_KEY is not configured.",
    };
  }

  const model =
    process.env.ANTHROPIC_PROSPECT_PREVIEW_MODEL?.trim() || DEFAULT_MODEL;

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

  const system = `You output only valid JSON with a single string field fullHtml containing a full HTML document. No markdown, no commentary.`;

  try {
    const res = await fetch(ANTHROPIC_MESSAGES_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: 16384,
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
    if (!raw) {
      return { ok: false, error: "Anthropic returned an empty response." };
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

    let html: string;
    try {
      html = isFullDocumentHtml(fullHtml)
        ? sanitizeProspectPreviewFullDocumentHtml(fullHtml)
        : buildProspectPreviewDocument(
            sanitizeProspectPreviewBodyHtml(fullHtml),
          );
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

    return { ok: true, html };
  } catch (e) {
    const msg =
      e instanceof Error ? e.message : "Anthropic request failed unexpectedly.";
    return { ok: false, error: msg };
  }
}
