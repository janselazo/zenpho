import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function MetaAdIntelPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const params = new URLSearchParams({ tab: "meta-ad-intel" });

  for (const [key, value] of Object.entries(sp)) {
    if (typeof value === "string" && value.trim()) {
      params.set(key, value);
    }
  }

  redirect(`/tools?${params.toString()}`);
}
