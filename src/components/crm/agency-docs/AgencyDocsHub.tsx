import { getAgencyHubDocItems } from "@/lib/crm/agency-docs-hub";
import AgencyDocsHubSortableGrid from "@/components/crm/agency-docs/AgencyDocsHubSortableGrid";
import AgencyNewDocButton from "@/components/crm/agency-docs/AgencyNewDocButton";
import type { AgencyDocType } from "@/lib/crm/agency-custom-doc";
import { isSupabaseConfigured } from "@/lib/supabase/config";

const DOCS_HUB_PATH = "/docs";

type Props = {
  heading?: string;
  subtitle?: string;
  /** Which workspace doc kinds appear on this hub (default: agency docs + former “Industries” cards). */
  docTypes?: AgencyDocType | AgencyDocType[];
  /** Base URL for card links + new-doc redirect (defaults to `/docs`). */
  hubBasePath?: string;
};

export default async function AgencyDocsHub({
  heading = "Agency docs",
  subtitle =
    "Strategy, positioning, and operating context for the team — one place per topic.",
  docTypes = ["doc", "industry"],
  hubBasePath = DOCS_HUB_PATH,
}: Props) {
  const items = await getAgencyHubDocItems(docTypes);
  const canPersist = isSupabaseConfigured();

  const docKinds = Array.isArray(docTypes) ? docTypes : [docTypes];
  const newDocType: AgencyDocType =
    docKinds.length === 1 && docKinds[0] === "industry" ? "industry" : "doc";

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
        {canPersist ? (
          <AgencyNewDocButton docType={newDocType} basePath={hubBasePath} />
        ) : null}
      </div>

      {items.length === 0 ? (
        <p className="mt-10 rounded-2xl border border-dashed border-border bg-surface/50 px-6 py-12 text-center text-sm text-text-secondary dark:border-zinc-700 dark:bg-zinc-900/40 dark:text-zinc-400">
          No documents on this grid yet.
        </p>
      ) : (
        <AgencyDocsHubSortableGrid
          items={items}
          canPersist={canPersist}
          basePath={hubBasePath}
        />
      )}
    </div>
  );
}
