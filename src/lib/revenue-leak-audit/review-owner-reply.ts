import type { BusinessReview } from "./types";

/**
 * User-facing note about owner/merchant replies for the Reviews & Reputation section.
 * Google Places (New) usually omits reply payloads on reviews; when `hasOwnerReply` is set on rows, we summarize it.
 */
export function formatReviewOwnerReplyAuditNote(reviews: BusinessReview[]): string {
  if (reviews.length === 0) {
    return "No review rows were returned in this audit, so public owner reply activity could not be assessed.";
  }
  const anyKnown = reviews.some((r) => typeof r.hasOwnerReply === "boolean");
  if (!anyKnown) {
    return "Google’s Places review sample here typically does not include owner reply text. Open Google Business Profile to confirm whether you are responding publicly — shoppers often read replies when comparing providers.";
  }

  const known = reviews.filter((r): r is BusinessReview & { hasOwnerReply: boolean } =>
    typeof r.hasOwnerReply === "boolean"
  );
  const replied = known.filter((r) => r.hasOwnerReply).length;
  const k = known.length;
  const n = reviews.length;

  if (k < n) {
    return `Owner reply metadata was only available for ${k} of ${n} reviews in this snapshot; of those, ${replied} show a public owner reply. Check Google Business Profile for full reply coverage.`;
  }

  if (replied === 0) {
    return `In this sample of ${n} reviews, none show a public owner reply in the data we received. Responding professionally (especially to lower ratings) usually improves trust.`;
  }
  if (replied === n) {
    return `In this sample of ${n} reviews, each row includes a public owner reply in the data we received. Keep replying within a few business days.`;
  }
  return `In this sample of ${n} reviews, ${replied} include a public owner reply in the data we received. Aim to acknowledge every review, including short ones.`;
}
