"use client";

import { motion } from "framer-motion";

const principles = [
  {
    title: "AI-Native Thinking",
    description:
      "Every product starts with the question: how can AI fundamentally improve this experience? I don't bolt AI onto existing patterns — I rethink the entire workflow.",
  },
  {
    title: "Build in Public",
    description:
      "I share my journey — the wins, the pivots, and the learnings. Transparency builds trust with early adopters and keeps me accountable.",
  },
  {
    title: "Speed & Iteration",
    description:
      "Ship the smallest meaningful thing, gather real feedback, and compound improvements over time. I'd rather launch in 6 weeks than plan for 6 months.",
  },
  {
    title: "Founder-Led Teams",
    description:
      "Each venture is led by a small team with deep domain expertise and full ownership. No committees, no bureaucracy — just builders making decisions.",
  },
];

export default function Philosophy() {
  return (
    <section className="mx-auto max-w-7xl px-6 py-32 lg:px-8">
      <div className="grid gap-16 lg:grid-cols-2 lg:items-center">
        <motion.div
          initial={{ opacity: 1, x: -30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6 }}
        >
          <span className="mb-4 inline-block font-mono text-sm uppercase tracking-widest text-accent-violet">
            Philosophy
          </span>
          <h2 className="text-3xl font-bold tracking-tight text-text-primary sm:text-4xl">
            How I identify
            <br />& build products
          </h2>
          <p className="mt-4 leading-relaxed text-text-secondary">
            I look for problems where AI can deliver a 10x improvement in
            markets that are ripe for disruption. Once I validate the thesis,
            I assemble a focused team and move fast — treating each venture as
            a real startup with studio-level resources, mentorship, and shared
            infrastructure.
          </p>
          <p className="mt-4 leading-relaxed text-text-secondary">
            My agency work gives me a unique advantage: I see patterns across
            dozens of industries and identify gaps that others miss. The best
            studio ideas often come from problems I encounter building for
            clients.
          </p>
        </motion.div>

        <div className="flex flex-col gap-6">
          {principles.map((p, i) => (
            <motion.div
              key={p.title}
              initial={{ opacity: 1, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="rounded-xl border border-border bg-surface p-6"
            >
              <h3 className="font-semibold text-text-primary">{p.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-text-secondary">
                {p.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
