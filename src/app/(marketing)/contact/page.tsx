import type { Metadata } from "next";
import ContactPageContent from "./ContactPageContent";
import { buildMarketingMetadata } from "@/lib/marketing/seo";

export const metadata: Metadata = buildMarketingMetadata({
  title: "Contact · Zenpho · MVP Product Studio",
  description:
    "Have a website, app, or MVP idea? Book a free thirty-minute build call — we'll listen, ask, and quote a fixed price within 48 hours.",
  path: "/contact",
});

export default function ContactPage() {
  return <ContactPageContent />;
}
