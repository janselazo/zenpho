"use server";

import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { MarketIntelReport } from "@/lib/crm/prospect-intel-report";
import { requireAgencyStaff } from "@/app/(crm)/actions/prospect-preview-agency";
import { generateAutomationReportNarrative } from "@/lib/crm/prospect-automation-report-llm";
import type { AutomationReportNarrative } from "@/lib/crm/prospect-automation-report-llm";

const PAGE_W = 612;
const PAGE_H = 792;
const MARGIN = 50;
const LINE = 13;
const MAX_CHARS = 82;
const HEADER_BAND_H = 78;
const MAX_BULLETS_PER_SECTION = 8;
const MAX_BULLET_CHARS = 240;
const MAX_EXEC_SUMMARY_CHARS = 1_400;
const MAX_IMPLEMENTATION_UPSELL_CHARS = 900;
const MAX_RESEARCH_CONTEXT_CHARS = 2_500;

const DEFAULT_IMPLEMENTATION_UPSELL =
  "Implementation, integrations, security review, training, and production rollout are not part of this audit document. They are scoped and quoted as a separate engagement after you approve priorities from this plan.";

/**
 * Standard Helvetica in pdf-lib is WinAnsi-encoded; `drawText` throws on many Unicode
 * code points (emoji, CJK, Cyrillic, arrows, etc.). Sanitize so generation always completes.
 */
const EXTRA_WIN_ANSI_OK = new Set<number>([
  0x0152, 0x0153, 0x0178, 0x20ac, // Œ œ Ÿ €
  0x2013, 0x2014, 0x2018, 0x2019, 0x201c, 0x201d, 0x2026, 0x2022, // – — ‘ ’ “ ” … •
]);

function sanitizeTextForHelveticaPdf(text: string): string {
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

function capBullet(s: string): string {
  const t = s.trim();
  if (t.length <= MAX_BULLET_CHARS) return t;
  return `${t.slice(0, MAX_BULLET_CHARS - 1)}…`;
}

type PdfContext = {
  pdf: PDFDocument;
  page: ReturnType<PDFDocument["addPage"]>;
  y: number;
  font: Awaited<ReturnType<PDFDocument["embedFont"]>>;
  fontBold: Awaited<ReturnType<PDFDocument["embedFont"]>>;
};

function createPdfContext(
  pdf: PDFDocument,
  font: Awaited<ReturnType<PDFDocument["embedFont"]>>,
  fontBold: Awaited<ReturnType<PDFDocument["embedFont"]>>
): PdfContext {
  const page = pdf.addPage([PAGE_W, PAGE_H]);
  return { pdf, page, y: PAGE_H - MARGIN, font, fontBold };
}

function drawHeaderBand(
  ctx: PdfContext,
  businessLine: string,
  dateStr: string
): void {
  const { page, font, fontBold } = ctx;
  page.drawRectangle({
    x: 0,
    y: PAGE_H - HEADER_BAND_H,
    width: PAGE_W,
    height: HEADER_BAND_H,
    color: rgb(0.91, 0.94, 0.99),
    borderWidth: 0,
  });
  page.drawText(sanitizeTextForHelveticaPdf("AI audit report"), {
    x: MARGIN,
    y: PAGE_H - 30,
    size: 17,
    font: fontBold,
    color: rgb(0.06, 0.12, 0.28),
  });
  const sub = sanitizeTextForHelveticaPdf(`${businessLine}   |   ${dateStr}`);
  page.drawText(sub, {
    x: MARGIN,
    y: PAGE_H - 52,
    size: 10,
    font,
    color: rgb(0.22, 0.28, 0.38),
  });
  ctx.y = PAGE_H - HEADER_BAND_H - 22;
}

function ensureSpace(ctx: PdfContext, linesNeeded: number): void {
  if (ctx.y - linesNeeded * LINE < MARGIN) {
    ctx.page = ctx.pdf.addPage([PAGE_W, PAGE_H]);
    ctx.y = PAGE_H - MARGIN;
  }
}

function drawRule(ctx: PdfContext): void {
  ensureSpace(ctx, 2);
  const yLine = ctx.y - 4;
  ctx.page.drawLine({
    start: { x: MARGIN, y: yLine },
    end: { x: PAGE_W - MARGIN, y: yLine },
    thickness: 0.75,
    color: rgb(0.82, 0.86, 0.92),
  });
  ctx.y = yLine - 14;
}

function drawBold(ctx: PdfContext, t: string, size = 12.5): void {
  const safe = sanitizeTextForHelveticaPdf(t);
  ensureSpace(ctx, 2);
  ctx.page.drawText(safe, {
    x: MARGIN,
    y: ctx.y,
    size,
    font: ctx.fontBold,
    color: rgb(0.08, 0.1, 0.16),
  });
  ctx.y -= LINE * 1.35;
}

function drawBodyLines(ctx: PdfContext, text: string, size = 10.5): void {
  const safe = sanitizeTextForHelveticaPdf(text);
  const paragraphs = safe.split(/\n+/);
  for (const para of paragraphs) {
    const p = para.trim();
    if (!p) continue;
    for (const line of wordWrap(p, MAX_CHARS)) {
      ensureSpace(ctx, 1);
      ctx.page.drawText(line, {
        x: MARGIN,
        y: ctx.y,
        size,
        font: ctx.font,
        color: rgb(0.18, 0.18, 0.22),
      });
      ctx.y -= LINE;
    }
    ctx.y -= 4;
  }
}

function drawBullets(ctx: PdfContext, items: string[], title: string): void {
  const slice = items.slice(0, MAX_BULLETS_PER_SECTION).map(capBullet);
  if (slice.length === 0) return;
  drawBold(ctx, title, 12);
  for (const b of slice) {
    drawBodyLines(ctx, `* ${b}`, 10.5);
    ctx.y -= 2;
  }
  ctx.y -= 6;
  drawRule(ctx);
}

function drawLegacyBody(ctx: PdfContext, report: MarketIntelReport, name: string): void {
  const dateStr = new Date().toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
  drawHeaderBand(ctx, name, dateStr);

  const summary = report.summary?.trim();
  if (summary) {
    drawBold(ctx, "Context", 12);
    drawBodyLines(ctx, summary.slice(0, 4000));
    ctx.y -= 8;
    drawRule(ctx);
  }

  drawBold(ctx, "Research notes (automation signals)", 12);
  const bullets = report.aiAutomations;
  if (bullets.length === 0) {
    drawBodyLines(
      ctx,
      "No research signals are in the current market intel report. Try a Google listing with richer signals, or refresh the report."
    );
  } else {
    for (const b of bullets.slice(0, MAX_BULLETS_PER_SECTION * 2)) {
      drawBodyLines(ctx, `* ${capBullet(b)}`, 10.5);
      ctx.y -= 2;
    }
  }
}

function drawNarrativeBody(
  ctx: PdfContext,
  narrative: AutomationReportNarrative,
  report: MarketIntelReport,
  name: string
): void {
  const dateStr = new Date().toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
  drawHeaderBand(ctx, name, dateStr);

  if (narrative.executiveSummary.trim()) {
    drawBold(ctx, "Executive summary", 12);
    drawBodyLines(
      ctx,
      narrative.executiveSummary.trim().slice(0, MAX_EXEC_SUMMARY_CHARS),
      10.5
    );
    ctx.y -= 6;
    drawRule(ctx);
  }

  drawBullets(ctx, narrative.repeatableProcesses, "Repeatable processes");
  drawBullets(ctx, narrative.costAndImpact, "Cost and impact");
  drawBullets(
    ctx,
    narrative.toolAndWorkflowRecommendations,
    "AI tools and workflows"
  );
  drawBullets(ctx, narrative.prioritizedActionPlan, "Prioritized action plan");

  const upsell =
    narrative.implementationUpsell.trim() || DEFAULT_IMPLEMENTATION_UPSELL;
  drawBold(ctx, "Implementation (separate engagement)", 12);
  drawBodyLines(
    ctx,
    upsell.slice(0, MAX_IMPLEMENTATION_UPSELL_CHARS),
    10.5
  );
  ctx.y -= 6;
  drawRule(ctx);

  const ref = report.aiAutomations;
  if (ref.length > 0) {
    drawBold(ctx, "Reference signals (from research)", 12);
    for (const b of ref.slice(0, MAX_BULLETS_PER_SECTION)) {
      drawBodyLines(ctx, `* ${capBullet(b)}`, 10.5);
      ctx.y -= 2;
    }
    ctx.y -= 6;
    drawRule(ctx);
  }

  const summary = report.summary?.trim();
  if (summary) {
    drawBold(ctx, "Research context", 12);
    drawBodyLines(ctx, summary.slice(0, MAX_RESEARCH_CONTEXT_CHARS));
  }
}

export async function generateProspectAutomationPdfAction(input: {
  report: MarketIntelReport;
  businessName: string;
}): Promise<
  { ok: true; pdfBase64: string; filename: string } | { ok: false; error: string }
> {
  const auth = await requireAgencyStaff();
  if (auth.error) return { ok: false, error: auth.error };

  const name = sanitizeTextForHelveticaPdf(input.businessName.trim() || "Business");

  const narrativeResult = await generateAutomationReportNarrative({
    businessName: input.businessName.trim() || "Business",
    report: input.report,
  });
  const useNarrative = narrativeResult.ok;

  try {
    const pdf = await PDFDocument.create();
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);

    const ctx = createPdfContext(pdf, font, fontBold);

    if (useNarrative) {
      drawNarrativeBody(ctx, narrativeResult.data, input.report, name);
    } else {
      drawLegacyBody(ctx, input.report, name);
    }

    const bytes = await pdf.save();
    const pdfBase64 = Buffer.from(bytes).toString("base64");
    const safe =
      name.replace(/[^\w\-]+/g, "-").replace(/^-|-$/g, "").slice(0, 48) || "prospect";
    return {
      ok: true,
      pdfBase64,
      filename: `${safe}-ai-audit.pdf`,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "PDF could not be generated.";
    return { ok: false, error: msg };
  }
}
