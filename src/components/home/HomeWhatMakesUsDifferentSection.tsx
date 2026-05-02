import { Check } from "lucide-react";
import {
  homeUnderstandingLeadIn,
  homeUnderstandingPoints,
  homeWhatMakesUsDifferentEyebrow,
  homeWhatMakesUsDifferentHeadline,
  homeWhatMakesUsDifferentIntro,
} from "@/lib/home-difference-sections";

const HEADING_ID = "home-what-makes-us-different-heading";

export default function HomeWhatMakesUsDifferentSection() {
  return (
    <section
      className="relative w-full border-t border-border/50 bg-background py-16 sm:py-20 lg:py-24"
      aria-labelledby={HEADING_ID}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-[2rem] border border-border/80 bg-white p-8 shadow-soft ring-1 ring-black/[0.04] sm:p-10 lg:p-12 dark:border-zinc-700/80 dark:bg-zinc-900/50">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-5 flex justify-center">
              <span className="inline-flex rounded-full border border-border/80 bg-white/90 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.2em] text-text-secondary shadow-sm dark:border-zinc-600/80 dark:bg-zinc-900/80 dark:text-zinc-300">
                {homeWhatMakesUsDifferentEyebrow}
              </span>
            </div>
            <h2
              id={HEADING_ID}
              className="heading-display text-balance text-3xl font-bold leading-[1.12] tracking-tight text-text-primary sm:text-4xl lg:text-[2.35rem] lg:leading-[1.08]"
            >
              {homeWhatMakesUsDifferentHeadline}
            </h2>
          </div>

          <div className="mx-auto mt-10 max-w-2xl space-y-4 text-pretty text-base leading-relaxed text-text-secondary sm:mt-12 sm:text-lg">
            {homeWhatMakesUsDifferentIntro.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>

          <div className="mx-auto mt-10 max-w-2xl sm:mt-12">
            <p className="text-center text-base font-semibold text-text-primary sm:text-left sm:text-lg">
              {homeUnderstandingLeadIn}
            </p>
            <ul className="mt-5 grid list-none gap-3 sm:gap-3.5">
              {homeUnderstandingPoints.map((item) => (
                <li key={item} className="flex gap-3 text-left">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:bg-emerald-400/15 dark:text-emerald-400">
                    <Check className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />
                  </span>
                  <span className="text-base leading-relaxed text-text-secondary sm:text-[1.0625rem]">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
