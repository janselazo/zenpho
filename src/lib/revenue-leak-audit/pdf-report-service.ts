import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFFont,
  type PDFPage,
  type RGB,
} from "pdf-lib";
import type { AuditFinding, AuditGrade, RevenueLeakAudit } from "./types";

const PAGE_W = 612;
const PAGE_H = 792;
const MARGIN = 36;
const CONTENT_W = PAGE_W - MARGIN * 2;
const BLUE = rgb(0.15, 0.39, 0.92);
const INK = rgb(0.05, 0.07, 0.12);
const MUTED = rgb(0.38, 0.42, 0.5);
const SURFACE = rgb(0.96, 0.98, 1);
const BORDER = rgb(0.88, 0.91, 0.95);
const WHITE = rgb(1, 1, 1);

type Ctx = {
  pdf: PDFDocument;
  page: PDFPage;
  font: PDFFont;
  bold: PDFFont;
  y: number;
  pageNo: number;
};

function money(value: number): string {
  return `$${Math.round(value).toLocaleString()}`;
}

function sanitize(text: string): string {
  return text
    .replace(/[^\x09\x0A\x0D\x20-\x7E\u00A0-\u00FF]/g, "")
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2018\u2019]/g, "'");
}

function hexToRgb(hex: string | null | undefined, fallback: RGB): RGB {
  const raw = hex?.trim().replace(/^#/, "");
  if (!raw || !/^[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/.test(raw)) return fallback;
  const full = raw.length === 3 ? raw.split("").map((c) => c + c).join("") : raw;
  return rgb(
    parseInt(full.slice(0, 2), 16) / 255,
    parseInt(full.slice(2, 4), 16) / 255,
    parseInt(full.slice(4, 6), 16) / 255
  );
}

function gradeColor(grade: AuditGrade): RGB {
  switch (grade) {
    case "Poor":
      return rgb(0.86, 0.15, 0.15);
    case "Average":
      return rgb(0.96, 0.62, 0.04);
    case "Good":
      return BLUE;
    case "Excellent":
      return rgb(0.02, 0.6, 0.38);
  }
}

function scoreColor(score: number): RGB {
  if (score < 50) return rgb(0.86, 0.15, 0.15);
  if (score < 70) return rgb(0.96, 0.62, 0.04);
  if (score < 85) return BLUE;
  return rgb(0.02, 0.6, 0.38);
}

function wrapText(
  text: string,
  font: PDFFont,
  size: number,
  maxWidth: number
): string[] {
  const words = sanitize(text).replace(/\s+/g, " ").trim().split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    if (!word) continue;
    const candidate = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [""];
}

function drawFooter(ctx: Ctx): void {
  ctx.page.drawText(`Revenue Leak Audit | Zenpho | ${ctx.pageNo}`, {
    x: MARGIN,
    y: 22,
    size: 8,
    font: ctx.font,
    color: MUTED,
  });
}

function addPage(ctx: Ctx): void {
  drawFooter(ctx);
  ctx.page = ctx.pdf.addPage([PAGE_W, PAGE_H]);
  ctx.pageNo += 1;
  ctx.y = PAGE_H - MARGIN;
  ctx.page.drawRectangle({
    x: 0,
    y: 0,
    width: PAGE_W,
    height: PAGE_H,
    color: rgb(0.985, 0.99, 1),
  });
}

function ensure(ctx: Ctx, height: number): void {
  if (ctx.y - height < MARGIN + 18) addPage(ctx);
}

function text(
  ctx: Ctx,
  value: string,
  opts: {
    x?: number;
    y?: number;
    size?: number;
    font?: PDFFont;
    color?: RGB;
    maxWidth?: number;
    lineGap?: number;
  } = {}
): number {
  const x = opts.x ?? MARGIN;
  let y = opts.y ?? ctx.y;
  const size = opts.size ?? 10;
  const font = opts.font ?? ctx.font;
  const color = opts.color ?? INK;
  const maxWidth = opts.maxWidth ?? CONTENT_W;
  const lineGap = opts.lineGap ?? 4;
  const lines = wrapText(value, font, size, maxWidth);
  for (const line of lines) {
    ctx.page.drawText(line, { x, y, size, font, color });
    y -= size + lineGap;
  }
  return y;
}

function sectionLabel(ctx: Ctx, label: string, y = ctx.y): number {
  ctx.page.drawText(sanitize(label.toUpperCase()), {
    x: MARGIN,
    y,
    size: 8,
    font: ctx.bold,
    color: BLUE,
  });
  return y - 20;
}

function card(ctx: Ctx, x: number, topY: number, w: number, h: number, fill = WHITE): void {
  ctx.page.drawRectangle({
    x,
    y: topY - h,
    width: w,
    height: h,
    color: fill,
    borderColor: BORDER,
    borderWidth: 1,
  });
}

function pill(ctx: Ctx, x: number, y: number, label: string, color: RGB): void {
  const labelText = sanitize(label);
  const w = ctx.bold.widthOfTextAtSize(labelText, 8) + 18;
  ctx.page.drawRectangle({
    x,
    y: y - 13,
    width: w,
    height: 18,
    color: rgb(0.95, 0.98, 1),
    borderColor: color,
    borderWidth: 0.5,
  });
  ctx.page.drawText(labelText, {
    x: x + 9,
    y: y - 7,
    size: 8,
    font: ctx.bold,
    color,
  });
}

function scoreRing(
  ctx: Ctx,
  x: number,
  y: number,
  score: number,
  grade: AuditGrade,
  size = 46
): void {
  const color = gradeColor(grade);
  ctx.page.drawCircle({
    x: x + size / 2,
    y: y - size / 2,
    size: size / 2,
    borderColor: color,
    borderWidth: 8,
  });
  const scoreText = String(score);
  ctx.page.drawText(scoreText, {
    x: x + size / 2 - ctx.bold.widthOfTextAtSize(scoreText, 17) / 2,
    y: y - size / 2 + 3,
    size: 17,
    font: ctx.bold,
    color: INK,
  });
  const gradeW = ctx.bold.widthOfTextAtSize(grade, 7.5) + 16;
  ctx.page.drawRectangle({
    x: x + size / 2 - gradeW / 2,
    y: y - size - 22,
    width: gradeW,
    height: 17,
    color: rgb(0.93, 1, 0.96),
    borderColor: color,
    borderWidth: 0.5,
  });
  ctx.page.drawText(grade, {
    x: x + size / 2 - ctx.bold.widthOfTextAtSize(grade, 7.5) / 2,
    y: y - size - 16,
    size: 7.5,
    font: ctx.bold,
    color,
  });
}

function metricCard(
  ctx: Ctx,
  x: number,
  topY: number,
  w: number,
  label: string,
  value: string,
  accent = BLUE
): void {
  card(ctx, x, topY, w, 76, SURFACE);
  ctx.page.drawText(sanitize(label.toUpperCase()), {
    x: x + 14,
    y: topY - 24,
    size: 7,
    font: ctx.bold,
    color: MUTED,
  });
  text(ctx, value, {
    x: x + 14,
    y: topY - 48,
    size: 14,
    font: ctx.bold,
    color: accent,
    maxWidth: w - 28,
  });
}

function progressCard(ctx: Ctx, x: number, topY: number, w: number, label: string, score: number): void {
  card(ctx, x, topY, w, 66, SURFACE);
  ctx.page.drawText(sanitize(label), {
    x: x + 14,
    y: topY - 24,
    size: 11,
    font: ctx.bold,
    color: INK,
  });
  const scoreText = `${score}/100`;
  ctx.page.drawText(scoreText, {
    x: x + w - 14 - ctx.bold.widthOfTextAtSize(scoreText, 11),
    y: topY - 24,
    size: 11,
    font: ctx.bold,
    color: scoreColor(score),
  });
  ctx.page.drawRectangle({
    x: x + 14,
    y: topY - 48,
    width: w - 28,
    height: 7,
    color: WHITE,
  });
  ctx.page.drawRectangle({
    x: x + 14,
    y: topY - 48,
    width: ((w - 28) * score) / 100,
    height: 7,
    color: scoreColor(score),
  });
}

function issueCard(ctx: Ctx, finding: AuditFinding, index: number): void {
  ensure(ctx, 94);
  const top = ctx.y;
  card(ctx, MARGIN, top, CONTENT_W, 86, WHITE);
  ctx.page.drawText(String(index), {
    x: MARGIN + 14,
    y: top - 24,
    size: 12,
    font: ctx.bold,
    color: BLUE,
  });
  text(ctx, finding.title, {
    x: MARGIN + 38,
    y: top - 20,
    size: 11,
    font: ctx.bold,
    maxWidth: CONTENT_W - 150,
  });
  pill(ctx, PAGE_W - MARGIN - 72, top - 13, finding.severity, scoreColor(finding.priorityScore));
  text(ctx, finding.whatWeFound, {
    x: MARGIN + 38,
    y: top - 42,
    size: 8.5,
    color: MUTED,
    maxWidth: CONTENT_W - 60,
  });
  text(ctx, `Fix: ${finding.recommendedFix}`, {
    x: MARGIN + 38,
    y: top - 65,
    size: 8.5,
    color: INK,
    maxWidth: CONTENT_W - 60,
  });
  ctx.y = top - 98;
}

function drawCover(ctx: Ctx, audit: RevenueLeakAudit): void {
  ctx.page.drawRectangle({
    x: 0,
    y: 0,
    width: PAGE_W,
    height: PAGE_H,
    color: rgb(0.965, 0.98, 1),
  });
  ctx.page.drawRectangle({
    x: MARGIN,
    y: PAGE_H - 292,
    width: CONTENT_W,
    height: 228,
    color: WHITE,
    borderColor: BORDER,
    borderWidth: 1,
  });
  ctx.page.drawText("REVENUE LEAK AUDIT", {
    x: MARGIN + 22,
    y: PAGE_H - 106,
    size: 8,
    font: ctx.bold,
    color: BLUE,
  });
  text(ctx, audit.business.name, {
    x: MARGIN + 22,
    y: PAGE_H - 140,
    size: 28,
    font: ctx.bold,
    maxWidth: 360,
  });
  text(ctx, audit.business.address ?? "Location unavailable", {
    x: MARGIN + 22,
    y: PAGE_H - 184,
    size: 9,
    color: MUTED,
    maxWidth: 360,
  });
  pill(ctx, MARGIN + 22, PAGE_H - 214, `${audit.business.rating ?? "N/A"} rating`, rgb(0.96, 0.62, 0.04));
  pill(ctx, MARGIN + 98, PAGE_H - 214, `${audit.business.reviewCount ?? 0} reviews`, BLUE);
  if (audit.business.website) {
    pill(ctx, MARGIN + 190, PAGE_H - 214, "Website linked", rgb(0.02, 0.6, 0.38));
  }
  scoreRing(ctx, PAGE_W - MARGIN - 108, PAGE_H - 100, audit.scores.overall, audit.scores.grade, 76);

  const metricTop = PAGE_H - 330;
  metricCard(
    ctx,
    MARGIN,
    metricTop,
    (CONTENT_W - 16) / 2,
    "Estimated monthly opportunity",
    `${money(audit.moneySummary.estimatedMonthlyCostLow)}-${money(audit.moneySummary.estimatedMonthlyCostHigh)}`
  );
  metricCard(
    ctx,
    MARGIN + (CONTENT_W + 16) / 2,
    metricTop,
    (CONTENT_W - 16) / 2,
    "Found issues",
    `${audit.moneySummary.totalIssues} revenue leaks`,
    rgb(0.86, 0.15, 0.15)
  );
  ctx.y = metricTop - 112;
  text(ctx, audit.moneySummary.assumptionsExplanation, {
    size: 10,
    color: MUTED,
    maxWidth: CONTENT_W,
  });
  ctx.y -= 10;
  text(ctx, `Recommended next step: ${audit.recommendedNextStep}`, {
    size: 11,
    font: ctx.bold,
    maxWidth: CONTENT_W,
  });
}

function drawBrandAndScores(ctx: Ctx, audit: RevenueLeakAudit): void {
  addPage(ctx);
  ctx.y = sectionLabel(ctx, "Brand Summary");
  card(ctx, MARGIN, ctx.y, CONTENT_W, 138, WHITE);
  text(ctx, audit.brandIdentity.brandPresenceSummary, {
    x: MARGIN + 18,
    y: ctx.y - 26,
    size: 10,
    color: MUTED,
    maxWidth: CONTENT_W - 36,
  });
  const swatches = [
    audit.brandIdentity.primaryColor,
    audit.brandIdentity.accentColor,
    ...audit.brandIdentity.palette,
  ].filter((c, index, all): c is string => Boolean(c) && all.indexOf(c) === index);
  swatches.slice(0, 6).forEach((hex, index) => {
    ctx.page.drawCircle({
      x: MARGIN + 24 + index * 26,
      y: ctx.y - 94,
      size: 9,
      color: hexToRgb(hex, BLUE),
      borderColor: BORDER,
      borderWidth: 0.5,
    });
  });
  audit.brandIdentity.typographyNotes.slice(0, 4).forEach((font, index) => {
    text(ctx, `- ${font}`, {
      x: MARGIN + 210,
      y: ctx.y - 78 - index * 15,
      size: 9,
      font: ctx.bold,
      maxWidth: CONTENT_W - 236,
    });
  });
  ctx.y -= 172;

  ctx.y = sectionLabel(ctx, "Score Breakdown", ctx.y);
  const rows = [
    { label: "GBP Health", score: audit.scores.gbpHealth },
    { label: "Reviews", score: audit.scores.reviews },
    { label: "Website Conversion", score: audit.scores.websiteConversion },
    { label: "Website Trust", score: audit.scores.websiteTrust },
    { label: "Local SEO", score: audit.scores.localSeo },
    { label: "Competitor Gap", score: audit.scores.competitorGap },
    { label: "Tracking & Ads", score: audit.scores.trackingAds },
    { label: "Photos", score: audit.scores.photos },
  ].sort((a, b) => b.score - a.score);
  const colW = (CONTENT_W - 16) / 2;
  rows.forEach((row, index) => {
    const col = index % 2;
    const line = Math.floor(index / 2);
    progressCard(ctx, MARGIN + col * (colW + 16), ctx.y - line * 82, colW, row.label, row.score);
  });
  ctx.y -= Math.ceil(rows.length / 2) * 82 + 18;
}

function drawIssuesAndReviews(ctx: Ctx, audit: RevenueLeakAudit): void {
  ensure(ctx, 90);
  ctx.y = sectionLabel(ctx, "Found Issues & Estimated Cost", ctx.y);
  audit.moneySummary.topExpensiveLeaks.slice(0, 5).forEach((finding, index) => {
    issueCard(ctx, finding, index + 1);
  });

  addPage(ctx);
  ctx.y = sectionLabel(ctx, "Top 5 Lowest Reviews");
  const reviews = audit.business.reviews
    .filter((review) => review.text?.trim() || review.rating !== null)
    .sort((a, b) => (a.rating ?? 5) - (b.rating ?? 5))
    .slice(0, 5);
  if (reviews.length === 0) {
    metricCard(ctx, MARGIN, ctx.y, CONTENT_W, "Review sample", "Review text unavailable", rgb(0.96, 0.62, 0.04));
    ctx.y -= 94;
  } else {
    reviews.forEach((review) => {
      ensure(ctx, 76);
      const top = ctx.y;
      card(ctx, MARGIN, top, CONTENT_W, 68, WHITE);
      ctx.page.drawText(`${review.rating ?? "N/A"} star`, {
        x: MARGIN + 16,
        y: top - 24,
        size: 12,
        font: ctx.bold,
        color: rgb(0.96, 0.62, 0.04),
      });
      text(ctx, review.authorName ?? "Google reviewer", {
        x: MARGIN + 62,
        y: top - 20,
        size: 10,
        font: ctx.bold,
        maxWidth: CONTENT_W - 90,
      });
      text(ctx, review.text ?? "No written review text available.", {
        x: MARGIN + 62,
        y: top - 39,
        size: 8.5,
        color: MUTED,
        maxWidth: CONTENT_W - 90,
      });
      ctx.y = top - 80;
    });
  }
}

function drawRankingAndCompetitors(ctx: Ctx, audit: RevenueLeakAudit): void {
  ctx.y = sectionLabel(ctx, "Who's Beating You On Google", ctx.y);
  text(ctx, `Query: ${audit.rankingSnapshot.query}`, {
    size: 10,
    font: ctx.bold,
    color: MUTED,
  });
  ctx.y -= 6;
  const rankRows = [...audit.rankingSnapshot.topFive];
  if (
    audit.rankingSnapshot.selectedBusinessRankItem &&
    !rankRows.some((row) => row.isSelectedBusiness)
  ) {
    rankRows.push(audit.rankingSnapshot.selectedBusinessRankItem);
  }
  rankRows.forEach((item) => {
    ensure(ctx, 42);
    const top = ctx.y;
    card(ctx, MARGIN, top, CONTENT_W, 36, item.isSelectedBusiness ? rgb(0.94, 0.97, 1) : WHITE);
    ctx.page.drawText(`#${item.position}`, {
      x: MARGIN + 14,
      y: top - 22,
      size: 10,
      font: ctx.bold,
      color: item.isSelectedBusiness ? BLUE : MUTED,
    });
    text(ctx, item.name, {
      x: MARGIN + 58,
      y: top - 17,
      size: 9.5,
      font: ctx.bold,
      maxWidth: 300,
    });
    const meta = `${item.rating ?? "N/A"} stars - ${item.reviewCount ?? 0} reviews`;
    ctx.page.drawText(meta, {
      x: PAGE_W - MARGIN - ctx.font.widthOfTextAtSize(meta, 8.5) - 12,
      y: top - 22,
      size: 8.5,
      font: ctx.font,
      color: MUTED,
    });
    ctx.y = top - 44;
  });

  ctx.y -= 8;
  ctx.y = sectionLabel(ctx, "Competitor Snapshot", ctx.y);
  audit.competitors.slice(0, 10).forEach((competitor) => {
    ensure(ctx, 34);
    text(
      ctx,
      `${competitor.rank ? `#${competitor.rank} ` : ""}${competitor.name} - ${
        competitor.rating ?? "N/A"
      } stars - ${competitor.reviewCount ?? 0} reviews - Market score ${
        competitor.marketStrengthScore
      }/100`,
      { size: 9, maxWidth: CONTENT_W }
    );
    ctx.y -= 2;
  });
}

function drawProblemsAndActionPlan(ctx: Ctx, audit: RevenueLeakAudit): void {
  addPage(ctx);
  ctx.y = sectionLabel(ctx, "Problems Found By Section");
  audit.sectionSummaries.forEach((summary) => {
    ensure(ctx, 70);
    const top = ctx.y;
    card(ctx, MARGIN, top, CONTENT_W, 58, WHITE);
    text(ctx, summary.category, {
      x: MARGIN + 14,
      y: top - 18,
      size: 10,
      font: ctx.bold,
      maxWidth: 330,
    });
    text(ctx, summary.summary, {
      x: MARGIN + 14,
      y: top - 36,
      size: 8,
      color: MUTED,
      maxWidth: 390,
    });
    scoreRing(ctx, PAGE_W - MARGIN - 60, top - 9, summary.score, summary.grade, 34);
    ctx.y = top - 70;
  });

  ctx.y -= 4;
  ctx.y = sectionLabel(ctx, "Action Plan", ctx.y);
  audit.actionPlan.slice(0, 6).forEach((item, index) => {
    ensure(ctx, 52);
    const top = ctx.y;
    card(ctx, MARGIN, top, CONTENT_W, 44, WHITE);
    ctx.page.drawCircle({
      x: MARGIN + 23,
      y: top - 22,
      size: 12,
      color: rgb(0.92, 0.95, 1),
    });
    ctx.page.drawText(String(index + 1), {
      x: MARGIN + 19,
      y: top - 26,
      size: 9,
      font: ctx.bold,
      color: BLUE,
    });
    text(ctx, item.fix, {
      x: MARGIN + 48,
      y: top - 15,
      size: 9,
      font: ctx.bold,
      maxWidth: CONTENT_W - 150,
    });
    text(ctx, `Impact: ${item.impact} - Difficulty: ${item.difficulty}`, {
      x: PAGE_W - MARGIN - 130,
      y: top - 17,
      size: 7.5,
      color: MUTED,
      maxWidth: 120,
    });
    ctx.y = top - 54;
  });

  ctx.y -= 8;
  ctx.y = sectionLabel(ctx, "Disclaimer", ctx.y);
  text(
    ctx,
    "Revenue estimates are based on available data and conservative assumptions. Results are not guaranteed. The report should be used as a directional planning tool.",
    { size: 9, color: MUTED, maxWidth: CONTENT_W }
  );
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

  drawCover(ctx, audit);
  drawBrandAndScores(ctx, audit);
  drawIssuesAndReviews(ctx, audit);
  drawRankingAndCompetitors(ctx, audit);
  drawProblemsAndActionPlan(ctx, audit);
  drawFooter(ctx);

  return pdf.save();
}
