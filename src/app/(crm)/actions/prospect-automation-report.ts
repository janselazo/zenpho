"use server";

import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { MarketIntelReport } from "@/lib/crm/prospect-intel-report";
import { requireAgencyStaff } from "@/app/(crm)/actions/prospect-preview-agency";

const PAGE_W = 612;
const PAGE_H = 792;
const MARGIN = 50;
const LINE = 13;
const MAX_CHARS = 82;

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

export async function generateProspectAutomationPdfAction(input: {
  report: MarketIntelReport;
  businessName: string;
}): Promise<
  { ok: true; pdfBase64: string; filename: string } | { ok: false; error: string }
> {
  const auth = await requireAgencyStaff();
  if (auth.error) return { ok: false, error: auth.error };

  const name = input.businessName.trim() || "Business";
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);

  let page = pdf.addPage([PAGE_W, PAGE_H]);
  let y = PAGE_H - MARGIN;

  const ensureSpace = (linesNeeded: number) => {
    if (y - linesNeeded * LINE < MARGIN) {
      page = pdf.addPage([PAGE_W, PAGE_H]);
      y = PAGE_H - MARGIN;
    }
  };

  const drawBold = (t: string, size = 14) => {
    ensureSpace(2);
    page.drawText(t, {
      x: MARGIN,
      y,
      size,
      font: fontBold,
      color: rgb(0.08, 0.08, 0.1),
    });
    y -= LINE * 1.4;
  };

  const drawBodyLines = (text: string, size = 11) => {
    for (const line of wordWrap(text, MAX_CHARS)) {
      ensureSpace(1);
      page.drawText(line, {
        x: MARGIN,
        y,
        size,
        font,
        color: rgb(0.15, 0.15, 0.18),
      });
      y -= LINE;
    }
  };

  drawBold("AI automation opportunities");
  drawBodyLines(`Business: ${name}`);
  drawBodyLines(`Generated: ${new Date().toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}`);
  y -= LINE * 0.5;

  const summary = input.report.summary?.trim();
  if (summary) {
    drawBold("Context", 12);
    drawBodyLines(summary.slice(0, 4000));
    y -= LINE * 0.5;
  }

  drawBold("Suggested automations", 12);
  const bullets = input.report.aiAutomations;
  if (bullets.length === 0) {
    drawBodyLines(
      "No automation ideas are in the current market intel report. Try a Google listing with richer signals, or refresh the report."
    );
  } else {
    for (const b of bullets) {
      drawBodyLines(`• ${b}`);
      y -= 4;
    }
  }

  const bytes = await pdf.save();
  const pdfBase64 = Buffer.from(bytes).toString("base64");
  const safe = name.replace(/[^\w\-]+/g, "-").replace(/^-|-$/g, "").slice(0, 48) || "prospect";
  return {
    ok: true,
    pdfBase64,
    filename: `${safe}-ai-automations.pdf`,
  };
}
