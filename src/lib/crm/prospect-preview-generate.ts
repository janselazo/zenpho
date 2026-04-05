import OpenAI from "openai";
import { buildProspectPreviewDocument, sanitizeProspectPreviewBodyHtml } from "@/lib/crm/prospect-preview-sanitize";

export type ProspectPreviewGenerateInput = {
  businessName: string;
  businessAddress: string | null;
  primaryCategory: string | null;
  websiteUrl: string | null;
  listingPhone: string | null;
};

type LlmJson = { bodyHtml?: string };

function parseJsonContent(raw: string): LlmJson | null {
  const t = raw.trim();
  if (!t) return null;
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

/**
 * Calls OpenAI to produce a single-page HTML body (fragment). Returns full HTML document.
 */
export async function generateProspectPreviewDocument(
  input: ProspectPreviewGenerateInput
): Promise<{ ok: true; html: string } | { ok: false; error: string }> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return { ok: false, error: "OPENAI_API_KEY is not configured." };
  }

  const model =
    process.env.OPENAI_PROSPECT_PREVIEW_MODEL?.trim() || "gpt-4o-mini";

  const lines = [
    `Business name: ${input.businessName}`,
    input.businessAddress ? `Address: ${input.businessAddress}` : null,
    input.primaryCategory ? `Category: ${input.primaryCategory}` : null,
    input.websiteUrl ? `Website: ${input.websiteUrl}` : null,
    input.listingPhone ? `Phone on listing: ${input.listingPhone}` : null,
  ].filter(Boolean);

  const userPrompt = `${lines.join("\n")}

Design a single modern landing-page style HTML **fragment** (content for inside <body> only) that this agency could show a local business owner as a **concept preview** of an improved homepage. Use only **inline styles** on elements (no <style>, no external CSS, no script). Use semantic tags. Keep it concise: hero, 2–3 benefit bullets, simple CTA. Do not include real phone numbers or emails unless they appear in the inputs above. Use placeholder business name from inputs.

Respond with **only** a JSON object: {"bodyHtml": "<div>...</div>"} — no markdown fences.`;

  const openai = new OpenAI({ apiKey });

  try {
    const completion = await openai.chat.completions.create({
      model,
      temperature: 0.7,
      max_tokens: 4096,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You output only valid JSON with a single string field bodyHtml containing safe HTML body fragment.",
        },
        { role: "user", content: userPrompt },
      ],
    });
    const raw = completion.choices[0]?.message?.content?.trim() ?? "";
    const parsed = parseJsonContent(raw);
    const body = typeof parsed?.bodyHtml === "string" ? parsed.bodyHtml : null;
    if (!body?.trim()) {
      return { ok: false, error: "Model returned no bodyHtml." };
    }
    let html: string;
    try {
      const sanitizedBody = sanitizeProspectPreviewBodyHtml(body);
      html = buildProspectPreviewDocument(sanitizedBody);
    } catch (e) {
      console.error("[prospectPreview] sanitize/build failed", e);
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
    const msg = e instanceof Error ? e.message : "OpenAI request failed.";
    return { ok: false, error: msg };
  }
}
