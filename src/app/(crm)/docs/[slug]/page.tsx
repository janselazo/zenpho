import Link from "next/link";
import { notFound } from "next/navigation";
import AgencyDocEditor from "@/components/crm/agency-docs/AgencyDocEditor";
import { DEFAULT_CUSTOM_DOC_BODY } from "@/lib/crm/agency-custom-doc";
import {
  defaultBodyFromDefinition,
  getAgencyDocBySlug,
} from "@/lib/crm/agency-docs";
import { fetchCustomDocBySlug } from "@/lib/crm/agency-custom-doc-server";
import { loadAgencyWorkspaceDocBody } from "@/lib/crm/agency-docs-load";
import { mergeHubCardOverrides } from "@/lib/crm/agency-docs-hub";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { ChevronLeft } from "lucide-react";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export default async function AgencyDocPage({ params }: PageProps) {
  const { slug } = await params;

  const builtIn = getAgencyDocBySlug(slug);
  const custom = builtIn ? null : await fetchCustomDocBySlug(slug);

  if (!builtIn && !custom) notFound();

  const { title, description } = await mergeHubCardOverrides(slug, {
    title: builtIn?.title ?? custom!.title,
    description: builtIn?.description ?? custom!.description,
  });
  const fallback = builtIn
    ? defaultBodyFromDefinition(builtIn)
    : DEFAULT_CUSTOM_DOC_BODY;

  const initialBody = await loadAgencyWorkspaceDocBody(slug, fallback);
  const canPersist = isSupabaseConfigured();

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-8 sm:px-8">
      <Link
        href="/docs"
        className="inline-flex items-center gap-1 text-sm font-medium text-text-secondary transition-colors hover:text-accent dark:text-zinc-400 dark:hover:text-blue-400"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden />
        All docs
      </Link>

      <header className="mt-6 border-b border-border pb-8 dark:border-zinc-800">
        <h1 className="text-3xl font-bold tracking-tight text-text-primary dark:text-zinc-50">
          {title}
        </h1>
        <p className="mt-2 text-justify text-text-secondary dark:text-zinc-400">
          {description}
        </p>
      </header>

      <div className="pt-8">
        <AgencyDocEditor
          key={slug}
          slug={slug}
          initialBody={initialBody}
          canPersist={canPersist}
        />
      </div>
    </div>
  );
}
