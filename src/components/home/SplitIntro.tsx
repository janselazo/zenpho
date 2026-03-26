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
    label: "Services",
    badgeClass: "bg-accent text-white",
    title: "Custom Software Development",
    titleAccent: "",
    body: "We design and build web apps, mobile apps, and e-commerce platforms tailored to your business — fast, scalable, and ready to grow with you.",
    href: "/services",
    cta: "Explore services",
    initial: "C",
  },
  {
    label: "Launch",
    badgeClass: "bg-accent-violet text-white",
    title: "From Idea to Launch in 2 Weeks",
    titleAccent: "",
    body: "Whether you're a tech or non-tech founder, we turn your idea into a fully functional, ready-to-launch software product — on time and at an affordable price.",
    href: "/services",
    cta: "Explore services",
    initial: "L",
  },
  {
    label: "Studio",
    badgeClass: "bg-accent-warm text-white",
    title: "Where We Build Our Own Ideas",
    titleAccent: "",
    body: "Our AI Product Studio is our internal lab where we design, build, and launch our own software products turning our ideas into real tools that solve real problems.",
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
            viewport={{ once: true, amount: 0.05, margin: "0px 0px 160px 0px" }}
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
    </section>
  );
}
