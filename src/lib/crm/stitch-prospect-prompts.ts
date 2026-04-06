import type { PlacesSearchPlace } from "@/lib/crm/places-types";
import { primaryPlaceTypeLabel } from "@/lib/crm/places-search-ui";
import type { StitchProspectDesignPayload } from "@/lib/crm/stitch-prospect-design-types";

function safe(s: string | null | undefined, max = 800): string {
  const t = (s ?? "").trim().replace(/\s+/g, " ");
  if (!t) return "";
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}

function placeContext(p: PlacesSearchPlace, colorVibe?: string): string {
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
    colorVibe?.trim() ? `Visual direction: ${safe(colorVibe, 400)}` : null,
  ];
  return lines.filter(Boolean).join("\n");
}

function urlContext(
  url: string,
  pageTitle?: string | null,
  metaDescription?: string | null,
  colorVibe?: string
): string {
  const lines = [
    `Page / brand title: ${safe(pageTitle, 200) || "(none)"}`,
    `Source URL: ${safe(url, 500)}`,
    metaDescription?.trim() ? `Meta description: ${safe(metaDescription, 500)}` : null,
    colorVibe?.trim() ? `Visual direction: ${safe(colorVibe, 400)}` : null,
    "Note: No Google Business Profile payload — infer industry from title, URL, and description.",
  ];
  return lines.filter(Boolean).join("\n");
}

const WEBSITE_VISUAL_CHECKLIST = `
Visual quality (2024–2026 product UI, not a generic template):
- Typography: refined sans or pairing; clear scale (display / H1–H3 / body / caption); comfortable line-height; avoid unstyled default system fonts.
- Color: cohesive palette from Visual direction + context — dominant neutrals, one confident accent for CTAs and active nav; WCAG-minded contrast (no faint gray body text on white).
- Layout: generous whitespace; 8/12/16px rhythm; separate sections with subtle borders, soft tints, or light gradients (CSS only).
- Polish: soft shadows, large radii on cards; optional subtle gradient or mesh hero band; pill-shaped primary buttons.
- Components: inline SVG icons where helpful; styled image placeholders (aspect-ratio, rounded) if no photos.
- Motion: CSS only — transition on :hover / :focus-visible for links and buttons; no JavaScript behavior beyond anchor navigation.`.trim();

export function buildStitchWebsitePrompt(payload: StitchProspectDesignPayload): string {
  const block =
    payload.kind === "place"
      ? placeContext(payload.place, payload.colorVibe)
      : urlContext(payload.url, payload.pageTitle, payload.metaDescription, payload.colorVibe);

  return `${block}

Task: Output **one complete HTML5 document** (desktop-width marketing **multi-page** experience) for this business. All “pages” live in **one file** as full-viewport **sections** with **in-page navigation** — no separate URLs, no client-side router, **no inline \`<script>\`** (Tailwind or other CDN \`<script src>\` is OK if needed). Interactions = **click nav → scroll to section** only.

## Structure checklist (required section \`id\`s)
Each section must be at least **min-height: 100vh** (or equivalent full panel), with **scroll-margin-top** so titles clear a sticky header.

1. **#home** — Hero: real business name, sharp value proposition, primary CTA (Book / Call / Get quote). Prefer **asymmetric or full-bleed** layout — not a tiny centered title-only block; strong typographic or gradient visual anchor.
2. **#services** — Service cards or list **specific to the category** (use Google types / title / description — not generic lorem).
3. **#expertise** — Why us: process steps, credentials, team or certification placeholders, trust copy grounded in the vertical.
4. **#reviews** — If rating/review count exists in context, show them prominently; else credible testimonial-style quotes with initials/roles.
5. **#location** — Hours-style block, map placeholder, contact; **use listing address and phone when provided** above.

## Navigation
- **Sticky or fixed top header** with links: Home, Services, Expertise, Reviews, Location → \`<a href="#home">\`, \`#services\`, \`#expertise\`, \`#reviews\`, \`#location\`.
- In \`<style>\`: \`html { scroll-behavior: smooth; }\` plus section scroll-margin for the header height.

## Copy
Each section must have **unique, substantive copy** tied to the business name, category, and location — **not** repeated placeholder paragraphs across sections.

${WEBSITE_VISUAL_CHECKLIST}

Output: polished, pitch-ready HTML document suitable for a prospect preview.`.trim();
}

const MOBILE_VISUAL_CHECKLIST = `
Visual quality (premium operator app, 2024–2026):
- Optional **dark navy / charcoal shell** with **lavender or mint accent** for active tab and KPI highlights — still harmonize with Visual direction above; do not ignore colorVibe.
- **Top app bar**: circular avatar placeholder, business name (from context), bell / notification icon; polished spacing.
- **Bottom tab bar**: four tabs with **icon + label**; **clear active state** (filled pill, tinted icon, or highlighted background).
- Cards: soft shadow, large radius; labels in small caps or overline style; **realistic fake data** (first names, pet/job types, times, currency) for credibility.
- List rows: optional chevron; three-dot menus as visual affordances; 44px+ tap targets.
- Typography hierarchy and accessible contrast; CSS-only :hover/:focus-visible transitions where useful.
- **No inline \`<script>\`** — navigation is anchor scroll only (CDN \`<script src>\` for Tailwind OK if used).`.trim();

export function buildStitchMobilePrompt(payload: StitchProspectDesignPayload): string {
  const block =
    payload.kind === "place"
      ? placeContext(payload.place, payload.colorVibe)
      : urlContext(payload.url, payload.pageTitle, payload.metaDescription, payload.colorVibe);

  const gmb =
    payload.kind === "place"
      ? "Brand identity must align with the Google Business Profile (name, category, and location above). "
      : "Infer brand from the page title, URL, and description. ";

  return `${block}

Task: ${gmb}Output **one complete HTML5 document** for a **phone-width operator / owner app** (not a consumer marketing site). All “screens” are **vertical full-viewport sections** in **one file**, switched by **bottom nav anchor links** — no router, **no inline \`<script>\`**, \`html { scroll-behavior: smooth; }\` in \`<style>\`.

## Structure checklist (required section \`id\`s)
Each panel **min-height: 100vh**. Add **padding-bottom** on scrollable content and/or **scroll-margin-bottom** so the last lines aren’t hidden behind the fixed tab bar.

1. **#home** (dashboard)
   - KPI row: e.g. status (“Accepting …”) and revenue or bookings today (plausible numbers).
   - **New request / notification** row (e.g. incoming booking) with chevron.
   - **Today’s schedule**: 2–3 list items with small thumbnails or icons, pet/client names, service labels, times; overflow menu dots.
   - Primary action: large **“+ Book”** or similar — **link to \`#book\`** (anchor), not a fake form submit.

2. **#clients**
   - Search or “Add” affordance; scrollable list of **category-appropriate** clients (e.g. pet + owner for grooming, job title for trades — infer from Google types / title).

3. **#book**
   - Week strip or calendar placeholder + time slots or upcoming appointments list; clear book flow visual.

4. **#reviews**
   - Rating summary (use **real stars/review count from context** when present); 1–2 review snippets; CTA row to request reviews (SMS/email copy as label only).

## Bottom navigation (fixed)
Four items: **Home**, **Clients**, **Book**, **Reviews** → \`<a href="#home">\`, \`#clients\`, \`#book\`, \`#reviews\` with inline SVG or icon font via allowed \`<link>\` (e.g. Google Fonts / Material icons).

## Copy
Unique copy per section, tied to the business name and vertical — not the same paragraph repeated.

${MOBILE_VISUAL_CHECKLIST}

Output: polished multi-screen mobile mockup in one HTML file, suitable for a client pitch.`.trim();
}
