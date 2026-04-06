/**
 * Prospect preview runs inside one serverless invocation (e.g. Vercel). If the LLM call
 * outlasts the plan’s wall-clock limit, the platform returns an HTML error — not our JSON.
 *
 * Override with PROSPECT_PREVIEW_LLM_BUDGET_MS (ms, min 5000) and optionally
 * PROSPECT_PREVIEW_MAX_TOKENS (512–16384) on Pro / Fluid if you raised maxDuration.
 */

export function prospectPreviewLlmTimeoutMs(): number {
  const raw = process.env.PROSPECT_PREVIEW_LLM_BUDGET_MS?.trim();
  if (raw) {
    const n = Number.parseInt(raw, 10);
    if (Number.isFinite(n) && n >= 5_000) return n;
  }
  if (process.env.VERCEL === "1") {
    // Headroom for auth, sanitize, and DB under a typical ~60s function cap.
    return 52_000;
  }
  return 110_000;
}

export function prospectPreviewMaxOutputTokens(): number {
  const raw = process.env.PROSPECT_PREVIEW_MAX_TOKENS?.trim();
  if (raw) {
    const n = Number.parseInt(raw, 10);
    if (Number.isFinite(n) && n >= 512 && n <= 16_384) return n;
  }
  if (process.env.VERCEL === "1") {
    return 4_096;
  }
  return 8_192;
}

export function prospectPreviewTimeoutHint(): string {
  return (
    "If this repeats on Vercel, your function may be hitting the plan time limit before the LLM returns. " +
    "Set PROSPECT_PREVIEW_LLM_BUDGET_MS (e.g. 52000) under your cap, use a faster model, or raise maxDuration / upgrade the plan."
  );
}
