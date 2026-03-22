"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import SectionHeading from "@/components/ui/SectionHeading";

const faqs = [
  {
    q: "What do you build?",
    a: "Web apps, mobile apps, websites, and ecommerce stores. We also handle growth services — product-led growth strategy, retention, acquisition, monetization, and growth experiments.",
  },
  {
    q: "How fast can I get a first version?",
    a: "Your first working version ships in 2 weeks. We run focused weekly sprints so you see real progress every single week, not a big reveal months later.",
  },
  {
    q: "Do I need to be technical?",
    a: "Not at all. We work with both non-tech and tech founders. You bring the vision — we handle the architecture, design, and execution.",
  },
  {
    q: "How do projects usually start?",
    a: "A short conversation about your idea, users, and goals. From there we move into Discover → Design → Build → Grow — starting lean and scaling what works.",
  },
  {
    q: "What's the difference between Development, Growth, and Studio?",
    a: "Development is building your product. Growth is making it succeed — acquisition, retention, monetization, and experiments. Studio is where we build our own products with the same mindset we bring to yours.",
  },
  {
    q: "Can you work with our existing stack?",
    a: "Yes. We've integrated with CRMs, payment processors, third-party APIs, and legacy systems. We work with what you have rather than push a rewrite.",
  },
  {
    q: "Where can I see pricing?",
    a: "We publish Development and Growth tracks separately: each has a $150 strategy hour, a $1,999 one-time sprint (Product MVP or Growth sprint), and $3,999/mo Scale (pause anytime). See the Pricing page for full details.",
  },
  {
    q: "Where are you based?",
    a: "Miami, FL. We work remotely with teams across the U.S. and Latin America. Bilingual — English and Spanish.",
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
        description="No surprises — just clear answers about how we work."
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
