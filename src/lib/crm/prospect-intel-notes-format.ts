import type { MarketIntelReport } from "@/lib/crm/prospect-intel-report";

function indentBulletLines(lines: string[]): string[] {
  return lines.map((line) => `  • ${line}`);
}

/** Indent non-empty lines for a plain-text block under a section header. */
function indentBodyLines(block: string): string[] {
  return block
    .trim()
    .split("\n")
    .map((line) => `  ${line.trimEnd()}`)
    .filter((line) => line.trim().length > 0);
}

/**
 * If the whole block is one URL, label it so it scans like a field, not raw paste.
 */
function formatContextBody(contextBlock: string): string[] {
  const raw = contextBlock.trim();
  if (!raw) return [];

  const lines = raw.split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length === 1 && /^https?:\/\//i.test(lines[0])) {
    return [`  Website · ${lines[0]}`];
  }

  return lines.map((line) => {
    if (/^https?:\/\//i.test(line)) {
      return `  Website · ${line}`;
    }
    return `  ${line}`;
  });
}

/**
 * Plain structured text for CRM lead notes (no markdown list syntax like "- ").
 * Section titles use sentence case; bullets use • with a two-space indent.
 */
export function formatReportAsPlainNotes(
  report: MarketIntelReport,
  contextBlock?: string,
  contactSignalsBlock?: string
): string {
  const chunks: string[] = [];

  if (contextBlock?.trim()) {
    chunks.push("Context", ...formatContextBody(contextBlock), "");
  }

  if (report.customWebsites.length) {
    chunks.push("Custom websites", ...indentBulletLines(report.customWebsites), "");
  }
  if (report.webApps.length) {
    chunks.push("Web apps", ...indentBulletLines(report.webApps), "");
  }
  if (report.mobileApps.length) {
    chunks.push("Mobile apps", ...indentBulletLines(report.mobileApps), "");
  }
  if (report.aiAutomations.length) {
    chunks.push("AI & automation", ...indentBulletLines(report.aiAutomations), "");
  }

  const summaryTrim = report.summary.trim();
  if (summaryTrim) {
    chunks.push(
      "Summary",
      ...summaryTrim.split("\n").map((line) => `  ${line}`),
      ""
    );
  }

  if (contactSignalsBlock?.trim()) {
    const contactLines = indentBodyLines(contactSignalsBlock);
    if (contactLines.length) {
      chunks.push("Contact signals", ...contactLines, "");
    }
  }

  return chunks.join("\n").replace(/\n+$/, "");
}
