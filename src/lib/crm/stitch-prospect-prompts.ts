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
- Motion: CSS only — transition on :hover / :focus-visible for links and buttons; no JavaScript — page changes use the **:target + :has** pattern below, not scroll.`.trim();

export function buildStitchWebsitePrompt(payload: StitchProspectDesignPayload): string {
  const block =
    payload.kind === "place"
      ? placeContext(payload.place, payload.colorVibe)
      : urlContext(payload.url, payload.pageTitle, payload.metaDescription, payload.colorVibe);

  return `${block}

Task: Output **one complete HTML5 document** (desktop-width marketing **multi-page** experience) for this business. Each “page” is a **separate full-viewport screen** inside the same file: **only one page is visible at a time** — **no long single scroll** stacking all pages. **No** separate HTTP URLs, **no** JS router, **no inline \`<script>\`** (Tailwind CDN \`<script src>\` OK). Interaction = **click nav → swap visible page** using **CSS only** (\`:target\` + \`:has\`).

## Page switch pattern (required — copy this behavior in \`<style>\`)
Wrap all page \`<section>\`s in \`<main>\` (or one clear wrapper). Each page: \`<section id="home" class="page">\` … \`</section>\` (ids exactly: \`home\`, \`services\`, \`expertise\`, \`reviews\`, \`location\`).

Use CSS equivalent to:

- Hide every \`.page\` by default; **\`min-height: 100vh\`** per page; **\`overflow-y: auto\`** inside a page if its content is tall (so the **outer document** does not become one giant scroll of all pages).
- **Initial view:** \`body:not(:has(main .page:target)) #home\` **and** \`#home:target\` → \`display: block\` (or flex).
- When \`#services\`, \`#expertise\`, \`#reviews\`, or \`#location\` matches \`:target\`, show that section the same way.
- When a **non-home** page is \`:target\`, hide \`#home\` via \`body:has(#services:target) #home\`, \`body:has(#expertise:target) #home\`, etc.
- **Active nav styling (no JS):** e.g. \`body:has(#services:target) nav a[href="#services"] { font-weight: 700; border-bottom: … }\` (repeat per tab).

Nav links: \`<a href="#home">\`, \`#services\`, \`#expertise\`, \`#reviews\`, \`#location\`. **Do not** rely on \`scroll-behavior\` or stacked \`min-height:100vh\` sections in one scroll — use **show/hide** as above.

## Structure checklist (required \`id\`s on \`<section class="page">\`)
1. **#home** — Hero: real business name, sharp value proposition, primary CTA (Book / Call / Get quote). Prefer **asymmetric or full-bleed** layout; strong typographic or gradient anchor.
2. **#services** — Service cards or list **specific to the category** (use Google types / title / description — not generic lorem).
3. **#expertise** — Why us: process, credentials, team or certification placeholders, trust copy grounded in the vertical.
4. **#reviews** — If rating/review count exists in context, show them prominently; else credible testimonial-style quotes with initials/roles.
5. **#location** — Hours, map placeholder, contact; **use listing address and phone when provided** above.

## Navigation chrome
- **Sticky or fixed top header** with the five anchor links; optional **Book** CTA button as \`<a href="#location">\` or \`tel:\` when phone exists.

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
- **No inline \`<script>\`** — page swap is CSS \`:target\` / \`:has\` only (CDN \`<script src>\` for Tailwind OK if used).`.trim();

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

Task: ${gmb}Output **one complete HTML5 document** for a **phone-width operator / owner app** (not a consumer marketing site). Each tab is a **separate full-screen** — **only one screen visible at a time** (no one long scroll through all tabs). Same file, **no JS router**, **no inline \`<script>\`**.

## Page switch pattern (required — CSS only)
Use \`<section id="home" class="page">\`, \`id="clients"\`, \`id="book"\`, \`id="reviews"\` inside \`<main>\`. CSS same idea as the website prompt:

- All \`.page\` hidden by default; **\`min-height: 100vh\`** (minus fixed chrome); **\`overflow-y: auto\`** on the active page content so **only that tab scrolls**, not the whole document stacked.
- **Default:** show \`#home\` when no hash: \`body:not(:has(main .page:target)) #home\` and \`#home:target\` → visible.
- Show \`#clients\`, \`#book\`, \`#reviews\` when those ids are \`:target\`; when any of those is targeted, **hide** \`#home\` via \`body:has(#clients:target) #home\`, \`body:has(#book:target) #home\`, \`body:has(#reviews:target) #home\`.
- **Bottom tab active state:** \`body:has(#book:target) nav.bottom-tabs a[href="#book"] { … }\` (repeat per tab). Fixed **bottom** nav with four \`<a href="#home">\` … \`#reviews\`.

## Structure checklist (required \`id\`s)
1. **#home** (dashboard)
   - KPI row: status (“Accepting …”) and revenue or bookings today (plausible numbers).
   - **New request** row with chevron.
   - **Today’s schedule**: 2–3 rows with thumbnails/icons, names, services, times.
   - Primary **“+ Book”** as \`<a href="#book">\` (switches tab), not a form submit.

2. **#clients** — Search / add affordance; **category-appropriate** client list.

3. **#book** — Calendar / slots / appointments.

4. **#reviews** — Rating summary from context when available; snippets; request-review CTA row.

## Chrome
- **Fixed top bar** (avatar, business name, bell).
- **Fixed bottom** tab bar: Home, Clients, Book, Reviews → \`<a href="#home">\`, \`#clients\`, \`#book\`, \`#reviews\` with inline SVG or icon \`<link>\` (e.g. Google Fonts / Material icons).

## Copy
Unique copy per section, tied to the business name and vertical — not the same paragraph repeated.

${MOBILE_VISUAL_CHECKLIST}

Output: polished multi-screen mobile mockup in one HTML file, suitable for a client pitch.`.trim();
}
