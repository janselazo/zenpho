import type { AuditFinding, AuditSeverity, RevenueLeakAudit } from "./types";

export type AuditShareImageResult = {
  svg: string;
  width: number;
  height: number;
  filename: string;
};

const WIDTH = 1200;
const HEIGHT = 900;
const BG = "#f7f5f0";
const INK = "#111111";
const MUTED = "#5f676d";
const ACCENT = "#2563eb";
const LINE = "#d8d3c8";

const SEVERITY_ORDER: Record<AuditSeverity, number> = {
  Critical: 0,
  High: 1,
  Medium: 2,
  Low: 3,
};

function esc(value: string | null | undefined): string {
  return (value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function clamp(value: string | null | undefined, max = 90): string {
  const t = (value ?? "").trim().replace(/\s+/g, " ");
  if (t.length <= max) return t;
  return `${t.slice(0, Math.max(0, max - 3)).trim()}...`;
}

function money(value: number): string {
  return `$${Math.round(value).toLocaleString("en-US")}`;
}

function businessSlug(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60) || "business"
  );
}

function pickFindingsForCard(findings: AuditFinding[]): AuditFinding[] {
  return [...findings]
    .sort((a, b) => {
      const s = SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
      if (s !== 0) return s;
      return b.priorityScore - a.priorityScore;
    })
    .slice(0, 5);
}

function rankingSummary(audit: RevenueLeakAudit): string {
  const rs = audit.rankingSnapshot;
  if (!rs?.query?.trim()) return "";
  const q = clamp(rs.query, 48);
  const pos =
    rs.selectedBusinessRankItem?.position ?? rs.selectedBusinessPosition ?? null;
  if (pos != null) return `Google local: ${q} · Your listing #${pos}`;
  return `Google local: ${q}`;
}

/**
 * Deterministic 1200×900 SVG summary for prospect outreach (converted to PNG client-side).
 */
export function renderAuditShareImage(audit: RevenueLeakAudit): AuditShareImageResult {
  const m = audit.moneySummary;
  const businessName = clamp(audit.business.name, 52);
  const grade = audit.scores.grade;
  const score = audit.scores.overall;
  const costBand = `${money(m.estimatedMonthlyCostLow)}–${money(m.estimatedMonthlyCostHigh)}/mo est. at risk`;
  const rankLine = rankingSummary(audit);
  const findings = pickFindingsForCard(audit.findings);
  const bulletYs = [388, 424, 460, 496, 532];
  const bullets = findings.map((f, i) => {
    const y = bulletYs[i] ?? 532 + (i - 4) * 36;
    const label = clamp(`${f.severity}: ${f.title}`, 72);
    return `<text x="56" y="${y}" font-size="22" fill="${INK}" font-family="system-ui, -apple-system, Segoe UI, sans-serif">${esc(label)}</text>`;
  });

  const rankBlock =
    rankLine ?
      `<text x="56" y="318" font-size="24" fill="${MUTED}" font-family="system-ui, -apple-system, Segoe UI, sans-serif">${esc(rankLine)}</text>`
    : "";

  const slug = businessSlug(audit.business.name);
  const filename = `${slug}-revenue-leak-audit-summary.png`;

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <rect width="${WIDTH}" height="${HEIGHT}" fill="${BG}"/>
  <text x="56" y="68" font-size="16" fill="${ACCENT}" font-weight="600" letter-spacing="0.12em" font-family="system-ui, -apple-system, Segoe UI, sans-serif">REVENUE LEAK AUDIT · SUMMARY</text>
  <text x="56" y="130" font-size="44" font-weight="700" fill="${INK}" font-family="system-ui, -apple-system, Segoe UI, sans-serif">${esc(businessName)}</text>
  <text x="56" y="188" font-size="32" fill="${INK}" font-family="system-ui, -apple-system, Segoe UI, sans-serif">Score ${score}/100 · ${esc(grade)}</text>
  <text x="56" y="238" font-size="28" fill="${MUTED}" font-family="system-ui, -apple-system, Segoe UI, sans-serif">${esc(`${m.totalIssues} issues flagged`)} · ${esc(costBand)}</text>
  ${rankBlock}
  <text x="56" y="354" font-size="22" font-weight="600" fill="${INK}" font-family="system-ui, -apple-system, Segoe UI, sans-serif">Top findings</text>
  ${bullets.join("\n  ")}
  <line x1="56" y1="780" x2="${WIDTH - 56}" y2="780" stroke="${LINE}" stroke-width="2"/>
  <text x="56" y="830" font-size="20" fill="${MUTED}" font-family="system-ui, -apple-system, Segoe UI, sans-serif">Zenpho · Revenue Leak Audit (summary) — full PDF includes issues &amp; suggested fixes</text>
</svg>`;

  return { svg, width: WIDTH, height: HEIGHT, filename };
}
