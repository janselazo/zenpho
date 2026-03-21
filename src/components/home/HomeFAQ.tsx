"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import SectionHeading from "@/components/ui/SectionHeading";

const faqs = [
  {
    q: "What do you actually build?",
    a: "AI applications (copilots, chat/search, predictive analytics), modern web apps, offline-first mobile, automation and agents, content generation pipelines, and APIs/integrations (auth, payments, analytics, third parties).",
  },
  {
    q: "Client work vs. Labs — what’s the difference?",
    a: "Client work is your roadmap: we scope, build, and hand off what you own. Labs is where I ship in-house products (e.g. SoldTools) on our own timeline, separate from your engagement.",
  },
  {
    q: "Do you only work with startups?",
    a: "Most clients are startups or small product teams, but I’ve also worked with larger organizations that need focused execution on a specific product or feature.",
  },
  {
    q: "How do projects usually start?",
    a: "A short conversation about your product, users, and timeline. Then a phased plan — often starting small to validate the approach before committing to a larger build.",
  },
  {
    q: "Can you work with our existing stack?",
    a: "Yes. I’ve integrated with CRMs, payment processors, third-party APIs, and legacy systems. I’ll work with what you have rather than push a rewrite.",
  },
  {
    q: "Where can I see pricing?",
    a: "$50 strategy hour, $1,999 Product MVP (one-time), and $3,999/mo Scale (10 hrs/week, pause or cancel anytime). See the Pricing page for what’s included. Hourly $100–150 outside packages.",
  },
  {
    q: "Where are you based?",
    a: "Miami, FL. I work remotely and have collaborated with teams across the U.S. and Latin America. Bilingual — English and Spanish.",
  },
];

export default function HomeFAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section className="mx-auto max-w-7xl px-6 py-24 lg:px-8">
      <SectionHeading
        label="FAQ"
        title="Common"
        titleAccent="questions"
        titleAccentInline
        description="Straight answers about how I work with teams building software products."
      />

      <div className="mx-auto max-w-3xl space-y-3">
        {faqs.map((faq, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.35, delay: i * 0.04 }}
            className="overflow-hidden rounded-3xl border border-border bg-white shadow-soft"
          >
            <button
              onClick={() => setOpenIndex(openIndex === i ? null : i)}
              className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
            >
              <span className="text-sm font-medium text-text-primary">
                {faq.q}
              </span>
              <svg
                className={`h-5 w-5 flex-shrink-0 text-text-secondary transition-transform duration-200 ${
                  openIndex === i ? "rotate-180" : ""
                }`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m19.5 8.25-7.5 7.5-7.5-7.5"
                />
              </svg>
            </button>
            <AnimatePresence>
              {openIndex === i && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <p className="px-5 pb-4 text-sm leading-relaxed text-text-secondary">
                    {faq.a}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
