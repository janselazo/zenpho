import type { PlacesSearchPlace } from "@/lib/crm/places-types";
import { primaryPlaceTypeLabel } from "@/lib/crm/places-search-ui";
import type { StitchProspectDesignPayload } from "@/lib/crm/stitch-prospect-design-types";

function safe(s: string | null | undefined, max = 800): string {
  const t = (s ?? "").trim().replace(/\s+/g, " ");
  if (!t) return "";
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}

function placeContext(p: PlacesSearchPlace, servicesLine?: string, colorVibe?: string): string {
  const primary = primaryPlaceTypeLabel(p.types);
  const typesLine =
    p.types?.filter(Boolean).slice(0, 8).join(", ") || primary || "local business";
  const lines = [
    `Business name: ${safe(p.name, 200) || "Unknown"}`,
    p.formattedAddress?.trim() ? `Address (Google Business Profile): ${safe(p.formattedAddress, 300)}` : null,
    primary ? `Primary Google category: ${primary}` : null,
    `Google Places types: ${safe(typesLine, 400)}`,
    p.rating != null ? `Google rating: ${p.rating}★ (${p.userRatingCount ?? 0} reviews)` : null,
    p.websiteUri?.trim() ? `Listing website URL (brand reference): ${safe(p.websiteUri, 500)}` : null,
    p.nationalPhoneNumber?.trim() || p.internationalPhoneNumber?.trim()
      ? `Phone on listing: ${safe(p.nationalPhoneNumber || p.internationalPhoneNumber, 40)}`
      : null,
    servicesLine?.trim() ? `Services line (user override): ${safe(servicesLine, 400)}` : null,
    colorVibe?.trim() ? `Visual direction: ${safe(colorVibe, 400)}` : null,
  ];
  return lines.filter(Boolean).join("\n");
}

function urlContext(
  url: string,
  pageTitle?: string | null,
  metaDescription?: string | null,
  servicesLine?: string,
  colorVibe?: string
): string {
  const lines = [
    `Page / brand title: ${safe(pageTitle, 200) || "(none)"}`,
    `Source URL: ${safe(url, 500)}`,
    metaDescription?.trim() ? `Meta description: ${safe(metaDescription, 500)}` : null,
    servicesLine?.trim() ? `Services line (user override): ${safe(servicesLine, 400)}` : null,
    colorVibe?.trim() ? `Visual direction: ${safe(colorVibe, 400)}` : null,
    "Note: No Google Business Profile payload — infer industry from title, URL, and description.",
  ];
  return lines.filter(Boolean).join("\n");
}

export function buildStitchWebsitePrompt(payload: StitchProspectDesignPayload): string {
  const block =
    payload.kind === "place"
      ? placeContext(payload.place, payload.servicesLine, payload.colorVibe)
      : urlContext(
          payload.url,
          payload.pageTitle,
          payload.metaDescription,
          payload.servicesLine,
          payload.colorVibe
        );

  return `${block}

Task: Design a single desktop-width marketing homepage mockup for this business.
Include: strong hero with the real business name, clear value proposition, services or offering section, trust signals where data allows (e.g. rating), and a contact / CTA area.
Style: professional, accessible, modern; typography hierarchy; generous whitespace.
Output as a polished UI design suitable for a client pitch (not wireframe-only).`.trim();
}

export function buildStitchMobilePrompt(payload: StitchProspectDesignPayload): string {
  const block =
    payload.kind === "place"
      ? placeContext(payload.place, payload.servicesLine, payload.colorVibe)
      : urlContext(
          payload.url,
          payload.pageTitle,
          payload.metaDescription,
          payload.servicesLine,
          payload.colorVibe
        );

  const gmb =
    payload.kind === "place"
      ? "Brand identity must align with the Google Business Profile (name, category, and location above). "
      : "Infer brand from the page title, URL, and description. ";

  return `${block}

Task: ${gmb}Design a primary mobile app screen (phone form factor) for this business — e.g. home / hub with clear hierarchy.
Include: app bar or header with business name, 1–2 hero actions appropriate to the industry, and a simple navigation pattern (e.g. bottom nav or prominent primary buttons).
Visual style: contemporary native-mobile patterns (iOS or Material-inspired), readable tap targets, cohesive color system.
Output as a polished mobile UI mockup for a client pitch.`.trim();
}
