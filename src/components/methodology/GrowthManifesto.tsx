"use client";

import { motion } from "framer-motion";

export default function GrowthManifesto() {
  return (
    <section className="mx-auto max-w-7xl px-6 py-32 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <motion.div
          initial={{ opacity: 1, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6 }}
        >
          <span className="mb-4 inline-block font-mono text-sm uppercase tracking-widest text-accent">
            My Belief
          </span>
          <h2 className="text-3xl font-bold tracking-tight text-text-primary sm:text-4xl">
            Software should be built for the company you&apos;re becoming, not
            just the company you are today.
          </h2>
        </motion.div>

        <motion.div
          initial={{ opacity: 1, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="mt-10 space-y-6 text-text-secondary"
        >
          <p className="text-lg leading-relaxed">
            Too many startups build software that works today but crumbles under
            the weight of success. Too many enterprises build systems so rigid
            that adapting to change becomes a multi-year project. I believe
            there&apos;s a better way.
          </p>
          <p className="text-lg leading-relaxed">
            My approach is rooted in years of building products that have scaled
            from zero to millions of users. I&apos;ve seen what breaks, what holds,
            and what separates systems that enable growth from systems that
            bottleneck it.
          </p>
          <p className="text-lg leading-relaxed">
            The growth mindset isn&apos;t a buzzword for me — it&apos;s an engineering
            philosophy. It means choosing architectures that bend rather than
            break. It means instrumenting everything so you can make decisions
            based on evidence, not gut feeling. It means building teams and
            processes that improve with every sprint.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
