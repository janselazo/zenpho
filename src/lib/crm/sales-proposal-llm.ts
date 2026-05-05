import OpenAI from "openai";
import type { CrmProductServiceRow } from "@/lib/crm/crm-catalog-types";
import {
  proposalGenerationLlmTimeoutMs,
  proposalGenerationMaxOutputTokens,
} from "@/lib/crm/proposal-generation-limits";

export type SalesProposalLlmClientContext = {
  name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
};

const DEFAULT_OPENAI_MODEL = "gpt-5.5";

const AGENCY_VOICE =
  "Zenpho positioning: outcomes-led product and growth studio. Voice is professional, warm, concise, trustworthy—consultative seller, not hypey. Match the framing used in polished agency proposals: specifics, timelines, clarity on investment.";

export type SalesProposalLlmParsed = {
  title: string;
  markdown: string;
};

function parseJsonFromCompletion(raw: string): SalesProposalLlmParsed | null {
  let t = raw.trim();
  const fence = /^```(?:json)?\s*([\s\S]*?)```$/m.exec(t);
  if (fence) t = fence[1]!.trim();
  try {
    const o = JSON.parse(t) as Record<string, unknown>;
    const title =
      typeof o.title === "string" ? o.title.trim() : "";
    const markdown =
      typeof o.markdown === "string"
        ? o.markdown.trim()
        : typeof o.body === "string"
          ? o.body.trim()
          : "";
    if (!title || !markdown) return null;
    return { title, markdown };
  } catch {
    const start = t.indexOf("{");
    const end = t.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        const o = JSON.parse(t.slice(start, end + 1)) as Record<
          string,
          unknown
        >;
        const title =
          typeof o.title === "string" ? o.title.trim() : "";
        const markdown =
          typeof o.markdown === "string"
            ? o.markdown.trim()
            : typeof o.body === "string"
              ? o.body.trim()
              : "";
        if (!title || !markdown) return null;
        return { title, markdown };
      } catch {
        return null;
      }
    }
    return null;
  }
}

function formatServices(services: CrmProductServiceRow[]): string {
  return services
    .map((s, i) => {
      const price = new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: (s.currency || "usd").toUpperCase(),
        minimumFractionDigits: 2,
      }).format(s.unit_price);
      return `${i + 1}. ${s.name}\n   Price guide: ${price}\n   Description: ${s.description.trim() || "—"}`;
    })
    .join("\n\n");
}

export async function generateSalesProposalMarkdown(input: {
  client: SalesProposalLlmClientContext;
  services: CrmProductServiceRow[];
  wizardNotes: string;
  /** Optional factual signals from Places + scraped website hues. */
  enrichment?: {
    listingBlock: string | null;
    brandSignalsBlock: string | null;
  } | null;
}): Promise<
  | ({ ok: true } & SalesProposalLlmParsed)
  | { ok: false; error: string }
> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return {
      ok: false,
      error: "OPENAI_API_KEY is not configured on the server.",
    };
  }

  const model =
    process.env.OPENAI_PROPOSAL_MODEL?.trim() || DEFAULT_OPENAI_MODEL;

  const clientLines = [
    `Name / contact label: ${input.client.name}`,
    input.client.company ? `Company: ${input.client.company}` : null,
    input.client.email ? `Email: ${input.client.email}` : null,
    input.client.phone ? `Phone: ${input.client.phone}` : null,
    input.client.notes?.trim()
      ? `Notes on file:\n${input.client.notes.trim()}`
      : null,
    input.wizardNotes.trim()
      ? `Sales rep instructions / nuances:\n${input.wizardNotes.trim()}`
      : null,
  ]
    .filter(Boolean)
    .join("\n");

  const system = `${AGENCY_VOICE}

You write client-facing proposals for a consulting / product studio.

Return ONLY a JSON object with exactly two string fields:
- "title": short internal-facing proposal title (include client business name).
- "markdown": the full proposal in GitHub-flavored Markdown.

The markdown MUST use ## headings exactly in this order (no sections skipped):
## Proposal Title
## Executive Summary
## Client Overview
## Goals / Objectives
## Recommended Services
## Scope of Work
## Deliverables
## Timeline
## Investment / Pricing
## Why Work With Us
## Next Steps
## Signature / Acceptance

Under "Proposal Title" repeat or refine the main title once (one line).

Use bullet lists where helpful. Tie recommendations to the services and pricing data provided.

When ENRICHMENT blocks are supplied (Google listing or scraped hues), weave industry/category language that matches Google's category labels naturally (do not quote them mechanically).

Do NOT invent Markdown image syntax or external image URLs — approved listing photography is stitched in automatically after generation.

Do not invent contact emails or URLs not implied by inputs. Numbers for totals should align with summed service pricing when sensible.`;

  const enrichmentText = [
    input.enrichment?.listingBlock?.trim(),
    input.enrichment?.brandSignalsBlock?.trim(),
  ]
    .filter(Boolean)
    .join("\n");

  const enrichmentSection = enrichmentText.trim()
    ? [
        "",
        "ENRICHMENT — use for tone / industry tailoring; CRM client facts still win:",
        input.enrichment?.listingBlock?.trim()
          ? `GOOGLE LISTING / CATEGORY CONTEXT\n${input.enrichment!.listingBlock!.trim()}`
          : null,
        input.enrichment?.brandSignalsBlock?.trim()
          ? `HOMEPAGE BRAND SIGNALS (automated scrape — illustrative only)\n${input.enrichment!.brandSignalsBlock!.trim()}`
          : null,
      ]
        .filter(Boolean)
        .join("\n")
    : "";

  const user = `Context for this proposal:

CLIENT
${clientLines}${enrichmentSection}

SERVICES SELECTED (use these as the commercial basis)
${formatServices(input.services)}

Write the JSON now.`;

  const llmMs = proposalGenerationLlmTimeoutMs();
  const maxTokens = proposalGenerationMaxOutputTokens();

  try {
    const openai = new OpenAI({ apiKey, timeout: llmMs });
    const completion = await openai.chat.completions.create({
      model,
      temperature: 0.65,
      max_completion_tokens: maxTokens,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    });
    const raw = completion.choices[0]?.message?.content?.trim() ?? "";
    const parsed = parseJsonFromCompletion(raw);
    if (!parsed) {
      return {
        ok: false,
        error: "The model returned an invalid JSON proposal. Try regenerating.",
      };
    }
    return { ok: true, ...parsed };
  } catch (e) {
    const msg =
      e instanceof Error ? e.message : "OpenAI proposal generation failed.";
    if (/timeout|timed out|ETIMEDOUT|abort/i.test(msg)) {
      return {
        ok: false,
        error: `Proposal generation timed out (${llmMs}ms). Try again or raise PROPOSAL_GENERATION_LLM_BUDGET_MS.`,
      };
    }
    return { ok: false, error: msg };
  }
}
