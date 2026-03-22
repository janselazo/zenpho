"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import SectionHeading from "@/components/ui/SectionHeading";

const faqs = [
  {
    q: "What’s the difference between Development and Growth pricing?",
    a: "Same dollar structure, different outcomes. Development packages are for building and shipping product — web apps, mobile, websites, ecommerce. Growth packages are for acquisition, retention, monetization, and experiments. You can run one track, the other, or both (e.g. Growth sprint while engineering is in-house).",
  },
  {
    q: "How quickly can we get started?",
    a: "The $150 strategy hours can usually be booked within days. MVP, Growth sprint, and Scale engagements typically start within one to two weeks once scope and paperwork are aligned.",
  },
  {
    q: "Do you only advise on Growth, or do you build too?",
    a: "Growth work includes shipped experiments and close coordination with your stack; bigger product changes often pair with Development Scale. On Development, we scope, build, integrate, and deploy end to end — with documentation and handoff so your team can run what we ship.",
  },
  {
    q: "Can we change the level of engagement over time?",
    a: "Yes. Common paths: $150 Development or Growth strategy → $1,999 Product MVP or Growth sprint → $3,999/mo Development Scale or Growth Scale. Pause or cancel either Scale plan anytime. Hourly ($100–150) covers work outside packages.",
  },
  {
    q: "What does $100–150/h cover?",
    a: "Time-and-materials when a package isn’t the right fit — implementation, integrations, growth experiments, reviews, and iteration billed as we go.",
  },
  {
    q: "What technologies do you use?",
    a: "TypeScript, React/Next.js, Node/Python, PostgreSQL, and major clouds (AWS, GCP, Vercel). On the AI side: OpenAI, Anthropic, LangChain/LlamaIndex-style patterns, and open-weight models when they’re the right tradeoff.",
  },
  {
    q: "Do you work with non-technical stakeholders?",
    a: "Often. We translate goals into milestones, risks, and options so product and ops leaders can decide without drowning in stack details.",
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
        titleAccentInline
        description="How Development vs Growth packages map to the same transparent structure — and when hourly makes sense."
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
