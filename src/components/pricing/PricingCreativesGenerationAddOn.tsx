import Link from "next/link";
import { Sparkles } from "lucide-react";

const HEADING_ID = "pricing-creatives-generation-addon";

const HIGHLIGHTS = [
  "Static and carousel ad creatives",
  "Story and Reel covers",
  "Video ad thumbnails (9:16 and 1:1)",
  "Hook and CTA copy variants",
];

/**
 * Horizontal add-on box shown below the pricing comparison table to surface the
 * Creatives Generation service. Non-invasive: rendered as its own section so
 * the existing pricing table stays untouched.
 */
export default function PricingCreativesGenerationAddOn() {
  return (
    <section
      aria-labelledby={HEADING_ID}
      className="px-4 pb-4 pt-2 sm:px-6 lg:px-8"
    >
      <div className="mx-auto max-w-7xl">
        <div className="rounded-3xl border border-border/70 bg-gradient-to-r from-amber-500/10 via-white to-white p-6 shadow-soft sm:p-8 lg:p-10">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between lg:gap-10">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-5">
              <span
                aria-hidden
                className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-600 sm:h-14 sm:w-14"
              >
                <Sparkles className="h-6 w-6 sm:h-7 sm:w-7" />
              </span>
              <div className="min-w-0">
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-text-secondary">
                  Add-on service
                </p>
                <h2
                  id={HEADING_ID}
                  className="mt-2 text-balance text-xl font-bold tracking-tight text-text-primary sm:text-2xl"
                >
                  Creatives Generation
                </h2>
                <p className="mt-2 max-w-2xl text-pretty text-sm leading-relaxed text-text-secondary sm:text-base">
                  On-brand ad creatives, social posts, and video ad thumbnails
                  generated for paid Meta and Google campaigns, launches, and
                  ongoing content—ready to upload without waiting on a full
                  design cycle.
                </p>
                <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5">
                  {HIGHLIGHTS.map((item) => (
                    <li
                      key={item}
                      className="flex items-center gap-2 text-xs font-medium text-text-secondary sm:text-sm"
                    >
                      <span
                        aria-hidden
                        className="h-1.5 w-1.5 rounded-full bg-amber-500"
                      />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center lg:flex-col lg:items-end lg:gap-3">
              <Link
                href="/booking"
                className="text-center text-sm font-semibold text-accent hover:underline lg:text-right"
              >
                Request a custom quote →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
