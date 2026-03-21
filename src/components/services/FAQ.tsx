"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import SectionHeading from "@/components/ui/SectionHeading";

const faqs = [
  {
    q: "How quickly can we get started?",
    a: "The $50 strategy hour can usually be booked within days. MVP and Scale engagements typically start within one to two weeks once scope and paperwork are aligned.",
  },
  {
    q: "Do you only advise, or do you build and deploy?",
    a: "I scope, build, integrate, and deploy end to end—with documentation and handoff so your team can run what we ship. Strategy and architecture are part of discovery before any build.",
  },
  {
    q: "Can we change the level of engagement over time?",
    a: "Yes. Common path: $50 consult → $1,999 MVP to validate → $3,999/mo Scale for ongoing shipping. You can pause or cancel Scale anytime. Hourly ($100–150) works for ad-hoc work outside packages.",
  },
  {
    q: "What does $100–150/h cover?",
    a: "Time-and-materials when Consultation, MVP, or Scale isn’t the right fit — implementation, integration, reviews, and iteration billed as we go.",
  },
  {
    q: "What technologies do you use?",
    a: "TypeScript, React/Next.js, Node/Python, PostgreSQL, and major clouds (AWS, GCP, Vercel). On the AI side: OpenAI, Anthropic, LangChain/LlamaIndex-style patterns, and open-weight models when they’re the right tradeoff.",
  },
  {
    q: "Do you work with non-technical stakeholders?",
    a: "Often. I translate goals into milestones, risks, and options so product and ops leaders can make decisions without drowning in stack details.",
  },
];

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section className="mx-auto max-w-7xl px-6 py-24 lg:px-8">
      <SectionHeading
        label="FAQ"
        title="Common"
        titleAccent="questions"
        description="How the $50 consult, $1,999 MVP, $3,999/mo Scale subscription, and hourly work fit together."
      />

      <div className="mx-auto max-w-3xl space-y-3">
        {faqs.map((faq, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.35, delay: i * 0.04 }}
            className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm"
          >
            <button
              onClick={() => setOpenIndex(openIndex === i ? null : i)}
              className="flex w-full items-center justify-between px-5 py-4 text-left"
            >
              <span className="text-sm font-medium text-text-primary">{faq.q}</span>
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
