/**
 * PDF row of contact / social “channel” badges for Revenue Leak Audit covers.
 * Vector icons via pdf-lib drawSvgPath; several paths mirror Lucide (ISC), same family as lucide-react.
 */
import type { PDFPage, PDFFont } from "pdf-lib";
import { rgb } from "pdf-lib";
import type { RevenueLeakAudit } from "./types";

const VIEW = 24;
/** Used by pdf layout to reserve GBP card height. */
export const PDF_CHANNEL_BADGE = 21;
export const PDF_CHANNEL_GAP = 5;
/** Vertical alignment band when mixing the Google Maps pin (24) with channel badges (21). */
export const PDF_CHANNEL_ROW_H = 24;
const PIN_GAP = 5;

export function pdfChannelRowLeadingWidth(hasMapsPin: boolean): number {
  return hasMapsPin ? PDF_CHANNEL_ROW_H + PIN_GAP : 0;
}
const LABEL_SIZE = 8.5;
const SURFACE_LIGHT = rgb(0.974, 0.98, 0.989);
const BORDER = rgb(0.88, 0.91, 0.95);
const INK_SOFT = rgb(0.18, 0.21, 0.28);
const ACCENT = rgb(0.145, 0.388, 0.922);
const MUTED = rgb(0.38, 0.42, 0.5);

export type PdfChannelKind =
  | "website"
  | "email"
  | "instagram"
  | "facebook"
  | "tiktok"
  | "youtube"
  | "linkedin"
  | "whatsapp";

/** Same detection order as the previous “Channels:” text line (max 7). */
export function channelKindsFromAudit(audit: RevenueLeakAudit): PdfChannelKind[] {
  const kinds: PdfChannelKind[] = [];
  const b = audit.business;
  const s = audit.websiteAudit.socialLinks;
  if (b.website?.trim()) kinds.push("website");
  if (audit.websiteAudit.contactLinks.email?.trim()) kinds.push("email");
  if (s.instagram?.trim()) kinds.push("instagram");
  if (s.facebook?.trim()) kinds.push("facebook");
  if (s.tiktok?.trim()) kinds.push("tiktok");
  if (s.youtube?.trim()) kinds.push("youtube");
  if (s.linkedin?.trim()) kinds.push("linkedin");
  if (s.whatsapp?.trim()) kinds.push("whatsapp");
  return kinds.slice(0, 7);
}

/** Vertical space needed below the GBP text stack for the Channels icon row (+ label). */
export function estimatePdfChannelIconBlockHeight(
  kinds: PdfChannelKind[],
  textLeft: number,
  rightEdge: number,
  labelFont: PDFFont,
  options?: { hasMapsPin?: boolean },
): number {
  if (kinds.length === 0) return 0;
  const leading = pdfChannelRowLeadingWidth(Boolean(options?.hasMapsPin));
  const lw = labelFont.widthOfTextAtSize("Channels:", LABEL_SIZE) + 8;
  const startIconX = textLeft + leading + lw;
  let curX = startIconX;
  let rows = 1;
  for (let i = 0; i < kinds.length; i++) {
    if (curX + PDF_CHANNEL_BADGE > rightEdge) {
      rows++;
      curX = startIconX;
    }
    curX += PDF_CHANNEL_BADGE + PDF_CHANNEL_GAP;
  }
  const extraRows = Math.max(0, rows - 1);
  return 6 + PDF_CHANNEL_ROW_H + extraRows * (PDF_CHANNEL_BADGE + PDF_CHANNEL_GAP) + 8;
}

const FB_PATH =
  "M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z";

const YT_SHELL =
  "M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17";

const YT_PLAY = "m10 15 5-3-5-3z";

/** Music note (Lucide) — used as TikTok stand-in; circles converted to arcs. */
const MUSIC_PATH =
  "M 9 18 V 5 l 12 -2 v 13 M 15 18 a 3 3 0 1 1 -6 0 3 3 0 0 1 6 0 M 21 16 a 3 3 0 1 1 -6 0 3 3 0 0 1 6 0";

const LINKEDIN_MAIN =
  "M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z";

const LINKEDIN_BAR = "M2 9h4v12H2z";

const LINKEDIN_DOT = "M6 4 A2 2 0 1 1 2 4 A2 2 0 1 1 6 4 z";

const MESSAGE_CIRCLE_PATH =
  "M2.992 16.342a2 2 0 0 1 .094 1.167l-1.065 3.29a1 1 0 0 0 1.236 1.168l3.413-.998a2 2 0 0 1 1.099.092 10 10 0 1 0-4.777-4.719";

const MAIL_FLAP = "m22 7-8.991 5.727a2 2 0 0 1-2.009 0L2 7";

const MAIL_BODY = "M2 4h20v16H2z";

/** Rounded camera tile + lens (single fill). */
const INSTAGRAM_PATH =
  "M 7 2 h 10 a 5 5 0 0 1 5 5 v 10 a 5 5 0 0 1 -5 5 H 7 a 5 5 0 0 1 -5 -5 V 7 a 5 5 0 0 1 5 -5 z m 5 6 a 4 4 0 1 1 0 8 a 4 4 0 0 1 0 -8 z";

/** Lucide globe meridians + equator (stroked). */
const GLOBE_MERID =
  "M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20 M2 12h20";

const GLOBE_OUTLINE =
  "M22 12A10 10 0 1 1 2.001 12 10 10 0 0 1 22 12z";

const YT_RED = rgb(0.86, 0.12, 0.12);
const IG_PINK = rgb(0.89, 0.19, 0.42);
const FB_BLUE = rgb(0.26, 0.41, 0.76);
const LI_BLUE = rgb(0.0, 0.47, 0.71);
const WA_GREEN = rgb(0.15, 0.72, 0.38);

function centerSvgPath(
  page: PDFPage,
  path: string,
  boxLeftX: number,
  boxLlY: number,
  opts: { color?: ReturnType<typeof rgb>; borderColor?: ReturnType<typeof rgb>; borderWidth?: number },
): void {
  const s = ((PDF_CHANNEL_BADGE * 0.64) / VIEW) as number;
  const cxPdf = boxLeftX + PDF_CHANNEL_BADGE / 2;
  const cyPdf = boxLlY + PDF_CHANNEL_BADGE / 2;
  const tx = cxPdf - 12 * s;
  const ty = cyPdf + 12 * s;
  page.drawSvgPath(path, {
    x: tx,
    y: ty,
    scale: s,
    color: opts.color,
    borderColor: opts.borderColor,
    borderWidth: opts.borderWidth ?? (opts.borderColor ? 1.35 : 0),
  });
}

function drawBadgeFrame(page: PDFPage, boxLeftX: number, boxLlY: number): void {
  page.drawRectangle({
    x: boxLeftX,
    y: boxLlY,
    width: PDF_CHANNEL_BADGE,
    height: PDF_CHANNEL_BADGE,
    color: SURFACE_LIGHT,
    borderColor: BORDER,
    borderWidth: 0.45,
  });
}

function drawKindGlyph(page: PDFPage, kind: PdfChannelKind, boxLeftX: number, boxLlY: number): void {
  switch (kind) {
    case "website":
      centerSvgPath(page, GLOBE_OUTLINE, boxLeftX, boxLlY, {
        borderColor: ACCENT,
        borderWidth: 1.35,
      });
      centerSvgPath(page, GLOBE_MERID, boxLeftX, boxLlY, {
        borderColor: INK_SOFT,
        borderWidth: 1.1,
      });
      break;
    case "email":
      centerSvgPath(page, MAIL_BODY, boxLeftX, boxLlY, {
        borderColor: MUTED,
        borderWidth: 1.15,
      });
      centerSvgPath(page, MAIL_FLAP, boxLeftX, boxLlY, {
        borderColor: MUTED,
        borderWidth: 1.15,
      });
      break;
    case "instagram":
      centerSvgPath(page, INSTAGRAM_PATH, boxLeftX, boxLlY, { color: IG_PINK });
      break;
    case "facebook":
      centerSvgPath(page, FB_PATH, boxLeftX, boxLlY, { color: FB_BLUE });
      break;
    case "tiktok":
      centerSvgPath(page, MUSIC_PATH, boxLeftX, boxLlY, { color: INK_SOFT });
      break;
    case "youtube":
      centerSvgPath(page, YT_SHELL, boxLeftX, boxLlY, { color: YT_RED });
      centerSvgPath(page, YT_PLAY, boxLeftX, boxLlY, { color: rgb(1, 1, 1) });
      break;
    case "linkedin":
      centerSvgPath(page, LINKEDIN_MAIN, boxLeftX, boxLlY, { color: LI_BLUE });
      centerSvgPath(page, LINKEDIN_BAR, boxLeftX, boxLlY, { color: LI_BLUE });
      centerSvgPath(page, LINKEDIN_DOT, boxLeftX, boxLlY, { color: LI_BLUE });
      break;
    case "whatsapp":
      centerSvgPath(page, MESSAGE_CIRCLE_PATH, boxLeftX, boxLlY, {
        borderColor: WA_GREEN,
        borderWidth: 1.45,
      });
      break;
    default:
      break;
  }
}

/**
 * Draw “Channels:” label + icon badges aligned to a 24px-tall row (`rowTopY` = top edge of row).
 * Returns a y suitable for stacking content below the row (includes padding).
 */
export function drawPdfChannelIconRow(
  page: PDFPage,
  kinds: PdfChannelKind[],
  opts: { textLeft: number; rowTopY: number; maxRight: number; labelFont: PDFFont },
): number {
  if (kinds.length === 0) return opts.rowTopY - PDF_CHANNEL_ROW_H;

  const rowLlY = opts.rowTopY - PDF_CHANNEL_ROW_H;
  /** Visually center label with the 24px row (8.5pt Latin caps). */
  const labelBaseline = rowLlY + 9;

  page.drawText("Channels:", {
    x: opts.textLeft,
    y: labelBaseline,
    size: LABEL_SIZE,
    font: opts.labelFont,
    color: MUTED,
  });
  const lw = opts.labelFont.widthOfTextAtSize("Channels:", LABEL_SIZE) + 8;
  const startIconX = opts.textLeft + lw;
  let curX = startIconX;
  let rowBadgeLl = rowLlY + (PDF_CHANNEL_ROW_H - PDF_CHANNEL_BADGE) / 2;
  let minLl = rowBadgeLl;

  for (const k of kinds) {
    if (curX + PDF_CHANNEL_BADGE > opts.maxRight) {
      curX = startIconX;
      rowBadgeLl -= PDF_CHANNEL_BADGE + PDF_CHANNEL_GAP;
    }
    drawBadgeFrame(page, curX, rowBadgeLl);
    drawKindGlyph(page, k, curX, rowBadgeLl);
    curX += PDF_CHANNEL_BADGE + PDF_CHANNEL_GAP;
    minLl = Math.min(minLl, rowBadgeLl);
  }
  return minLl - 10;
}
