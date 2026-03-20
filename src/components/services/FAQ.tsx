"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import SectionHeading from "@/components/ui/SectionHeading";

const faqs = [
  {
    q: "How quickly can we get started?",
    a: "Advisory calls are usually available within a few days. Retainers and build work typically begin within one to two weeks after scope and paperwork are aligned.",
  },
  {
    q: "Do you only advise, or do you build?",
    a: "Both. Retainers on this page are advisory-first. For implementation—agents, apps, integrations—I scope fixed phases or sprint-based delivery and ship alongside your team.",
  },
  {
    q: "Can we change the level of engagement over time?",
    a: "Yes. Many teams start with a call or short PoC, move into a build phase, then shift to a lighter advisory rhythm after launch.",
  },
  {
    q: "What technologies do you use?",
    a: "TypeScript, React/Next.js, Node/Python, PostgreSQL, and major clouds (AWS, GCP, Vercel). On the AI side: OpenAI, Anthropic, LangChain/LlamaIndex patterns, and open-weight models when they’re the right tradeoff.",
  },
  {
    q: "Do you work with non-technical stakeholders?",
    a: "Often. I translate goals into milestones, risks, and options so product and ops leaders can make decisions without drowning in stack details.",
  },
  {
    q: "What does an advisory call include?",
    a: "A 90-minute working session on the topic you choose—architecture, AI approach, roadmap, or growth—plus a written summary and concrete next steps. No generic pitch deck.",
  },
];

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section className="mx-auto max-w-7xl px-6 py-24 lg:px-8">
      <SectionHeading
        label="FAQ"
        title="Common questions"
        description="How advisory, builds, and timelines usually fit together."
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
