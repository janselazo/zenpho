"use client";

import { useState } from "react";
import { ExternalLink } from "lucide-react";
import TabBar from "@/components/crm/TabBar";
import Button from "@/components/ui/Button";
import { getReviewPlatformLinks } from "@/lib/review-platform-links";

const TABS = [
  { id: "referrals", label: "Referrals" },
  { id: "reviews", label: "Reviews" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function ReferralsReviewsView() {
  const [activeTab, setActiveTab] = useState<TabId>("referrals");
  const links = getReviewPlatformLinks();

  return (
    <div>
      <div>
        <h1 className="heading-display text-2xl font-bold text-text-primary dark:text-zinc-100">
          Referrals &amp; reviews
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-text-secondary dark:text-zinc-400">
          Grow through warm introductions and public proof. Use the Referrals tab
          to steer clients and prospects toward introductions; use Reviews to
          send happy partners to Google Business Profile, Clutch, and Yelp.
        </p>
      </div>

      <div className="mt-8">
        <TabBar
          tabs={[...TABS]}
          activeTab={activeTab}
          onTabChange={(id) => setActiveTab(id as TabId)}
          ariaLabel="Referrals and reviews"
        />
      </div>

      <div className="mt-6">
        {activeTab === "referrals" && (
          <div
            id="referrals-panel"
            role="tabpanel"
            aria-labelledby="referrals-tab"
            className="rounded-2xl border border-border bg-white p-6 shadow-sm dark:border-zinc-800/80 dark:bg-zinc-900/40 dark:shadow-none"
          >
            <h2 className="text-lg font-semibold text-text-primary dark:text-zinc-100">
              Bring us your next build
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-text-secondary dark:text-zinc-400">
              The best projects come from people who already trust you. If you
              know a team that needs design, AI, web, or mobile delivery, make
              the intro — we&apos;ll take it seriously and keep you in the loop.
            </p>
            <ul className="mt-4 list-inside list-disc space-y-2 text-sm text-text-secondary dark:text-zinc-400">
              <li>
                <span className="font-medium text-text-primary dark:text-zinc-200">
                  Who to refer:
                </span>{" "}
                Founders, product leads, or ops owners planning software or
                automation work.
              </li>
              <li>
                <span className="font-medium text-text-primary dark:text-zinc-200">
                  What to share:
                </span>{" "}
                A short note on their goals, timeline, and how to reach them
                (email or calendar).
              </li>
              <li>
                <span className="font-medium text-text-primary dark:text-zinc-200">
                  What happens next:
                </span>{" "}
                We respond quickly, run a focused discovery, and only pursue
                fits where we can deliver real velocity.
              </li>
            </ul>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button href="/contact" variant="primary" size="md">
                Contact (introduce someone)
              </Button>
              <Button href="/booking" variant="dark" size="md" showLiveDot>
                Book a call
              </Button>
            </div>
            <p className="mt-4 text-xs text-text-secondary dark:text-zinc-500">
              Links open the public site in the same tab; share the URL with
              clients or forward this page internally.
            </p>
          </div>
        )}

        {activeTab === "reviews" && (
          <div
            id="reviews-panel"
            role="tabpanel"
            aria-labelledby="reviews-tab"
            className="rounded-2xl border border-border bg-white p-6 shadow-sm dark:border-zinc-800/80 dark:bg-zinc-900/40 dark:shadow-none"
          >
            <h2 className="text-lg font-semibold text-text-primary dark:text-zinc-100">
              Leave public feedback
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-text-secondary dark:text-zinc-400">
              Short, specific reviews help other teams find us and signal trust
              on Google Business Profile, Clutch, and Yelp. If we shipped
              something you&apos;re proud of, a star rating plus a sentence or
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
        )}
      </div>
    </div>
  );
}
