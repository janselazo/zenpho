/**
 * Picks a stable Lucide icon key for custom agency docs from title/description.
 * Title matches take precedence so a "Fundamentals" card stays on-theme even if
 * the blurb mentions growth or metrics.
 */

const RULES: { re: RegExp; key: string }[] = [
  {
    re: /\b(routine|daily|habits?|ritual|cadence|morning|calendar|repeat)\b/i,
    key: "calendar-days",
  },
  {
    re: /\b(fundamentals?|fundamental|basics?|foundation|essentials?|primer|intro(?:duction)?|getting\s+started)\b/i,
    key: "book-open",
  },
  {
    re: /\b(ai|ml|gpt|llm|chatgpt|copilot|agents?|llms)\b/i,
    key: "sparkles",
  },
  {
    re: /\b(growth|grow|scaling|scale|revenue|sales|marketing|acquisition)\b/i,
    key: "trending-up",
  },
  {
    re: /\b(team|culture|people|hiring|talent|org(?:anization)?|leadership)\b/i,
    key: "users",
  },
  {
    re: /\b(process|playbook|workflow|sop|checklist|operations|ops)\b/i,
    key: "list-checks",
  },
  {
    re: /\b(performance|metrics|kpi|analytics|dashboard|measure)\b/i,
    key: "bar-chart-3",
  },
  {
    re: /\b(strategy|goal|goals|roadmap|okr|milestone|planning|vision)\b/i,
    key: "target",
  },
  {
    re: /\b(idea|ideas|brainstorm|creative|innovation)\b/i,
    key: "lightbulb",
  },
  {
    re: /\b(journal|notes|notebook|diary|writing)\b/i,
    key: "notebook-pen",
  },
  {
    re: /\b(policy|policies|legal|terms|compliance|contract)\b/i,
    key: "scroll-text",
  },
];

/** Keys used when no keyword matches — varied, deterministic per title. */
const FALLBACK_KEYS = [
  "lightbulb",
  "notebook-pen",
  "scroll-text",
  "file-stack",
  "calendar-days",
  "book-open",
  "sparkles",
  "trending-up",
  "list-checks",
  "bar-chart-3",
  "users",
  "target",
] as const;

function djb2(seed: string): number {
  let hash = 5381;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) + hash) + seed.charCodeAt(i);
  }
  return hash >>> 0;
}

function hashPick(seed: string): string {
  const idx = djb2(seed) % FALLBACK_KEYS.length;
  return FALLBACK_KEYS[idx]!;
}

export function pickAgencyDocIconKey(title: string, description: string): string {
  const t = title.trim();
  const d = description.trim();
  const titleLower = t.toLowerCase();
  const fullLower = `${t} ${d}`.toLowerCase();

  for (const { re, key } of RULES) {
    if (re.test(titleLower)) return key;
  }
  for (const { re, key } of RULES) {
    if (re.test(fullLower)) return key;
  }
  return hashPick(`${t}\n${d}`);
}
