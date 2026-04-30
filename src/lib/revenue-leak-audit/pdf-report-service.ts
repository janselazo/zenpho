import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import type { AuditFinding, RevenueLeakAudit } from "./types";

const PAGE_W = 612;
const PAGE_H = 792;
const MARGIN = 44;
const LINE = 14;

function money(n: number): string {
  return `$${Math.round(n).toLocaleString()}`;
}

function sanitize(text: string): string {
  return text
    .replace(/[^\x09\x0A\x0D\x20-\x7E\u00A0-\u00FF]/g, "")
    .replace(/[–—]/g, "-")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'");
}

function wrap(text: string, max = 82): string[] {
  const words = sanitize(text).replace(/\s+/g, " ").trim().split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const word of words) {
    if (!word) continue;
    const next = cur ? `${cur} ${word}` : word;
    if (next.length <= max) {
      cur = next;
    } else {
      if (cur) lines.push(cur);
      cur = word;
    }
  }
  if (cur) lines.push(cur);
  return lines.length ? lines : [""];
}

type Ctx = {
  pdf: PDFDocument;
  page: PDFPage;
  font: PDFFont;
  bold: PDFFont;
  y: number;
  pageNo: number;
};

function addPage(ctx: Ctx): void {
  drawFooter(ctx);
  ctx.page = ctx.pdf.addPage([PAGE_W, PAGE_H]);
  ctx.pageNo += 1;
  ctx.y = PAGE_H - MARGIN;
}

function ensure(ctx: Ctx, height: number): void {
  if (ctx.y - height < MARGIN + 20) addPage(ctx);
}

function text(
  ctx: Ctx,
  value: string,
  opts: { size?: number; bold?: boolean; color?: ReturnType<typeof rgb>; max?: number } = {}
): void {
  const size = opts.size ?? 10;
  const font = opts.bold ? ctx.bold : ctx.font;
  const color = opts.color ?? rgb(0.17, 0.2, 0.28);
  const lines = wrap(value, opts.max ?? 88);
  ensure(ctx, lines.length * (size + 4));
  for (const line of lines) {
    ctx.page.drawText(line, {
      x: MARGIN,
      y: ctx.y,
      size,
      font,
      color,
    });
    ctx.y -= size + 4;
  }
}

function section(ctx: Ctx, title: string): void {
  ensure(ctx, 42);
  ctx.y -= 8;
  ctx.page.drawText(sanitize(title.toUpperCase()), {
    x: MARGIN,
    y: ctx.y,
    size: 8,
    font: ctx.bold,
    color: rgb(0.15, 0.39, 0.92),
  });
  ctx.y -= 18;
}

function drawFooter(ctx: Ctx): void {
  ctx.page.drawText(`Revenue Leak Audit | Zenpho | ${ctx.pageNo}`, {
    x: MARGIN,
    y: 24,
    size: 8,
    font: ctx.font,
    color: rgb(0.45, 0.5, 0.58),
  });
}

function drawScore(ctx: Ctx, audit: RevenueLeakAudit): void {
  const score = audit.scores.overall;
  const x = PAGE_W - MARGIN - 118;
  const y = PAGE_H - 168;
  ctx.page.drawCircle({
    x: x + 58,
    y: y + 58,
    size: 58,
    borderColor: rgb(0.86, 0.9, 0.95),
    borderWidth: 10,
  });
  ctx.page.drawText(String(score), {
    x: x + (score >= 100 ? 34 : score >= 10 ? 42 : 49),
    y: y + 62,
    size: 28,
    font: ctx.bold,
    color: rgb(0.15, 0.39, 0.92),
  });
  ctx.page.drawText(audit.scores.grade, {
    x: x + 34,
    y: y + 42,
    size: 10,
    font: ctx.bold,
    color: rgb(0.17, 0.2, 0.28),
  });
}

function findingLine(finding: AuditFinding): string {
  return `${finding.severity}: ${finding.title} (${money(
    finding.estimatedRevenueImpactLow
  )}-${money(finding.estimatedRevenueImpactHigh)}/mo)`;
}

export async function generateRevenueLeakAuditPdf(
  audit: RevenueLeakAudit
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const ctx: Ctx = {
    pdf,
    page: pdf.addPage([PAGE_W, PAGE_H]),
    font,
    bold,
    y: PAGE_H - MARGIN,
    pageNo: 1,
  };

  ctx.page.drawRectangle({
    x: 0,
    y: PAGE_H - 210,
    width: PAGE_W,
    height: 210,
    color: rgb(0.93, 0.96, 1),
  });
  ctx.page.drawText("Revenue Leak Audit", {
    x: MARGIN,
    y: PAGE_H - 78,
    size: 30,
    font: bold,
    color: rgb(0.05, 0.09, 0.18),
  });
  ctx.y = PAGE_H - 112;
  text(ctx, audit.business.name, {
    size: 14,
    bold: true,
    color: rgb(0.17, 0.2, 0.28),
    max: 54,
  });
  text(ctx, `${audit.business.address ?? "Location unavailable"} | ${new Date(audit.createdAt).toLocaleDateString()}`, {
    size: 10,
    max: 70,
  });
  drawScore(ctx, audit);
  ctx.y = PAGE_H - 240;

  section(ctx, "Executive Summary");
  text(
    ctx,
    `Estimated monthly revenue opportunity: ${money(
      audit.moneySummary.estimatedMonthlyCostLow
    )}-${money(audit.moneySummary.estimatedMonthlyCostHigh)}. We found ${
      audit.moneySummary.totalIssues
    } revenue leaks. ${audit.moneySummary.assumptionsExplanation}`,
    { size: 11, max: 86 }
  );
  text(ctx, `Recommended next step: ${audit.recommendedNextStep}`, {
    size: 11,
    bold: true,
  });

  section(ctx, "Brand Summary");
  text(
    ctx,
    `Palette: ${audit.brandIdentity.palette.join(", ") || "Not available"}. ${
      audit.brandIdentity.brandPresenceSummary
    }`,
    { max: 86 }
  );
  for (const note of audit.brandIdentity.typographyNotes.slice(0, 3)) {
    text(ctx, `- ${note}`, { max: 84 });
  }

  section(ctx, "Found Issues And Estimated Cost");
  for (const finding of audit.moneySummary.topExpensiveLeaks.slice(0, 5)) {
    text(ctx, findingLine(finding), { bold: true, max: 86 });
    text(ctx, finding.recommendedFix, { max: 86 });
    ctx.y -= 4;
  }

  section(ctx, "Score Breakdown");
  const breakdown = [
    ["Google Business Profile", audit.scores.gbpHealth],
    ["Reviews & Reputation", audit.scores.reviews],
    ["Website Conversion", audit.scores.websiteConversion],
    ["Website Trust & Visual Proof", audit.scores.websiteTrust],
    ["Local SEO", audit.scores.localSeo],
    ["Competitor Gap", audit.scores.competitorGap],
    ["Tracking & Ads", audit.scores.trackingAds],
    ["Photos", audit.scores.photos],
  ] as const;
  for (const [label, score] of breakdown) {
    text(ctx, `${label}: ${score}/100 (${score < 50 ? "Poor" : score < 70 ? "Average" : score < 85 ? "Good" : "Excellent"})`);
  }

  section(ctx, "Who's Beating You On Google");
  text(ctx, `Query: ${audit.rankingSnapshot.query}`, { bold: true });
  for (const item of audit.rankingSnapshot.topFive) {
    text(
      ctx,
      `#${item.position} ${item.name} - ${item.rating ?? "N/A"} stars, ${
        item.reviewCount ?? 0
      } reviews`
    );
  }
  if (
    audit.rankingSnapshot.selectedBusinessRankItem &&
    !audit.rankingSnapshot.topFive.some((i) => i.isSelectedBusiness)
  ) {
    text(ctx, "...", { bold: true });
    const item = audit.rankingSnapshot.selectedBusinessRankItem;
    text(
      ctx,
      `#${item.position} ${item.name} - ${item.rating ?? "N/A"} stars, ${
        item.reviewCount ?? 0
      } reviews`,
      { bold: true }
    );
  }

  section(ctx, "Competitor Snapshot");
  for (const competitor of audit.competitors.slice(0, 10)) {
    text(
      ctx,
      `${competitor.rank ? `#${competitor.rank} ` : ""}${competitor.name}: ${
        competitor.rating ?? "N/A"
      } stars, ${competitor.reviewCount ?? 0} reviews, market score ${
        competitor.marketStrengthScore
      }/100`
    );
  }

  section(ctx, "Problems Found By Section");
  for (const sectionSummary of audit.sectionSummaries) {
    text(
      ctx,
      `${sectionSummary.category}: ${sectionSummary.score}/100 (${sectionSummary.grade}) - ${sectionSummary.issueCount} issue(s)`,
      { bold: true }
    );
    for (const finding of sectionSummary.findings.slice(0, 4)) {
      text(ctx, `- ${finding.title}: ${finding.recommendedFix}`, { max: 84 });
    }
    ctx.y -= 4;
  }

  section(ctx, "Action Plan");
  for (const item of audit.actionPlan.slice(0, 6)) {
    text(
      ctx,
      `${item.timeline}: ${item.fix} Impact: ${item.impact}. Difficulty: ${item.difficulty}.`,
      { max: 86 }
    );
  }

  section(ctx, "Disclaimer");
  text(
    ctx,
    "Revenue estimates are based on available data and conservative assumptions. Results are not guaranteed. The report should be used as a directional planning tool.",
    { max: 86 }
  );
  drawFooter(ctx);

  return pdf.save();
}
