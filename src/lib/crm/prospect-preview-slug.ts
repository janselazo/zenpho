/**
 * URL-safe slug from Google / Places business name, plus id fragment so it stays unique.
 * Example: "Joe's Pet Grooming" → "joes-pet-grooming-a1b2c3d4"
 */
export function prospectPreviewSlugFromBusiness(
  businessName: string,
  previewId: string
): string {
  const idPart = previewId.replace(/-/g, "").slice(0, 8).toLowerCase();
  const base =
    businessName
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/\p{M}/gu, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 72) || "preview";
  return `${base}-${idPart}`;
}
