"use client";

import { motion } from "framer-motion";
import { techStack } from "@/lib/data";
import SectionHeading from "@/components/ui/SectionHeading";

const chipClass = (i: number) =>
  i % 3 === 0
    ? "border-accent/20 hover:border-accent/40 hover:bg-accent/5 hover:text-accent"
    : i % 3 === 1
      ? "border-accent-violet/20 hover:border-accent-violet/40 hover:bg-accent-violet/5 hover:text-accent-violet"
      : "border-accent-warm/20 hover:border-accent-warm/40 hover:bg-accent-warm/5 hover:text-accent-warm";

export default function TechStrip() {
  return (
    <section className="relative mx-auto max-w-7xl px-6 py-24 lg:px-8">
      <SectionHeading
        label="Stack"
        title="Tools"
        titleAccent="& platforms"
        titleAccentInline
        description="Every stack decision is driven by your product goals."
      />

      <div className="w-full overflow-x-auto overflow-y-hidden scroll-smooth pb-1 [-webkit-overflow-scrolling:touch]">
        <motion.div
          initial={{ opacity: 1 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, amount: 0.05, margin: "0px 0px 120px 0px" }}
          transition={{ duration: 0.5 }}
          className="mx-auto flex w-max max-w-none flex-nowrap items-center justify-center gap-2 px-1"
        >
          {techStack.map((tech, i) => (
            <motion.div
              key={tech.name}
              initial={{ opacity: 1, scale: 0.96 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, amount: 0.05, margin: "0px 0px 120px 0px" }}
              transition={{ duration: 0.25, delay: i * 0.02 }}
              className={`shrink-0 whitespace-nowrap rounded-full border border-border bg-white px-4 py-2 text-sm font-medium text-text-secondary shadow-soft transition-all duration-200 ${chipClass(i)}`}
            >
              {tech.name}
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
