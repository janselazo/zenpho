import { notFound, redirect } from "next/navigation";
import {
  isProspectingSectionSlug,
} from "@/lib/crm/prospecting-nav";
import ProspectingSectionClient from "@/components/crm/prospecting/ProspectingSectionClient";
import { fetchMergedCrmFieldOptions } from "@/lib/crm/fetch-crm-field-options";
import { mergeFieldOptionsFromDb } from "@/lib/crm/field-options";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";

export default async function ProspectingSectionPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const playbookTab = sp.tab;
  if (slug === "referrals") {
    redirect("/referrals");
  }
  if (!isProspectingSectionSlug(slug)) {
    notFound();
  }

  const fieldOptions = isSupabaseConfigured()
    ? await fetchMergedCrmFieldOptions()
    : mergeFieldOptionsFromDb(null);

  return (
    <div className="p-8">
      <ProspectingSectionClient
        slug={slug}
        fieldOptions={fieldOptions}
        playbookTab={playbookTab}
      />
    </div>
  );
}
