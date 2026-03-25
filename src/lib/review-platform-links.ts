/**
 * Public review listing URLs for the CRM Referrals → Reviews tab.
 * Set in .env (see .env.example); omitted buttons when unset.
 */
export function getReviewPlatformLinks(): {
  google: string | undefined;
  clutch: string | undefined;
  yelp: string | undefined;
} {
  const trim = (v: string | undefined) => {
    const s = v?.trim();
    return s && s.length > 0 ? s : undefined;
  };
  return {
    google: trim(process.env.NEXT_PUBLIC_REVIEW_URL_GOOGLE),
    clutch: trim(process.env.NEXT_PUBLIC_REVIEW_URL_CLUTCH),
    yelp: trim(process.env.NEXT_PUBLIC_REVIEW_URL_YELP),
  };
}
