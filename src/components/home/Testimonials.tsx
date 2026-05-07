"use client";

import { useRef } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import SectionHeading from "@/components/ui/SectionHeading";

interface Testimonial {
  quote: string;
  name: string;
  title: string;
  company: string;
}

const testimonials: Testimonial[] = [
  {
    quote:
      "We went from a rough idea to a production SaaS in weeks. The inspection platform they shipped became our single source of truth overnight. Our team was able to adopt it immediately and we've gotten nothing but compliments from clients.",
    name: "Michael Torres",
    title: "CEO",
    company: "Apex Inspection Pro",
  },
  {
    quote:
      "They built our mobile-first ordering product end to end — catalog, checkout, fulfillment — and today we operate without a bench of engineers. Velocity and craftsmanship were standout.",
    name: "Andrea Guzmán",
    title: "Founder",
    company: "TQMuch",
  },
];

export default function Testimonials() {
  const scrollRef = useRef<HTMLDivElement>(null);

  function scroll(direction: "left" | "right") {
    if (!scrollRef.current) return;
    const amount = scrollRef.current.offsetWidth * 0.7;
    scrollRef.current.scrollBy({
      left: direction === "left" ? -amount : amount,
      behavior: "smooth",
    });
  }

  return (
    <section className="relative py-24">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <SectionHeading
          label="Testimonials"
          title="Trusted by founders"
          titleAccent="Hear what clients are saying"
          description="Real feedback from the teams we've built with."
        />
      </div>

      {/* Scroll controls */}
      <div className="mx-auto mb-4 flex max-w-7xl justify-end gap-2 px-6 lg:px-8">
        <button
          type="button"
          onClick={() => scroll("left")}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-white text-text-secondary shadow-sm transition-colors hover:bg-surface hover:text-text-primary"
          aria-label="Scroll left"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => scroll("right")}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-white text-text-secondary shadow-sm transition-colors hover:bg-surface hover:text-text-primary"
          aria-label="Scroll right"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Cards */}
      <div
        ref={scrollRef}
        className="no-scrollbar flex snap-x snap-mandatory gap-5 overflow-x-auto px-6 pb-2 lg:px-8"
        style={{ scrollPaddingLeft: "1.5rem" }}
      >
        {/* Left spacer for centering on wide screens */}
        <div className="w-0 shrink-0 lg:w-[calc((100vw-80rem)/2)]" />

        {testimonials.map((t, i) => (
          <motion.div
            key={t.company}
            initial={{ opacity: 1, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.05, margin: "0px 0px 200px 0px" }}
            transition={{ duration: 0.4, delay: i * 0.08 }}
            className="w-[320px] shrink-0 snap-start sm:w-[360px]"
          >
            <div className="flex h-full flex-col justify-between rounded-2xl border border-border bg-white p-6 shadow-soft">
              <p className="text-sm leading-relaxed text-text-secondary">
                &ldquo;{t.quote}&rdquo;
              </p>

              <div className="mt-6 flex items-center gap-3 border-t border-border pt-5">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface text-xs font-bold text-text-primary">
                  {t.name
                    .split(" ")
                    .map((w) => w[0])
                    .join("")}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-text-primary">
                    {t.name}
                  </p>
                  <p className="truncate text-xs text-text-secondary">
                    {t.title}, {t.company}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        ))}

        {/* Right spacer */}
        <div className="w-6 shrink-0 lg:w-[calc((100vw-80rem)/2+1.5rem)]" />
      </div>
    </section>
  );
}
