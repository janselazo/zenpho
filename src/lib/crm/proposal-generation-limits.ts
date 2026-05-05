/**
 * CRM Proposal Generation runs in one server invocation. Override budgets if needed.
 */

export function proposalGenerationLlmTimeoutMs(): number {
  const raw = process.env.PROPOSAL_GENERATION_LLM_BUDGET_MS?.trim();
  if (raw) {
    const n = Number.parseInt(raw, 10);
    if (Number.isFinite(n) && n >= 5_000) return n;
  }
  return process.env.VERCEL === "1" ? 52_000 : 110_000;
}

export function proposalGenerationMaxOutputTokens(): number {
  const raw = process.env.PROPOSAL_GENERATION_MAX_TOKENS?.trim();
  if (raw) {
    const n = Number.parseInt(raw, 10);
    if (Number.isFinite(n) && n >= 1_024 && n <= 16_384) return n;
  }
  return process.env.VERCEL === "1" ? 6_000 : 12_000;
}
