import OpenAI from "openai";
import type { MarketIntelReport } from "@/lib/crm/prospect-intel-report";
import {
  automationReportLlmTimeoutMs,
  automationReportMaxOutputTokens,
} from "@/lib/crm/prospect-automation-report-limits";

const ANTHROPIC_MESSAGES_URL = "https://api.anthropic.com/v1/messages";
const DEFAULT_ANTHROPIC_MODEL = "claude-sonnet-4-20250514";
const DEFAULT_OPENAI_MODEL = "gpt-4o-mini";

const MAX_ITEMS_PER_ARRAY = 12;
const MAX_STRING_LEN = 400;

/** LLM output for the prospect AI audit PDF (assessment + plan; not a build spec). */
export type AutomationReportNarrative = {
  executiveSummary: string;
  repeatableProcesses: string[];
  costAndImpact: string[];
  toolAndWorkflowRecommendations: string[];
  prioritizedActionPlan: string[];
  /** Short paragraph: implementation / rollout quoted separately (upsell). */
  implementationUpsell: string;
};

function truncateItem(s: string): string {
  const t = s.trim();
  if (t.length <= MAX_STRING_LEN) return t;
  return `${t.slice(0, MAX_STRING_LEN - 1)}…`;
}

function boundedReportForPrompt(report: MarketIntelReport): Record<string, unknown> {
  const take = (arr: string[]) =>
    arr.slice(0, MAX_ITEMS_PER_ARRAY).map(truncateItem);
  return {
    summary: truncateItem(report.summary || ""),
    customWebsites: take(report.customWebsites),
    webApps: take(report.webApps),
    mobileApps: take(report.mobileApps),
    aiAutomations: take(report.aiAutomations),
  };
}

function strField(o: Record<string, unknown>, k: string, alt?: string): string {
  const v = o[k] ?? (alt ? o[alt] : undefined);
  return typeof v === "string" ? v.trim() : "";
}

function arrField(o: Record<string, unknown>, k: string, alt?: string): string[] {
  const v = o[k] ?? (alt ? o[alt] : undefined);
  if (!Array.isArray(v)) return [];
  return v
    .filter((x) => typeof x === "string")
    .map((x) => x.trim())
    .filter(Boolean);
}

function coerceNarrative(o: Record<string, unknown>): AutomationReportNarrative {
  const exec = strField(o, "executiveSummary", "executive_summary");

  let repeatableProcesses = arrField(o, "repeatableProcesses", "repeatable_processes");
  let costAndImpact = arrField(o, "costAndImpact", "cost_and_impact");
  let toolAndWorkflowRecommendations = arrField(
    o,
    "toolAndWorkflowRecommendations",
    "tool_and_workflow_recommendations"
  );
  let prioritizedActionPlan = arrField(o, "prioritizedActionPlan", "prioritized_action_plan");

  let implementationUpsell = strField(o, "implementationUpsell", "implementation_upsell");

  // Legacy schema (opportunities / problems / solutions / gaps)
  if (repeatableProcesses.length === 0) {
    repeatableProcesses = arrField(o, "opportunities");
  }
  if (costAndImpact.length === 0) {
    costAndImpact = arrField(o, "problems");
  }
  if (toolAndWorkflowRecommendations.length === 0) {
    toolAndWorkflowRecommendations = arrField(o, "solutions");
  }
  if (prioritizedActionPlan.length === 0) {
    prioritizedActionPlan = arrField(o, "gaps");
  }

  return {
    executiveSummary: exec,
    repeatableProcesses,
    costAndImpact,
    toolAndWorkflowRecommendations,
    prioritizedActionPlan,
    implementationUpsell,
  };
}

function parseNarrativeJson(raw: string): AutomationReportNarrative | null {
  let t = raw.trim();
  const fence = /^```(?:json)?\s*([\s\S]*?)```$/m.exec(t);
  if (fence) t = fence[1].trim();
  const tryParse = (s: string): AutomationReportNarrative | null => {
    try {
      const o = JSON.parse(s) as Record<string, unknown>;
      return coerceNarrative(o);
    } catch {
      return null;
    }
  };
  const direct = tryParse(t);
  if (direct) return direct;
  const start = t.indexOf("{");
  const end = t.lastIndexOf("}");
  if (start >= 0 && end > start) {
    return tryParse(t.slice(start, end + 1));
  }
  return null;
}

function buildPrompts(businessName: string, reportJson: string): {
  system: string;
  user: string;
} {
  const system =
    "You output only valid JSON. No markdown fences, no commentary before or after the JSON object.";

  const user = `You are helping a digital agency deliver an AI AUDIT for a prospect: "${businessName}".

This is NOT a software build or delivery document. You produce a structured assessment and a prioritized action plan only. Implementation, integrations, and rollout are out of scope for this PDF and are quoted separately.

Below is JSON from a rule-based "market intel" pass (websites, apps, automation-related research signals, summary). Use ONLY this data and reasonable inferences from it. Do not invent addresses, ratings, phone numbers, or products not implied by the text.

Market intel JSON:
${reportJson}

Return a single JSON object with exactly these keys (all required):
- "executiveSummary": string, 2-4 sentences, plain English. State that this document is an audit (map processes, cost/impact, recommendations, prioritized next steps) and that building or deploying systems is not included here.
- "repeatableProcesses": array of 3-6 short strings — repeatable workflows or operational processes implied by the intel (e.g. intake, scheduling, follow-up, reviews). Name them as processes, not product specs.
- "costAndImpact": array of 3-6 short strings — which of those processes likely cost the most time, money, missed revenue, or risk if left manual; tie to signals in the intel when possible.
- "toolAndWorkflowRecommendations": array of 3-6 short strings — types of AI tools, patterns, or workflow designs that could address the hotspots (e.g. triage bot, draft-then-approve email, structured intake). Mention categories or patterns; do not promise a specific vendor contract or price.
- "prioritizedActionPlan": array of 3-6 short strings in priority order — what to validate or do first, then next (discovery questions, pilots, metrics to track). This is the concrete "plan" output.
- "implementationUpsell": string, 2-4 sentences. Clarify that full implementation, security review, integrations, training, and production rollout are a separate engagement after they approve priorities from this audit.

Keep each bullet under 220 characters. Use ASCII-friendly punctuation.`;

  return { system, user };
}

async function generateWithAnthropic(
  businessName: string,
  reportJson: string
): Promise<{ ok: true; data: AutomationReportNarrative } | { ok: false; error: string }> {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) {
    return { ok: false, error: "ANTHROPIC_API_KEY is not configured." };
  }

  const model =
    process.env.ANTHROPIC_AUTOMATION_REPORT_MODEL?.trim() || DEFAULT_ANTHROPIC_MODEL;
  const { system, user } = buildPrompts(businessName, reportJson);
  const llmMs = automationReportLlmTimeoutMs();
  const maxTokens = automationReportMaxOutputTokens();

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
        model,
        max_tokens: maxTokens,
        system,
        messages: [{ role: "user", content: user }],
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
    const parsed = parseNarrativeJson(raw);
    if (!parsed) {
      return { ok: false, error: "Anthropic returned invalid JSON for AI audit narrative." };
    }
    return { ok: true, data: parsed };
  } catch (e) {
    const msg =
      e instanceof Error ? e.message : "Anthropic request failed unexpectedly.";
    if (msg.includes("abort") || msg.includes("TimeoutError")) {
      return { ok: false, error: `Anthropic request timed out (${llmMs}ms).` };
    }
    return { ok: false, error: msg };
  }
}

async function generateWithOpenAI(
  businessName: string,
  reportJson: string
): Promise<{ ok: true; data: AutomationReportNarrative } | { ok: false; error: string }> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return { ok: false, error: "OPENAI_API_KEY is not configured." };
  }

  const model =
    process.env.OPENAI_AUTOMATION_REPORT_MODEL?.trim() || DEFAULT_OPENAI_MODEL;
  const { system, user } = buildPrompts(businessName, reportJson);
  const llmMs = automationReportLlmTimeoutMs();
  const maxTokens = automationReportMaxOutputTokens();

  try {
    const openai = new OpenAI({ apiKey, timeout: llmMs });
    const completion = await openai.chat.completions.create({
      model,
      temperature: 0.5,
      max_tokens: maxTokens,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    });
    const raw = completion.choices[0]?.message?.content?.trim() ?? "";
    const parsed = parseNarrativeJson(raw);
    if (!parsed) {
      return { ok: false, error: "OpenAI returned invalid JSON for AI audit narrative." };
    }
    return { ok: true, data: parsed };
  } catch (e) {
    const msg =
      e instanceof Error ? e.message : "OpenAI request failed unexpectedly.";
    if (/timeout|timed out|ETIMEDOUT|abort/i.test(msg)) {
      return { ok: false, error: `OpenAI request timed out (${llmMs}ms).` };
    }
    return { ok: false, error: msg };
  }
}

/**
 * Anthropic first when ANTHROPIC_API_KEY is set; on failure fall back to OpenAI if configured.
 * If no keys, returns ok: false without throwing (caller uses legacy PDF content).
 */
export async function generateAutomationReportNarrative(input: {
  businessName: string;
  report: MarketIntelReport;
}): Promise<
  { ok: true; data: AutomationReportNarrative } | { ok: false; error: string }
> {
  const businessName = input.businessName.trim() || "Business";
  const reportJson = JSON.stringify(boundedReportForPrompt(input.report), null, 0);

  const hasAnthropic = Boolean(process.env.ANTHROPIC_API_KEY?.trim());
  const hasOpenAI = Boolean(process.env.OPENAI_API_KEY?.trim());

  if (!hasAnthropic && !hasOpenAI) {
    return { ok: false, error: "No LLM API keys configured." };
  }

  if (hasAnthropic) {
    const r = await generateWithAnthropic(businessName, reportJson);
    if (r.ok) return r;
    if (hasOpenAI) {
      console.warn("[automationReport] Anthropic failed, falling back to OpenAI:", r.error);
      return generateWithOpenAI(businessName, reportJson);
    }
    return r;
  }

  return generateWithOpenAI(businessName, reportJson);
}
