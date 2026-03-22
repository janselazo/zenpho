import type { Metadata } from "next";
import BookingHero from "./BookingHero";
import BookingSection from "@/components/contact/BookingSection";

export const metadata: Metadata = {
  title: "Book a Call",
  description:
    "Pick a time on the calendar for a strategy or intro call with Janse Lazo — AI software development agency.",
};

export default function BookingPage() {
  return (
    <>
      <BookingHero />
      <BookingSection />
    </>
  );
}
