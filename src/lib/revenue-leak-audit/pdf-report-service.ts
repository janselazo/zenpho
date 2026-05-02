import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFFont,
  type PDFPage,
  type RGB,
} from "pdf-lib";
import { formatReviewStarLabel, selectLowestRatedReviews } from "./review-selection";
import { buildGoogleBusinessProfileChecklist } from "./gbp-checklist";
import type {
  AuditFinding,
  AuditGrade,
  AuditSeverity,
  BusinessProfile,
  RevenueLeakAudit,
} from "./types";

// ─── Layout constants ────────────────────────────────────────────────────────
const PAGE_W = 612;
const PAGE_H = 792;
const MARGIN = 36;
const CONTENT_W = PAGE_W - MARGIN * 2;
const FOOTER_H = 26;

// ─── Colour tokens (mirror src/app/globals.css) ──────────────────────────────
const ACCENT = rgb(0.145, 0.388, 0.922);        // #2563eb
const ACCENT_HOVER = rgb(0.114, 0.306, 0.847);  // #1d4ed8
const ACCENT_SOFT = rgb(0.859, 0.918, 0.996);   // #dbeafe
const ACCENT_GREEN = rgb(0.022, 0.588, 0.412);  // #059669
const ACCENT_GREEN_SOFT = rgb(0.82, 0.98, 0.91);
const INK = rgb(0.05, 0.07, 0.12);
const INK_SOFT = rgb(0.18, 0.21, 0.28);
const MUTED = rgb(0.38, 0.42, 0.5);
const PAGE_BG = rgb(0.985, 0.99, 1);
const SURFACE = rgb(0.957, 0.969, 0.98);
const SURFACE_LIGHT = rgb(0.974, 0.98, 0.989);
const BORDER = rgb(0.88, 0.91, 0.95);
const BORDER_SOFT = rgb(0.93, 0.95, 0.97);
const WHITE = rgb(1, 1, 1);

const SEVERITY_FG: Record<AuditSeverity, RGB> = {
  Critical: rgb(0.62, 0.08, 0.08),
  High: rgb(0.78, 0.13, 0.13),
  Medium: rgb(0.78, 0.5, 0.04),
  Low: rgb(0.34, 0.4, 0.5),
};

const SEVERITY_BG: Record<AuditSeverity, RGB> = {
  Critical: rgb(0.985, 0.91, 0.91),
  High: rgb(0.99, 0.94, 0.94),
  Medium: rgb(1, 0.96, 0.86),
  Low: rgb(0.93, 0.95, 0.98),
};

// ─── Types ───────────────────────────────────────────────────────────────────
type Ctx = {
  pdf: PDFDocument;
  page: PDFPage;
  font: PDFFont;
  bold: PDFFont;
  italic: PDFFont;
  y: number;
  pageNo: number;
};

// ─── Utilities ───────────────────────────────────────────────────────────────
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
    parseInt(full.slice(4, 6), 16) / 255,
  );
}

function gradeColor(grade: AuditGrade): RGB {
  switch (grade) {
    case "Poor":
      return rgb(0.86, 0.15, 0.15);
    case "Average":
      return rgb(0.96, 0.62, 0.04);
    case "Good":
      return ACCENT;
    case "Excellent":
      return ACCENT_GREEN;
  }
}

function gradeBg(grade: AuditGrade): RGB {
  switch (grade) {
    case "Poor":
      return rgb(0.99, 0.93, 0.93);
    case "Average":
      return rgb(1, 0.96, 0.86);
    case "Good":
      return ACCENT_SOFT;
    case "Excellent":
      return ACCENT_GREEN_SOFT;
  }
}

function scoreColor(score: number): RGB {
  if (score < 50) return rgb(0.86, 0.15, 0.15);
  if (score < 70) return rgb(0.96, 0.62, 0.04);
  if (score < 85) return ACCENT;
  return ACCENT_GREEN;
}

function wrapText(
  text: string,
  font: PDFFont,
  size: number,
  maxWidth: number,
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

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpRgb(a: RGB, b: RGB, t: number): RGB {
  return rgb(lerp(a.red, b.red, t), lerp(a.green, b.green, t), lerp(a.blue, b.blue, t));
}

// ─── Drawing primitives ──────────────────────────────────────────────────────
function paintBackground(ctx: Ctx): void {
  ctx.page.drawRectangle({ x: 0, y: 0, width: PAGE_W, height: PAGE_H, color: PAGE_BG });
}

function drawFooter(ctx: Ctx): void {
  ctx.page.drawLine({
    start: { x: MARGIN, y: 32 },
    end: { x: PAGE_W - MARGIN, y: 32 },
    thickness: 0.4,
    color: BORDER,
  });
  ctx.page.drawText("Revenue Leak Audit  |  Zenpho", {
    x: MARGIN,
    y: 18,
    size: 8,
    font: ctx.font,
    color: MUTED,
  });
  const right = `Page ${ctx.pageNo}`;
  ctx.page.drawText(right, {
    x: PAGE_W - MARGIN - ctx.font.widthOfTextAtSize(right, 8),
    y: 18,
    size: 8,
    font: ctx.font,
    color: MUTED,
  });
}

function newPage(ctx: Ctx): void {
  drawFooter(ctx);
  ctx.page = ctx.pdf.addPage([PAGE_W, PAGE_H]);
  ctx.pageNo += 1;
  paintBackground(ctx);
  ctx.y = PAGE_H - MARGIN;
}

function ensure(ctx: Ctx, height: number): void {
  if (ctx.y - height < MARGIN + FOOTER_H + 10) newPage(ctx);
}

function drawText(
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
  } = {},
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

function flowText(
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
  } = {},
): void {
  const gapAfter = opts.gapAfter ?? 12;
  const { gapAfter: _g, ...rest } = opts;
  ctx.y = drawText(ctx, value, { y: ctx.y, ...rest });
  ctx.y -= gapAfter;
}

function sectionLabel(ctx: Ctx, label: string, y = ctx.y): number {
  ctx.page.drawText(sanitize(label.toUpperCase()), {
    x: MARGIN,
    y,
    size: 8,
    font: ctx.bold,
    color: ACCENT,
  });
  return y - 18;
}

function sectionHeading(
  ctx: Ctx,
  label: string,
  heading: string,
  opts: { description?: string } = {},
): void {
  ensure(ctx, 60 + (opts.description ? 30 : 0));
  ctx.y = sectionLabel(ctx, label);
  ctx.page.drawText(sanitize(heading), {
    x: MARGIN,
    y: ctx.y - 4,
    size: 18,
    font: ctx.bold,
    color: INK,
  });
  ctx.y -= 28;
  if (opts.description) {
    flowText(ctx, opts.description, {
      size: 9.5,
      color: MUTED,
      maxWidth: CONTENT_W,
      gapAfter: 14,
    });
  }
}

function card(
  ctx: Ctx,
  x: number,
  topY: number,
  w: number,
  h: number,
  fill: RGB = WHITE,
  border: RGB = BORDER,
): void {
  ctx.page.drawRectangle({
    x,
    y: topY - h,
    width: w,
    height: h,
    color: fill,
    borderColor: border,
    borderWidth: 0.6,
  });
}

function drawVerticalGradient(
  ctx: Ctx,
  x: number,
  topY: number,
  w: number,
  h: number,
  topColor: RGB,
  bottomColor: RGB,
  steps = 28,
): void {
  const stripeH = h / steps;
  for (let i = 0; i < steps; i++) {
    const t = i / Math.max(1, steps - 1);
    ctx.page.drawRectangle({
      x,
      y: topY - stripeH * (i + 1),
      width: w,
      height: stripeH + 0.6, // slight overlap to avoid hairlines
      color: lerpRgb(topColor, bottomColor, t),
    });
  }
}

function drawDiagonalGradient(
  ctx: Ctx,
  x: number,
  topY: number,
  w: number,
  h: number,
  startColor: RGB,
  endColor: RGB,
  steps = 36,
): void {
  // Approximate a diagonal gradient with tilted thin bands. Cheap but pleasant.
  drawVerticalGradient(ctx, x, topY, w, h, startColor, endColor, steps);
}

function pill(
  ctx: Ctx,
  x: number,
  y: number,
  label: string,
  fg: RGB,
  bg: RGB,
  size = 8,
): { x: number; w: number } {
  const safe = sanitize(label);
  const w = ctx.bold.widthOfTextAtSize(safe, size) + 16;
  ctx.page.drawRectangle({
    x,
    y: y - size - 5,
    width: w,
    height: size + 10,
    color: bg,
    borderColor: fg,
    borderWidth: 0.4,
  });
  ctx.page.drawText(safe, {
    x: x + 8,
    y: y - size - 1,
    size,
    font: ctx.bold,
    color: fg,
  });
  return { x, w };
}

function severityPill(ctx: Ctx, x: number, y: number, severity: AuditSeverity): { w: number } {
  const fg = SEVERITY_FG[severity];
  const bg = SEVERITY_BG[severity];
  const r = pill(ctx, x, y, severity, fg, bg, 8);
  return { w: r.w };
}

function gradePill(ctx: Ctx, x: number, y: number, grade: AuditGrade): { w: number } {
  const r = pill(ctx, x, y, grade, gradeColor(grade), gradeBg(grade), 8);
  return { w: r.w };
}

// Polar helper: angle 0 = top (12 o'clock), increasing clockwise.
function arcPoint(cx: number, cy: number, r: number, deg: number): { x: number; y: number } {
  const rad = (deg * Math.PI) / 180;
  return {
    x: cx + r * Math.sin(rad),
    y: cy + r * Math.cos(rad),
  };
}

function drawArc(
  ctx: Ctx,
  cx: number,
  cy: number,
  radius: number,
  startDeg: number,
  sweepDeg: number,
  color: RGB,
  thickness: number,
): void {
  if (sweepDeg <= 0) return;
  const segments = Math.max(8, Math.ceil(sweepDeg / 4));
  let prev = arcPoint(cx, cy, radius, startDeg);
  for (let i = 1; i <= segments; i++) {
    const t = startDeg + (sweepDeg * i) / segments;
    const next = arcPoint(cx, cy, radius, t);
    ctx.page.drawLine({ start: prev, end: next, thickness, color });
    prev = next;
  }
}

function scoreRing(
  ctx: Ctx,
  cx: number,
  cy: number,
  score: number,
  grade: AuditGrade,
  opts: { radius?: number; thickness?: number; showGrade?: boolean; numberSize?: number } = {},
): void {
  const radius = opts.radius ?? 22;
  const thickness = opts.thickness ?? 6;
  const numberSize = opts.numberSize ?? 14;
  const showGrade = opts.showGrade ?? true;
  const safe = Math.max(0, Math.min(100, Math.round(score)));
  const sweep = (safe / 100) * 360;
  const trackColor = rgb(0.91, 0.93, 0.96);
  // Background full ring
  drawArc(ctx, cx, cy, radius, 0, 360, trackColor, thickness);
  // Foreground arc starting at top, sweeping clockwise
  drawArc(ctx, cx, cy, radius, 0, sweep, gradeColor(grade), thickness);
  const scoreText = String(safe);
  ctx.page.drawText(scoreText, {
    x: cx - ctx.bold.widthOfTextAtSize(scoreText, numberSize) / 2,
    y: cy - numberSize / 2 + 1,
    size: numberSize,
    font: ctx.bold,
    color: INK,
  });
  if (showGrade) {
    const gradeSize = 7.5;
    const w = ctx.bold.widthOfTextAtSize(grade, gradeSize) + 14;
    ctx.page.drawRectangle({
      x: cx - w / 2,
      y: cy - radius - 18,
      width: w,
      height: 14,
      color: gradeBg(grade),
      borderColor: gradeColor(grade),
      borderWidth: 0.4,
    });
    ctx.page.drawText(grade, {
      x: cx - ctx.bold.widthOfTextAtSize(grade, gradeSize) / 2,
      y: cy - radius - 14,
      size: gradeSize,
      font: ctx.bold,
      color: gradeColor(grade),
    });
  }
}

// ─── Cover page ──────────────────────────────────────────────────────────────
function drawCover(ctx: Ctx, audit: RevenueLeakAudit): void {
  paintBackground(ctx);

  // Gradient hero band
  const heroH = 240;
  const heroTop = PAGE_H;
  drawDiagonalGradient(ctx, 0, heroTop, PAGE_W, heroH, ACCENT, ACCENT_HOVER);

  // Top bar — small product label
  ctx.page.drawText("REVENUE LEAK AUDIT", {
    x: MARGIN,
    y: heroTop - 38,
    size: 8,
    font: ctx.bold,
    color: rgb(1, 1, 1),
  });

  // Right-aligned "By Zenpho"
  const byZ = "By Zenpho";
  ctx.page.drawText(byZ, {
    x: PAGE_W - MARGIN - ctx.font.widthOfTextAtSize(byZ, 8.5),
    y: heroTop - 38,
    size: 8.5,
    font: ctx.font,
    color: WHITE,
  });

  if (audit.createdAt?.trim()) {
    const lu = new Date(audit.createdAt);
    if (!Number.isNaN(lu.getTime())) {
      const luText = `Last updated ${lu.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}`;
      const luSan = sanitize(luText);
      ctx.page.drawText(luSan, {
        x: PAGE_W - MARGIN - ctx.font.widthOfTextAtSize(luSan, 7.5),
        y: heroTop - 52,
        size: 7.5,
        font: ctx.font,
        color: rgb(0.88, 0.92, 0.98),
      });
    }
  }

  // Business name — wrap to two lines if needed
  const nameLines = wrapText(audit.business.name, ctx.bold, 26, CONTENT_W - 200);
  let ny = heroTop - 70;
  for (const line of nameLines.slice(0, 2)) {
    ctx.page.drawText(line, {
      x: MARGIN,
      y: ny,
      size: 26,
      font: ctx.bold,
      color: WHITE,
    });
    ny -= 30;
  }

  const cat = audit.business.category ?? "Local business";
  const status = audit.business.businessStatus
    ? audit.business.businessStatus.replace(/_/g, " ").toLowerCase()
    : null;
  const subtitle = sanitize([cat, status].filter(Boolean).join(" · "));
  ctx.page.drawText(subtitle, {
    x: MARGIN,
    y: ny - 4,
    size: 11,
    font: ctx.font,
    color: rgb(0.86, 0.91, 0.99),
  });
  ny -= 20;
  const addressLine = sanitize(audit.business.address ?? "Address unavailable");
  const addrLines = wrapText(addressLine, ctx.font, 9.5, CONTENT_W - 200);
  let ay = ny;
  for (const line of addrLines.slice(0, 2)) {
    ctx.page.drawText(line, {
      x: MARGIN,
      y: ay,
      size: 9.5,
      font: ctx.font,
      color: rgb(0.86, 0.91, 0.99),
    });
    ay -= 12;
  }

  // Right-side overall score card on the hero
  const scoreCardW = 140;
  const scoreCardH = 132;
  const scoreCardX = PAGE_W - MARGIN - scoreCardW;
  const scoreCardTop = heroTop - 60;
  card(ctx, scoreCardX, scoreCardTop, scoreCardW, scoreCardH, WHITE, BORDER);
  ctx.page.drawText("OVERALL SCORE", {
    x: scoreCardX + (scoreCardW - ctx.bold.widthOfTextAtSize("OVERALL SCORE", 7)) / 2,
    y: scoreCardTop - 18,
    size: 7,
    font: ctx.bold,
    color: MUTED,
  });
  scoreRing(ctx, scoreCardX + scoreCardW / 2, scoreCardTop - 60, audit.scores.overall, audit.scores.grade, {
    radius: 30,
    thickness: 8,
    numberSize: 22,
    showGrade: true,
  });

  // Below hero: estimated cost + leaks side-by-side
  ctx.y = heroTop - heroH - 24;
  const metricCardH = 86;
  const metricCardW = (CONTENT_W - 16) / 2;
  const m = audit.moneySummary;

  // Card 1 — Monthly cost
  card(ctx, MARGIN, ctx.y, metricCardW, metricCardH, WHITE, BORDER);
  ctx.page.drawRectangle({
    x: MARGIN,
    y: ctx.y - 4,
    width: metricCardW,
    height: 4,
    color: ACCENT,
  });
  ctx.page.drawText("ESTIMATED MONTHLY COST", {
    x: MARGIN + 14,
    y: ctx.y - 22,
    size: 7,
    font: ctx.bold,
    color: MUTED,
  });
  const costStr = `${money(m.estimatedMonthlyCostLow)}–${money(m.estimatedMonthlyCostHigh)}`;
  ctx.page.drawText(costStr, {
    x: MARGIN + 14,
    y: ctx.y - 50,
    size: 18,
    font: ctx.bold,
    color: INK,
  });
  const leakLow = Math.round(m.combinedLeakRateLow * 100);
  const leakHigh = Math.round(m.combinedLeakRateHigh * 100);
  ctx.page.drawText(
    `~${leakLow}%–${leakHigh}% of ${money(m.addressableMonthlyRevenue)} addressable / mo`,
    {
      x: MARGIN + 14,
      y: ctx.y - 68,
      size: 8,
      font: ctx.font,
      color: MUTED,
    },
  );

  // Card 2 — Found issues
  const c2x = MARGIN + metricCardW + 16;
  card(ctx, c2x, ctx.y, metricCardW, metricCardH, WHITE, BORDER);
  ctx.page.drawRectangle({
    x: c2x,
    y: ctx.y - 4,
    width: metricCardW,
    height: 4,
    color: rgb(0.86, 0.15, 0.15),
  });
  ctx.page.drawText("FOUND ISSUES", {
    x: c2x + 14,
    y: ctx.y - 22,
    size: 7,
    font: ctx.bold,
    color: MUTED,
  });
  ctx.page.drawText(`${m.totalIssues} revenue leaks`, {
    x: c2x + 14,
    y: ctx.y - 50,
    size: 18,
    font: ctx.bold,
    color: INK,
  });
  const sevParts = (["Critical", "High", "Medium", "Low"] as const)
    .map((s) => (m.severityCounts[s] ? `${m.severityCounts[s]} ${s.toLowerCase()}` : null))
    .filter((x): x is string => Boolean(x));
  ctx.page.drawText(sevParts.join("  ·  ") || "No issues detected", {
    x: c2x + 14,
    y: ctx.y - 68,
    size: 8,
    font: ctx.font,
    color: MUTED,
  });

  ctx.y -= metricCardH + 22;

  // Recommended next step
  ensure(ctx, 90);
  ctx.y = sectionLabel(ctx, "Recommended next step");
  flowText(ctx, audit.recommendedNextStep, {
    size: 11,
    font: ctx.bold,
    color: INK,
    maxWidth: CONTENT_W,
    gapAfter: 12,
  });

  // Quick contact strip
  const stripTop = ctx.y;
  card(ctx, MARGIN, stripTop, CONTENT_W, 50, SURFACE_LIGHT, BORDER_SOFT);
  const fields: Array<[string, string]> = [
    ["WEBSITE", audit.business.website ?? "Not linked on Google"],
    ["PHONE", audit.business.phone ?? "Phone unavailable"],
    [
      "REVIEWS",
      `${audit.business.rating ?? "N/A"} stars  ·  ${audit.business.reviewCount ?? 0} reviews`,
    ],
  ];
  const colW = (CONTENT_W - 28) / fields.length;
  fields.forEach(([label, value], i) => {
    const cx = MARGIN + 14 + colW * i;
    ctx.page.drawText(label, {
      x: cx,
      y: stripTop - 18,
      size: 7,
      font: ctx.bold,
      color: MUTED,
    });
    drawText(ctx, value, {
      x: cx,
      y: stripTop - 32,
      size: 9,
      font: ctx.font,
      color: INK_SOFT,
      maxWidth: colW - 6,
    });
  });
  ctx.y = stripTop - 50 - 14;
}

// ─── Brand Summary ───────────────────────────────────────────────────────────
function drawBrandSummary(ctx: Ctx, audit: RevenueLeakAudit): void {
  newPage(ctx);
  sectionHeading(ctx, "Brand identity", "Brand summary", {
    description: audit.brandIdentity.brandPresenceSummary,
  });

  const swatches = [
    audit.brandIdentity.primaryColor,
    audit.brandIdentity.accentColor,
    ...audit.brandIdentity.palette,
  ].filter((c, i, all): c is string => Boolean(c) && all.indexOf(c) === i);

  if (swatches.length > 0) {
    const circleR = 11;
    const fontSize = 7.5;
    const circleLabelGap = 6;
    const itemHGap = 14;
    const rowHeight = 26;
    const innerLeft = MARGIN + 14;
    const innerRight = PAGE_W - MARGIN - 14;

    type Placed = { row: number; x: number; label: string; rawHex: string };
    const placed: Placed[] = [];
    let row = 0;
    let x = innerLeft;
    for (const raw of swatches.slice(0, 8)) {
      const label = raw.toUpperCase();
      const tw = ctx.bold.widthOfTextAtSize(label, fontSize);
      const itemW = circleR * 2 + circleLabelGap + tw;
      if (x > innerLeft && x + itemW > innerRight) {
        row += 1;
        x = innerLeft;
      }
      placed.push({ row, x, label, rawHex: raw });
      x += itemW + itemHGap;
    }
    const rowCount = row + 1;
    const cardH = 24 + rowCount * rowHeight + 12;

    ensure(ctx, cardH + 10);
    const top = ctx.y;
    card(ctx, MARGIN, top, CONTENT_W, cardH, WHITE, BORDER);
    ctx.page.drawText("BRAND PALETTE", {
      x: MARGIN + 14,
      y: top - 18,
      size: 7,
      font: ctx.bold,
      color: MUTED,
    });

    const baseY = top - 40;
    for (const p of placed) {
      const sy = baseY - p.row * rowHeight;
      ctx.page.drawCircle({
        x: p.x + circleR,
        y: sy,
        size: circleR,
        color: hexToRgb(p.rawHex, ACCENT),
        borderColor: BORDER,
        borderWidth: 0.6,
      });
      ctx.page.drawText(p.label, {
        x: p.x + circleR * 2 + circleLabelGap,
        y: sy - 3,
        size: fontSize,
        font: ctx.bold,
        color: INK_SOFT,
      });
    }
    ctx.y = top - cardH - 16;
  }

  if (audit.brandIdentity.typographyNotes.length > 0) {
    ensure(ctx, 80);
    const top = ctx.y;
    const cardH = Math.max(60, 28 + audit.brandIdentity.typographyNotes.length * 14);
    card(ctx, MARGIN, top, CONTENT_W, cardH, WHITE, BORDER);
    ctx.page.drawText("TYPOGRAPHY SIGNALS", {
      x: MARGIN + 14,
      y: top - 18,
      size: 7,
      font: ctx.bold,
      color: MUTED,
    });
    audit.brandIdentity.typographyNotes.slice(0, 6).forEach((note, i) => {
      ctx.page.drawText(`•  ${sanitize(note)}`, {
        x: MARGIN + 14,
        y: top - 38 - i * 14,
        size: 9,
        font: ctx.font,
        color: INK_SOFT,
      });
    });
    ctx.y = top - cardH - 16;
  }
}

// ─── Money summary page ──────────────────────────────────────────────────────
function drawMoneySummary(ctx: Ctx, audit: RevenueLeakAudit): void {
  newPage(ctx);
  ctx.y = sectionLabel(ctx, "Found issues & estimated cost");

  const m = audit.moneySummary;
  const heroTop = ctx.y;
  const heroH = 220;
  // Gradient panel
  drawDiagonalGradient(ctx, MARGIN, heroTop, CONTENT_W, heroH, ACCENT, ACCENT_HOVER);
  // Headline
  ctx.page.drawText(`We found ${m.totalIssues} revenue leaks`, {
    x: MARGIN + 22,
    y: heroTop - 36,
    size: 22,
    font: ctx.bold,
    color: WHITE,
  });
  // Description
  const descLines = wrapText(m.assumptionsExplanation, ctx.font, 9, CONTENT_W * 0.55);
  let dy = heroTop - 60;
  for (const line of descLines.slice(0, 6)) {
    ctx.page.drawText(line, {
      x: MARGIN + 22,
      y: dy,
      size: 9,
      font: ctx.font,
      color: rgb(0.92, 0.95, 1),
    });
    dy -= 12;
  }
  // Severity chips on the panel
  let chipX = MARGIN + 22;
  const chipY = heroTop - heroH + 32;
  (["Critical", "High", "Medium", "Low"] as const).forEach((sev) => {
    const n = m.severityCounts[sev];
    if (!n) return;
    const label = `${sev}: ${n}`;
    const w = ctx.bold.widthOfTextAtSize(label, 8.5) + 18;
    ctx.page.drawRectangle({
      x: chipX,
      y: chipY,
      width: w,
      height: 18,
      color: rgb(1, 1, 1),
      borderColor: rgb(1, 1, 1),
      borderWidth: 0,
    });
    ctx.page.drawText(label, {
      x: chipX + 9,
      y: chipY + 5,
      size: 8.5,
      font: ctx.bold,
      color: ACCENT,
    });
    chipX += w + 6;
  });

  // Right-side white metric panel
  const panelW = 200;
  const panelH = heroH - 28;
  const panelX = MARGIN + CONTENT_W - panelW - 14;
  const panelTop = heroTop - 14;
  card(ctx, panelX, panelTop, panelW, panelH, WHITE, BORDER);
  ctx.page.drawText("ESTIMATED MONTHLY COST", {
    x: panelX + 16,
    y: panelTop - 20,
    size: 7,
    font: ctx.bold,
    color: MUTED,
  });
  const costStr = `${money(m.estimatedMonthlyCostLow)}–${money(m.estimatedMonthlyCostHigh)}`;
  ctx.page.drawText(costStr, {
    x: panelX + 16,
    y: panelTop - 50,
    size: 20,
    font: ctx.bold,
    color: INK,
  });
  const leakLow = Math.round(m.combinedLeakRateLow * 100);
  const leakHigh = Math.round(m.combinedLeakRateHigh * 100);
  drawText(ctx, `~${leakLow}%–${leakHigh}% of ${money(m.addressableMonthlyRevenue)} addressable / mo`, {
    x: panelX + 16,
    y: panelTop - 68,
    size: 7.5,
    font: ctx.font,
    color: MUTED,
    maxWidth: panelW - 32,
    lineGap: 2,
  });
  // Two micro-cards
  const microW = (panelW - 32 - 8) / 2;
  const microTop = panelTop - 92;
  const microH = 38;
  [
    ["LEADS LOST / MO", `${m.lostLeadsPerMonthLow}–${m.lostLeadsPerMonthHigh}`],
    ["JOBS LOST / MO", `${m.lostJobsPerMonthLow}–${m.lostJobsPerMonthHigh}`],
  ].forEach((entry, i) => {
    const [label, value] = entry;
    const cx = panelX + 16 + i * (microW + 8);
    card(ctx, cx, microTop, microW, microH, SURFACE, BORDER_SOFT);
    ctx.page.drawText(label, {
      x: cx + 8,
      y: microTop - 12,
      size: 6.5,
      font: ctx.bold,
      color: MUTED,
    });
    ctx.page.drawText(String(value), {
      x: cx + 8,
      y: microTop - 28,
      size: 12,
      font: ctx.bold,
      color: INK,
    });
  });
  ctx.page.drawText("ANNUALIZED RISK", {
    x: panelX + 16,
    y: microTop - microH - 20,
    size: 7,
    font: ctx.bold,
    color: MUTED,
  });
  ctx.page.drawText(
    `${money(m.estimatedAnnualCostLow)}–${money(m.estimatedAnnualCostHigh)}`,
    {
      x: panelX + 16,
      y: microTop - microH - 38,
      size: 14,
      font: ctx.bold,
      color: rgb(0.86, 0.15, 0.15),
    },
  );

  ctx.y = heroTop - heroH - 24;

  // Highest-impact leaks
  ctx.y = sectionLabel(ctx, "Highest-impact revenue leaks");
  for (const [i, finding] of m.topExpensiveLeaks.slice(0, 5).entries()) {
    drawFindingCard(ctx, finding, i + 1);
  }
}

// ─── Finding card (reused in multiple places) ────────────────────────────────
function drawFindingCard(ctx: Ctx, finding: AuditFinding, index: number): void {
  const sev = finding.severity;
  const severityW = ctx.bold.widthOfTextAtSize(sev, 8) + 16;
  const innerLeft = MARGIN + 38;
  const innerRight = PAGE_W - MARGIN - severityW - 14;
  const titleMax = innerRight - innerLeft - 4;
  const bodyMax = CONTENT_W - 56;

  const titleLines = wrapText(finding.title, ctx.bold, 11, titleMax);
  const what = wrapText(`What we found: ${finding.whatWeFound}`, ctx.font, 8.5, bodyMax);
  const why = wrapText(`Why it matters: ${finding.whyItMatters}`, ctx.font, 8.5, bodyMax);
  const fix = wrapText(`Recommended fix: ${finding.recommendedFix}`, ctx.font, 8.5, bodyMax);

  const titleBlockH = titleLines.length * 14;
  const sectionGap = 6;
  const bodyLineH = 11;
  const blockH = (lines: string[]) => 4 + lines.length * bodyLineH;
  const impactRow = finding.estimatedRevenueImpactHigh > 0 ? 16 : 0;
  const cardH =
    20 + titleBlockH + sectionGap + blockH(what) + sectionGap + blockH(why) + sectionGap + blockH(fix) + impactRow + 14;

  ensure(ctx, cardH + 12);
  const top = ctx.y;
  card(ctx, MARGIN, top, CONTENT_W, cardH, WHITE, BORDER);

  // Index badge
  ctx.page.drawCircle({
    x: MARGIN + 22,
    y: top - 22,
    size: 12,
    color: ACCENT_SOFT,
  });
  const idxStr = String(index);
  ctx.page.drawText(idxStr, {
    x: MARGIN + 22 - ctx.bold.widthOfTextAtSize(idxStr, 9) / 2,
    y: top - 26,
    size: 9,
    font: ctx.bold,
    color: ACCENT,
  });

  // Severity pill, top-right
  severityPill(ctx, PAGE_W - MARGIN - severityW - 14, top - 13, sev);

  // Title
  let lineY = top - 22;
  for (const line of titleLines) {
    ctx.page.drawText(line, {
      x: innerLeft,
      y: lineY,
      size: 11,
      font: ctx.bold,
      color: INK,
    });
    lineY -= 14;
  }

  // What we found
  lineY -= 6;
  drawLabelledLines(ctx, what, lineY, "What we found:");
  lineY -= blockH(what) + 0;

  // Why it matters
  drawLabelledLines(ctx, why, lineY, "Why it matters:");
  lineY -= blockH(why);

  // Fix
  drawLabelledLines(ctx, fix, lineY, "Recommended fix:", { color: INK });
  lineY -= blockH(fix);

  if (impactRow) {
    const impactMid = Math.round((finding.estimatedRevenueImpactLow + finding.estimatedRevenueImpactHigh) / 2);
    const impactStr = `~${money(impactMid)} / mo at risk`;
    ctx.page.drawText(impactStr, {
      x: MARGIN + 14,
      y: top - cardH + 14,
      size: 8,
      font: ctx.bold,
      color: ACCENT,
    });
  }

  ctx.y = top - cardH - 10;
}

function drawLabelledLines(
  ctx: Ctx,
  lines: string[],
  startY: number,
  prefix: string,
  opts: { color?: RGB } = {},
): void {
  // The first line carries the bold label inline; subsequent lines are flowing body.
  const color = opts.color ?? MUTED;
  let y = startY;
  for (const [i, raw] of lines.entries()) {
    const text = raw.startsWith(prefix) ? raw.slice(prefix.length).trim() : raw;
    if (i === 0) {
      ctx.page.drawText(prefix, {
        x: MARGIN + 14,
        y,
        size: 8.5,
        font: ctx.bold,
        color: INK,
      });
      const labelW = ctx.bold.widthOfTextAtSize(prefix, 8.5);
      ctx.page.drawText(text, {
        x: MARGIN + 14 + labelW + 4,
        y,
        size: 8.5,
        font: ctx.font,
        color,
      });
    } else {
      ctx.page.drawText(raw, {
        x: MARGIN + 14,
        y,
        size: 8.5,
        font: ctx.font,
        color,
      });
    }
    y -= 11;
  }
}

function drawGbpChecklistPdf(ctx: Ctx, business: BusinessProfile): void {
  const items = buildGoogleBusinessProfileChecklist(business);
  ensure(ctx, 28);
  ctx.page.drawText(sanitize("Google Business Profile checklist"), {
    x: MARGIN,
    y: ctx.y,
    size: 9,
    font: ctx.bold,
    color: INK,
  });
  let y = ctx.y - 12;
  for (const item of items) {
    const tag =
      item.status === "pass"
        ? "[OK]"
        : item.status === "warn"
          ? "[!]"
          : item.status === "fail"
            ? "[X]"
            : "[?]";
    const text = sanitize(`${tag} ${item.label} — ${item.hint}`);
    ensure(ctx, 40);
    y = drawText(ctx, text, {
      x: MARGIN,
      y,
      size: 8,
      font: ctx.font,
      color: INK_SOFT,
      maxWidth: CONTENT_W,
      lineGap: 2,
    });
    y -= 4;
  }
  ctx.y = y - 6;
}

// ─── Problems by section ─────────────────────────────────────────────────────
function drawProblemsBySection(ctx: Ctx, audit: RevenueLeakAudit): void {
  newPage(ctx);
  sectionHeading(ctx, "Section breakdown", "Problems found by section", {
    description:
      "Each section is graded against the strongest local-pack competitors. Below the score is the priority issue list with What we found, Why it matters, and the recommended fix.",
  });

  for (const section of audit.sectionSummaries) {
    // Header card
    const headerH = 96;
    ensure(ctx, headerH + 24);
    const top = ctx.y;
    card(ctx, MARGIN, top, CONTENT_W, headerH, WHITE, BORDER);
    // Score ring on the right (with grade pill underneath)
    scoreRing(ctx, PAGE_W - MARGIN - 40, top - 38, section.score, section.grade, {
      radius: 18,
      thickness: 5,
      numberSize: 12,
      showGrade: true,
    });
    // Title + summary
    drawText(ctx, section.category, {
      x: MARGIN + 18,
      y: top - 24,
      size: 13,
      font: ctx.bold,
      color: INK,
      maxWidth: CONTENT_W - 120,
    });
    drawText(ctx, section.summary, {
      x: MARGIN + 18,
      y: top - 44,
      size: 9,
      font: ctx.font,
      color: MUTED,
      maxWidth: CONTENT_W - 120,
      lineGap: 3,
    });
    // Issue count chip
    if (section.issueCount > 0) {
      pill(
        ctx,
        MARGIN + 18,
        top - headerH + 22,
        `${section.issueCount} ${section.issueCount === 1 ? "issue" : "issues"} found`,
        ACCENT_HOVER,
        ACCENT_SOFT,
        7.5,
      );
    } else {
      pill(ctx, MARGIN + 18, top - headerH + 22, "No issues found", ACCENT_GREEN, ACCENT_GREEN_SOFT, 7.5);
    }
    ctx.y = top - headerH - 10;

    if (section.category === "Google Business Profile") {
      drawGbpChecklistPdf(ctx, audit.business);
    }

    if (section.findings.length === 0) {
      if (section.category === "Google Business Profile") {
        ensure(ctx, 28);
        ctx.y = drawText(ctx, sanitize("No flagged GBP issues in the priority list above."), {
          y: ctx.y,
          size: 9,
          font: ctx.font,
          color: MUTED,
          maxWidth: CONTENT_W,
          lineGap: 2,
        });
        ctx.y -= 8;
        continue;
      }
      ensure(ctx, 36);
      card(ctx, MARGIN, ctx.y, CONTENT_W, 28, SURFACE_LIGHT, BORDER_SOFT);
      ctx.page.drawText("No major issues found in this section.", {
        x: MARGIN + 14,
        y: ctx.y - 18,
        size: 9,
        font: ctx.font,
        color: MUTED,
      });
      ctx.y -= 38;
      continue;
    }

    for (const [i, finding] of section.findings.entries()) {
      drawFindingCard(ctx, finding, i + 1);
    }
    ctx.y -= 6;
  }
}

// ─── Competitor strengths ────────────────────────────────────────────────────
function drawCompetitorStrengths(ctx: Ctx, audit: RevenueLeakAudit): void {
  const insight = audit.competitorStrengths;
  if (!insight) return;
  newPage(ctx);
  sectionHeading(ctx, "My business vs Google competitors", "What competitors are praised for", {
    description: insight.summary,
  });

  const themes = insight.themes.slice(0, 6);
  if (themes.length === 0) {
    ensure(ctx, 60);
    card(ctx, MARGIN, ctx.y, CONTENT_W, 50, SURFACE_LIGHT, BORDER_SOFT);
    ctx.page.drawText(
      "Competitor reviews were limited in this market sample.",
      {
        x: MARGIN + 16,
        y: ctx.y - 24,
        size: 10,
        font: ctx.font,
        color: MUTED,
      },
    );
    ctx.y -= 70;
  }

  for (const theme of themes) {
    const isGap = insight.topGap?.theme === theme.theme;
    const labelLines = wrapText(theme.label, ctx.bold, 10.5, CONTENT_W - 200);
    const quoteLines = theme.exampleQuote
      ? wrapText(`"${theme.exampleQuote}"`, ctx.italic, 8.5, CONTENT_W - 32)
      : [];
    const praisedLine = theme.praisedCompetitors.length
      ? `Praised in: ${theme.praisedCompetitors.slice(0, 3).join(", ")}`
      : "";
    const cardH =
      20 +
      labelLines.length * 13 +
      (isGap ? 18 : 0) +
      (praisedLine ? 14 : 0) +
      (quoteLines.length ? 6 + quoteLines.length * 11 : 0) +
      14;

    ensure(ctx, cardH + 12);
    const top = ctx.y;
    card(
      ctx,
      MARGIN,
      top,
      CONTENT_W,
      cardH,
      isGap ? ACCENT_SOFT : WHITE,
      isGap ? ACCENT : BORDER,
    );

    // Title row
    let yy = top - 20;
    for (const line of labelLines) {
      ctx.page.drawText(line, {
        x: MARGIN + 14,
        y: yy,
        size: 10.5,
        font: ctx.bold,
        color: INK,
      });
      yy -= 13;
    }

    // Counts on the right
    const countsStr = `competitors ${theme.competitorMentions}x  ·  you ${theme.ownMentions}x`;
    ctx.page.drawText(countsStr, {
      x: PAGE_W - MARGIN - 14 - ctx.font.widthOfTextAtSize(countsStr, 8.5),
      y: top - 20,
      size: 8.5,
      font: ctx.font,
      color: MUTED,
    });

    if (isGap) {
      const r = pill(ctx, MARGIN + 14, yy + 5, "Biggest gap", ACCENT, WHITE, 7);
      // shift remaining content below the pill
      yy -= 18;
      void r;
    }

    if (praisedLine) {
      ctx.page.drawText(praisedLine, {
        x: MARGIN + 14,
        y: yy - 4,
        size: 8.5,
        font: ctx.font,
        color: MUTED,
      });
      yy -= 14;
    }

    if (quoteLines.length) {
      yy -= 6;
      for (const line of quoteLines.slice(0, 3)) {
        ctx.page.drawText(line, {
          x: MARGIN + 14,
          y: yy,
          size: 8.5,
          font: ctx.italic,
          color: INK_SOFT,
        });
        yy -= 11;
      }
    }

    ctx.y = top - cardH - 10;
  }

  // Suggestion footer card
  ensure(ctx, 70);
  const top = ctx.y;
  const suggestionLines = wrapText(insight.recommendation, ctx.font, 9.5, CONTENT_W - 32);
  const sugCardH = Math.max(60, 24 + suggestionLines.length * 12);
  card(ctx, MARGIN, top, CONTENT_W, sugCardH, ACCENT_SOFT, ACCENT);
  ctx.page.drawText("SUGGESTION", {
    x: MARGIN + 14,
    y: top - 18,
    size: 7,
    font: ctx.bold,
    color: ACCENT_HOVER,
  });
  let sy = top - 34;
  for (const line of suggestionLines) {
    ctx.page.drawText(line, {
      x: MARGIN + 14,
      y: sy,
      size: 9.5,
      font: ctx.font,
      color: INK,
    });
    sy -= 12;
  }
  ctx.y = top - sugCardH - 12;
}

// ─── Local ranking snapshot ──────────────────────────────────────────────────
function drawLocalRanking(ctx: Ctx, audit: RevenueLeakAudit): void {
  newPage(ctx);
  sectionHeading(ctx, "Google local pack", "Local ranking snapshot", {
    description: `Query: ${audit.rankingSnapshot.query}  ·  Location: ${audit.rankingSnapshot.location}  ·  Rank orders this batch by rating, reviews, and distance (not only Google's API sort).`,
  });

  const rows = [...audit.rankingSnapshot.topFive];
  if (
    audit.rankingSnapshot.selectedBusinessRankItem &&
    !rows.some((row) => row.isSelectedBusiness)
  ) {
    rows.push(audit.rankingSnapshot.selectedBusinessRankItem);
  }

  for (const item of rows) {
    const nameLines = wrapText(item.name, ctx.bold, 10, CONTENT_W - 220);
    const rowH = Math.max(46, 30 + nameLines.length * 12);
    ensure(ctx, rowH + 10);
    const top = ctx.y;
    card(
      ctx,
      MARGIN,
      top,
      CONTENT_W,
      rowH,
      item.isSelectedBusiness ? ACCENT_SOFT : WHITE,
      item.isSelectedBusiness ? ACCENT : BORDER,
    );

    // Position
    const posStr = `#${item.position}`;
    ctx.page.drawText(posStr, {
      x: MARGIN + 14,
      y: top - 24,
      size: 14,
      font: ctx.bold,
      color: item.isSelectedBusiness ? ACCENT : INK_SOFT,
    });

    // Name + (you) tag
    let ny = top - 20;
    for (const line of nameLines) {
      ctx.page.drawText(line, {
        x: MARGIN + 56,
        y: ny,
        size: 10,
        font: ctx.bold,
        color: INK,
      });
      ny -= 12;
    }
    if (item.isSelectedBusiness) {
      pill(ctx, MARGIN + 56, top - 36 - nameLines.length * 6, "You", ACCENT_HOVER, WHITE, 7);
    }

    // Stats on the right (measure both; layout from right edge so rating + reviews never overlap)
    const ratingStr = `${item.rating ?? "N/A"} stars`;
    const reviewsStr = `${item.reviewCount ?? 0} reviews`;
    const ratingSize = 10;
    const reviewsSize = 9;
    const statsRightPad = 14;
    const statsGap = 8;
    const ratingW = ctx.bold.widthOfTextAtSize(ratingStr, ratingSize);
    const reviewsW = ctx.font.widthOfTextAtSize(reviewsStr, reviewsSize);
    const statsRightEdge = PAGE_W - MARGIN - statsRightPad;
    const reviewsX = statsRightEdge - reviewsW;
    const ratingX = reviewsX - statsGap - ratingW;

    ctx.page.drawText(ratingStr, {
      x: ratingX,
      y: top - 22,
      size: ratingSize,
      font: ctx.bold,
      color: rgb(0.96, 0.62, 0.04),
    });
    ctx.page.drawText(reviewsStr, {
      x: reviewsX,
      y: top - 22,
      size: reviewsSize,
      font: ctx.font,
      color: MUTED,
    });

    if (item.category) {
      ctx.page.drawText(sanitize(item.category), {
        x: MARGIN + 56,
        y: top - rowH + 14,
        size: 8,
        font: ctx.font,
        color: MUTED,
      });
    }

    ctx.y = top - rowH - 8;
  }

  const mapped = audit.competitorMapPoints.filter((p) => !p.isSelectedBusiness).length;
  ctx.y -= 6;
  flowText(
    ctx,
    `${mapped} direct competitors are plotted on the interactive map in the online report.`,
    {
      size: 9,
      color: MUTED,
      maxWidth: CONTENT_W,
      gapAfter: 4,
    },
  );
}

// ─── Lowest review analysis ──────────────────────────────────────────────────
function drawLowestReviews(ctx: Ctx, audit: RevenueLeakAudit): void {
  newPage(ctx);
  sectionHeading(ctx, "Reviews & reputation", "Lowest review analysis", {
    description:
      "Reviews ordered by lowest star rating in the public Google sample (max 5). Use these to spot recurring objections and coach the team toward fixes.",
  });

  const business = audit.business;
  if (business.website?.trim()) {
    ensure(ctx, 80);
    flowText(ctx, "Not featuring or responding to reviews hurts sales.", {
      size: 10,
      font: ctx.bold,
      color: INK_SOFT,
      maxWidth: CONTENT_W,
      gapAfter: 8,
    });
    const wa = audit.websiteAudit;
    if (wa.available) {
      if (!wa.homepageFeaturesReviews) {
        flowText(ctx, "Reviews are not featured on your homepage.", {
          size: 9.5,
          color: INK_SOFT,
          maxWidth: CONTENT_W,
          gapAfter: 6,
        });
        flowText(ctx, "Customer reviews are not visible on your homepage, which hurts conversion rate.", {
          size: 9.5,
          color: MUTED,
          maxWidth: CONTENT_W,
          gapAfter: 14,
        });
      }
    } else {
      flowText(ctx, "Homepage could not be analyzed for this report, so on-site review visibility was not verified.", {
        size: 9,
        color: MUTED,
        maxWidth: CONTENT_W,
        gapAfter: 14,
      });
    }
  }

  const reviews = selectLowestRatedReviews(audit.business.reviews, 5);
  if (reviews.length === 0) {
    ensure(ctx, 60);
    card(ctx, MARGIN, ctx.y, CONTENT_W, 50, SURFACE_LIGHT, BORDER_SOFT);
    ctx.page.drawText("No public review text was available for this business.", {
      x: MARGIN + 16,
      y: ctx.y - 26,
      size: 10,
      font: ctx.font,
      color: MUTED,
    });
    ctx.y -= 70;
    return;
  }

  for (const review of reviews) {
    const bodyText = sanitize(review.text ?? "No written review text available.");
    const bodyLines = wrapText(bodyText, ctx.font, 9, CONTENT_W - 100);
    const cardH = Math.max(60, 42 + bodyLines.length * 12);
    ensure(ctx, cardH + 12);
    const top = ctx.y;
    card(ctx, MARGIN, top, CONTENT_W, cardH, WHITE, BORDER);

    ctx.page.drawText(formatReviewStarLabel(review.rating), {
      x: MARGIN + 16,
      y: top - 24,
      size: 12,
      font: ctx.bold,
      color: rgb(0.96, 0.62, 0.04),
    });
    const author = sanitize(review.authorName ?? "Google reviewer");
    ctx.page.drawText(author, {
      x: MARGIN + 70,
      y: top - 24,
      size: 10,
      font: ctx.bold,
      color: INK,
    });
    if (review.relativePublishTime) {
      const t = sanitize(review.relativePublishTime);
      ctx.page.drawText(t, {
        x: PAGE_W - MARGIN - ctx.font.widthOfTextAtSize(t, 8.5) - 14,
        y: top - 24,
        size: 8.5,
        font: ctx.font,
        color: MUTED,
      });
    }
    let by = top - 42;
    for (const line of bodyLines) {
      ctx.page.drawText(line, {
        x: MARGIN + 70,
        y: by,
        size: 9,
        font: ctx.font,
        color: MUTED,
      });
      by -= 12;
    }
    ctx.y = top - cardH - 10;
  }
}

// ─── Action plan ─────────────────────────────────────────────────────────────
function drawActionPlan(ctx: Ctx, audit: RevenueLeakAudit): void {
  newPage(ctx);
  sectionHeading(ctx, "Roadmap", "Action plan", {
    description:
      "Prioritized fixes ordered by impact. Tackle the first two this week, the next two over the next 30 days, and the rest over 60–90 days.",
  });

  audit.actionPlan.forEach((item, index) => {
    const fixLines = wrapText(item.fix, ctx.bold, 10, CONTENT_W - 84);
    const benefitLines = wrapText(item.expectedBenefit, ctx.font, 8.5, CONTENT_W - 84);
    const cardH = Math.max(72, 32 + fixLines.length * 13 + benefitLines.length * 11 + 26);
    ensure(ctx, cardH + 12);
    const top = ctx.y;
    card(ctx, MARGIN, top, CONTENT_W, cardH, WHITE, BORDER);

    // Index badge
    ctx.page.drawCircle({
      x: MARGIN + 24,
      y: top - 26,
      size: 14,
      color: ACCENT_SOFT,
    });
    const idxStr = String(index + 1);
    ctx.page.drawText(idxStr, {
      x: MARGIN + 24 - ctx.bold.widthOfTextAtSize(idxStr, 11) / 2,
      y: top - 31,
      size: 11,
      font: ctx.bold,
      color: ACCENT,
    });

    let ty = top - 22;
    for (const line of fixLines) {
      ctx.page.drawText(line, {
        x: MARGIN + 50,
        y: ty,
        size: 10,
        font: ctx.bold,
        color: INK,
      });
      ty -= 13;
    }

    ty -= 2;
    for (const line of benefitLines.slice(0, 3)) {
      ctx.page.drawText(line, {
        x: MARGIN + 50,
        y: ty,
        size: 8.5,
        font: ctx.font,
        color: MUTED,
      });
      ty -= 11;
    }

    // Pills row at the bottom of the card
    const pillY = top - cardH + 18;
    const impactColor =
      item.impact === "High" ? rgb(0.86, 0.15, 0.15) : item.impact === "Medium" ? rgb(0.96, 0.62, 0.04) : MUTED;
    const impactBg =
      item.impact === "High"
        ? rgb(0.99, 0.93, 0.93)
        : item.impact === "Medium"
          ? rgb(1, 0.96, 0.86)
          : SURFACE;
    const diffColor =
      item.difficulty === "High" ? rgb(0.86, 0.15, 0.15) : item.difficulty === "Medium" ? rgb(0.96, 0.62, 0.04) : ACCENT_GREEN;
    const diffBg =
      item.difficulty === "High"
        ? rgb(0.99, 0.93, 0.93)
        : item.difficulty === "Medium"
          ? rgb(1, 0.96, 0.86)
          : ACCENT_GREEN_SOFT;
    let px = MARGIN + 50;
    const r1 = pill(ctx, px, pillY, `Impact: ${item.impact}`, impactColor, impactBg, 7.5);
    px += r1.w + 6;
    const r2 = pill(ctx, px, pillY, `Difficulty: ${item.difficulty}`, diffColor, diffBg, 7.5);
    px += r2.w + 6;
    pill(ctx, px, pillY, `Timeline: ${item.timeline}`, ACCENT_HOVER, ACCENT_SOFT, 7.5);

    ctx.y = top - cardH - 10;
  });

  ctx.y -= 6;
  ctx.y = sectionLabel(ctx, "Disclaimer");
  flowText(
    ctx,
    "Revenue estimates use your inputs and on-site signals. Multiple leaks are combined with funnel math and overlap damping and are capped at roughly half of addressable revenue; headline figures lean toward the lower end of the band. Results are not guaranteed. Use this report as a directional planning tool.",
    {
      size: 9,
      color: MUTED,
      maxWidth: CONTENT_W,
      gapAfter: 8,
    },
  );
}

// ─── Public entry point ──────────────────────────────────────────────────────
export async function generateRevenueLeakAuditPdf(
  audit: RevenueLeakAudit,
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const italic = await pdf.embedFont(StandardFonts.HelveticaOblique);
  const ctx: Ctx = {
    pdf,
    page: pdf.addPage([PAGE_W, PAGE_H]),
    font,
    bold,
    italic,
    y: PAGE_H - MARGIN,
    pageNo: 1,
  };

  drawCover(ctx, audit);
  drawBrandSummary(ctx, audit);
  drawMoneySummary(ctx, audit);
  drawProblemsBySection(ctx, audit);
  drawCompetitorStrengths(ctx, audit);
  drawLocalRanking(ctx, audit);
  drawLowestReviews(ctx, audit);
  drawActionPlan(ctx, audit);
  drawFooter(ctx);

  return pdf.save();
}
