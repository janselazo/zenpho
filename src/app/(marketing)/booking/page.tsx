import type { Metadata } from "next";
import BookingHero from "./BookingHero";
import BookingSection from "@/components/contact/BookingSection";

export const metadata: Metadata = {
  title: "Book a growth call · Zenpho",
  description:
    "Schedule time with Zenpho to talk leads, bookings, reviews, referrals, and revenue tracking for your local service business.",
};

export default function BookingPage() {
  return (
    <>
      <BookingHero />
      <BookingSection />
    </>
  );
}
