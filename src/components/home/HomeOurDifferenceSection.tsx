import { Check } from "lucide-react";
import {
  homeOurDifferenceHeadline,
  homeOurDifferenceLeadIn,
  homeOurDifferencePoints,
} from "@/lib/home-difference-sections";

const HEADING_ID = "home-our-difference-heading";

export default function HomeOurDifferenceSection() {
  return (
    <section
      className="relative w-full border-t border-border/50 bg-background py-16 sm:py-20 lg:py-24"
      aria-labelledby={HEADING_ID}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-[2rem] border border-violet-100/90 bg-gradient-to-b from-violet-50/70 via-fuchsia-50/25 to-background p-8 shadow-soft ring-1 ring-black/[0.04] sm:p-10 lg:p-12 dark:border-violet-900/35 dark:from-violet-950/25 dark:via-fuchsia-950/10 dark:to-background">
          <div className="mx-auto max-w-3xl text-center">
            <h2
              id={HEADING_ID}
              className="heading-display text-balance text-3xl font-bold leading-[1.12] tracking-tight text-text-primary sm:text-4xl lg:text-[2.35rem] lg:leading-[1.08]"
            >
              {homeOurDifferenceHeadline}
            </h2>
            <p className="mx-auto mt-5 max-w-prose text-base font-semibold leading-snug text-text-primary sm:text-lg">
              {homeOurDifferenceLeadIn}
            </p>
          </div>

          <ul className="mx-auto mt-10 grid max-w-4xl list-none grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-x-10 sm:gap-y-3.5 lg:mt-12">
            {homeOurDifferencePoints.map((item) => (
              <li key={item} className="flex gap-3">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-500/15 text-violet-700 dark:bg-violet-400/15 dark:text-violet-300">
                  <Check className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />
                </span>
                <span className="text-base leading-relaxed text-text-secondary sm:text-[1.0625rem]">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
