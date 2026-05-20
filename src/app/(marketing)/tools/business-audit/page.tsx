import type { Metadata } from "next";
import BusinessAuditPageContent from "./BusinessAuditPageContent";
import { buildMarketingMetadata } from "@/lib/marketing/seo";

export const metadata: Metadata = buildMarketingMetadata({
  title: "Business Audit · Find revenue leaks · Zenpho",
  description:
    "Analyze your Google profile, reviews, competitors, website, ads, and local positioning to uncover missed revenue opportunities.",
  path: "/tools/business-audit",
});

export default function BusinessAuditPage() {
  return <BusinessAuditPageContent />;
}
