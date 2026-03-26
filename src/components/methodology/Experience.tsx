"use client";

import { motion } from "framer-motion";

const experiences = [
  {
    domain: "Startups & Scale-ups",
    description:
      "From pre-seed MVPs to Series B platforms, I've helped dozens of startups navigate the technical challenges of rapid growth.",
    examples: [
      "Built MVPs that secured $50M+ in combined funding",
      "Scaled systems from 0 to 1M+ users",
      "Technical due diligence for acquisition targets",
    ],
  },
  {
    domain: "Enterprise & SaaS",
    description:
      "I've modernized legacy systems, built internal tools, and integrated AI into workflows for companies across finance, legal, healthcare, and logistics.",
    examples: [
      "Reduced processing times by 60-80% with AI automation",
      "Migrated monoliths to microservices without downtime",
      "Built multi-tenant SaaS platforms from scratch",
    ],
  },
  {
    domain: "AI & Machine Learning",
    description:
      "From fine-tuning LLMs to deploying computer vision pipelines, I've shipped AI solutions that work in the real world — not just in a notebook.",
    examples: [
      "Production LLM applications serving millions of queries",
      "Custom ML models for industry-specific problems",
      "RAG systems, AI agents, and automation pipelines",
    ],
  },
];

export default function Experience() {
  return (
    <section className="mx-auto max-w-7xl px-6 py-32 lg:px-8">
      <motion.div
        initial={{ opacity: 1, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.6 }}
        className="mb-16"
      >
        <span className="mb-4 inline-block font-mono text-sm uppercase tracking-widest text-accent">
          Experience
        </span>
        <h2 className="max-w-2xl text-3xl font-bold tracking-tight text-text-primary sm:text-4xl">
          Battle-tested across industries, stages, and scales
        </h2>
        <p className="mt-4 max-w-2xl text-lg text-text-secondary">
          My methodology isn&apos;t theoretical — it&apos;s forged from years of
          building software that has to perform under real-world pressure.
        </p>
      </motion.div>

      <div className="grid gap-8 lg:grid-cols-3">
        {experiences.map((exp, i) => (
          <motion.div
            key={exp.domain}
            initial={{ opacity: 1, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.5, delay: i * 0.1 }}
            className="rounded-2xl border border-border bg-surface p-8"
          >
            <h3 className="text-lg font-bold text-text-primary">
              {exp.domain}
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-text-secondary">
              {exp.description}
            </p>
            <ul className="mt-6 space-y-3">
              {exp.examples.map((example) => (
                <li
                  key={example}
                  className="flex items-start gap-3 text-sm text-text-secondary"
                >
                  <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-accent-violet" />
                  {example}
                </li>
              ))}
            </ul>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
