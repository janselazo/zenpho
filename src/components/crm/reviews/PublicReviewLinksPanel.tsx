"use client";

import { ExternalLink } from "lucide-react";
import Button from "@/components/ui/Button";
import { getReviewPlatformLinks } from "@/lib/review-platform-links";

/**
 * Public review links (Google, Clutch, Yelp) — shared by /reviews/google-reviews
 * and previously the Referrals page Reviews tab.
 */
export default function PublicReviewLinksPanel() {
  const links = getReviewPlatformLinks();

  return (
    <div
      className="rounded-2xl border border-border bg-white p-6 shadow-sm dark:border-zinc-800/80 dark:bg-zinc-900/40 dark:shadow-none"
    >
      <h2 className="text-lg font-semibold text-text-primary dark:text-zinc-100">
        Leave public feedback
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-text-secondary dark:text-zinc-400">
        Short, specific reviews help other teams find us and signal trust on Google Business Profile,
        Clutch, and Yelp. If we shipped something you&apos;re proud of, a star rating plus a sentence or
        two makes a big difference.
      </p>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        {links.google ? (
          <Button
            href={links.google}
            variant="secondary"
            size="md"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2"
          >
            Google Business Profile
            <ExternalLink className="h-4 w-4 opacity-70" aria-hidden />
          </Button>
        ) : null}
        {links.clutch ? (
          <Button
            href={links.clutch}
            variant="secondary"
            size="md"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2"
          >
            Clutch
            <ExternalLink className="h-4 w-4 opacity-70" aria-hidden />
          </Button>
        ) : null}
        {links.yelp ? (
          <Button
            href={links.yelp}
            variant="secondary"
            size="md"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2"
          >
            Yelp
            <ExternalLink className="h-4 w-4 opacity-70" aria-hidden />
          </Button>
        ) : null}
      </div>
      {!links.google && !links.clutch && !links.yelp ? (
        <p className="mt-4 rounded-xl border border-dashed border-border bg-surface/50 px-4 py-3 text-sm text-text-secondary dark:border-zinc-700 dark:bg-zinc-800/30 dark:text-zinc-400">
          Add review links for your listings: set{" "}
          <code className="rounded bg-white px-1 py-0.5 font-mono text-xs dark:bg-zinc-900">
            NEXT_PUBLIC_REVIEW_URL_GOOGLE
          </code>
          ,{" "}
          <code className="rounded bg-white px-1 py-0.5 font-mono text-xs dark:bg-zinc-900">
            NEXT_PUBLIC_REVIEW_URL_CLUTCH
          </code>
          , and{" "}
          <code className="rounded bg-white px-1 py-0.5 font-mono text-xs dark:bg-zinc-900">
            NEXT_PUBLIC_REVIEW_URL_YELP
          </code>{" "}
          in your environment (see{" "}
          <code className="rounded bg-white px-1 py-0.5 font-mono text-xs dark:bg-zinc-900">
            .env.example
          </code>
          ).
        </p>
      ) : (
        <p className="mt-4 text-xs text-text-secondary dark:text-zinc-500">
          Missing a platform? Add its URL in env to show the button here.
        </p>
      )}
    </div>
  );
}
