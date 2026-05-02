import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFFont,
  type PDFImage,
  type PDFPage,
  type RGB,
} from "pdf-lib";
import { formatReviewStarLabel } from "./review-selection";
import { buildGoogleBusinessProfileChecklist } from "./gbp-checklist";
import { applyAssumptionsToFindings } from "./revenue-leak-scoring-service";
import { buildLastReviewsSentimentBlock } from "./review-sentiment-service";
import type {
  AuditFinding,
  AuditGrade,
  AuditSeverity,
  BusinessProfile,
  GoogleLocalRankItem,
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

/** Soft filled pills (Tailwind amber/blue/violet/emerald approximations). */
const PILL_AMBER_BG = rgb(1, 0.98, 0.902);
const PILL_AMBER_FG = rgb(0.69, 0.25, 0.09);
const PILL_BLUE_BG = rgb(0.929, 0.953, 0.996);
const PILL_BLUE_FG = rgb(0.12, 0.31, 0.82);
const PILL_VIOLET_BG = rgb(0.965, 0.949, 0.996);
const PILL_VIOLET_FG = rgb(0.37, 0.15, 0.65);
const PILL_EMERALD_BG = rgb(0.93, 0.99, 0.96);
const PILL_EMERALD_FG = rgb(0.02, 0.45, 0.34);
const PILL_RED_SOFT_BG = rgb(0.99, 0.945, 0.945);
const PILL_RED_SOFT_FG = rgb(0.69, 0.1, 0.1);

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

/** Same coarse rounding as RevenueLeakSnapshot (web). */
function roundMoneyDisplay(n: number): number {
  const step = Math.max(Math.abs(n), 0) >= 5000 ? 100 : 10;
  return Math.round(n / step) * step;
}

function formatSnapshotUsd(n: number): string {
  const rounded = roundMoneyDisplay(n);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(rounded);
}

function absoluteAppOrigin(): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "");
  if (explicit) return explicit;
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel)
    return vercel.startsWith("http") ? vercel.replace(/\/$/, "") : `https://${vercel}`;
  return "";
}

function marketingSiteOrigin(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "");
  if (explicit) return explicit;
  const fallback = absoluteAppOrigin();
  if (fallback) return fallback;
  return "https://zenpho.com";
}

async function tryEmbedAuditHeaderImage(
  pdf: PDFDocument,
  audit: RevenueLeakAudit,
): Promise<PDFImage | null> {
  const urls: string[] = [];
  const logo = audit.brandIdentity.logoUrl?.trim();
  if (logo && /^https?:\/\//i.test(logo)) urls.push(logo);
  const base = absoluteAppOrigin();
  const photoName = audit.business.photos.find((p) => p.name)?.name;
  if (base && photoName) {
    urls.push(
      `${base}/api/revenue-leak-audit/place-photo?name=${encodeURIComponent(photoName)}`,
    );
  }
  for (const url of urls) {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 6000);
      const res = await fetch(url, { signal: ctrl.signal });
      clearTimeout(timer);
      if (!res.ok) continue;
      const buf = new Uint8Array(await res.arrayBuffer());
      try {
        return await pdf.embedPng(buf);
      } catch {
        try {
          return await pdf.embedJpg(buf);
        } catch {
          continue;
        }
      }
    } catch {
      continue;
    }
  }
  return null;
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

// ─── Google Business Profile opener (parity with InteractiveReport) ──────────
function layoutSoftFilledPillsRowWrap(
  ctx: Ctx,
  startX: number,
  firstRowBaselineY: number,
  maxRight: number,
  items: readonly { label: string; fg: RGB; bg: RGB }[],
  size = 7.5,
): number {
  const padX = 10;
  const pillH = size + 9;
  const gap = 6;
  let px = startX;
  let baseline = firstRowBaselineY;
  let minBottom = baseline - pillH;

  for (const item of items) {
    const safe = sanitize(item.label);
    const w = ctx.bold.widthOfTextAtSize(safe, size) + padX * 2;
    if (px > startX && px + w > maxRight) {
      px = startX;
      baseline -= pillH + gap;
    }
    ctx.page.drawRectangle({
      x: px,
      y: baseline - size - 6,
      width: w,
      height: pillH,
      color: item.bg,
      borderWidth: 0,
    });
    ctx.page.drawText(safe, {
      x: px + padX,
      y: baseline - size - 2,
      size,
      font: ctx.bold,
      color: item.fg,
    });
    px += w + gap;
    minBottom = Math.min(minBottom, baseline - pillH);
  }
  return minBottom - 8;
}

function channelLabelsFromAudit(audit: RevenueLeakAudit): string[] {
  const labels: string[] = [];
  const b = audit.business;
  const s = audit.websiteAudit.socialLinks;
  if (b.website?.trim()) labels.push("Website");
  if (audit.websiteAudit.contactLinks.email?.trim()) labels.push("Email");
  if (s.instagram?.trim()) labels.push("Instagram");
  if (s.facebook?.trim()) labels.push("Facebook");
  if (s.tiktok?.trim()) labels.push("TikTok");
  if (s.youtube?.trim()) labels.push("YouTube");
  if (s.linkedin?.trim()) labels.push("LinkedIn");
  if (s.whatsapp?.trim()) labels.push("WhatsApp");
  return labels.slice(0, 7);
}

function drawGoogleBusinessProfileCard(
  ctx: Ctx,
  audit: RevenueLeakAudit,
  headerImage: PDFImage | null,
): void {
  paintBackground(ctx);

  const topBannerY = PAGE_H - MARGIN;
  const headerSans = sanitize("Revenue Leak Audit  ·  Zenpho");
  ctx.page.drawText(headerSans, {
    x: MARGIN,
    y: topBannerY,
    size: 8,
    font: ctx.font,
    color: MUTED,
  });
  if (audit.createdAt?.trim()) {
    const lu = new Date(audit.createdAt);
    if (!Number.isNaN(lu.getTime())) {
      const luSan = sanitize(
        `Last updated ${lu.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}`,
      );
      ctx.page.drawText(luSan, {
        x: PAGE_W - MARGIN - ctx.font.widthOfTextAtSize(luSan, 7.5),
        y: topBannerY,
        size: 7.5,
        font: ctx.font,
        color: MUTED,
      });
    }
  }

  ctx.y = topBannerY - 28;

  const business = audit.business;
  const primaryPhone =
    business.phone ?? audit.websiteAudit.contactLinks.phone ?? null;
  const statusLabel = business.businessStatus
    ? business.businessStatus.replace(/_/g, " ").toLowerCase()
    : "Status unavailable";
  const identityAttributes = business.identityAttributes.filter((a) => a.detected);

  const pad = 24;
  const imgBox = 82;
  const ringCx = PAGE_W - MARGIN - pad - 44;
  const gaugePlateLeft = ringCx - 58;
  const textLeft = MARGIN + pad + imgBox + 18;
  /** Stop all left-column copy before the score gauge plate — prevents pills/phone colliding into the gauge. */
  const textMax = Math.max(136, gaugePlateLeft - 14 - textLeft);

  const nameLines = wrapText(business.name, ctx.bold, 21, textMax);
  const catLine = sanitize(
    [business.category ?? "Local business", statusLabel].filter(Boolean).join(" · "),
  );
  const addrLines = business.address?.trim()
    ? wrapText(sanitize(business.address), ctx.font, 9, textMax)
    : [];

  const pills: Array<{ label: string; fg: RGB; bg: RGB }> = [
    {
      label: `${business.rating ?? "N/A"} rating`,
      fg: PILL_AMBER_FG,
      bg: PILL_AMBER_BG,
    },
    {
      label: `${business.reviewCount ?? 0} reviews`,
      fg: PILL_BLUE_FG,
      bg: PILL_BLUE_BG,
    },
    {
      label: `${business.photoCount ?? business.photos.length} photos`,
      fg: PILL_VIOLET_FG,
      bg: PILL_VIOLET_BG,
    },
    {
      label: business.website ? "Website linked" : "No website linked",
      fg: PILL_EMERALD_FG,
      bg: PILL_EMERALD_BG,
    },
  ];
  for (const attr of identityAttributes.slice(0, 5)) {
    pills.push({
      label: sanitize(attr.label),
      fg: PILL_VIOLET_FG,
      bg: PILL_VIOLET_BG,
    });
  }


  /** Count wrapped pill rows (no drawing — layout only). */
  const pillSz = 7.5;
  const pillRowH = pillSz + 9 + 6;
  let pX = textLeft;
  let pillLines = 1;
  const rightEdge = textLeft + textMax;
  for (const p of pills) {
    const w = ctx.bold.widthOfTextAtSize(sanitize(p.label), pillSz) + 20;
    if (pX > textLeft && pX + w > rightEdge) {
      pillLines++;
      pX = textLeft;
    }
    pX += w + 6;
  }

  const nameLinesDrawn = Math.min(nameLines.length, 3);
  let textStackH =
    16 +
    nameLinesDrawn * 26 +
    12 +
    (catLine.trim() ? 12 : 0) +
    (addrLines.length ? Math.min(addrLines.length, 3) * 11 + 8 : 0) +
    14 +
    pillLines * pillRowH +
    54;

  const cardH = Math.max(imgBox + pad * 2, textStackH + pad * 2);

  ensure(ctx, cardH + 28);
  const cardTop = ctx.y;
  card(ctx, MARGIN, cardTop, CONTENT_W, cardH, WHITE, BORDER);

  const imgLeft = MARGIN + pad;
  const imgTop = cardTop - pad;
  ctx.page.drawRectangle({
    x: imgLeft,
    y: imgTop - imgBox,
    width: imgBox,
    height: imgBox,
    color: WHITE,
    borderColor: BORDER,
    borderWidth: 0.6,
  });

  if (headerImage) {
    const iw = headerImage.width;
    const ih = headerImage.height;
    const scale = Math.min(imgBox / iw, imgBox / ih);
    const dw = iw * scale;
    const dh = ih * scale;
    const ix = imgLeft + (imgBox - dw) / 2;
    const iy = imgTop - imgBox + (imgBox - dh) / 2;
    ctx.page.drawImage(headerImage, {
      x: ix,
      y: iy,
      width: dw,
      height: dh,
    });
  }

  const ringCy = cardTop - pad - imgBox / 2 - 4;
  const gaugePlate = SURFACE_LIGHT;
  ctx.page.drawRectangle({
    x: ringCx - 58,
    y: ringCy - 62,
    width: 116,
    height: 124,
    color: gaugePlate,
    borderColor: BORDER_SOFT,
    borderWidth: 0.55,
  });
  scoreRing(ctx, ringCx, ringCy, audit.scores.overall, audit.scores.grade, {
    radius: 44,
    thickness: 10,
    numberSize: 19,
    showGrade: true,
  });

  let ty = cardTop - pad - 14;
  ctx.page.drawText("GOOGLE BUSINESS PROFILE", {
    x: textLeft,
    y: ty,
    size: 8,
    font: ctx.bold,
    color: ACCENT,
  });
  ty -= 22;
  for (const line of nameLines.slice(0, 3)) {
    ctx.page.drawText(line, {
      x: textLeft,
      y: ty,
      size: 20,
      font: ctx.bold,
      color: INK,
    });
    ty -= 24;
  }
  ty -= 4;
  ctx.page.drawText(catLine, {
    x: textLeft,
    y: ty,
    size: 9.5,
    font: ctx.bold,
    color: INK_SOFT,
  });
  ty -= 12;
  if (addrLines.length) {
    ty -= 2;
    for (const line of addrLines.slice(0, 4)) {
      ctx.page.drawText(line, {
        x: textLeft,
        y: ty,
        size: 9,
        font: ctx.font,
        color: MUTED,
      });
      ty -= 11;
    }
  }
  ty -= 8;
  const pillsBottom = layoutSoftFilledPillsRowWrap(ctx, textLeft, ty, rightEdge, pills, pillSz);

  ty = pillsBottom - 10;

  ctx.page.drawText(
    sanitize(
      primaryPhone ? `Phone:  ${primaryPhone}` : "No phone number on Google listing.",
    ),
    {
      x: textLeft,
      y: ty,
      size: 9,
      font: ctx.bold,
      color: primaryPhone ? ACCENT : MUTED,
    },
  );
  ty -= 16;
  if (business.googleMapsUri?.trim()) {
    ty = drawText(ctx, `Open in Maps: ${sanitize(business.googleMapsUri)}`, {
      x: textLeft,
      y: ty,
      size: 8.5,
      font: ctx.font,
      color: ACCENT_HOVER,
      maxWidth: textMax,
      lineGap: 2,
    });
    ty -= 4;
  }
  const ch = channelLabelsFromAudit(audit);
  if (ch.length > 0) {
    ty -= 2;
    ty = drawText(ctx, `Channels: ${ch.join("  ·  ")}`, {
      x: textLeft,
      y: ty,
      size: 8,
      font: ctx.font,
      color: MUTED,
      maxWidth: textMax,
      lineGap: 2,
    });
  }

  ctx.y = cardTop - cardH - 18;
}

function drawRecommendedNextStep(ctx: Ctx, audit: RevenueLeakAudit): void {
  ensure(ctx, 72);
  ctx.y = sectionLabel(ctx, "Recommended next step");
  flowText(ctx, audit.recommendedNextStep, {
    size: 11,
    font: ctx.bold,
    color: INK,
    maxWidth: CONTENT_W,
    gapAfter: 14,
  });
}

function drawBrandSummary(ctx: Ctx, audit: RevenueLeakAudit, headerImage: PDFImage | null): void {
  newPage(ctx);

  const pad = 26;
  const innerW = CONTENT_W - pad * 2;
  const summaryLines = wrapText(
    audit.brandIdentity.brandPresenceSummary,
    ctx.font,
    10,
    innerW - 4,
  );
  const palette = audit.brandIdentity.palette.slice(0, 5);
  const thumb = 56;
  const circleR = 14;
  const paletteGap = 10;
  const paletteRow = Math.max(thumb, circleR * 2 + 8);
  const paletteToGridGap = 26;
  const colGap = 10;
  const colW = (innerW - colGap * 2) / 3;

  const typographyNotes = audit.brandIdentity.typographyNotes.slice(0, 5);
  const typoMaxW = colW - 28;
  let typoLineCount = 0;
  for (const note of typographyNotes) {
    typoLineCount += Math.max(1, wrapText(sanitize(note), ctx.bold, 9, typoMaxW).length);
  }
  const gridH =
    typographyNotes.length === 0
      ? 102
      : Math.max(102, 32 + typoLineCount * 12 + 20);

  const cardH =
    pad +
    22 +
    28 +
    Math.min(summaryLines.length, 5) * 13 +
    18 +
    paletteRow +
    paletteToGridGap +
    gridH +
    pad;

  ensure(ctx, cardH + 20);
  const top = ctx.y;
  card(ctx, MARGIN, top, CONTENT_W, cardH, WHITE, BORDER);

  let y = top - pad;
  ctx.page.drawText("BRAND SUMMARY", {
    x: MARGIN + pad,
    y,
    size: 8,
    font: ctx.bold,
    color: ACCENT,
  });
  y -= 22;
  ctx.page.drawText("Brand palette", {
    x: MARGIN + pad,
    y,
    size: 19,
    font: ctx.bold,
    color: INK,
  });
  y -= 28;

  for (const line of summaryLines.slice(0, 5)) {
    ctx.page.drawText(line, {
      x: MARGIN + pad,
      y,
      size: 10,
      font: ctx.font,
      color: MUTED,
    });
    y -= 13;
  }

  y -= 14;
  const rowTop = y;
  ctx.page.drawRectangle({
    x: MARGIN + pad,
    y: rowTop - thumb,
    width: thumb,
    height: thumb,
    color: SURFACE_LIGHT,
    borderColor: BORDER,
    borderWidth: 0.55,
  });

  if (headerImage) {
    const iw = headerImage.width;
    const ih = headerImage.height;
    const scale = Math.min(thumb / iw, thumb / ih);
    const dw = iw * scale;
    const dh = ih * scale;
    ctx.page.drawImage(headerImage, {
      x: MARGIN + pad + (thumb - dw) / 2,
      y: rowTop - thumb + (thumb - dh) / 2,
      width: dw,
      height: dh,
    });
  }

  let cxColor = MARGIN + pad + thumb + 14;
  const circleY = rowTop - thumb / 2;
  for (const hex of palette) {
    ctx.page.drawCircle({
      x: cxColor + circleR,
      y: circleY,
      size: circleR,
      color: hexToRgb(hex, ACCENT),
      borderColor: BORDER,
      borderWidth: 0.55,
    });
    cxColor += circleR * 2 + paletteGap;
  }

  const gridTop = rowTop - thumb - paletteToGridGap;
  const colSpecs: Array<[number, string]> = [
    [0, "PRIMARY"],
    [1, "ACCENT"],
    [2, "TYPOGRAPHY"],
  ];

  for (const [idx, eyebrow] of colSpecs) {
    const gx = MARGIN + pad + idx * (colW + colGap);
    ctx.page.drawRectangle({
      x: gx,
      y: gridTop - gridH,
      width: colW,
      height: gridH,
      color: SURFACE,
      borderColor: BORDER_SOFT,
      borderWidth: 0.55,
    });
    ctx.page.drawText(eyebrow, {
      x: gx + 12,
      y: gridTop - 18,
      size: 7,
      font: ctx.bold,
      color: MUTED,
    });

    if (idx === 0) {
      const hc = audit.brandIdentity.primaryColor;
      if (hc) {
        ctx.page.drawCircle({
          x: gx + colW / 2,
          y: gridTop - 56,
          size: 16,
          color: hexToRgb(hc, ACCENT),
          borderColor: BORDER,
          borderWidth: 0.55,
        });
      } else {
        ctx.page.drawText("Not found", {
          x: gx + 12,
          y: gridTop - 48,
          size: 11,
          font: ctx.bold,
          color: INK,
        });
      }
      continue;
    }

    if (idx === 1) {
      const hc = audit.brandIdentity.accentColor;
      if (hc) {
        ctx.page.drawCircle({
          x: gx + colW / 2,
          y: gridTop - 56,
          size: 16,
          color: hexToRgb(hc, ACCENT),
          borderColor: BORDER,
          borderWidth: 0.55,
        });
      } else {
        ctx.page.drawText("Not found", {
          x: gx + 12,
          y: gridTop - 48,
          size: 11,
          font: ctx.bold,
          color: INK,
        });
      }
      continue;
    }

    if (typographyNotes.length > 0) {
      let tyNote = gridTop - 38;
      for (const note of typographyNotes) {
        const lines = wrapText(sanitize(note), ctx.bold, 9, typoMaxW);
        for (let li = 0; li < lines.length; li++) {
          const line = lines[li]!;
          if (li === 0) {
            ctx.page.drawCircle({
              x: gx + 14,
              y: tyNote,
              size: 2.5,
              color: ACCENT,
              borderWidth: 0,
            });
            ctx.page.drawText(line, {
              x: gx + 24,
              y: tyNote - 2,
              size: 9,
              font: ctx.bold,
              color: INK,
            });
          } else {
            ctx.page.drawText(line, {
              x: gx + 24,
              y: tyNote - 2,
              size: 9,
              font: ctx.bold,
              color: INK,
            });
          }
          tyNote -= 12;
        }
        tyNote -= 4;
      }
    } else {
      ctx.page.drawText("No typography signal found", {
        x: gx + 12,
        y: gridTop - 44,
        size: 9,
        font: ctx.font,
        color: INK_SOFT,
      });
    }
  }

  ctx.y = top - cardH - 18;
}

function drawRevenueLeakSnapshot(ctx: Ctx, audit: RevenueLeakAudit): void {
  newPage(ctx);
  const findingsWithMoney = applyAssumptionsToFindings(audit.assumptions, audit.findings);
  const ranked = [...findingsWithMoney].sort(
    (a, b) => b.estimatedRevenueImpactHigh - a.estimatedRevenueImpactHigh,
  );

  const m = audit.moneySummary;
  const issueCount = m.totalIssues;
  const avgMonthly = formatSnapshotUsd(m.estimatedMonthlyCost);

  const pad = 26;
  const innerW = CONTENT_W - pad * 2;
  const listLimit = 15;
  const listRows = ranked.slice(0, listLimit).map((f) => ({
    line: sanitize(`${f.severity}: ${f.title}`),
  }));
  let wrappedTitleRows = 0;
  if (issueCount > 0 && listRows.length > 0) {
    for (const row of listRows) {
      wrappedTitleRows += wrapText(row.line, ctx.bold, 10.5, innerW - 18).length;
    }
  }
  const listBlockH =
    issueCount === 0 ? 0 : listRows.length > 0 ? 16 + wrappedTitleRows * 14 : 0;

  const cardH = pad + 20 + (issueCount === 0 ? 28 : 46) + 12 + listBlockH + 24 + pad;

  ensure(ctx, cardH + 20);
  const top = ctx.y;
  card(ctx, MARGIN, top, CONTENT_W, cardH, WHITE, BORDER);

  let y = top - pad;
  ctx.page.drawText("REVENUE LEAK SNAPSHOT", {
    x: MARGIN + pad,
    y,
    size: 8,
    font: ctx.bold,
    color: ACCENT,
  });
  y -= 28;

  if (issueCount === 0) {
    ctx.page.drawText("No major revenue leaks were flagged in this snapshot.", {
      x: MARGIN + pad,
      y,
      size: 16,
      font: ctx.bold,
      color: INK,
    });
  } else {
    const mid = `${issueCount} ${issueCount === 1 ? "issue" : "issues"} are costing you `;
    const tail = " average / month";
    ctx.page.drawText(mid, {
      x: MARGIN + pad,
      y,
      size: 16,
      font: ctx.bold,
      color: INK,
    });
    const midW = ctx.bold.widthOfTextAtSize(mid, 16);
    ctx.page.drawText(avgMonthly, {
      x: MARGIN + pad + midW,
      y,
      size: 16,
      font: ctx.bold,
      color: ACCENT,
    });
    const moneyW = ctx.bold.widthOfTextAtSize(avgMonthly, 16);
    ctx.page.drawText(tail, {
      x: MARGIN + pad + midW + moneyW,
      y,
      size: 16,
      font: ctx.bold,
      color: INK,
    });

    y -= 22;
    if (listRows.length > 0) {
      ctx.page.drawText("Issues by estimated impact (condensed list):", {
        x: MARGIN + pad,
        y,
        size: 9,
        font: ctx.bold,
        color: MUTED,
      });
      y -= 16;
      for (const row of listRows) {
        const wrapped = wrapText(row.line, ctx.bold, 10.5, innerW - 18);
        const first = wrapped[0] ?? "";
        ctx.page.drawText("-", {
          x: MARGIN + pad,
          y,
          size: 11,
          font: ctx.bold,
          color: ACCENT,
        });
        ctx.page.drawText(first, {
          x: MARGIN + pad + 14,
          y,
          size: 10.5,
          font: ctx.bold,
          color: INK,
        });
        y -= 14;
        for (const extra of wrapped.slice(1)) {
          ctx.page.drawText(extra, {
            x: MARGIN + pad + 14,
            y,
            size: 10.5,
            font: ctx.bold,
            color: INK,
          });
          y -= 13;
        }
      }
    }
  }

  ctx.y = top - cardH - 18;
}

// ─── Money summary page ──────────────────────────────────────────────────────
function drawMoneySummary(ctx: Ctx, audit: RevenueLeakAudit): void {
  newPage(ctx);
  ctx.y = sectionLabel(ctx, "Found issues & estimated cost");

  const m = audit.moneySummary;
  const heroTop = ctx.y;
  const heroH = 208;

  card(ctx, MARGIN, heroTop, CONTENT_W, heroH, WHITE, BORDER);
  ctx.page.drawRectangle({
    x: MARGIN,
    y: heroTop - 5,
    width: CONTENT_W,
    height: 4,
    color: ACCENT,
  });

  const leftPad = MARGIN + 22;
  const leftMax = CONTENT_W * 0.52;

  ctx.page.drawText(`We found ${m.totalIssues} revenue leaks`, {
    x: leftPad,
    y: heroTop - 32,
    size: 19,
    font: ctx.bold,
    color: INK,
  });

  const descLines = wrapText(m.assumptionsExplanation, ctx.font, 9.5, leftMax);
  let dy = heroTop - 58;
  for (const line of descLines.slice(0, 7)) {
    ctx.page.drawText(line, {
      x: leftPad,
      y: dy,
      size: 9.5,
      font: ctx.font,
      color: MUTED,
    });
    dy -= 11.5;
  }

  let chipX = leftPad;
  const chipY = heroTop - heroH + 36;
  (["Critical", "High", "Medium", "Low"] as const).forEach((sev) => {
    const n = m.severityCounts[sev];
    if (!n) return;
    const label = `${sev}: ${n}`;
    const w = ctx.bold.widthOfTextAtSize(label, 8) + 14;
    ctx.page.drawRectangle({
      x: chipX,
      y: chipY,
      width: w,
      height: 16,
      color: SEVERITY_BG[sev],
      borderWidth: 0,
    });
    ctx.page.drawText(label, {
      x: chipX + 7,
      y: chipY + 5,
      size: 8,
      font: ctx.bold,
      color: SEVERITY_FG[sev],
    });
    chipX += w + 5;
  });

  const panelW = 198;
  const panelH = heroH - 26;
  const panelX = MARGIN + CONTENT_W - panelW - 14;
  const panelTop = heroTop - 12;
  card(ctx, panelX, panelTop, panelW, panelH, SURFACE_LIGHT, BORDER_SOFT);
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
  sectionHeading(ctx, "Problems found by section", "Prioritized breakdown", {
    description:
      "Each section mirrors the accordion in the interactive report — graded versus local-pack competitors — with What we found, Why it matters, and the recommended fix for each flagged item.",
  });

  for (const section of audit.sectionSummaries) {
    const headerH = 96;
    ensure(ctx, headerH + 24);
    const top = ctx.y;
    card(ctx, MARGIN, top, CONTENT_W, headerH, WHITE, BORDER);
    const ringCx = PAGE_W - MARGIN - 44;
    const ringCy = top - 41;
    ctx.page.drawRectangle({
      x: ringCx - 44,
      y: ringCy - 44,
      width: 88,
      height: 88,
      color: SURFACE_LIGHT,
      borderColor: BORDER_SOFT,
      borderWidth: 0.55,
    });
    scoreRing(ctx, ringCx, ringCy, section.score, section.grade, {
      radius: 24,
      thickness: 5.5,
      numberSize: 13,
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

// ─── Who's beating you on Google (matches LocalRankingSnapshotAside) ───────────
function drawLocalRankingRow(ctx: Ctx, item: GoogleLocalRankItem): void {
  const title = `#${item.position} ${sanitize(item.name)}`;
  const statsStr = `${item.rating ?? "N/A"} stars  ·  ${item.reviewCount ?? 0} reviews`;
  const statsSize = 9;
  const statsW = ctx.font.widthOfTextAtSize(statsStr, statsSize);
  const nameLeft = MARGIN + 18;
  const nameMax = Math.max(140, PAGE_W - MARGIN - 14 - statsW - 10 - nameLeft);
  const nameLines = wrapText(title, ctx.bold, 10, Math.max(160, nameMax));
  const rowH = Math.max(46, 24 + nameLines.length * 12 + 14);
  ensure(ctx, rowH + 10);
  const top = ctx.y;
  card(
    ctx,
    MARGIN,
    top,
    CONTENT_W,
    rowH,
    item.isSelectedBusiness ? ACCENT_SOFT : SURFACE_LIGHT,
    item.isSelectedBusiness ? ACCENT : BORDER_SOFT,
  );

  const lineY = top - 22;
  ctx.page.drawText(nameLines[0] ?? "", {
    x: MARGIN + 18,
    y: lineY,
    size: 10,
    font: ctx.bold,
    color: INK,
  });
  ctx.page.drawText(statsStr, {
    x: PAGE_W - MARGIN - 14 - statsW,
    y: lineY,
    size: statsSize,
    font: ctx.font,
    color: MUTED,
  });

  let ny = lineY - 12;
  for (const line of nameLines.slice(1)) {
    ctx.page.drawText(line, {
      x: MARGIN + 18,
      y: ny,
      size: 10,
      font: ctx.bold,
      color: INK,
    });
    ny -= 12;
  }

  if (item.category) {
    ctx.page.drawText(sanitize(item.category), {
      x: MARGIN + 18,
      y: top - rowH + 12,
      size: 8,
      font: ctx.font,
      color: MUTED,
    });
  }

  ctx.y = top - rowH - 8;
}

function drawLocalRanking(ctx: Ctx, audit: RevenueLeakAudit): void {
  newPage(ctx);
  const snap = audit.rankingSnapshot;
  const selectedInTopFive = snap.topFive.some((i) => i.isSelectedBusiness);
  const rankPos =
    snap.topFive.find((i) => i.isSelectedBusiness)?.position ??
    snap.selectedBusinessRankItem?.position ??
    null;

  ensure(ctx, 130);
  const eyebrowY = ctx.y;
  ctx.page.drawText("WHO'S BEATING YOU ON GOOGLE", {
    x: MARGIN,
    y: eyebrowY,
    size: 8,
    font: ctx.bold,
    color: ACCENT,
  });

  if (rankPos != null) {
    const prefix = "Your Google Business ranks ";
    const mid = `#${rankPos}`;
    const suffix = ".";
    const pW = ctx.font.widthOfTextAtSize(prefix, 9);
    const mW = ctx.bold.widthOfTextAtSize(mid, 9);
    const sW = ctx.font.widthOfTextAtSize(suffix, 9);
    const rx = PAGE_W - MARGIN - (pW + mW + sW);
    ctx.page.drawText(prefix, { x: rx, y: eyebrowY - 1, size: 9, font: ctx.font, color: MUTED });
    ctx.page.drawText(mid, {
      x: rx + pW,
      y: eyebrowY - 1,
      size: 9,
      font: ctx.bold,
      color: INK,
    });
    ctx.page.drawText(suffix, {
      x: rx + pW + mW,
      y: eyebrowY - 1,
      size: 9,
      font: ctx.font,
      color: MUTED,
    });
  }

  ctx.y = eyebrowY - 26;
  ctx.page.drawText("Local ranking snapshot", {
    x: MARGIN,
    y: ctx.y,
    size: 18,
    font: ctx.bold,
    color: INK,
  });
  ctx.y -= 28;
  ctx.page.drawText(sanitize(`Query: ${snap.query}`), {
    x: MARGIN,
    y: ctx.y,
    size: 9.5,
    font: ctx.font,
    color: MUTED,
  });
  ctx.y -= 13;
  flowText(
    ctx,
    `${sanitize(snap.location)} · Ranks reflect this audited batch (ratings, reviews, distance — not necessarily Google's live order).`,
    { size: 8.5, color: MUTED, maxWidth: CONTENT_W, gapAfter: 16 },
  );

  for (const item of snap.topFive) {
    drawLocalRankingRow(ctx, item);
  }

  if (!selectedInTopFive && snap.selectedBusinessRankItem) {
    ensure(ctx, 36);
    const dots = "...";
    const dw = ctx.bold.widthOfTextAtSize(dots, 10);
    ctx.page.drawText(dots, {
      x: (PAGE_W - dw) / 2,
      y: ctx.y - 10,
      size: 10,
      font: ctx.bold,
      color: MUTED,
    });
    ctx.y -= 28;
    drawLocalRankingRow(ctx, snap.selectedBusinessRankItem);
  }

  if (!snap.selectedBusinessRankItem) {
    ensure(ctx, 52);
    const warnTop = ctx.y;
    card(ctx, MARGIN, warnTop, CONTENT_W, 42, rgb(1, 0.98, 0.918), BORDER);
    const msg = sanitize(
      `Not found in the first ${snap.totalResultsChecked} results checked.`,
    );
    ctx.page.drawText(msg, {
      x: MARGIN + 14,
      y: warnTop - 24,
      size: 9,
      font: ctx.bold,
      color: rgb(0.62, 0.28, 0.02),
    });
    ctx.y = warnTop - 54;
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

// ─── Recent review sentiment (RecentReviewSentimentSection parity) ─────────
function drawRecentReviewSentiment(ctx: Ctx, audit: RevenueLeakAudit): void {
  newPage(ctx);
  const { recent, sentiment, recommendations } = buildLastReviewsSentimentBlock(
    audit.business.reviews,
    5,
  );

  sectionHeading(ctx, "Review sentiment", "Last 5 reviews", {
    description:
      "Most recent rows from the Google review sample — same slice and theme tags as the interactive report.",
  });

  ensure(ctx, 48);
  const scoreLabel = `Score ${sentiment.sentimentScore}/100`;
  ctx.page.drawText(scoreLabel, {
    x: MARGIN,
    y: ctx.y,
    size: 11,
    font: ctx.bold,
    color: ACCENT,
  });
  const sliceInfo = `${sentiment.sampleSize} row${sentiment.sampleSize === 1 ? "" : "s"} in slice`;
  ctx.page.drawText(sliceInfo, {
    x: MARGIN + ctx.bold.widthOfTextAtSize(scoreLabel, 11) + 14,
    y: ctx.y,
    size: 8.5,
    font: ctx.font,
    color: MUTED,
  });
  ctx.y -= 18;

  const themeSpecs: Array<{ label: string; fg: RGB; bg: RGB }> = [
    ...sentiment.positiveThemes.map((t) => ({
      label: sanitize(t),
      fg: PILL_EMERALD_FG,
      bg: PILL_EMERALD_BG,
    })),
    ...sentiment.negativeThemes.map((t) => ({
      label: sanitize(t),
      fg: PILL_RED_SOFT_FG,
      bg: PILL_RED_SOFT_BG,
    })),
  ];
  if (themeSpecs.length > 0) {
    const bottomThemes = layoutSoftFilledPillsRowWrap(
      ctx,
      MARGIN,
      ctx.y,
      PAGE_W - MARGIN,
      themeSpecs,
      7.5,
    );
    ctx.y = bottomThemes - 10;
  }

  if (recent.length === 0) {
    ensure(ctx, 52);
    card(ctx, MARGIN, ctx.y, CONTENT_W, 42, rgb(1, 0.98, 0.92), BORDER);
    ctx.page.drawText("No review rows were returned in the current Google sample.", {
      x: MARGIN + 14,
      y: ctx.y - 24,
      size: 9.5,
      font: ctx.bold,
      color: rgb(0.62, 0.28, 0.02),
    });
    ctx.y -= 62;
  } else {
    for (const [index, review] of recent.entries()) {
      const bodyText = sanitize(review.text ?? "No written review text available.");
      const bodyLines = wrapText(bodyText, ctx.font, 9.5, CONTENT_W - 112);
      const cardH = Math.max(64, 40 + bodyLines.length * 12 + 22);
      ensure(ctx, cardH + 14);
      const rcTop = ctx.y;
      card(ctx, MARGIN, rcTop, CONTENT_W, cardH, WHITE, BORDER);

      ctx.page.drawCircle({
        x: MARGIN + 28,
        y: rcTop - 29,
        size: 15,
        color: ACCENT_SOFT,
        borderWidth: 0,
      });
      const nStr = String(index + 1);
      ctx.page.drawText(nStr, {
        x: MARGIN + 28 - ctx.bold.widthOfTextAtSize(nStr, 11) / 2,
        y: rcTop - 34,
        size: 11,
        font: ctx.bold,
        color: ACCENT,
      });

      const author = sanitize(review.authorName ?? "Google reviewer");
      ctx.page.drawText(author, {
        x: MARGIN + 56,
        y: rcTop - 24,
        size: 10.5,
        font: ctx.bold,
        color: INK,
      });
      const when = sanitize(review.relativePublishTime ?? review.publishTime ?? "Date unavailable");
      ctx.page.drawText(when, {
        x: MARGIN + 56,
        y: rcTop - 38,
        size: 8,
        font: ctx.font,
        color: MUTED,
      });

      const starStr = formatReviewStarLabel(review.rating);
      ctx.page.drawText(starStr, {
        x: PAGE_W - MARGIN - ctx.bold.widthOfTextAtSize(starStr, 8.5) - 14,
        y: rcTop - 26,
        size: 8.5,
        font: ctx.bold,
        color: PILL_AMBER_FG,
      });

      let by = rcTop - 54;
      for (const line of bodyLines) {
        ctx.page.drawText(line, {
          x: MARGIN + 56,
          y: by,
          size: 9.5,
          font: ctx.font,
          color: MUTED,
        });
        by -= 12;
      }
      ctx.y = rcTop - cardH - 10;
    }
  }

  let recLines = 0;
  const bulletMax = CONTENT_W - 44;
  const wrappedBullets = recommendations.map((rec) =>
    wrapText(sanitize(rec), ctx.font, 9, bulletMax),
  );
  for (const ws of wrappedBullets) recLines += Math.max(1, ws.length);

  const recCardH = Math.max(58, 40 + recLines * 13 + 22);

  ensure(ctx, recCardH + 24);
  const recTop = ctx.y;
  card(ctx, MARGIN, recTop, CONTENT_W, recCardH, SURFACE_LIGHT, BORDER_SOFT);
  ctx.page.drawText("RECOMMENDATIONS", {
    x: MARGIN + 14,
    y: recTop - 18,
    size: 8,
    font: ctx.bold,
    color: ACCENT,
  });
  let ry = recTop - 38;
  for (const ws of wrappedBullets) {
    for (const [i, line] of ws.entries()) {
      const text = i === 0 ? `\u2022  ${line}` : line;
      const x = i === 0 ? MARGIN + 18 : MARGIN + 26;
      ry = drawText(ctx, sanitize(text), {
        x,
        y: ry,
        size: 9,
        font: ctx.font,
        color: INK,
        maxWidth: bulletMax,
        lineGap: 2,
      });
    }
    ry -= 6;
  }
  ctx.y = recTop - recCardH - 14;
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
      size: 15,
      color: ACCENT_SOFT,
      borderWidth: 0,
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



// ─── Closing CTA (RevenueLeakFixLeaksCta parity) ─────────────────────────────
function drawClosingCta(ctx: Ctx): void {
  ensure(ctx, 128);
  const cardTop = ctx.y;
  const cardPad = 24;
  const cardH = 112;
  card(ctx, MARGIN, cardTop, CONTENT_W, cardH, WHITE, BORDER);

  const btnLabel = sanitize("Start fixing leaks");
  const btnH = 30;
  const btnW = ctx.bold.widthOfTextAtSize(btnLabel, 11) + 40;
  const btnX = PAGE_W - MARGIN - cardPad - btnW;
  const btnTopY = cardTop - 62;

  ctx.page.drawText("NEXT STEP", {
    x: MARGIN + cardPad,
    y: cardTop - cardPad - 12,
    size: 8,
    font: ctx.bold,
    color: ACCENT,
  });

  ctx.page.drawText(sanitize("Ready to recover lost revenue?"), {
    x: MARGIN + cardPad,
    y: cardTop - cardPad - 34,
    size: 14,
    font: ctx.bold,
    color: INK,
  });

  const bodyLeftW = Math.max(200, btnX - (MARGIN + cardPad) - 22);
  const body = sanitize(
    "We'll review your audit results with you, highlight the biggest opportunities, and recommend where to start.",
  );
  drawText(ctx, body, {
    x: MARGIN + cardPad,
    y: cardTop - cardPad - 52,
    size: 9.5,
    font: ctx.font,
    color: MUTED,
    maxWidth: bodyLeftW,
    lineGap: 3,
  });

  ctx.page.drawRectangle({
    x: btnX,
    y: btnTopY - btnH,
    width: btnW,
    height: btnH,
    color: ACCENT,
    borderWidth: 0,
  });
  const twBtn = ctx.bold.widthOfTextAtSize(btnLabel, 11);
  ctx.page.drawText(btnLabel, {
    x: btnX + (btnW - twBtn) / 2,
    y: btnTopY - btnH + 10,
    size: 11,
    font: ctx.bold,
    color: WHITE,
  });

  const hint = sanitize(`${marketingSiteOrigin()}/contact`);
  ctx.page.drawText(`Visit ${hint}`, {
    x: MARGIN + cardPad,
    y: cardTop - cardH + cardPad + 6,
    size: 7.5,
    font: ctx.font,
    color: MUTED,
  });

  ctx.y = cardTop - cardH - 18;
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

  const headerImage = await tryEmbedAuditHeaderImage(pdf, audit);
  drawGoogleBusinessProfileCard(ctx, audit, headerImage);
  drawBrandSummary(ctx, audit, headerImage);
  drawRevenueLeakSnapshot(ctx, audit);
  drawRecommendedNextStep(ctx, audit);
  drawMoneySummary(ctx, audit);
  drawProblemsBySection(ctx, audit);
  drawCompetitorStrengths(ctx, audit);
  drawLocalRanking(ctx, audit);
  drawRecentReviewSentiment(ctx, audit);
  drawActionPlan(ctx, audit);
  drawClosingCta(ctx);
  drawFooter(ctx);

  return pdf.save();
}
