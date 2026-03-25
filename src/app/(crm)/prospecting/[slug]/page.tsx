import { notFound } from "next/navigation";
import {
  isProspectingSectionSlug,
} from "@/lib/crm/prospecting-nav";
import ProspectingSectionClient from "@/components/crm/prospecting/ProspectingSectionClient";

export const dynamic = "force-dynamic";

export default async function ProspectingSectionPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (!isProspectingSectionSlug(slug)) {
    notFound();
  }

  return (
    <div className="p-8">
      <ProspectingSectionClient slug={slug} />
    </div>
  );
}
