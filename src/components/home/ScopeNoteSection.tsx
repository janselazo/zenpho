"use client";

import { motion } from "framer-motion";
import SectionHeading from "@/components/ui/SectionHeading";
import Card from "@/components/ui/Card";

const bullets = [
  "1 core user type",
  "1 core workflow",
  "5–8 main screens",
  "Basic authentication",
  "Database setup",
  "1–2 AI/API integrations",
  "Admin dashboard",
  "Launch landing page",
  "Analytics",
  "Deployment",
] as const;

export default function ScopeNoteSection() {
  return (
    <section className="border-t border-border/60 bg-white py-24 lg:py-28">
      <div className="mx-auto max-w-3xl px-6 lg:px-8">
        <SectionHeading
          align="center"
          title="Fast does not mean"
          titleAccent="unfocused."
          description={
            <p>
              Our 2-week MVP sprint is designed for focused products with one
              core workflow. It is ideal for validating the first version of your
              idea, not building a fully scaled enterprise platform.
            </p>
          }
        />

        <motion.div
          initial={{ opacity: 1, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.12 }}
          transition={{ duration: 0.45 }}
        >
          <Card className="border-border/80 bg-surface/60 p-8 shadow-soft sm:p-10">
            <p className="text-sm font-semibold uppercase tracking-wider text-text-primary">
              A typical 2-week MVP includes:
            </p>
            <ul className="mt-4 grid gap-2.5 sm:grid-cols-2 sm:gap-x-8">
              {bullets.map((line) => (
                <li
                  key={line}
                  className="flex gap-3 text-sm leading-relaxed text-text-secondary"
                >
                  <span
                    className="mt-2 h-1 w-1 shrink-0 rounded-full bg-accent-violet"
                    aria-hidden
                  />
                  {line}
                </li>
              ))}
            </ul>
          </Card>
        </motion.div>
      </div>
    </section>
  );
}
