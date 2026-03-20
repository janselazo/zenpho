"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import SectionHeading from "@/components/ui/SectionHeading";

const faqs = [
  {
    q: "What do you actually build?",
    a: "Custom AI software: agents and copilots, customer and internal chatbots, RAG and LLM integrations, workflow automation, and the web or mobile apps that wrap them. I also advise when you need ongoing technical direction without a full build.",
  },
  {
    q: "Agency vs. studio—what’s the difference?",
    a: "Agency work is for your roadmap: we scope, build, and hand off systems you own. Studio is where I originate and ship my own AI products, often informed by patterns I see across client work.",
  },
  {
    q: "Do you only work with startups?",
    a: "Most partners are funded startups or product-led teams, but engagements also include larger orgs that need a focused AI feature or internal tool delivered with startup speed.",
  },
  {
    q: "How do projects usually start?",
    a: "With a short discovery: users, constraints (security, compliance, latency, cost), and what “good” looks like. Then a phased plan—often a time-boxed PoC before a production roadmap.",
  },
  {
    q: "Can you work with our existing stack?",
    a: "Yes. Integrations are a core part of the work—CRMs, data warehouses, identity, ticketing, and legacy APIs. Architecture is vendor-aware so you are not locked to one model provider.",
  },
  {
    q: "Where can I see pricing?",
    a: "See the Pricing page for consultancy, PoC, production, and enterprise-style programs, plus $100–150/h time-and-materials. Exact quotes depend on scope—send a short brief and I’ll suggest a sensible next step.",
  },
  {
    q: "Where are you based?",
    a: "Remote-first, with hours aligned to US and European teams. I’ve collaborated across Silicon Valley, Europe, and Latin America.",
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
        description="Straight answers about how I work with teams shipping AI into real products."
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
