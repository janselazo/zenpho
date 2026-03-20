"use client";

import { motion } from "framer-motion";
import Button from "@/components/ui/Button";
import { SECTION_EYEBROW_COMPACT_CLASSNAME } from "@/components/ui/SectionHeading";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: i * 0.12 },
  }),
};

const cards = [
  {
    label: "Services",
    badgeClass: "bg-accent text-white",
    title: "Custom AI software",
    titleAccent: "for your stack.",
    body: "Web apps, mobile, stores, and AI solutions—LLMs, agents, RAG, and integrations scoped for production, not demos.",
    href: "/services",
    cta: "Explore services",
    initial: "S",
  },
  {
    label: "Case studies",
    badgeClass: "bg-accent-violet text-white",
    title: "Proof from",
    titleAccent: "shipped work.",
    body: "Client builds and studio products across agents, apps, and platforms—outcomes we measured together.",
    href: "/case-studies",
    cta: "Browse case studies",
    initial: "C",
  },
  {
    label: "Studio",
    badgeClass: "bg-accent-warm text-white",
    title: "Personal projects",
    titleAccent: "I ship.",
    body: "SoldTools—my live studio product for car sales teams—built on my own time, separate from client engagements.",
    href: "/studio",
    cta: "Open Studio",
    initial: "T",
  },
] as const;

export default function SplitIntro() {
  return (
    <section className="relative mx-auto max-w-7xl px-6 py-24 lg:px-8">
      <div className="grid gap-6 md:grid-cols-3">
        {cards.map((card, i) => (
          <motion.div
            key={card.label}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.25 }}
            custom={i}
            variants={fadeUp}
            className="relative overflow-hidden rounded-3xl border border-border bg-white p-8 shadow-soft lg:p-10"
          >
            <div className="relative z-10">
              <div
                className={`mb-5 flex h-11 w-11 items-center justify-center rounded-full text-sm font-bold shadow-sm ${card.badgeClass}`}
              >
                {card.initial}
              </div>
              <span className={`${SECTION_EYEBROW_COMPACT_CLASSNAME} mb-3`}>
                {card.label}
              </span>
              <h3 className="heading-display mt-1 text-xl font-bold leading-snug text-text-primary lg:text-2xl">
                <span className="block">{card.title}</span>
                <span className="mt-0.5 block text-accent">
                  {card.titleAccent}
                </span>
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-text-secondary">
                {card.body}
              </p>
              <div className="mt-8">
                <Button href={card.href} variant="ghost" size="sm">
                  {card.cta} →
                </Button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
