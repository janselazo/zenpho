"use client";

import { motion } from "framer-motion";
import SectionHeading from "@/components/ui/SectionHeading";
import Card from "@/components/ui/Card";

const cards = [
  {
    title: "AI SaaS Products",
    body: "AI-powered tools, dashboards, assistants, automations, and workflow products.",
  },
  {
    title: "Web Apps",
    body: "SaaS platforms, client portals, internal tools, marketplaces, admin dashboards, and data products.",
  },
  {
    title: "Mobile-First Apps",
    body: "Mobile-first web apps, PWAs, and selected cross-platform MVPs when the scope fits the sprint.",
  },
  {
    title: "Launch Websites",
    body: "Landing pages, waitlists, demo booking pages, and product launch websites designed to convert.",
  },
  {
    title: "Internal Tools",
    body: "AI automations, dashboards, reporting tools, CRM-lite systems, and operational software.",
  },
  {
    title: "Marketplace MVPs",
    body: "Focused marketplace MVPs with listings, profiles, search, inquiry flows, and admin tools.",
  },
] as const;

export default function ServicesWhatWeBuild() {
  return (
    <section className="border-t border-border/60 bg-surface/60 py-24 lg:py-28">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <SectionHeading
          title="MVPs for modern founders"
          align="center"
          description="We build focused MVPs for founders creating technology products across SaaS, AI, automation, marketplaces, and mobile-first experiences."
        />

        <div className="mx-auto mt-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((card, i) => (
            <motion.div
              key={card.title}
              initial={{ opacity: 1, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.1 }}
              transition={{ duration: 0.4, delay: i * 0.06 }}
            >
              <Card className="h-full border-border/80 bg-white p-6 shadow-soft sm:p-7">
                <h3 className="heading-display text-lg font-bold text-text-primary">
                  {card.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-text-secondary">
                  {card.body}
                </p>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
