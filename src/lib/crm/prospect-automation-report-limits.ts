/**
 * LLM budget for AI Automations PDF narrative (shorter than full prospect preview HTML).
 */

export function automationReportLlmTimeoutMs(): number {
  const raw = process.env.AUTOMATION_REPORT_LLM_BUDGET_MS?.trim();
  if (raw) {
    const n = Number.parseInt(raw, 10);
    if (Number.isFinite(n) && n >= 5_000) return n;
  }
  if (process.env.VERCEL === "1") {
    return 45_000;
  }
  return 90_000;
}

export function automationReportMaxOutputTokens(): number {
  const raw = process.env.AUTOMATION_REPORT_MAX_TOKENS?.trim();
  if (raw) {
    const n = Number.parseInt(raw, 10);
    if (Number.isFinite(n) && n >= 512 && n <= 8_192) return n;
  }
  return 3_072;
}
