import type { Metadata } from "next";
import BusinessAuditPageContent from "./BusinessAuditPageContent";

export const metadata: Metadata = {
  title: {
    absolute: "Business Audit · Find revenue leaks · Zenpho",
  },
  description:
    "Analyze your Google profile, reviews, competitors, website, ads, and local positioning to uncover missed revenue opportunities.",
};

export default function BusinessAuditPage() {
  return <BusinessAuditPageContent />;
}
