import type { Metadata } from "next";
import ContactPageContent from "./ContactPageContent";

export const metadata: Metadata = {
  title: {
    absolute: "Contact · Zenpho · MVP Product Studio",
  },
  description:
    "Have a website, app, or MVP idea? Book a free thirty-minute build call — we'll listen, ask, and quote a fixed price within 48 hours.",
};

export default function ContactPage() {
  return <ContactPageContent />;
}
