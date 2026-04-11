import { getAgencyHubDocItems } from "@/lib/crm/agency-docs-hub";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { AgencyDocType } from "@/lib/crm/agency-custom-doc";
import AgencyNewDocButton from "@/components/crm/agency-docs/AgencyNewDocButton";
import AgencyDocsHubSortableGrid from "@/components/crm/agency-docs/AgencyDocsHubSortableGrid";

type Props = {
  docType?: AgencyDocType;
  heading?: string;
  subtitle?: string;
  basePath?: string;
};

export default async function AgencyDocsHub({
  docType = "doc",
  heading = "Agency docs",
  subtitle = "Strategy, positioning, and operating context for the team \u2014 one place per topic.",
  basePath = "/docs",
}: Props) {
  const items = await getAgencyHubDocItems(docType);
  const canPersist = isSupabaseConfigured();

  return (
    <div className="mx-auto max-w-6xl p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-widest text-text-secondary/70 dark:text-zinc-500">
            Agency workspace
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-text-primary dark:text-zinc-50 md:text-4xl">
            {heading}
          </h1>
          <p className="mt-3 max-w-2xl text-base text-text-secondary dark:text-zinc-400">
            {subtitle}
            {!canPersist ? (
              <>
                {" "}
                Connect Supabase to add, reorder, edit, or remove cards from the
                hub.
              </>
            ) : null}
          </p>
        </div>
        {canPersist ? <AgencyNewDocButton docType={docType} basePath={basePath} /> : null}
      </div>

      {items.length === 0 ? (
        <p className="mt-10 rounded-2xl border border-dashed border-border bg-surface/50 px-6 py-12 text-center text-sm text-text-secondary dark:border-zinc-700 dark:bg-zinc-900/40 dark:text-zinc-400">
          No documents on this grid yet.
        </p>
      ) : (
        <AgencyDocsHubSortableGrid
          items={items}
          canPersist={canPersist}
          docType={docType}
          basePath={basePath}
        />
      )}
    </div>
  );
}
