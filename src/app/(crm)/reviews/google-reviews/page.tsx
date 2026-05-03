import PublicReviewLinksPanel from "@/components/crm/reviews/PublicReviewLinksPanel";

export default function GoogleReviewsPage() {
  return (
    <div className="p-8">
      <h1 className="heading-display text-2xl font-bold text-text-primary dark:text-zinc-100">
        Google Reviews
      </h1>
      <p className="mt-1 max-w-2xl text-sm text-text-secondary dark:text-zinc-400">
        Share public review destinations with clients and partners. Links rely on environment variables
        in <code className="font-mono text-xs">.env.local</code>.
      </p>
      <div className="mt-8">
        <PublicReviewLinksPanel />
      </div>
    </div>
  );
}
