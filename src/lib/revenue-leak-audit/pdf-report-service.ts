import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFFont,
  type PDFPage,
  type RGB,
} from "pdf-lib";
import { formatReviewStarLabel, selectLowestRatedReviews } from "./review-selection";
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

/** Draw wrapped text and move `ctx.y` to the last baseline minus `gapAfter` (avoids overlapping blocks). */
function advanceText(
  ctx: Ctx,
  value: string,
  opts: {
    x?: number;
    size?: number;
    font?: PDFFont;
    color?: RGB;
    maxWidth?: number;
    lineGap?: number;
    gapAfter?: number;
  } = {}
): void {
  const gapAfter = opts.gapAfter ?? 12;
  const { gapAfter: _g, ...textOpts } = opts;
  ctx.y = text(ctx, value, { y: ctx.y, ...textOpts });
  ctx.y -= gapAfter;
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

function issueCard(ctx: Ctx, finding: AuditFinding, index: number): void {
  const titleMax = CONTENT_W - 150;
  const bodyMax = CONTENT_W - 52;
  const titleLines = wrapText(sanitize(finding.title), ctx.bold, 11, titleMax);
  const foundLines = wrapText(sanitize(finding.whatWeFound), ctx.font, 8.5, bodyMax);
  const fixLines = wrapText(sanitize(`Fix: ${finding.recommendedFix}`), ctx.font, 8.5, bodyMax);
  const titleLineStep = 11 + 4;
  const bodyLineStep = 8.5 + 3;
  const titleBlockH = titleLines.length * titleLineStep;
  const foundBlockH = 6 + foundLines.length * bodyLineStep;
  const fixBlockH = 6 + fixLines.length * bodyLineStep;
  const cardH = Math.max(32, 26 + titleBlockH + foundBlockH + fixBlockH + 18);

  ensure(ctx, cardH + 16);
  const top = ctx.y;
  card(ctx, MARGIN, top, CONTENT_W, cardH, WHITE);
  ctx.page.drawText(String(index), {
    x: MARGIN + 14,
    y: top - 24,
    size: 12,
    font: ctx.bold,
    color: BLUE,
  });
  pill(ctx, PAGE_W - MARGIN - 72, top - 13, finding.severity, scoreColor(finding.priorityScore));

  let lineY = top - 20;
  for (const line of titleLines) {
    ctx.page.drawText(line, {
      x: MARGIN + 38,
      y: lineY,
      size: 11,
      font: ctx.bold,
      color: INK,
    });
    lineY -= titleLineStep;
  }
  lineY -= 2;
  for (const line of foundLines) {
    ctx.page.drawText(line, {
      x: MARGIN + 38,
      y: lineY,
      size: 8.5,
      font: ctx.font,
      color: MUTED,
    });
    lineY -= bodyLineStep;
  }
  lineY -= 2;
  for (const line of fixLines) {
    ctx.page.drawText(line, {
      x: MARGIN + 38,
      y: lineY,
      size: 8.5,
      font: ctx.font,
      color: INK,
    });
    lineY -= bodyLineStep;
  }
  ctx.y = top - cardH - 12;
}

function drawFirstPage(ctx: Ctx, audit: RevenueLeakAudit): void {
  ctx.page.drawRectangle({
    x: 0,
    y: 0,
    width: PAGE_W,
    height: PAGE_H,
    color: rgb(0.985, 0.99, 1),
  });
  ctx.y = PAGE_H - MARGIN;
  drawGoogleBusinessProfileSummary(ctx, audit);

  const metricTop = ctx.y - 24;
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
  ensure(ctx, 100);
  ctx.y = sectionLabel(ctx, "Recommended next step", ctx.y);
  advanceText(ctx, audit.recommendedNextStep, {
    size: 11,
    font: ctx.bold,
    maxWidth: CONTENT_W,
    gapAfter: 8,
  });
}

function drawGoogleBusinessProfileSummary(ctx: Ctx, audit: RevenueLeakAudit): void {
  ctx.y = sectionLabel(ctx, "Google Business Profile");
  const top = ctx.y;
  const cardH = 158;
  card(ctx, MARGIN, top, CONTENT_W, cardH, WHITE);
  ctx.page.drawCircle({
    x: MARGIN + 42,
    y: top - 45,
    size: 28,
    color: rgb(0.93, 0.96, 1),
    borderColor: BORDER,
    borderWidth: 1,
  });
  const initial = sanitize(audit.business.name.trim().charAt(0).toUpperCase() || "G");
  ctx.page.drawText(initial, {
    x: MARGIN + 42 - ctx.bold.widthOfTextAtSize(initial, 21) / 2,
    y: top - 52,
    size: 21,
    font: ctx.bold,
    color: BLUE,
  });
  text(ctx, audit.business.name, {
    x: MARGIN + 84,
    y: top - 28,
    size: 16,
    font: ctx.bold,
    maxWidth: CONTENT_W - 190,
  });
  const statusLabel = audit.business.businessStatus
    ? audit.business.businessStatus.replace(/_/g, " ").toLowerCase()
    : null;
  const categoryLine = [audit.business.category ?? "Local business", statusLabel].filter(Boolean).join(" · ");
  text(ctx, categoryLine, {
    x: MARGIN + 84,
    y: top - 52,
    size: 9,
    color: MUTED,
    maxWidth: CONTENT_W - 190,
  });
  pill(ctx, MARGIN + 84, top - 78, `${audit.business.rating ?? "N/A"} rating`, rgb(0.96, 0.62, 0.04));
  pill(ctx, MARGIN + 170, top - 78, `${audit.business.reviewCount ?? 0} reviews`, BLUE);
  pill(ctx, MARGIN + 270, top - 78, `${audit.business.photoCount ?? audit.business.photos.length} photos`, rgb(0.5, 0.2, 0.88));
  if (audit.business.website) {
    pill(ctx, MARGIN + 84, top - 102, "Website linked", rgb(0.02, 0.6, 0.38));
  } else {
    pill(ctx, MARGIN + 84, top - 102, "No website linked", MUTED);
  }
  scoreRing(ctx, PAGE_W - MARGIN - 70, top - 28, audit.scores.overall, audit.scores.grade, 50);
  text(ctx, audit.business.address ?? "Address unavailable", {
    x: MARGIN + 18,
    y: top - 124,
    size: 8.5,
    color: MUTED,
    maxWidth: CONTENT_W / 2 - 28,
  });
  text(ctx, audit.business.phone ?? "Phone unavailable", {
    x: MARGIN + CONTENT_W / 2,
    y: top - 124,
    size: 8.5,
    color: MUTED,
    maxWidth: CONTENT_W / 2 - 18,
  });
  text(ctx, audit.business.website ?? "Website not linked on Google profile", {
    x: MARGIN + 18,
    y: top - 142,
    size: 8.5,
    color: MUTED,
    maxWidth: CONTENT_W - 36,
  });
  ctx.y = top - cardH - 20;
}

function drawBrandSummaryPage(ctx: Ctx, audit: RevenueLeakAudit): void {
  addPage(ctx);
  ctx.y = sectionLabel(ctx, "Brand Summary");
  const top = ctx.y;
  const summaryLines = wrapText(
    sanitize(audit.brandIdentity.brandPresenceSummary),
    ctx.font,
    10,
    CONTENT_W - 36
  );
  const summaryBlockH = summaryLines.length * 14 + 12;
  const cardH = Math.max(150, summaryBlockH + 100);
  card(ctx, MARGIN, top, CONTENT_W, cardH, WHITE);
  let sy = top - 26;
  for (const line of summaryLines) {
    ctx.page.drawText(line, {
      x: MARGIN + 18,
      y: sy,
      size: 10,
      font: ctx.font,
      color: MUTED,
    });
    sy -= 14;
  }
  const swatches = [
    audit.brandIdentity.primaryColor,
    audit.brandIdentity.accentColor,
    ...audit.brandIdentity.palette,
  ].filter((c, index, all): c is string => Boolean(c) && all.indexOf(c) === index);
  const swatchY = sy - 20;
  swatches.slice(0, 6).forEach((hex, index) => {
    ctx.page.drawCircle({
      x: MARGIN + 24 + index * 26,
      y: swatchY - 14,
      size: 9,
      color: hexToRgb(hex, BLUE),
      borderColor: BORDER,
      borderWidth: 0.5,
    });
  });
  audit.brandIdentity.typographyNotes.slice(0, 4).forEach((font, index) => {
    text(ctx, `- ${font}`, {
      x: MARGIN + 210,
      y: swatchY - 10 - index * 15,
      size: 9,
      font: ctx.bold,
      maxWidth: CONTENT_W - 236,
    });
  });
  ctx.y = top - cardH - 20;
}

function drawFoundIssuesAndLeaks(ctx: Ctx, audit: RevenueLeakAudit): void {
  addPage(ctx);
  ctx.y = sectionLabel(ctx, "Found issues & estimated cost", ctx.y);
  ctx.page.drawText(`We found ${audit.moneySummary.totalIssues} revenue leaks`, {
    x: MARGIN,
    y: ctx.y - 4,
    size: 17,
    font: ctx.bold,
    color: INK,
  });
  ctx.y -= 36;
  advanceText(ctx, audit.moneySummary.assumptionsExplanation, {
    size: 10,
    color: MUTED,
    maxWidth: CONTENT_W,
    gapAfter: 12,
  });
  const sevParts = (["Critical", "High", "Medium", "Low"] as const)
    .map((s) => {
      const n = audit.moneySummary.severityCounts[s];
      return n > 0 ? `${s}: ${n}` : null;
    })
    .filter((x): x is string => Boolean(x));
  if (sevParts.length > 0) {
    advanceText(sevParts.join("   "), {
      size: 9,
      font: ctx.bold,
      color: INK,
      maxWidth: CONTENT_W,
      gapAfter: 16,
    });
  }
  const metricTop = ctx.y - 4;
  metricCard(
    ctx,
    MARGIN,
    metricTop,
    (CONTENT_W - 16) / 2,
    "Estimated monthly cost",
    `${money(audit.moneySummary.estimatedMonthlyCostLow)}-${money(audit.moneySummary.estimatedMonthlyCostHigh)}`
  );
  metricCard(
    ctx,
    MARGIN + (CONTENT_W + 16) / 2,
    metricTop,
    (CONTENT_W - 16) / 2,
    "Annualized risk",
    `${money(audit.moneySummary.estimatedAnnualCostLow)}-${money(audit.moneySummary.estimatedAnnualCostHigh)}`,
    rgb(0.86, 0.15, 0.15)
  );
  ctx.y = metricTop - 112;
  ctx.y = sectionLabel(ctx, "Highest-impact revenue leaks", ctx.y);
  audit.moneySummary.topExpensiveLeaks.slice(0, 5).forEach((finding, index) => {
    issueCard(ctx, finding, index + 1);
  });
}

function drawLowestReviews(ctx: Ctx, audit: RevenueLeakAudit): void {
  addPage(ctx);
  ctx.y = sectionLabel(ctx, "Lowest review analysis", ctx.y);
  advanceText(ctx, "Reviews ordered by lowest star rating in the Google review sample (max 5 reviews). Wording hints surface risky feedback when stars tie.", {
    size: 9,
    color: MUTED,
    maxWidth: CONTENT_W,
    gapAfter: 14,
  });
  const reviews = selectLowestRatedReviews(audit.business.reviews, 5);
  if (reviews.length === 0) {
    metricCard(ctx, MARGIN, ctx.y, CONTENT_W, "Review sample", "Review text unavailable", rgb(0.96, 0.62, 0.04));
    ctx.y -= 94;
    return;
  }
  for (const review of reviews) {
    const bodyText = sanitize(review.text ?? "No written review text available.");
    const bodyLines = wrapText(bodyText, ctx.font, 8.5, CONTENT_W - 90);
    const cardH = Math.max(56, 42 + bodyLines.length * 12);
    ensure(ctx, cardH + 14);
    const top = ctx.y;
    card(ctx, MARGIN, top, CONTENT_W, cardH, WHITE);
    ctx.page.drawText(formatReviewStarLabel(review.rating), {
      x: MARGIN + 16,
      y: top - 24,
      size: 12,
      font: ctx.bold,
      color: rgb(0.96, 0.62, 0.04),
    });
    const authorLines = wrapText(sanitize(review.authorName ?? "Google reviewer"), ctx.bold, 10, CONTENT_W - 90);
    let ay = top - 20;
    for (const line of authorLines) {
      ctx.page.drawText(line, {
        x: MARGIN + 62,
        y: ay,
        size: 10,
        font: ctx.bold,
        color: INK,
      });
      ay -= 13;
    }
    let by = ay - 4;
    for (const line of bodyLines) {
      ctx.page.drawText(line, {
        x: MARGIN + 62,
        y: by,
        size: 8.5,
        font: ctx.font,
        color: MUTED,
      });
      by -= 12;
    }
    ctx.y = top - cardH - 10;
  }
}

function drawLocalRanking(ctx: Ctx, audit: RevenueLeakAudit): void {
  addPage(ctx);
  ctx.y = sectionLabel(ctx, "Local ranking snapshot", ctx.y);
  advanceText(ctx, `Query: ${audit.rankingSnapshot.query}`, {
    size: 10,
    font: ctx.bold,
    color: MUTED,
    maxWidth: CONTENT_W,
    gapAfter: 14,
  });
  const rankRows = [...audit.rankingSnapshot.topFive];
  if (
    audit.rankingSnapshot.selectedBusinessRankItem &&
    !rankRows.some((row) => row.isSelectedBusiness)
  ) {
    rankRows.push(audit.rankingSnapshot.selectedBusinessRankItem);
  }
  for (const item of rankRows) {
    const nameLines = wrapText(sanitize(item.name), ctx.bold, 9.5, 280);
    const rowH = Math.max(40, 28 + nameLines.length * 12);
    ensure(ctx, rowH + 12);
    const top = ctx.y;
    card(ctx, MARGIN, top, CONTENT_W, rowH, item.isSelectedBusiness ? rgb(0.94, 0.97, 1) : WHITE);
    ctx.page.drawText(`#${item.position}`, {
      x: MARGIN + 14,
      y: top - 22,
      size: 10,
      font: ctx.bold,
      color: item.isSelectedBusiness ? BLUE : MUTED,
    });
    let ny = top - 18;
    for (const line of nameLines) {
      ctx.page.drawText(line, {
        x: MARGIN + 58,
        y: ny,
        size: 9.5,
        font: ctx.bold,
        color: INK,
      });
      ny -= 12;
    }
    const meta = `${item.rating ?? "N/A"} stars · ${item.reviewCount ?? 0} reviews`;
    ctx.page.drawText(meta, {
      x: PAGE_W - MARGIN - ctx.font.widthOfTextAtSize(meta, 8.5) - 12,
      y: top - 22,
      size: 8.5,
      font: ctx.font,
      color: MUTED,
    });
    ctx.y = top - rowH - 8;
  }
  const mapped = audit.competitorMapPoints.filter((p) => !p.isSelectedBusiness).length;
  ctx.y -= 4;
  advanceText(ctx, `${mapped} direct competitors are plotted on the interactive map in the online report.`, {
    size: 9,
    color: MUTED,
    maxWidth: CONTENT_W,
    gapAfter: 4,
  });
}

function drawProblemsBySection(ctx: Ctx, audit: RevenueLeakAudit): void {
  addPage(ctx);
  ctx.y = sectionLabel(ctx, "Problems found by section", ctx.y);
  for (const summary of audit.sectionSummaries) {
    const summaryLines = wrapText(sanitize(summary.summary), ctx.font, 8, CONTENT_W - 100);
    const findings = summary.findings.slice(0, 5);
    let findingsH = 0;
    for (const f of findings) {
      const titleL = wrapText(sanitize(f.title), ctx.bold, 9, CONTENT_W - 36);
      const whatL = wrapText(sanitize(f.whatWeFound), ctx.font, 7.5, CONTENT_W - 36);
      const fixL = wrapText(sanitize(`Fix: ${f.recommendedFix}`), ctx.font, 7.5, CONTENT_W - 36);
      findingsH += 4 + titleL.length * 11 + whatL.length * 9 + fixL.length * 9 + 10;
    }
    const cardH = Math.max(72, 22 + summaryLines.length * 10 + findingsH + 36);
    ensure(ctx, cardH + 16);
    const top = ctx.y;
    card(ctx, MARGIN, top, CONTENT_W, cardH, WHITE);
    text(ctx, summary.category, {
      x: MARGIN + 14,
      y: top - 18,
      size: 10,
      font: ctx.bold,
      maxWidth: 320,
    });
    scoreRing(ctx, PAGE_W - MARGIN - 60, top - 9, summary.score, summary.grade, 34);
    let yy = top - 34;
    for (const line of summaryLines) {
      ctx.page.drawText(line, {
        x: MARGIN + 14,
        y: yy,
        size: 8,
        font: ctx.font,
        color: MUTED,
      });
      yy -= 10;
    }
    yy -= 6;
    for (const f of findings) {
      const titleL = wrapText(sanitize(f.title), ctx.bold, 9, CONTENT_W - 36);
      for (const line of titleL) {
        ctx.page.drawText(line, {
          x: MARGIN + 14,
          y: yy,
          size: 9,
          font: ctx.bold,
          color: INK,
        });
        yy -= 11;
      }
      const whatL = wrapText(sanitize(f.whatWeFound), ctx.font, 7.5, CONTENT_W - 36);
      for (const line of whatL) {
        ctx.page.drawText(line, {
          x: MARGIN + 14,
          y: yy,
          size: 7.5,
          font: ctx.font,
          color: MUTED,
        });
        yy -= 9;
      }
      const fixL = wrapText(sanitize(`Fix: ${f.recommendedFix}`), ctx.font, 7.5, CONTENT_W - 36);
      for (const line of fixL) {
        ctx.page.drawText(line, {
          x: MARGIN + 14,
          y: yy,
          size: 7.5,
          font: ctx.font,
          color: INK,
        });
        yy -= 9;
      }
      yy -= 8;
    }
    ctx.y = top - cardH - 12;
  }
}

function drawActionPlanPage(ctx: Ctx, audit: RevenueLeakAudit): void {
  addPage(ctx);
  ctx.y = sectionLabel(ctx, "Action plan", ctx.y);
  ctx.page.drawText("What to fix first", {
    x: MARGIN,
    y: ctx.y - 2,
    size: 14,
    font: ctx.bold,
    color: INK,
  });
  ctx.y -= 30;
  audit.actionPlan.slice(0, 8).forEach((item, index) => {
    const fixLines = wrapText(sanitize(item.fix), ctx.bold, 9, CONTENT_W - 56);
    const meta = `Impact: ${item.impact} · Difficulty: ${item.difficulty}`;
    const cardH = Math.max(48, 28 + fixLines.length * 12);
    ensure(ctx, cardH + 14);
    const top = ctx.y;
    card(ctx, MARGIN, top, CONTENT_W, cardH, WHITE);
    ctx.page.drawCircle({
      x: MARGIN + 23,
      y: top - 22,
      size: 12,
      color: rgb(0.92, 0.95, 1),
    });
    ctx.page.drawText(String(index + 1), {
      x: MARGIN + 18,
      y: top - 26,
      size: 9,
      font: ctx.bold,
      color: BLUE,
    });
    ctx.page.drawText(meta, {
      x: PAGE_W - MARGIN - ctx.font.widthOfTextAtSize(meta, 7.5) - 14,
      y: top - 20,
      size: 7.5,
      font: ctx.font,
      color: MUTED,
    });
    let fy = top - 16;
    for (const line of fixLines) {
      ctx.page.drawText(line, {
        x: MARGIN + 48,
        y: fy,
        size: 9,
        font: ctx.bold,
        color: INK,
      });
      fy -= 12;
    }
    ctx.y = top - cardH - 10;
  });
  ctx.y -= 6;
  ctx.y = sectionLabel(ctx, "Disclaimer", ctx.y);
  advanceText(ctx, "Revenue estimates are based on available data and conservative assumptions. Results are not guaranteed. The report should be used as a directional planning tool.", {
    size: 9,
    color: MUTED,
    maxWidth: CONTENT_W,
    gapAfter: 8,
  });
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

  drawFirstPage(ctx, audit);
  drawBrandSummaryPage(ctx, audit);
  drawFoundIssuesAndLeaks(ctx, audit);
  drawProblemsBySection(ctx, audit);
  drawLowestReviews(ctx, audit);
  drawLocalRanking(ctx, audit);
  drawActionPlanPage(ctx, audit);
  drawFooter(ctx);

  return pdf.save();
}
