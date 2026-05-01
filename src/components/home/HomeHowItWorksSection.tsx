import {
  homeHowItWorksEyebrow,
  homeHowItWorksHeadline,
  homeHowItWorksSteps,
} from "@/lib/home-how-it-works";

const HEADING_ID = "home-how-it-works-heading";

export default function HomeHowItWorksSection() {
  return (
    <section
      className="relative w-full border-t border-border/50 bg-background py-16 sm:py-20 lg:py-24"
      aria-labelledby={HEADING_ID}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-[2rem] border border-sky-100/90 bg-gradient-to-b from-sky-50/85 via-cyan-50/30 to-background p-8 shadow-soft ring-1 ring-black/[0.04] sm:p-10 lg:p-12 dark:border-sky-900/35 dark:from-sky-950/28 dark:via-cyan-950/12 dark:to-background">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-5 flex justify-center">
              <span className="inline-flex rounded-full border border-sky-200/90 bg-white/90 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.2em] text-sky-800 shadow-sm dark:border-sky-500/30 dark:bg-zinc-900/80 dark:text-sky-300">
                {homeHowItWorksEyebrow}
              </span>
            </div>
            <h2
              id={HEADING_ID}
              className="heading-display text-balance text-3xl font-bold leading-[1.12] tracking-tight text-text-primary sm:text-4xl lg:text-[2.35rem] lg:leading-[1.08]"
            >
              {homeHowItWorksHeadline}
            </h2>
          </div>

          <ol className="mx-auto mt-12 max-w-3xl list-none space-y-10 lg:mt-14">
            {homeHowItWorksSteps.map((step, i) => (
              <li key={step.title} className="flex gap-4 sm:gap-5">
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-accent text-sm font-black text-white shadow-sm sm:h-11 sm:w-11 sm:text-base"
                  aria-hidden
                >
                  {i + 1}
                </span>
                <div className="min-w-0 pt-0.5">
                  <h3 className="text-lg font-bold leading-snug text-text-primary sm:text-xl">
                    Step {i + 1}: {step.title}
                  </h3>
                  <p className="mt-2 text-base leading-relaxed text-text-secondary sm:text-[1.0625rem]">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
