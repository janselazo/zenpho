import type { Metadata } from "next";
import BookingHero from "./BookingHero";
import BookingSection from "@/components/contact/BookingSection";

export const metadata: Metadata = {
  title: "Book a Free Build Call · Zenpho",
  description:
    "Schedule time with Zenpho to align on your website, web app, or mobile MVP—scope, timeline, and how we ship together.",
};

export default function BookingPage() {
  return (
    <>
      <BookingHero />
      <BookingSection />
    </>
  );
}
