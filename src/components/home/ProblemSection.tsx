"use client";

import { motion } from "framer-motion";
import SectionHeading from "@/components/ui/SectionHeading";
import Card from "@/components/ui/Card";

const stuckPoints = [
  "They do not know what features belong in version one",
  "They do not have a technical team",
  "Their idea is clear, but the product roadmap is not",
  "They need a working demo for users, investors, or partners",
  "They want to use AI but are unsure how to integrate it",
  "They need more than development — they need help launching",
] as const;

export default function ProblemSection() {
  return (
    <section className="relative w-full py-24 marketing-section-band lg:py-28">
      <div className="mx-auto max-w-3xl px-6 lg:px-8">
      <SectionHeading
        title="Most founders lose months"
        titleAccent="building too much too early."
        align="center"
        description={
          <>
            <p>
              You do not need a full product to validate demand. You need a
              focused MVP that proves the core idea, gets users in, and helps
              you learn fast.
            </p>
            <p className="!mt-4 font-medium text-text-primary/90">
              Founders usually get stuck because:
            </p>
          </>
        }
      />

      <motion.div
        initial={{ opacity: 1, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.12 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="border-border/80 bg-white p-8 shadow-soft sm:p-10">
          <ul className="space-y-3">
            {stuckPoints.map((item) => (
              <li
                key={item}
                className="flex gap-3 text-sm leading-relaxed text-text-secondary sm:text-base"
              >
                <span
                  className="mt-2 h-1 w-1 shrink-0 rounded-full bg-accent-violet"
                  aria-hidden
                />
                {item}
              </li>
            ))}
          </ul>
        </Card>
      </motion.div>

      <motion.p
        initial={{ opacity: 1, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.12 }}
        transition={{ duration: 0.45, delay: 0.08 }}
        className="mx-auto mt-10 max-w-2xl text-center text-base leading-relaxed text-text-secondary sm:text-lg"
      >
        At Zenpho, we help you move from idea to working product without
        spending months in development.
      </motion.p>
      </div>
    </section>
  );
}
