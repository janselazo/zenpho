"use client";

import { motion } from "framer-motion";
import Button from "@/components/ui/Button";
import { SECTION_EYEBROW_COMPACT_CLASSNAME } from "@/components/ui/SectionHeading";

const fadeUp = {
  hidden: { opacity: 1, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: i * 0.12 },
  }),
};

const cards = [
  {
    label: "MVP Development",
    badgeClass: "bg-accent text-white",
    title: "Ship fast. Learn from real usage",
    titleAccent: "",
    body: "Scoped AI-assisted MVPs for web, SaaS, PWAs, internal tools, marketplace slices, prototypes — landing pages included when they support onboarding or launch.",
    href: "/services/mvp-development",
    cta: "Explore MVP Development",
    initial: "D",
  },
  {
    label: "MVP Growth",
    badgeClass: "bg-accent-violet text-white",
    title: "Traction loops after launch",
    titleAccent: "",
    body: "Acquisition, onboarding, experimentation, instrumentation — disciplined growth layered on once your MVP clears the bar.",
    href: "/services/mvp-growth",
    cta: "Explore MVP Growth",
    initial: "G",
  },
  {
    label: "Studio",
    badgeClass: "bg-accent-warm text-white",
    title: "We ship our own products",
    titleAccent: "Same standards",
    body: "Products we operate on our own roadmap — the same accountability we promise on founder engagements.",
    href: "/studio",
    cta: "Open Studio",
    initial: "S",
  },
] as const;

/** Service offering cards (MVP Development, Growth, Studio) — reusable inside a parent section. */
export function SplitIntroCards({ className = "" }: { className?: string }) {
  return (
    <div className={`mx-auto max-w-7xl px-6 lg:px-8 ${className}`}>
      <div className="grid gap-6 md:grid-cols-3">
        {cards.map((card, i) => (
          <motion.div
            key={card.label}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.05, margin: "0px 0px 160px 0px" }}
            custom={i}
            variants={fadeUp}
            className="relative overflow-hidden rounded-3xl border border-border bg-white p-8 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:border-accent/25 hover:shadow-soft-lg lg:p-10"
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
                {card.titleAccent ? (
                  <span className="mt-0.5 block text-accent">
                    {card.titleAccent}
                  </span>
                ) : null}
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
    </div>
  );
}
