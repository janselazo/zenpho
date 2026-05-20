export function metaAdIntelToolsHref(input: {
  businessName?: string | null;
  websiteUrl?: string | null;
  facebookUrl?: string | null;
  category?: string | null;
  city?: string | null;
}): string {
  const params = new URLSearchParams({ tab: "meta-ad-intel" });
  if (input.businessName?.trim()) params.set("businessName", input.businessName.trim());
  if (input.websiteUrl?.trim()) params.set("websiteUrl", input.websiteUrl.trim());
  if (input.facebookUrl?.trim()) params.set("facebookUrl", input.facebookUrl.trim());
  if (input.category?.trim()) params.set("category", input.category.trim());
  if (input.city?.trim()) params.set("city", input.city.trim());
  return `/tools?${params.toString()}`;
}
