import OpenAI from "openai";
import type { CrmProductServiceRow } from "@/lib/crm/crm-catalog-types";
import { catalogListAndEffectivePrice } from "@/lib/crm/crm-catalog-pricing";
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

/** Some chat models reject non-default temperature (OpenAI returns 400). Proposal-only — branding LLM paths unchanged. */
function proposalModelSupportsCustomTemperature(modelId: string): boolean {
  const base = modelId.trim().toLowerCase().split("/").pop() ?? "";
  if (base.startsWith("gpt-5")) return false;
  if (base.startsWith("o1")) return false;
  if (base.startsWith("o3")) return false;
  if (base.startsWith("o4")) return false;
  return true;
}

function proposalCompletionTemperature(
  modelId: string,
  temperature: number
): { temperature: number } | Record<string, never> {
  return proposalModelSupportsCustomTemperature(modelId)
    ? { temperature }
    : {};
}

const AGENCY_VOICE =
  "Zenpho positioning: outcomes-led product and growth studio. Voice is professional, warm, concise, trustworthy—consultative seller, not hypey. Match the framing used in polished agency proposals: specifics, timelines, clarity on investment.";

export type SalesProposalLlmParsed = {
  title: string;
  markdown: string;
};

/** Layer-1 structured plan before full markdown composition (proposal-only schema). */
export type SalesProposalStrategySpec = {
  titleHint: string;
  executiveThesis: string;
  clientContextFrame: string;
  serviceBundleStory: string;
  sectionBullets: {
    executiveSummary: string[];
    clientOverview: string[];
    goals: string[];
    recommendedServices: string[];
    scope: string[];
    deliverables: string[];
    timeline: string[];
    investment: string[];
    whyUs: string[];
    nextSteps: string[];
  };
  objectionsToAddress: string[];
};

export function formatProposalServicesBlock(
  services: CrmProductServiceRow[],
): string {
  return services
    .map((s, i) => {
      const cur = (s.currency || "usd").toUpperCase();
      const pe = catalogListAndEffectivePrice(s);
      const fmt = (n: number) =>
        new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: cur,
          minimumFractionDigits: 2,
        }).format(n);
      const priceGuide = pe.hasDiscount
        ? `${fmt(pe.listPrice)} (promotional ${fmt(pe.effectivePrice)})`
        : fmt(pe.listPrice);
      return `${i + 1}. ${s.name}\n   Price guide: ${priceGuide}\n   Description: ${s.description.trim() || "—"}`;
    })
    .join("\n\n");
}

function strategyPromptMaxCompletionTokens(): number {
  const cap = proposalGenerationMaxOutputTokens();
  return Math.min(4_096, Math.max(1_024, cap));
}

function coerceStringArray(raw: unknown, limit: number): string[] {
  if (!Array.isArray(raw)) return [];
  const out = raw
    .filter((x): x is string => typeof x === "string")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, limit);
  return out;
}

function coerceSectionBullets(
  raw: unknown,
): SalesProposalStrategySpec["sectionBullets"] {
  const emp = (): SalesProposalStrategySpec["sectionBullets"] => ({
    executiveSummary: [],
    clientOverview: [],
    goals: [],
    recommendedServices: [],
    scope: [],
    deliverables: [],
    timeline: [],
    investment: [],
    whyUs: [],
    nextSteps: [],
  });
  if (!raw || typeof raw !== "object") return emp();
  const o = raw as Record<string, unknown>;
  const pick = (k: string) => coerceStringArray(o[k], 12);
  return {
    executiveSummary: pick("executiveSummary"),
    clientOverview: pick("clientOverview"),
    goals: pick("goals"),
    recommendedServices: pick("recommendedServices"),
    scope: pick("scope"),
    deliverables: pick("deliverables"),
    timeline: pick("timeline"),
    investment: pick("investment"),
    whyUs: pick("whyUs"),
    nextSteps: pick("nextSteps"),
  };
}

export function coerceSalesProposalStrategySpec(
  raw: unknown,
): SalesProposalStrategySpec | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const titleHint =
    typeof o.titleHint === "string" ? o.titleHint.trim().slice(0, 280) : "";
  const executiveThesis =
    typeof o.executiveThesis === "string"
      ? o.executiveThesis.trim().slice(0, 900)
      : "";
  if (!executiveThesis || !titleHint) return null;
  return {
    titleHint,
    executiveThesis,
    clientContextFrame:
      typeof o.clientContextFrame === "string"
        ? o.clientContextFrame.trim().slice(0, 900)
        : "",
    serviceBundleStory:
      typeof o.serviceBundleStory === "string"
        ? o.serviceBundleStory.trim().slice(0, 900)
        : "",
    sectionBullets: coerceSectionBullets(o.sectionBullets),
    objectionsToAddress: coerceStringArray(o.objectionsToAddress, 8),
  };
}

function parseStrategyJson(raw: string): SalesProposalStrategySpec | null {
  let t = raw.trim();
  const fence = /^```(?:json)?\s*([\s\S]*?)```$/m.exec(t);
  if (fence) t = fence[1]!.trim();
  try {
    return coerceSalesProposalStrategySpec(JSON.parse(t));
  } catch {
    const start = t.indexOf("{");
    const end = t.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return coerceSalesProposalStrategySpec(JSON.parse(t.slice(start, end + 1)));
      } catch {
        return null;
      }
    }
    return null;
  }
}

export type ProposalLlmFactsInput = {
  client: SalesProposalLlmClientContext;
  services: CrmProductServiceRow[];
  wizardNotes: string;
  enrichment?: {
    listingBlock: string | null;
    brandSignalsBlock: string | null;
  } | null;
};

function buildClientLines(
  client: SalesProposalLlmClientContext,
  wizardNotes: string,
): string {
  return [
    `Name / contact label: ${client.name}`,
    client.company ? `Company: ${client.company}` : null,
    client.email ? `Email: ${client.email}` : null,
    client.phone ? `Phone: ${client.phone}` : null,
    client.notes?.trim()
      ? `Notes on file:\n${client.notes.trim()}`
      : null,
    wizardNotes.trim()
      ? `Sales rep instructions / nuances:\n${wizardNotes.trim()}`
      : null,
  ]
    .filter(Boolean)
    .join("\n");
}

function buildEnrichmentSection(
  enrichment: ProposalLlmFactsInput["enrichment"],
): string {
  const enrichmentText = [
    enrichment?.listingBlock?.trim(),
    enrichment?.brandSignalsBlock?.trim(),
  ]
    .filter(Boolean)
    .join("\n");
  return enrichmentText.trim()
    ? [
        "",
        "ENRICHMENT — tone / category tailoring only; CRM wins for facts:",
        enrichment?.listingBlock?.trim()
          ? `GOOGLE LISTING\n${enrichment!.listingBlock!.trim()}`
          : null,
        enrichment?.brandSignalsBlock?.trim()
          ? `HOMEPAGE BRAND SIGNALS (scrape — illustrative)\n${enrichment!.brandSignalsBlock!.trim()}`
          : null,
      ]
        .filter(Boolean)
        .join("\n")
    : "";
}

function sectionBulletsForPrompt(spec: SalesProposalStrategySpec): string {
  const s = spec.sectionBullets;
  const block = (
    title: string,
    arr: string[],
  ) =>
    arr.length ? `${title}:\n${arr.map((b) => `  - ${b}`).join("\n")}` : "";

  return [
    block("Executive Summary", s.executiveSummary),
    block("Client Overview", s.clientOverview),
    block("Goals", s.goals),
    block("Recommended Services", s.recommendedServices),
    block("Scope of Work", s.scope),
    block("Deliverables", s.deliverables),
    block("Timeline", s.timeline),
    block("Investment", s.investment),
    block("Why Work With Us", s.whyUs),
    block("Next Steps", s.nextSteps),
  ]
    .filter(Boolean)
    .join("\n\n");
}

function parseMarkdownJson(raw: string): SalesProposalLlmParsed | null {
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

/**
 * Structured strategy pass — mirrors “spec before composition” branding flow,
 * scoped to CRM proposals only.
 */
export async function generateSalesProposalStrategySpec(
  input: ProposalLlmFactsInput,
): Promise<
  | { ok: true; data: SalesProposalStrategySpec }
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

  const servicesBlock = formatProposalServicesBlock(input.services);
  const clientLines = buildClientLines(input.client, input.wizardNotes);
  const enrich = buildEnrichmentSection(input.enrichment);

  const system = `${AGENCY_VOICE}

You are planning a consultancy proposal outline (no long prose).

Return ONLY JSON with exactly:
{
  "titleHint": string (≤90 chars — working title incl. buyer org name),
  "executiveThesis": string (2–5 sentences articulating winning angle),
  "clientContextFrame": string (neutral restatement of situation / category),
  "serviceBundleStory": string (why this bundled offering fits NOW),
  "sectionBullets": {
    "executiveSummary": string[],
    "clientOverview": string[],
    "goals": string[],
    "recommendedServices": string[],
    "scope": string[],
    "deliverables": string[],
    "timeline": string[],
    "investment": string[],
    "whyUs": string[],
    "nextSteps": string[]
  },
  "objectionsToAddress": string[]
}

Rules:
- Each sectionBullets array: 3–7 short bullets (fragments okay).
- Do NOT invent numeric prices — pricing numbers exist only in SERVICES block downstream.
- Do NOT output markdown headings or markdown images — planning only.
- Respect ENRICHMENT for tone / categories; CLIENT block is factual.`;

  const user = `CLIENT
${clientLines}${enrich}

SERVICES SHORTLIST (identifiers + guide pricing — factual)
${servicesBlock}

Return JSON now.`;

  const llmMs = proposalGenerationLlmTimeoutMs();
  const maxOut = strategyPromptMaxCompletionTokens();

  try {
    const openai = new OpenAI({ apiKey, timeout: llmMs });
    const completion = await openai.chat.completions.create({
      model,
      ...proposalCompletionTemperature(model, 0.55),
      max_completion_tokens: maxOut,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    });
    const raw = completion.choices[0]?.message?.content?.trim() ?? "";
    const parsed = parseStrategyJson(raw);
    if (!parsed) {
      return {
        ok: false,
        error: "Strategy model returned invalid JSON. Try again.",
      };
    }
    return { ok: true, data: parsed };
  } catch (e) {
    const msg =
      e instanceof Error ? e.message : "OpenAI strategy generation failed.";
    if (/timeout|timed out|ETIMEDOUT|abort/i.test(msg)) {
      return {
        ok: false,
        error: `Proposal strategy timed out (${llmMs}ms). Try again or adjust PROPOSAL_GENERATION_LLM_BUDGET_MS.`,
      };
    }
    return { ok: false, error: msg };
  }
}

/**
 * Expands validated strategy JSON + immutable CRM/service facts into markdown.
 */
export async function expandSalesProposalFromStrategy(
  spec: SalesProposalStrategySpec,
  input: ProposalLlmFactsInput,
): Promise<
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

  const clientLines = buildClientLines(input.client, input.wizardNotes);
  const enrich = buildEnrichmentSection(input.enrichment);
  const servicesBlock = formatProposalServicesBlock(input.services);

  const system = `${AGENCY_VOICE}

You compose the final buyer-facing Markdown proposal FROM a PLAN plus FACTS.

Return ONLY JSON with keys "title" and "markdown" (GitHub-flavored Markdown string).

MARKDOWN RULES — headings must appear exactly once each, in order:
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

Under "## Proposal Title" put a single line title (may refine titleHint).

- Follow STRATEGY for narrative arc / bullets — expand bullets into fluent prose mixed with bullets.
- SERVICES block is authoritative for descriptions and price guides; totals must be consistent when you sum visually.
- Do NOT invent markdown images or URLs — visuals are stitched server-side.

When ENRICHMENT exists, weave industry language naturally without robotic quoting.

No invented emails/URLs absent from CLIENT/ENRICHMENT.`;

  const strategyBlock = `
STRATEGY (follow closely)
Title hint: ${spec.titleHint}
Executive thesis: ${spec.executiveThesis}
Client context frame: ${spec.clientContextFrame}
Service bundle story: ${spec.serviceBundleStory}
${spec.objectionsToAddress.length ? `Preempt objections:\n${spec.objectionsToAddress.map((x) => `- ${x}`).join("\n")}` : ""}

Planned bullets by section:
${sectionBulletsForPrompt(spec)}
`.trim();

  const user = `CONTEXT
CLIENT
${clientLines}${enrich}

SERVICES SELECTED (commercial basis — source of numeric truth)
${servicesBlock}

${strategyBlock}

Return JSON {"title","markdown"} now.`;

  const llmMs = proposalGenerationLlmTimeoutMs();
  const maxTokens = proposalGenerationMaxOutputTokens();

  try {
    const openai = new OpenAI({ apiKey, timeout: llmMs });
    const completion = await openai.chat.completions.create({
      model,
      ...proposalCompletionTemperature(model, 0.62),
      max_completion_tokens: maxTokens,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    });
    const raw = completion.choices[0]?.message?.content?.trim() ?? "";
    const parsed = parseMarkdownJson(raw);
    if (!parsed) {
      return {
        ok: false,
        error: "The model returned invalid JSON proposal text. Try regenerating.",
      };
    }
    return { ok: true, ...parsed };
  } catch (e) {
    const msg =
      e instanceof Error ? e.message : "OpenAI proposal expansion failed.";
    if (/timeout|timed out|ETIMEDOUT|abort/i.test(msg)) {
      return {
        ok: false,
        error: `Proposal expansion timed out (${llmMs}ms). Try again or raise PROPOSAL_GENERATION_LLM_BUDGET_MS.`,
      };
    }
    return { ok: false, error: msg };
  }
}

/**
 * Legacy single-shot path — used when PROPOSAL_STRATEGY_DISABLED is truthy or strategy passes fail upstream.
 */
export async function generateSalesProposalMarkdown(
  input: ProposalLlmFactsInput,
): Promise<
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

  const clientLines = buildClientLines(input.client, input.wizardNotes);

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
${formatProposalServicesBlock(input.services)}

Write the JSON now.`;

  const llmMs = proposalGenerationLlmTimeoutMs();
  const maxTokens = proposalGenerationMaxOutputTokens();

  try {
    const openai = new OpenAI({ apiKey, timeout: llmMs });
    const completion = await openai.chat.completions.create({
      model,
      ...proposalCompletionTemperature(model, 0.65),
      max_completion_tokens: maxTokens,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    });
    const raw = completion.choices[0]?.message?.content?.trim() ?? "";
    const parsed = parseMarkdownJson(raw);
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

/**
 * Translates proposal markdown to professional Spanish for the editor toggle.
 * Preserves structure, URLs, and image lines `![alt](url)`.
 */
export async function translateProposalMarkdownToSpanish(markdown: string): Promise<
  { ok: true; markdown: string } | { ok: false; error: string }
> {
  const trimmed = markdown.trim();
  if (!trimmed) {
    return { ok: true, markdown: "" };
  }

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return {
      ok: false,
      error: "OPENAI_API_KEY is not configured on the server.",
    };
  }

  const model =
    process.env.OPENAI_PROPOSAL_MODEL?.trim() || DEFAULT_OPENAI_MODEL;
  const llmMs = proposalGenerationLlmTimeoutMs();
  const maxOut = Math.min(
    16_384,
    Math.max(4_096, proposalGenerationMaxOutputTokens() * 2),
  );

  const system = `You are a professional translator for B2B agency proposals.

Translate the user's Markdown into clear, professional Latin American Spanish suitable for business clients.

Rules:
- Preserve GitHub-flavored Markdown structure exactly: ## headings, ### subheadings, bullet/numbered lists, **bold**, *italic*, blockquotes.
- Keep lines that are only images unchanged except for alt text: ![alt](url) — translate alt text if it is human language; never change URLs inside parentheses.
- Do not wrap the result in markdown code fences.
- Output only the translated Markdown document, nothing else.`;

  try {
    const openai = new OpenAI({ apiKey, timeout: llmMs });
    const completion = await openai.chat.completions.create({
      model,
      ...proposalCompletionTemperature(model, 0.25),
      max_completion_tokens: maxOut,
      messages: [
        { role: "system", content: system },
        { role: "user", content: trimmed },
      ],
    });
    const out = completion.choices[0]?.message?.content?.trim() ?? "";
    if (!out) {
      return {
        ok: false,
        error: "Translation returned empty content. Try again.",
      };
    }
    const cleaned = out
      .replace(/^```(?:markdown|md)?\s*/i, "")
      .replace(/\s*```\s*$/i, "")
      .trim();
    return { ok: true, markdown: cleaned };
  } catch (e) {
    const msg =
      e instanceof Error ? e.message : "OpenAI translation failed.";
    if (/timeout|timed out|ETIMEDOUT|abort/i.test(msg)) {
      return {
        ok: false,
        error: `Translation timed out (${llmMs}ms). Try again.`,
      };
    }
    return { ok: false, error: msg };
  }
}
