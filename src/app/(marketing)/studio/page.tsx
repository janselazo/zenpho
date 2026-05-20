import type { Metadata } from "next";
import StudioPageContent from "./StudioPageContent";
import { buildMarketingMetadata } from "@/lib/marketing/seo";

const title = "Zenpho Studio | A venture studio building its own products";
const description =
  "Zenpho Studio is a venture studio building Zenpho CRM, SoldTools and 305 Car Deals — using the same playbooks we bring to client work.";

export const metadata: Metadata = buildMarketingMetadata({
  title,
  description,
  path: "/studio",
});

export default function StudioPage() {
  return <StudioPageContent />;
}
