"use client";

import { motion } from "framer-motion";
import { ventures } from "@/lib/data";
import SectionHeading from "@/components/ui/SectionHeading";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";

export default function VenturesGrid() {
  return (
    <section id="studio-projects" className="mx-auto max-w-7xl px-6 py-24 lg:px-8 lg:py-32">
      <SectionHeading
        label="Studio"
        title="Personal projects"
        titleAccent="& products"
        description="SoldTools is my live studio product—built for car sales teams, owned end to end, and separate from client work with the same bar for craft."
      />

      <div className="grid gap-6 sm:grid-cols-2">
        {ventures.map((venture, i) => (
          <motion.div
            key={venture.name}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.5, delay: i * 0.08 }}
          >
            <Card className="flex h-full flex-col">
              <div className="mb-3 flex items-center justify-between gap-2">
                <span className="font-mono text-xs uppercase tracking-widest text-text-secondary">
                  {venture.category}
                </span>
                <Badge status={venture.status} />
              </div>
              <h3 className="text-xl font-bold text-text-primary">
                {venture.name}
              </h3>
              <p className="mt-1 text-sm italic text-accent-violet/70">
                {venture.tagline}
              </p>
              <p className="mt-3 flex-1 text-sm leading-relaxed text-text-secondary">
                {venture.description}
              </p>
              {venture.metrics && (
                <div className="mt-4 rounded-lg bg-surface-light px-4 py-2">
                  <span className="text-xs font-medium text-text-primary">
                    {venture.metrics}
                  </span>
                </div>
              )}
              {venture.ctaHref && venture.ctaLabel ? (
                <div className="mt-5">
                  <Button
                    href={venture.ctaHref}
                    variant="primary"
                    size="md"
                    target={venture.ctaExternal ? "_blank" : undefined}
                    rel={
                      venture.ctaExternal ? "noopener noreferrer" : undefined
                    }
                  >
                    {venture.ctaLabel}
                  </Button>
                </div>
              ) : null}
            </Card>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
