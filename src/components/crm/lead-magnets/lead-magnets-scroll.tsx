"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const pillScrollerInnerClass =
  "flex min-w-0 flex-1 gap-2 overflow-x-auto overscroll-x-contain pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden snap-x snap-mandatory scroll-px-1";

const arrowBtnClass =
  "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-white text-text-secondary shadow-sm transition-colors hover:border-accent/30 hover:bg-surface hover:text-text-primary disabled:pointer-events-none disabled:opacity-30 dark:border-zinc-700 dark:bg-zinc-900/40 dark:text-zinc-400 dark:hover:border-zinc-600 dark:hover:bg-zinc-800/80 dark:hover:text-zinc-200";

export function HorizontalPillScroller({
  children,
  depKey,
  labelLeft = "Scroll left",
  labelRight = "Scroll right",
}: {
  children: React.ReactNode;
  depKey?: string;
  labelLeft?: string;
  labelRight?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  const update = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanLeft(scrollLeft > 4);
    setCanRight(scrollLeft + clientWidth < scrollWidth - 4);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    update();
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", update);
      ro.disconnect();
    };
  }, [update, depKey]);

  const scrollByDir = (dir: -1 | 1) => {
    const el = ref.current;
    if (!el) return;
    const delta = Math.min(280, Math.max(160, el.clientWidth * 0.72));
    el.scrollBy({ left: dir * delta, behavior: "smooth" });
  };

  return (
    <div className="flex items-stretch gap-1.5 sm:gap-2">
      <button
        type="button"
        className={arrowBtnClass}
        aria-label={labelLeft}
        disabled={!canLeft}
        onClick={() => scrollByDir(-1)}
      >
        <ChevronLeft className="h-5 w-5" aria-hidden />
      </button>
      <div className="relative min-w-0 flex-1">
        {canLeft ? (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 left-0 z-10 w-8 bg-gradient-to-r from-white to-transparent dark:from-zinc-950"
          />
        ) : null}
        {canRight ? (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 right-0 z-10 w-8 bg-gradient-to-l from-white to-transparent dark:from-zinc-950"
          />
        ) : null}
        <div ref={ref} className={pillScrollerInnerClass}>
          {children}
        </div>
      </div>
      <button
        type="button"
        className={arrowBtnClass}
        aria-label={labelRight}
        disabled={!canRight}
        onClick={() => scrollByDir(1)}
      >
        <ChevronRight className="h-5 w-5" aria-hidden />
      </button>
    </div>
  );
}
