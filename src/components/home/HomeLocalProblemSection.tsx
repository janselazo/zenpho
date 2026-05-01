import {
  homeLocalProblemCards,
  iconForLocalProblemCard,
} from "@/lib/home-local-problem-cards";

const HEADLINE_ID = "home-local-problem-heading";

export default function HomeLocalProblemSection() {
  return (
    <section
      className="relative w-full border-t border-border/50 bg-background py-16 sm:py-20 lg:py-24"
      aria-labelledby={HEADLINE_ID}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-[2rem] border border-rose-100/90 bg-rose-50/95 p-8 shadow-soft ring-1 ring-black/[0.04] sm:p-10 lg:p-12 dark:border-rose-900/40 dark:bg-rose-950/35">
          <div className="grid gap-12 lg:grid-cols-2 lg:gap-14 xl:gap-16">
            <div className="flex flex-col lg:max-w-xl">
              <div className="mb-5 flex justify-start">
                <span className="inline-flex rounded-full border border-red-200 bg-white px-4 py-1.5 text-xs font-bold uppercase tracking-[0.2em] text-red-700 shadow-sm dark:border-red-500/35 dark:bg-zinc-900/80 dark:text-red-400">
                  The Problem
                </span>
              </div>
              <h2
                id={HEADLINE_ID}
                className="heading-display text-balance text-3xl font-bold leading-[1.12] tracking-tight text-text-primary sm:text-4xl lg:text-[2.35rem] lg:leading-[1.1]"
              >
                Most local service businesses don’t just need more leads, they need to stop losing revenue.
              </h2>
              <p className="mt-5 max-w-prose text-base leading-relaxed text-text-secondary sm:text-lg">
                Many local businesses are already getting calls, website visits, quote requests, and referrals. But if
                those opportunities are not captured, tracked, followed up with, and converted, money is being left on
                the table.
              </p>
            </div>

            <div className="min-w-0">
              <p className="mb-5 text-center text-sm font-semibold leading-snug text-text-primary sm:text-left sm:text-base">
                Local service businesses often lose revenue because of:
              </p>
              <ul className="grid grid-cols-1 list-none gap-3 sm:grid-cols-2 sm:gap-4">
                {homeLocalProblemCards.map((card, i) => {
                  const Icon = iconForLocalProblemCard(card.iconKey);
                  const tilt =
                    i % 2 === 0
                      ? "lg:-rotate-[0.8deg] lg:translate-y-0"
                      : "lg:rotate-[0.8deg] lg:translate-y-1";
                  return (
                    <li key={card.text} className={`relative list-none ${tilt}`}>
                      <div className="flex h-full gap-3 rounded-xl border border-border/80 bg-white p-4 shadow-soft dark:border-zinc-700/80 dark:bg-zinc-900/85 sm:p-4">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-rose-100/90 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300">
                          <Icon className="h-5 w-5" aria-hidden />
                        </span>
                        <p className="min-w-0 pt-0.5 text-sm font-medium leading-snug text-text-primary sm:text-[0.9375rem]">
                          {card.text}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>

          <div className="mt-10 rounded-2xl border border-border/80 bg-white px-6 py-6 shadow-soft sm:px-8 sm:py-8 dark:border-zinc-700/80 dark:bg-zinc-900/85">
            <p className="text-base font-semibold leading-snug text-text-primary sm:text-lg">Our job is simple:</p>
            <p className="mt-3 text-sm leading-relaxed text-text-secondary sm:text-base">
              We help local businesses find the leaks, fix them, and build a system that turns more opportunities into
              revenue.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
