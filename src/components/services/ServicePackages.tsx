"use client";

import { motion } from "framer-motion";
import { servicePackages } from "@/lib/data";
import SectionHeading from "@/components/ui/SectionHeading";
import Card from "@/components/ui/Card";

const iconMap: Record<string, React.ReactNode> = {
  brain: (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 0 1-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 0 1 4.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0 1 12 15a9.065 9.065 0 0 0-6.23.693L5 14.5m14.8.8 1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0 1 12 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
    </svg>
  ),
  rocket: (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 0 1-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 0 0 6.16-12.12A14.98 14.98 0 0 0 9.631 8.41m5.96 5.96a14.926 14.926 0 0 1-5.841 2.58m-.119-8.54a6 6 0 0 0-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 0 0-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 0 1-2.448-2.448 14.9 14.9 0 0 1 .06-.312m-2.24 2.39a4.493 4.493 0 0 0-1.757 4.306 4.493 4.493 0 0 0 4.306-1.758M16.5 9a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Z" />
    </svg>
  ),
  zap: (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z" />
    </svg>
  ),
};

const iconAccent = (i: number) =>
  i % 3 === 0
    ? "bg-accent text-white shadow-sm"
    : i % 3 === 1
      ? "bg-accent-violet text-white shadow-sm"
      : "bg-accent-warm text-white shadow-sm";

const checkAccent = (i: number) =>
  i % 3 === 0 ? "text-accent" : i % 3 === 1 ? "text-accent-violet" : "text-accent-warm";

export default function ServicePackages() {
  return (
    <section className="border-t border-border bg-surface">
      <div className="mx-auto max-w-7xl px-6 py-32 lg:px-8">
        <SectionHeading
          label="How it runs"
          title="From idea"
          titleAccent="to production"
          titleAccentInline
          description="Typical phases inside SaaS, app, and AI builds—from discovery through launch and optional maintenance."
        />

        <div className="grid gap-8 lg:grid-cols-3">
          {servicePackages.map((pkg, i) => (
            <motion.div
              key={pkg.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
            >
              <Card className="flex h-full flex-col">
                <div
                  className={`mb-4 flex h-11 w-11 items-center justify-center rounded-full ${iconAccent(i)}`}
                >
                  {iconMap[pkg.icon]}
                </div>
                <h3 className="text-lg font-semibold text-text-primary">
                  {pkg.title}
                </h3>
                <p className="mt-2 text-sm text-text-secondary">
                  {pkg.description}
                </p>

                <div className="mt-4 rounded-lg bg-surface-light px-4 py-2">
                  <span className="text-xs font-medium text-text-primary">
                    Timeline: {pkg.timeline}
                  </span>
                </div>

                <ul className="mt-6 flex-1 space-y-3">
                  {pkg.deliverables.map((d) => (
                    <li
                      key={d}
                      className="flex items-start gap-3 text-sm text-text-secondary"
                    >
                      <svg
                        className={`mt-0.5 h-4 w-4 flex-shrink-0 ${checkAccent(i)}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="m4.5 12.75 6 6 9-13.5"
                        />
                      </svg>
                      {d}
                    </li>
                  ))}
                </ul>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
