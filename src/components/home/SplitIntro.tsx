"use client";

import { motion } from "framer-motion";
import Button from "@/components/ui/Button";

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
    label: "Agency",
    badgeClass: "bg-accent text-white",
    title: "Build with you, for your users.",
    body: "End-to-end AI product work: discovery, UX, APIs, models, and launch. Ideal when you need a senior engineer who owns outcomes—not tickets.",
    href: "/agency",
    cta: "Capabilities",
    initial: "A",
  },
  {
    label: "Studio",
    badgeClass: "bg-accent-violet text-white",
    title: "Products I start from zero.",
    body: "Focused ventures where I pair market insight with AI-native execution—shipping, learning in production, and iterating with real usage.",
    href: "/studio",
    cta: "Ventures",
    initial: "S",
  },
  {
    label: "Writing",
    badgeClass: "bg-accent-warm text-white",
    title: "Notes for builders and buyers.",
    body: "Essays on agents, evaluation, product craft, and what it takes to ship AI software that organizations trust.",
    href: "/blog",
    cta: "Read the blog",
    initial: "W",
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
              <span className="text-xs font-semibold uppercase tracking-widest text-text-secondary">
                {card.label}
              </span>
              <h3 className="heading-display mt-2 text-xl font-bold leading-snug text-text-primary lg:text-2xl">
                {card.title}
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
