import type { BusinessProfile, Competitor } from "./types";

export type PhotoAnalysisSummary = {
  businessPhotoCount: number;
  competitorAveragePhotoCount: number;
  hasLowQuantity: boolean;
  hasLowResolutionSignals: boolean;
  notes: string[];
};

export function analyzePhotos(
  business: BusinessProfile,
  competitors: Competitor[]
): PhotoAnalysisSummary {
  const businessPhotoCount = business.photoCount ?? business.photos.length;
  const competitorPhotoCounts = competitors
    .map((c) => c.photoCount)
    .filter((n): n is number => typeof n === "number" && Number.isFinite(n));
  const competitorAveragePhotoCount =
    competitorPhotoCounts.length === 0
      ? 0
      : Math.round(
          competitorPhotoCounts.reduce((sum, n) => sum + n, 0) /
            competitorPhotoCounts.length
        );
  const lowRes = business.photos.some(
    (p) =>
      typeof p.widthPx === "number" &&
      typeof p.heightPx === "number" &&
      (p.widthPx < 500 || p.heightPx < 350)
  );
  const notes: string[] = [];
  if (businessPhotoCount < 10) notes.push("Low Google photo quantity.");
  if (competitorAveragePhotoCount > businessPhotoCount * 2) {
    notes.push("Competitors appear to have materially more Google photos.");
  }
  if (lowRes) notes.push("Some available Google photos look low resolution.");
  if (notes.length === 0) notes.push("Photo footprint appears competitive.");
  return {
    businessPhotoCount,
    competitorAveragePhotoCount,
    hasLowQuantity:
      businessPhotoCount < 10 ||
      (competitorAveragePhotoCount > 0 &&
        competitorAveragePhotoCount > businessPhotoCount * 2),
    hasLowResolutionSignals: lowRes,
    notes,
  };
}
