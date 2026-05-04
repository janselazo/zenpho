import type { MarketIntelReport } from "@/lib/crm/prospect-intel-report";

/**
 * Plain text for CRM lead notes from prospect intel: the insight summary only.
 * Context, vertical bullets, and contact lines stay on other fields / the report UI.
 */
export function formatReportAsPlainNotes(report: MarketIntelReport): string {
  return report.summary.trim();
}
