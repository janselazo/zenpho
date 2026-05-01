import Image from "next/image";
import {
  homeGrowthAchieveCards,
  homeGrowthAchieveDescription,
  homeGrowthAchieveHeadline,
  homeGrowthAchieveSectionEyebrow,
} from "@/lib/home-growth-achieve-cards";

const HEADING_ID = "home-growth-achieve-heading";

export default function HomeGrowthAchieveSection() {
  return (
    <section
      className="relative w-full border-t border-border/50 bg-background py-16 sm:py-20 lg:py-24"
      aria-labelledby={HEADING_ID}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-[2rem] border border-indigo-100/90 bg-gradient-to-b from-indigo-50/90 via-sky-50/40 to-background p-8 shadow-soft ring-1 ring-black/[0.04] sm:p-10 lg:p-12 dark:border-indigo-900/40 dark:from-indigo-950/40 dark:via-sky-950/20 dark:to-background">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-5 flex justify-center">
              <span className="inline-flex rounded-full border border-accent/25 bg-white/90 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.2em] text-accent shadow-sm dark:bg-zinc-900/80">
                {homeGrowthAchieveSectionEyebrow}
              </span>
            </div>
            <h2
              id={HEADING_ID}
              className="heading-display text-balance text-3xl font-bold leading-[1.12] tracking-tight text-text-primary sm:text-4xl lg:text-[2.35rem] lg:leading-[1.08]"
            >
              {homeGrowthAchieveHeadline}
            </h2>
            <p className="mx-auto mt-5 max-w-prose text-base leading-relaxed text-text-secondary sm:text-lg">
              {homeGrowthAchieveDescription}
            </p>
          </div>

          <ul className="mx-auto mt-12 grid max-w-6xl list-none grid-cols-1 gap-6 sm:grid-cols-2 lg:mt-14 lg:grid-cols-3 lg:gap-8">
            {homeGrowthAchieveCards.map((card) => (
              <li key={card.id}>
                <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-border/80 bg-white shadow-soft transition-shadow hover:shadow-soft-lg dark:border-zinc-700/80 dark:bg-zinc-900/80">
                  <div className="relative aspect-[400/220] w-full overflow-hidden bg-indigo-50/50 dark:bg-zinc-800/50">
                    <Image
                      src={card.imageSrc}
                      alt={card.imageLabel}
                      width={400}
                      height={220}
                      className="h-full w-full object-cover object-center"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    />
                  </div>
                  <div className="flex flex-1 flex-col p-5 sm:p-6">
                    <h3 className="text-lg font-bold leading-snug text-text-primary sm:text-xl">{card.title}</h3>
                    <p className="mt-2 flex-1 text-sm leading-relaxed text-text-secondary sm:text-[0.9375rem]">
                      {card.description}
                    </p>
                  </div>
                </article>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
