"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";

const ROTATING = ["Leads", "Jobs", "Clients", "Reviews", "Referrals"] as const;
const INTERVAL_MS = 2800;

const longestRotating = ROTATING.reduce((a, b) => (a.length >= b.length ? a : b));

const metallicWordClass =
  "bg-gradient-to-b from-zinc-500 via-zinc-600 to-zinc-800 bg-clip-text font-bold text-transparent dark:from-zinc-300 dark:via-zinc-400 dark:to-zinc-200";

export default function MoreRotatingHeadline() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const t = window.setInterval(
      () => setIndex((i) => (i + 1) % ROTATING.length),
      INTERVAL_MS,
    );
    return () => window.clearInterval(t);
  }, []);

  return (
    <h2 className="heading-display text-center text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
      <span className="inline-flex flex-wrap items-baseline justify-center gap-x-1.5 text-pretty leading-[1.12] sm:gap-x-2 sm:leading-[1.15]">
        <span className="shrink-0 text-text-primary">More</span>
        <span className="relative inline-block min-h-[1.15em] align-baseline">
          <span className="invisible whitespace-nowrap" aria-hidden>
            {longestRotating}
          </span>
          <span className="absolute inset-0 flex items-center justify-center overflow-hidden">
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={ROTATING[index]}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -14 }}
                transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
                className={`whitespace-nowrap ${metallicWordClass}`}
              >
                {ROTATING[index]}
              </motion.span>
            </AnimatePresence>
          </span>
        </span>
        <span className="shrink-0 text-accent">Clear ROI</span>
      </span>
    </h2>
  );
}
