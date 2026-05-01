"use client";

import { useState } from "react";
import Link from "next/link";
import SectionHeading from "@/components/ui/SectionHeading";
import { SITE_HOME_FULL_FAQS } from "@/lib/marketing/site-faq-items";

const INITIAL_VISIBLE = 5;

export default function HomeFAQ() {
  const [showAll, setShowAll] = useState(false);
  const total = SITE_HOME_FULL_FAQS.length;
  const hasMore = total > INITIAL_VISIBLE;
  const visible = showAll
    ? SITE_HOME_FULL_FAQS
    : SITE_HOME_FULL_FAQS.slice(0, INITIAL_VISIBLE);

  return (
    <section className="border-y border-border/50 bg-gradient-to-b from-background via-surface/45 to-background py-24 lg:py-28">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <SectionHeading
          label="FAQ"
          title="Common"
          titleAccent="questions"
          titleAccentInline
          className="!mb-10 sm:!mb-12"
          description={
            <p className="sm:text-lg">
              How we help local service businesses grow, what the Revenue Leak Audit covers, and how ROI is tracked.
              See{" "}
              <Link
                href="/pricing"
                className="font-medium text-accent underline-offset-4 hover:underline"
              >
                pricing
              </Link>{" "}
              for plans.
            </p>
          }
        />

        <div className="mx-auto max-w-3xl space-y-2.5">
          {visible.map((faq, i) => (
            <details
              key={`${faq.q}-${i}`}
              name="home-faq"
              className="faq-native group overflow-hidden rounded-2xl border border-border bg-white/95 shadow-sm transition-shadow duration-200 hover:shadow-md"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-4 text-left sm:px-5 sm:py-4 [&::-webkit-details-marker]:hidden">
                <span className="text-sm font-medium leading-snug text-text-primary sm:text-[15px]">
                  {faq.q}
                </span>
                <svg
                  className="faq-chevron h-5 w-5 shrink-0 text-accent/80 transition-transform duration-200"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  aria-hidden
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="m19.5 8.25-7.5 7.5-7.5-7.5"
                  />
                </svg>
              </summary>
              <div className="border-t border-border/60 px-4 pb-4 pt-3 sm:px-5">
                <p className="text-sm leading-relaxed text-text-secondary">
                  {faq.a}
                </p>
              </div>
            </details>
          ))}
        </div>

        {hasMore ? (
          <div className="mx-auto mt-8 flex max-w-3xl justify-center">
            <button
              type="button"
              onClick={() => setShowAll((v) => !v)}
              className="rounded-full border border-border bg-white px-6 py-2.5 text-sm font-semibold text-text-primary shadow-soft transition-all hover:border-accent/35 hover:bg-accent/[0.06] hover:text-accent"
            >
              {showAll
                ? "Show fewer questions"
                : `Show ${total - INITIAL_VISIBLE} more questions`}
            </button>
          </div>
        ) : null}
      </div>
    </section>
  );
}
