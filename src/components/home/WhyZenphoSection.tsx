"use client";

import { motion } from "framer-motion";
import SectionHeading from "@/components/ui/SectionHeading";
import Card from "@/components/ui/Card";

const differentiators = [
  {
    title: "Product thinking before code",
    body: "We help you avoid bloated MVPs by focusing on the features that validate the core idea.",
  },
  {
    title: "AI-assisted speed",
    body: "We use modern AI development workflows to move faster without losing product clarity.",
  },
  {
    title: "Launch included",
    body: "Every MVP should be ready for users, not just ready for a demo.",
  },
  {
    title: "Founder-focused process",
    body: "We work with early-stage founders who need clarity, speed, and execution.",
  },
  {
    title: "Growth-ready foundation",
    body: "We include analytics, landing pages, and feedback systems so you can learn after launch.",
  },
] as const;

export default function WhyZenphoSection() {
  return (
    <section className="relative py-24 lg:py-28">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <SectionHeading
          align="center"
          title="More than development."
          titleAccent="Built for launch."
          description={
            <p>
              Most development teams only build what you ask for. Zenpho helps
              you decide what should be built, how it should work, how it should
              launch, and how you should measure success.
            </p>
          }
        />

        <p className="mx-auto -mt-2 mb-10 max-w-2xl text-center text-xs font-semibold uppercase tracking-widest text-text-secondary sm:mb-12">
          Differentiators
        </p>

        <div className="mx-auto grid max-w-6xl gap-5 sm:grid-cols-2 lg:gap-6">
          {differentiators.map((item, i) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 1, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.1 }}
              transition={{ duration: 0.4, delay: i * 0.05 }}
            >
              <Card className="h-full border-border/80 bg-white p-7 shadow-soft sm:p-8">
                <h3 className="heading-display text-lg font-bold leading-snug text-text-primary">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-text-secondary">
                  {item.body}
                </p>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
