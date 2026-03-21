"use client";

import { motion } from "framer-motion";
import Button from "@/components/ui/Button";
import SectionHeading from "@/components/ui/SectionHeading";

const embedUrl = process.env.NEXT_PUBLIC_BOOKING_EMBED_URL?.trim();
const hasEmbed = Boolean(embedUrl?.startsWith("https://"));

export default function BookingSection() {
  return (
    <section
      id="booking"
      className="mx-auto max-w-7xl px-6 pb-16 lg:px-8"
      aria-label="Book a call"
    >
      <SectionHeading
        label="Booking"
        title="Pick a time"
        titleAccent="on the calendar"
        description="Reserve a slot for a strategy or intro call — you’ll get a calendar invite with the details."
        align="center"
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.5 }}
        className="mx-auto max-w-4xl overflow-hidden rounded-2xl border border-border bg-white shadow-soft-lg"
      >
        {hasEmbed ? (
          <iframe
            src={embedUrl}
            title="Schedule a meeting"
            className="h-[min(90vh,720px)] w-full min-h-[560px] border-0 sm:min-h-[640px]"
            allow="camera; microphone; fullscreen; payment; autoplay"
          />
        ) : (
          <div className="flex flex-col items-center justify-center gap-5 px-6 py-16 text-center sm:py-20">
            <p className="max-w-md text-sm leading-relaxed text-text-secondary sm:text-base">
              Connect a scheduler by setting{" "}
              <code className="rounded-md bg-surface-light px-1.5 py-0.5 font-mono text-xs text-text-primary">
                NEXT_PUBLIC_BOOKING_EMBED_URL
              </code>{" "}
              in your environment (Cal.com, Calendly, or any embeddable booking
              URL). Until then, reach out by email and we&apos;ll coordinate a
              time.
            </p>
            <Button href="mailto:hello@janselazo.com" variant="primary" size="lg">
              Email to schedule
            </Button>
          </div>
        )}
      </motion.div>
    </section>
  );
}
