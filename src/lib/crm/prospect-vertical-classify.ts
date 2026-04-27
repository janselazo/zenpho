/**
 * Heuristic prospect vertical classifier. Used by the brand-book + sales
 * funnel PDF action so prompts and ad creatives can be biased per category.
 *
 * Rules of evaluation (first match wins):
 *   1. Verified ecommerce platform fingerprint OR ecom fit score >= 35.
 *   2. Tech-startup fit score >= 35 AND no local Place type.
 *   3. Local-business when Place types match restaurant / local-service /
 *      health / legal / real-estate / home-trade / retail.
 *   4. Otherwise `general`.
 *
 * Inputs are all optional so the caller can pass whatever signals it has.
 */
import type { PlacesSearchPlace } from "@/lib/crm/places-types";
import type { EcomPlatformFingerprint } from "@/lib/crm/ecom-platform-fingerprint";
import { isVerifiedEcomPlatform } from "@/lib/crm/ecom-platform-fingerprint";

export type ProspectVertical =
  | "local-business"
  | "tech-startup"
  | "ecommerce"
  | "general";

export type VerticalSignals = {
  /** Optional Apollo-driven ecom fit score (0..100). */
  ecomFitScore?: number | null;
  /** Optional Apollo-driven tech-startup fit score (0..100). */
  techFitScore?: number | null;
  /** Web platform fingerprint (Shopify / Woo / etc.). */
  ecomFingerprint?: EcomPlatformFingerprint | null;
};

const LOCAL_TYPE_RE =
  /restaurant|cafe|meal_takeaway|bakery|bar|meal_delivery|food|store|gym|fitness|yoga|spa|beauty_salon|hair_care|salon|plumber|electrician|roofing|locksmith|hvac|general_contractor|painter|dentist|doctor|physician|hospital|pharmacy|veterinary|health|lawyer|attorney|real_estate|car_repair|car_dealer|lodging|travel_agency|banquet_hall|event_venue|shopping_mall|clothing_store|jewelry_store|furniture_store|book_store/i;

function placeIsLocal(place: PlacesSearchPlace | null | undefined): boolean {
  if (!place) return false;
  const types = (place.types ?? []).join(" ").toLowerCase();
  if (LOCAL_TYPE_RE.test(types)) return true;
  if (place.formattedAddress && /\d/.test(place.formattedAddress)) {
    return Boolean(types) && !/software|saas|technology|consulting/.test(types);
  }
  return false;
}

export function classifyProspectVertical(input: {
  place?: PlacesSearchPlace | null;
  signals?: VerticalSignals | null;
}): ProspectVertical {
  const place = input.place ?? null;
  const sig = input.signals ?? null;

  // Step 1: ecommerce wins when there is a real platform fingerprint or a
  // strong Apollo-driven ecom fit.
  const fingerprint = sig?.ecomFingerprint ?? null;
  if (fingerprint && isVerifiedEcomPlatform(fingerprint.platform)) {
    return "ecommerce";
  }
  if (fingerprint?.platform === "wix_stores" || fingerprint?.platform === "squarespace_commerce") {
    return "ecommerce";
  }
  if (typeof sig?.ecomFitScore === "number" && sig.ecomFitScore >= 35) {
    return "ecommerce";
  }

  // Step 2: tech startup when fit score is meaningful AND we're not on a
  // physical-storefront Place type.
  const local = placeIsLocal(place);
  if (
    typeof sig?.techFitScore === "number" &&
    sig.techFitScore >= 35 &&
    !local
  ) {
    return "tech-startup";
  }

  // Step 3: local business catch-all driven by Google Places categories.
  if (local) return "local-business";

  return "general";
}

/**
 * Human-readable label for log lines / PDF metadata.
 */
export function verticalLabel(v: ProspectVertical): string {
  switch (v) {
    case "local-business":
      return "Local business";
    case "tech-startup":
      return "Tech startup";
    case "ecommerce":
      return "Ecommerce brand";
    case "general":
      return "General";
  }
}

/**
 * Short imagery / messaging direction that downstream prompts can splice in
 * verbatim. Keeps the vertical-specific tone in one place.
 */
export function verticalImageryDirection(v: ProspectVertical): string {
  switch (v) {
    case "local-business":
      return "warm storefront detail, real human moments, golden-hour lighting, neighborhood feel";
    case "tech-startup":
      return "clean SaaS product fragments, abstract dashboard surfaces, soft gradients, modern editorial photography";
    case "ecommerce":
      return "product still life, lifestyle shots in-context, bright editorial styling, repeating product silhouettes";
    case "general":
      return "editorial photography with consistent lighting and a calm, premium tone";
  }
}

/**
 * Vertical-specific KPI direction so the AdsFunnelSpec prompt can request the
 * right metrics.
 */
export function verticalKpiDirection(v: ProspectVertical): string {
  switch (v) {
    case "local-business":
      return "store visits, calls, bookings, cost-per-lead, review volume, repeat customer rate";
    case "tech-startup":
      return "MQL → SQL conversion, demo bookings, CAC, sign-ups, activation rate, payback period";
    case "ecommerce":
      return "ROAS, AOV, cost-per-acquisition, add-to-cart rate, checkout conversion, repeat purchase rate";
    case "general":
      return "leads, cost-per-lead, click-through rate, landing-page conversion, brand search lift";
  }
}
