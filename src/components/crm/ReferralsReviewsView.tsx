"use client";

import Button from "@/components/ui/Button";

export default function ReferralsReviewsView() {
  return (
    <div>
      <div>
        <h1 className="heading-display text-2xl font-bold text-text-primary dark:text-zinc-100">
          Campaigns
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-text-secondary dark:text-zinc-400">
          Grow through warm introductions. Use outbound touchpoints to steer clients and leads toward
          introductions — public review links for Google and other platforms now live under{" "}
          <strong className="font-semibold text-text-primary dark:text-zinc-200">Reviews → Google Reviews</strong>.
        </p>
      </div>

      <div className="mt-8">
        <div
          id="referrals-panel"
          className="rounded-2xl border border-border bg-white p-6 shadow-sm dark:border-zinc-800/80 dark:bg-zinc-900/40 dark:shadow-none"
        >
          <h2 className="text-lg font-semibold text-text-primary dark:text-zinc-100">
            Bring us your next build
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-text-secondary dark:text-zinc-400">
            The best projects come from people who already trust you. If you know a team that needs
            design, AI, web, or mobile delivery, make the intro — we&apos;ll take it seriously and keep you
            in the loop.
          </p>
          <ul className="mt-4 list-inside list-disc space-y-2 text-sm text-text-secondary dark:text-zinc-400">
            <li>
              <span className="font-medium text-text-primary dark:text-zinc-200">Who to refer:</span>{" "}
              Founders, product leads, or ops owners planning software or automation work.
            </li>
            <li>
              <span className="font-medium text-text-primary dark:text-zinc-200">What to share:</span>{" "}
              A short note on their goals, timeline, and how to reach them (email or calendar).
            </li>
            <li>
              <span className="font-medium text-text-primary dark:text-zinc-200">What happens next:</span>{" "}
              We respond quickly, run a focused discovery, and only pursue fits where we can deliver real
              velocity.
            </li>
          </ul>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button href="/contact" variant="primary" size="md">
              Contact (introduce someone)
            </Button>
            <Button href="/booking" variant="dark" size="md" showLiveDot>
              Book a Call
            </Button>
          </div>
          <p className="mt-4 text-xs text-text-secondary dark:text-zinc-500">
            Links open the public site in the same tab; share the URL with clients or forward this page
            internally.
          </p>
        </div>
      </div>
    </div>
  );
}
