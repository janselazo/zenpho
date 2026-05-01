"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";

const ROTATING = ["Leads", "Booked Jobs", "Reviews", "Referrals"] as const;
const INTERVAL_MS = 2800;

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
    <h2 className="heading-display text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
      <span className="flex flex-wrap items-baseline justify-center gap-x-1.5 text-pretty leading-[1.12] sm:gap-x-2 sm:leading-[1.15]">
        <span className="shrink-0 text-text-primary">More</span>
        <span className="relative inline-block min-h-[1.15em] min-w-[8.75rem] align-baseline sm:min-w-[10rem] lg:min-w-[11rem]">
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={ROTATING[index]}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -14 }}
              transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
              className={`absolute left-0 top-1/2 inline-block -translate-y-1/2 whitespace-nowrap ${metallicWordClass}`}
            >
              {ROTATING[index]}
            </motion.span>
          </AnimatePresence>
        </span>
        <span className="shrink-0 text-accent">Clear ROI.</span>
      </span>
    </h2>
  );
}
