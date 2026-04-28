"use client";

import { motion } from "framer-motion";
import Card from "@/components/ui/Card";

const stuckPoints = [
  "They do not know what features belong in version one",
  "They do not have a technical team",
  "Their idea is clear, but the product roadmap is not",
  "They need a working demo for users, investors, or partners",
  "They want to use AI but are unsure how to integrate it",
  "They need more than development — they need help launching",
] as const;

/** Where founders stall before a focused MVP—and how Zenpho closes the gap. */
export default function FoundersStuckSection() {
  return (
    <section
      id="founders-get-stuck"
      aria-labelledby="founders-stuck-heading"
      className="relative w-full border-t border-border/50 bg-background py-24 lg:py-28"
    >
      <div className="mx-auto max-w-3xl px-6 lg:px-8">
        <p
          id="founders-stuck-heading"
          className="text-center text-base font-semibold leading-snug text-text-primary sm:text-lg"
        >
          Founders usually get stuck because:
        </p>

        <motion.div
          initial={{ opacity: 1, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.12 }}
          transition={{ duration: 0.5 }}
          className="mt-8"
        >
          <Card className="border-border/80 bg-white p-8 text-left shadow-soft sm:p-10">
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
          transition={{ duration: 0.45, delay: 0.06 }}
          className="mx-auto mt-10 max-w-2xl text-center text-base leading-relaxed text-text-secondary sm:text-lg"
        >
          At Zenpho, we help you move from idea to working product without
          spending months in development.
        </motion.p>
      </div>
    </section>
  );
}
