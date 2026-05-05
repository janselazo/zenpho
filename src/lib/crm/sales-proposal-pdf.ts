/**
 * Build a branded PDF export for Proposal Generation wizard output.
 */

import { Buffer } from "node:buffer";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { drawImageFit, embedPngIfAny } from "@/lib/crm/pdf-brand-book";
import type { ProposalPdfRasterSlot } from "@/lib/crm/proposal-pdf-rasters";
import { stripMarkdownForProposalPdf } from "@/lib/crm/proposal-enrichment-context";

const PAGE_W = 612;
const PAGE_H = 792;
const MARGIN = 50;
const LINE = 12;
const MAX_CHARS = 86;
const FOOTER_MARGIN = 40;

/** WinAnsi-safe text for Helvetica (aligned with automation report helper). */
const EXTRA_WIN_ANSI_OK = new Set<number>([
  0x0152, 0x0153, 0x0178, 0x20ac,
  0x2013, 0x2014, 0x2018, 0x2019, 0x201c, 0x201d, 0x2026, 0x2022,
]);

export function sanitizeTextForHelveticaPdf(text: string): string {
  let out = "";
  for (const ch of text) {
    const cp = ch.codePointAt(0)!;
    if (cp === 0x09 || cp === 0x0a || cp === 0x0d) {
      out += ch;
      continue;
    }
    if (cp >= 0x20 && cp <= 0x7e) {
      out += ch;
      continue;
    }
    if (cp >= 0xa0 && cp <= 0xff) {
      out += ch;
      continue;
    }
    if (EXTRA_WIN_ANSI_OK.has(cp)) {
      out += ch;
      continue;
    }
    if (/\p{Extended_Pictographic}/u.test(ch)) {
      out += " ";
      continue;
    }
    if (
      /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}\p{Script=Cyrillic}\p{Script=Arabic}\p{Script=Hebrew}\p{Script=Devanagari}]/u.test(
        ch
      )
    ) {
      out += "?";
      continue;
    }
    out += "?";
  }
  return out;
}

export function slugifyPdfFilenameSegment(name: string): string {
  const t = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 56);
  return t || "client";
}

function wordWrap(text: string, maxChars: number): string[] {
  const words = text.replace(/\s+/g, " ").trim().split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    if (!w) continue;
    const next = cur ? `${cur} ${w}` : w;
    if (next.length <= maxChars) cur = next;
    else {
      if (cur) lines.push(cur);
      if (w.length > maxChars) {
        for (let i = 0; i < w.length; i += maxChars) {
          lines.push(w.slice(i, i + maxChars));
        }
        cur = "";
      } else cur = w;
    }
  }
  if (cur) lines.push(cur);
  return lines.length ? lines : [""];
}

type PdfCtx = {
  pdf: PDFDocument;
  page: ReturnType<PDFDocument["addPage"]>;
  y: number;
  font: Awaited<ReturnType<PDFDocument["embedFont"]>>;
  fontBold: Awaited<ReturnType<PDFDocument["embedFont"]>>;
};

function ensureSpace(ctx: PdfCtx, linesNeeded: number): void {
  if (ctx.y - linesNeeded * LINE < FOOTER_MARGIN) {
    ctx.page = ctx.pdf.addPage([PAGE_W, PAGE_H]);
    ctx.y = PAGE_H - MARGIN;
  }
}

function ensureImageBand(
  ctx: PdfCtx,
  bandHeightPx: number,
  captionReservePx: number
): void {
  const reserve = bandHeightPx + captionReservePx;
  if (ctx.y - reserve < FOOTER_MARGIN + 24) {
    ctx.page = ctx.pdf.addPage([PAGE_W, PAGE_H]);
    ctx.y = PAGE_H - MARGIN;
  }
}

function stampFooterLastPage(
  ctx: PdfCtx,
  dateStr: string
): void {
  const pages = ctx.pdf.getPages();
  const last = pages[pages.length - 1];
  const foot = sanitizeTextForHelveticaPdf(
    `${dateStr}  ·  Zenpho proposal`
  );
  last.drawText(foot, {
    x: MARGIN,
    y: 28,
    size: 8,
    font: ctx.font,
    color: rgb(0.45, 0.48, 0.54),
  });
}

function drawBoldLine(ctx: PdfCtx, text: string, size = 12): void {
  const safe = sanitizeTextForHelveticaPdf(text);
  ensureSpace(ctx, 2);
  ctx.page.drawText(safe, {
    x: MARGIN,
    y: ctx.y,
    size,
    font: ctx.fontBold,
    color: rgb(0.06, 0.1, 0.2),
  });
  ctx.y -= LINE * 1.55;
}

function drawBodyParagraph(ctx: PdfCtx, para: string, size = 10): void {
  const safe = sanitizeTextForHelveticaPdf(para);
  const linesToDraw = [];
  const rawParas = safe.split(/\n+/);
  for (const rp of rawParas) {
    const p = rp.trim();
    if (!p) continue;
    for (const wl of wordWrap(p, MAX_CHARS)) {
      linesToDraw.push(wl);
    }
  }
  if (linesToDraw.length === 0) return;
  for (const wl of linesToDraw) {
    ensureSpace(ctx, 1);
    ctx.page.drawText(wl, {
      x: MARGIN,
      y: ctx.y,
      size,
      font: ctx.font,
      color: rgb(0.15, 0.16, 0.2),
    });
    ctx.y -= LINE;
  }
  ctx.y -= 4;
}

function drawHeader(ctx: PdfCtx, title: string, sub: string, dateStr: string): void {
  const { page, font, fontBold } = ctx;
  page.drawRectangle({
    x: 0,
    y: PAGE_H - 78,
    width: PAGE_W,
    height: 78,
    color: rgb(0.91, 0.93, 0.98),
    borderWidth: 0,
  });
  page.drawText(sanitizeTextForHelveticaPdf(title.slice(0, 120)), {
    x: MARGIN,
    y: PAGE_H - 32,
    size: 18,
    font: fontBold,
    color: rgb(0.06, 0.12, 0.28),
  });
  const subline = sanitizeTextForHelveticaPdf(`${sub}  |  ${dateStr}`);
  page.drawText(subline, {
    x: MARGIN,
    y: PAGE_H - 54,
    size: 10,
    font,
    color: rgb(0.22, 0.28, 0.38),
  });
  ctx.y = PAGE_H - 96;
}

export type SalesProposalPdfInput = {
  proposalTitle: string;
  clientLine: string;
  investmentLine: string;
  markdownBody: string;
  generatedAtLabel: string;
  /** Raster snapshots (listing photos, scraped logo PNG) stitched before prose. */
  embeddedRasters?: ProposalPdfRasterSlot[];
};

export async function buildSalesProposalPdfBytes(
  input: SalesProposalPdfInput
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);

  let page = pdf.addPage([PAGE_W, PAGE_H]);
  const ctx: PdfCtx = { pdf, page, y: PAGE_H - MARGIN, font, fontBold };

  drawHeader(
    ctx,
    input.proposalTitle,
    input.clientLine,
    input.generatedAtLabel
  );

  if (input.investmentLine.trim()) {
    drawBoldLine(ctx, "Pricing summary");
    drawBodyParagraph(ctx, input.investmentLine);
  }

  if (input.embeddedRasters?.length) {
    drawBoldLine(ctx, "Listing & brand visuals");
    for (const slot of input.embeddedRasters) {
      const imgBoxH = 152;
      ensureImageBand(ctx, imgBoxH, 44);
      const rect = {
        x: MARGIN,
        y: ctx.y - imgBoxH,
        width: PAGE_W - 2 * MARGIN,
        height: imgBoxH,
      };
      const img = await embedPngIfAny(pdf, Buffer.from(slot.bytes));
      if (img) drawImageFit(ctx.page, img, rect, "contain");
      else
        drawBodyParagraph(
          ctx,
          sanitizeTextForHelveticaPdf(`${slot.caption} (unable to rasterize)`),
          9
        );
      ctx.y -= imgBoxH + LINE + 6;
      drawBodyParagraph(ctx, slot.caption, 8);
    }
    ctx.y -= LINE;
  }

  drawBoldLine(ctx, "Proposal");
  const body = stripMarkdownForProposalPdf(
    input.markdownBody.replace(/\r\n/g, "\n")
  ).trim();
  const lines = body.split("\n");
  let buf = "";
  for (const line of lines) {
    const t = line.trimEnd();
    if (/^#\s+\S/.test(t) || /^##\s+\S/.test(t) || /^###\s+\S/.test(t)) {
      if (buf.trim()) {
        drawBodyParagraph(ctx, buf.trim());
        buf = "";
      }
      const heading = t.replace(/^#{1,3}\s+/, "").trim();
      drawBoldLine(ctx, heading, 11.5);
    } else {
      buf += (buf ? "\n" : "") + t;
    }
  }
  if (buf.trim()) drawBodyParagraph(ctx, buf.trim());

  stampFooterLastPage(ctx, input.generatedAtLabel);

  const out = await pdf.save();
  return out;
}
