"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";

const ROTATING = ["Leads", "Booked Jobs", "Reviews", "Referrals"] as const;
const INTERVAL_MS = 2800;

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
      <span className="flex flex-col items-center leading-[1.05] sm:leading-[1.08]">
        <span className="flex flex-wrap items-baseline justify-center gap-x-3 text-pretty">
          <span className="text-text-primary">More</span>
          <span className="relative inline-block min-h-[2.6rem] min-w-[10.5rem] align-top sm:min-h-[3.1rem] sm:min-w-[12.5rem] lg:min-h-[3.6rem] lg:min-w-[13.5rem]">
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={ROTATING[index]}
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -18 }}
                transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
                className="absolute left-1/2 top-1/2 inline-block -translate-x-1/2 -translate-y-1/2 whitespace-nowrap font-bold text-text-primary"
              >
                {ROTATING[index]}
              </motion.span>
            </AnimatePresence>
          </span>
        </span>
        <span className="mt-2 block text-accent sm:mt-2.5">Clear ROI.</span>
      </span>
    </h2>
  );
}
