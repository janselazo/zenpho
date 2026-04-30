import type { BusinessProfile, Competitor, WebsiteAudit } from "./types";

export type PhotoAnalysisSummary = {
  businessPhotoCount: number;
  competitorAveragePhotoCount: number;
  hasLowQuantity: boolean;
  /** Google Business Profile media with width/height metadata below a practical threshold. */
  hasLowResolutionSignals: boolean;
  profileLowResolutionCount: number;
  /** Homepage `<img>` tags with small declared width/height (heuristic for soft/blurry display). */
  hasWebsiteLowResolutionHtmlSignals: boolean;
  /** Lighthouse image savings, heavy dimensions + slow mobile score, or weak image SEO on homepage. */
  hasWebsiteImageOptimizationGaps: boolean;
  websiteImageCount: number;
  websiteBlurringSignals: number;
  websiteWeakOrMissingAlt: number;
  websitePageSpeedImageWasteBytes: number | null;
  notes: string[];
};

function websitePhotoOptimizationGap(website: WebsiteAudit): boolean {
  if (!website.available || !website.imageSeo) return false;
  const imgN = website.imageCount;
  const imgSeo = website.imageSeo;
  if (imgN < 1) return false;

  const waste = website.pageSpeedImageWasteBytes;
  if (waste !== null && waste >= 200 * 1024) return true;
  if (
    waste === null &&
    imgSeo.largeDeclaredDimensions >= 2 &&
    website.pageSpeedMobileScore !== null &&
    website.pageSpeedMobileScore < 70
  ) {
    return true;
  }

  if (imgN >= 3) {
    const altRatio = imgSeo.weakOrMissingAlt / imgN;
    if (altRatio >= 0.25 || imgSeo.weakOrMissingAlt >= 5) return true;
    const titleRatio = imgSeo.missingTitle / imgN;
    if (titleRatio >= 0.5) return true;
    const genRatio = imgSeo.genericFilename / imgN;
    if (imgSeo.genericFilename >= 3 || genRatio >= 0.35) return true;
  } else if (imgSeo.weakOrMissingAlt >= imgN && imgN >= 1) {
    return true;
  }

  return false;
}

export function analyzePhotos(
  business: BusinessProfile,
  competitors: Competitor[],
  websiteAudit: WebsiteAudit
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

  const profileLowResolutionCount = business.photos.filter(
    (p) =>
      typeof p.widthPx === "number" &&
      typeof p.heightPx === "number" &&
      (p.widthPx < 500 || p.heightPx < 350)
  ).length;
  const hasLowResolutionSignals = profileLowResolutionCount > 0;

  const hasWebsiteLowResolutionHtmlSignals =
    websiteAudit.available && websiteAudit.blurryImageSignals > 0;
  const hasWebsiteImageOptimizationGaps = websitePhotoOptimizationGap(websiteAudit);

  const websiteImageCount = websiteAudit.available ? websiteAudit.imageCount : 0;
  const websiteBlurringSignals = websiteAudit.available ? websiteAudit.blurryImageSignals : 0;
  const websiteWeakOrMissingAlt = websiteAudit.available && websiteAudit.imageSeo
    ? websiteAudit.imageSeo.weakOrMissingAlt
    : 0;
  const websitePageSpeedImageWasteBytes = websiteAudit.available
    ? websiteAudit.pageSpeedImageWasteBytes
    : null;

  const notes: string[] = [];

  if (businessPhotoCount < 10) notes.push("Low Google Business Profile photo quantity.");
  if (competitorAveragePhotoCount > 0 && competitorAveragePhotoCount > businessPhotoCount * 2) {
    notes.push("Competitors appear to have materially more Google profile photos.");
  }
  if (hasLowResolutionSignals) {
    notes.push(
      profileLowResolutionCount === 1
        ? "At least one Google profile photo has low declared resolution (<500×350px)."
        : `${profileLowResolutionCount} Google profile photos have low declared resolution (<500×350px).`
    );
  }

  if (!websiteAudit.available) {
    notes.push("Homepage was not analyzed — website image quality and optimization were not checked.");
  } else {
    notes.push(
      `Website homepage: ${websiteImageCount} <img> element(s) scanned for display size, alt text, and compression signals.`
    );
    if (websiteBlurringSignals > 0) {
      notes.push(
        `${websiteBlurringSignals} image(s) use small width/height in HTML and may look soft on retina displays.`
      );
    }
    if (websitePageSpeedImageWasteBytes !== null && websitePageSpeedImageWasteBytes >= 200 * 1024) {
      const kb = Math.round(websitePageSpeedImageWasteBytes / 1024);
      notes.push(`Mobile Lighthouse estimates ~${kb} KiB image byte savings (compression / sizing).`);
    } else if (
      websitePageSpeedImageWasteBytes === null &&
      websiteAudit.imageSeo &&
      websiteAudit.imageSeo.largeDeclaredDimensions >= 2 &&
      websiteAudit.pageSpeedMobileScore !== null &&
      websiteAudit.pageSpeedMobileScore < 70
    ) {
      notes.push(
        `Several images declare very large dimensions while mobile PageSpeed is ${websiteAudit.pageSpeedMobileScore}/100 — likely heavy payloads.`
      );
    }
    if (websiteAudit.imageSeo && websiteImageCount >= 1 && websiteWeakOrMissingAlt > 0) {
      notes.push(
        `${websiteWeakOrMissingAlt} non-decorative image(s) are missing useful alt text on the homepage.`
      );
    }
    const hadWebsiteIssue =
      websiteBlurringSignals > 0 ||
      (websitePageSpeedImageWasteBytes !== null &&
        websitePageSpeedImageWasteBytes >= 200 * 1024) ||
      (websitePageSpeedImageWasteBytes === null &&
        websiteAudit.imageSeo !== null &&
        websiteAudit.imageSeo.largeDeclaredDimensions >= 2 &&
        websiteAudit.pageSpeedMobileScore !== null &&
        websiteAudit.pageSpeedMobileScore < 70) ||
      websiteWeakOrMissingAlt > 0;
    if (!hadWebsiteIssue) {
      notes.push(
        "Homepage images show no strong soft-size, alt, or Lighthouse compression warnings in this pass."
      );
    }
  }

  const hasLowQuantity =
    businessPhotoCount < 10 ||
    (competitorAveragePhotoCount > 0 && competitorAveragePhotoCount > businessPhotoCount * 2);

  return {
    businessPhotoCount,
    competitorAveragePhotoCount,
    hasLowQuantity,
    hasLowResolutionSignals,
    profileLowResolutionCount,
    hasWebsiteLowResolutionHtmlSignals,
    hasWebsiteImageOptimizationGaps,
    websiteImageCount,
    websiteBlurringSignals,
    websiteWeakOrMissingAlt,
    websitePageSpeedImageWasteBytes,
    notes,
  };
}