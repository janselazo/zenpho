import type { Metadata } from "next";
import BookingHero from "./BookingHero";
import BookingSection from "@/components/contact/BookingSection";
import { buildMarketingMetadata } from "@/lib/marketing/seo";

export const metadata: Metadata = buildMarketingMetadata({
  title: "Book a Free Build Call · Zenpho",
  description:
    "Schedule time with Zenpho to align on your website, ecommerce, or mobile build—scope, timeline, and how we ship together.",
  path: "/booking",
});

export default function BookingPage() {
  return (
    <>
      <BookingHero />
      <BookingSection />
    </>
  );
}
