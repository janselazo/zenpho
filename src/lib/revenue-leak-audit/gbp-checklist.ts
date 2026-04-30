import type { BusinessProfile } from "./types";

export type GbpChecklistStatus = "pass" | "warn" | "fail" | "unknown";

export type GoogleBusinessProfileChecklistItem = {
  id: string;
  label: string;
  status: GbpChecklistStatus;
  hint: string;
};

function nonOperational(business: BusinessProfile): boolean {
  const s = business.businessStatus?.trim();
  if (!s) return false;
  return /CLOSED|PERMANENTLY_CLOSED|CLOSED_TEMPORARILY|SUSPEND/i.test(s);
}

/** Profile completeness checks from Places-normalized `BusinessProfile` (no verification / posts in API yet). */
export function buildGoogleBusinessProfileChecklist(business: BusinessProfile): GoogleBusinessProfileChecklistItem[] {
  const photoN = business.photoCount ?? business.photos?.length ?? 0;
  const reviewsN = business.reviewCount ?? 0;

  let photoStatus: GbpChecklistStatus;
  let photoHint: string;
  if (photoN >= 10) {
    photoStatus = "pass";
    photoHint = `${photoN} photos on the profile.`;
  } else if (photoN >= 5) {
    photoStatus = "warn";
    photoHint = `${photoN} photos — aim for 10+ for stronger local engagement.`;
  } else {
    photoStatus = "fail";
    photoHint = `${photoN} photos — add more storefront, team, and work samples.`;
  }

  let reviewStatus: GbpChecklistStatus;
  let reviewHint: string;
  if (reviewsN >= 25) {
    reviewStatus = "pass";
    reviewHint = `${reviewsN} reviews.`;
  } else if (reviewsN >= 10) {
    reviewStatus = "warn";
    reviewHint = `${reviewsN} reviews — many buyers expect 25+ for trust.`;
  } else {
    reviewStatus = "fail";
    reviewHint = `${reviewsN} reviews — grow count with a consistent request flow.`;
  }

  const operationalFail = nonOperational(business);

  return [
    {
      id: "website",
      label: "Website link",
      status: business.website ? "pass" : "fail",
      hint: business.website ? "Linked on the profile." : "Add a website or landing page URL.",
    },
    {
      id: "phone",
      label: "Phone number",
      status: business.phone ? "pass" : "fail",
      hint: business.phone ? "Primary phone present." : "Add a callable primary number.",
    },
    {
      id: "address",
      label: "Address",
      status: business.address?.trim() ? "pass" : "fail",
      hint: business.address?.trim() ? "Formatted address present." : "Complete or verify the address on GBP.",
    },
    {
      id: "hours",
      label: "Business hours",
      status: business.hours.length > 0 ? "pass" : "fail",
      hint: business.hours.length > 0 ? "Hours published." : "Add regular (and special) hours.",
    },
    {
      id: "category",
      label: "Primary category",
      status: business.category ? "pass" : "fail",
      hint: business.category ? `${business.category}.` : "Set the most specific primary category.",
    },
    {
      id: "photos",
      label: "Photo coverage",
      status: photoStatus,
      hint: photoHint,
    },
    {
      id: "operational",
      label: "Operational status",
      status: operationalFail ? "fail" : "pass",
      hint: operationalFail
        ? `Google status: ${business.businessStatus}. Fix or reclaim the listing.`
        : "Listing shows an operational business.",
    },
    {
      id: "reviews",
      label: "Reviews on profile",
      status: reviewStatus,
      hint: reviewHint,
    },
    {
      id: "verification",
      label: "Verification",
      status: "unknown",
      hint: "Not exposed by Places in this audit — confirm Verified in Google Business Profile.",
    },
    {
      id: "posts",
      label: "Posts & updates",
      status: "unknown",
      hint: "Not included in this data — check recent Google posts in Business Profile.",
    },
  ];
}

/** Items to surface in the report UI: not fully met (fail) or weak signals (warn). Omits passes and unknown. */
export function getGoogleBusinessProfileChecklistIssues(
  business: BusinessProfile,
): GoogleBusinessProfileChecklistItem[] {
  return buildGoogleBusinessProfileChecklist(business).filter(
    (i) => i.status === "fail" || i.status === "warn",
  );
}
