import type { MarketIntelReport } from "@/lib/crm/prospect-intel-report";

function indentBulletLines(lines: string[]): string[] {
  return lines.map((line) => `  • ${line}`);
}

/**
 * Plain structured text for CRM lead notes (no markdown list syntax like "- ").
 * Sections use short labels; bullets use the • character and two-space indent.
 */
export function formatReportAsPlainNotes(
  report: MarketIntelReport,
  contextBlock?: string,
  contactSignalsBlock?: string
): string {
  const chunks: string[] = [];

  if (contextBlock?.trim()) {
    chunks.push(
      "CONTEXT",
      ...contextBlock.trim().split("\n").map((line) => `  ${line}`),
      ""
    );
  }

  if (report.software.length) {
    chunks.push("SOFTWARE", ...indentBulletLines(report.software), "");
  }
  if (report.aiAutomations.length) {
    chunks.push("AI AUTOMATIONS", ...indentBulletLines(report.aiAutomations), "");
  }
  if (report.productGrowth.length) {
    chunks.push("PRODUCT GROWTH", ...indentBulletLines(report.productGrowth), "");
  }

  const summaryBody = report.summary.trim().split("\n");
  chunks.push("SUMMARY", ...summaryBody.map((line) => `  ${line}`), "");

  if (contactSignalsBlock?.trim()) {
    chunks.push(
      "CONTACT SIGNALS",
      ...contactSignalsBlock.trim().split("\n").map((line) => `  ${line}`),
      ""
    );
  }

  return chunks.join("\n").replace(/\n+$/, "");
}
