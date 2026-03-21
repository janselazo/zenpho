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
    label: "What we build",
    badgeClass: "bg-accent text-white",
    title: "AI, web, mobile,",
    titleAccent: "automation & APIs.",
    body: "Copilots and search, modern web apps, offline-first mobile, workflows and agents, content pipelines, and stack integrations.",
    href: "/services",
    cta: "Explore services",
    initial: "W",
  },
  {
    label: "Proof",
    badgeClass: "bg-accent-violet text-white",
    title: "Client work",
    titleAccent: "in production.",
    body: "SaaS, ecommerce, and dashboards shipped for real teams — outcomes you can verify.",
    href: "/case-studies",
    cta: "Browse case studies",
    initial: "C",
  },
  {
    label: "Studio",
    badgeClass: "bg-accent-warm text-white",
    title: "Our own",
    titleAccent: "products.",
    body: "SoldTools and other in-house experiments — shipped in Studio alongside client delivery, separate from your roadmap.",
    href: "/studio",
    cta: "Open Studio",
    initial: "S",
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
