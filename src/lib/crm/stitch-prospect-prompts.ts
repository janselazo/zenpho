import type { PlacesSearchPlace } from "@/lib/crm/places-types";
import { primaryPlaceTypeLabel } from "@/lib/crm/places-search-ui";
import type { StitchProspectDesignPayload } from "@/lib/crm/stitch-prospect-design-types";

/** Stable hash for picking variation axes (same business → same axes on regenerate). */
function stablePickIndex(seed: string, salt: string, modulo: number): number {
  const combined = `${salt}\0${seed}`;
  let h = 2166136261;
  for (let i = 0; i < combined.length; i++) {
    h ^= combined.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h) % modulo;
}

function prospectUniquenessSeed(payload: StitchProspectDesignPayload): string {
  if (payload.kind === "place") {
    const id = (payload.place.id ?? "").trim();
    const name = (payload.place.name ?? "").trim();
    return `${id}:${name}:${primaryPlaceTypeLabel(payload.place.types)}`;
  }
  try {
    const u = new URL(/^https?:\/\//i.test(payload.url) ? payload.url : `https://${payload.url}`);
    return u.hostname + u.pathname;
  } catch {
    return payload.url.trim() || "url";
  }
}

/** Mandates a concrete aesthetic so outputs diverge between businesses. */
const WEBSITE_ASSIGNED_AESTHETIC_LANES = [
  "Brutalist / raw editorial — stark type, visible grid, few colors",
  "Warm organic & handcrafted — earth tones, soft shapes, tactile texture",
  "Luxury minimal — editorial serif headlines, thin rules, generous air",
  "Retro-futuristic neon — dark base, luminous accent, sharp geometry",
  "Art deco geometric — symmetry, metallic accents, stepped forms",
  "Soft pastel & illustrative — light base, playful shapes, friendly contrast",
  "Industrial utilitarian — steel/concrete neutrals, strong dividers, monospace hints",
  "Magazine editorial — pull quotes, column rhythm, byline-style metadata",
  "Dark moody atmospheric — deep background, one warm highlight, dramatic crop",
  "Vibrant maximalist — bold color blocks, collage energy, confident overlap",
  "Coastal / airy — light blues & sand neutrals, breezy whitespace, soft radii",
  "Heritage craft — deep ink + cream paper, badge motifs, timeless serif",
] as const;

const WEBSITE_ASSIGNED_LAYOUT_MOTIFS = [
  "Asymmetric split hero: copy left (or right), bold visual panel opposite — not centered hero + stock photo",
  "Full-bleed band + overlapping cards that break the rectangle grid",
  "Editorial magazine: multi-column text, oversized headline, one strong pull quote",
  "Minimal centered column: huge display wordmark, sparse lines — almost poster-like",
  "Horizontal top bar + tall hero with stacked proof (stats, badges) under the H1",
  "Z-pattern flow: diagonal or stepped section backgrounds alternating light/dark bands",
  "Bento grid: unequal tiles for services (not three equal cards)",
  "Frosted / layered panels (CSS only) with clear depth — not flat white boxes only",
] as const;

const WEBSITE_ASSIGNED_TYPE_DIRECTIONS = [
  "High-contrast serif display (H1–H2) + clean geometric sans for body",
  "Condensed grotesk headlines + humanist sans body for warmth",
  "Old-style serif for trust + neutral sans UI text",
  "Rounded display for friendly SMB + crisp sans for lists and CTAs",
  "Narrow headline sans + slightly wider body sans (distinct weights, not one family only)",
  "Slab serif accent for section labels + sans for paragraphs",
  "Italic serif quote style for testimonials + sans elsewhere",
] as const;

const WEBSITE_ASSIGNED_HERO_STRUCTURES = [
  "Headline + subhead + dual CTAs; visual is typographic or abstract (gradient mesh, pattern) — not generic stock trio",
  "Headline over full-bleed duotone or gradient wash; nav floats transparent",
  "Stacked: eyebrow, huge name, single CTA; services preview as horizontal scroll row (CSS)",
  "Split with **fake** map or hours card as designed UI (not iframe) beside copy",
  "Hero is mostly whitespace with one asymmetric image mask (clip-path or rounded irregular)",
] as const;

function buildWebsiteAssignedDifferentiationBlock(
  payload: StitchProspectDesignPayload
): string {
  const seed = prospectUniquenessSeed(payload);
  const lane =
    WEBSITE_ASSIGNED_AESTHETIC_LANES[
      stablePickIndex(seed, "lane", WEBSITE_ASSIGNED_AESTHETIC_LANES.length)
    ];
  const layout =
    WEBSITE_ASSIGNED_LAYOUT_MOTIFS[
      stablePickIndex(seed, "layout", WEBSITE_ASSIGNED_LAYOUT_MOTIFS.length)
    ];
  const typeDir =
    WEBSITE_ASSIGNED_TYPE_DIRECTIONS[
      stablePickIndex(seed, "type", WEBSITE_ASSIGNED_TYPE_DIRECTIONS.length)
    ];
  const hero =
    WEBSITE_ASSIGNED_HERO_STRUCTURES[
      stablePickIndex(seed, "hero", WEBSITE_ASSIGNED_HERO_STRUCTURES.length)
    ];

  return `
## Assigned differentiation (mandatory — follow exactly)

Each prospect must look **nothing like a default Stitch/Gemini marketing page**. For **this** business, you MUST commit to:

1. **Aesthetic lane:** ${lane}
2. **Layout motif:** ${layout}
3. **Typography direction:** ${typeDir} — load distinct faces via \`<link>\` to Google Fonts (or similar); **do not** use Inter, Roboto, or Arial as the only fonts.
4. **Hero structure:** ${hero}

**Anti-sameness (hard rules):**
- Do **not** produce the same hero → three equal cards → testimonial strip → footer pattern you would for an unrelated business.
- Do **not** default to purple–blue gradients, generic “three feature icons,” or interchangeable SaaS marketing tropes unless the aesthetic lane explicitly demands neon/tech.
- Vary **section backgrounds** (tint, subtle gradient, texture via CSS, or full-bleed contrast bands) so the page is not one white column wall-to-wall.
- Mention the **business name** in real copy; make **services** specific to the Google category / URL context — not filler lorem.

**Lane + layout execution:** The **Layout motif**, **Hero structure**, and every band inside \`#home\` must express the assigned aesthetic lane — but **never** at the cost of **Layout safety** (see technical brief): headlines and paragraphs stay readable. Decorative overlap or collage is allowed **only** when the lane calls for it **and** copy sits on a scrim or dedicated panel, not under unmasked photos.

If **Visual direction** appears in the context block, harmonize with it; otherwise obey the lane above without drifting to a bland default.
`.trim();
}

function hasExistingWebsite(payload: StitchProspectDesignPayload): boolean {
  if (payload.kind === "place") return Boolean(payload.place.websiteUri?.trim());
  return Boolean(payload.url?.trim());
}

/** When the business already has a website, frame the task as a dramatic upgrade. */
const WEBSITE_REDESIGN_BRIEF = `
## Project brief — website redesign (before → after)

This business **already has a live website** (see "Listing website URL" in context above). Your job is to produce a **dramatically improved, premium redesign** that makes the original look dated by comparison. This will be shown to the business owner as a **before vs after** side-by-side — the contrast must be immediately striking.

### Redesign mandate
- **Study the existing site URL** from context. Identify its weaknesses: generic templates, weak typography, poor visual hierarchy, stock-photo overuse, cramped or bland layout, inconsistent color, missing trust signals.
- **Preserve brand identity**: keep the business name, real services, location, and contact info. Do NOT invent a different business — improve how the **same** content is presented.
- **Elevate everything**: transform the visual language with a confident aesthetic leap. Better font pairing, refined color palette, intentional whitespace, richer depth (shadows, layered surfaces, gradient accents), premium micro-interactions (CSS only), and a clear information hierarchy that guides the eye.
- **Add what the old site lacks**: professional testimonial cards (with star ratings from context when available), a modern gallery/portfolio section with styled placeholders, a polished contact form, clear CTAs with hover states, and a cohesive footer.
- **The new design must look like a $15,000+ custom agency build** next to whatever the current site is. Avoid anything that could be confused with a free Wix/Squarespace template.
`.trim();

/** When the business has no website at all, frame the task as creating their first premium presence. */
const WEBSITE_NEW_PREMIUM_BRIEF = `
## Project brief — first website (no existing site)

This business **does not have a website yet**. You are creating their **flagship online presence from scratch** — the very first impression potential customers will have when they search online. This is a high-stakes opportunity to establish credibility and professionalism.

### New-site mandate
- **Infer the ideal site structure** from the Google Business category and types. A restaurant needs an appetizing hero, menu with prices, reservation CTA, and ambiance gallery. A law firm needs authority-driven headlines, practice area cards, attorney bios, and case results. A salon needs a booking-forward hero, service menu with pricing, stylist profiles, and transformation gallery. Tailor every section to what **this specific business type** needs to convert visitors.
- **Design as a $15,000+ custom agency build**: premium typography with intentional font pairings (load via Google Fonts), a refined color palette derived from the business category's emotional register, generous whitespace, rich visual depth (layered surfaces, subtle shadows, gradient accents), and polished micro-interactions (CSS only).
- **Establish trust from scratch**: prominent rating/review display (from context when available), professional testimonial cards with realistic names and service references, a credibility bar (years in business, certifications, service count), and clear contact/booking CTAs.
- **Content completeness**: every section must have substantive, realistic copy specific to this business — not placeholder lorem. Write headlines, taglines, service descriptions, and testimonial quotes that feel authentic for the category and location.
- **Make it unmistakably custom**: this must look nothing like a template site. The layout, color story, and typography should feel hand-crafted for this one business.
`.trim();

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

/** Creative director layer for marketing sites — precedes technical Task/CSS contract in the prompt. */
const WEBSITE_CREATIVE_DIRECTIVE = `
## Creative direction (local business marketing site)

You are an award-winning web designer and creative director specializing in **local business websites**. Your goal is to design experiences that are visually stunning, highly unique, and completely unlike generic templates.

### Brand identity first
Before designing, deeply understand the business from the context above:
- Business type, name, and location.
- Mood and personality (e.g. cozy & artisan, bold & modern, luxurious & refined, playful & energetic, rustic & authentic).
- Target customer and what makes this business different from competitors.

### Commit to a bold aesthetic direction
The **Assigned differentiation** block above already chose your lane — execute **that** lane, not a generic default. Supplemental examples only (do not ignore the assigned lane):
- Brutalist / raw editorial
- Warm organic & handcrafted
- Luxury minimal with refined typography
- Retro-futuristic neon
- Art deco geometric
- Soft pastel & illustrative
- Industrial & utilitarian
- Magazine-style editorial
- Dark & moody atmospheric
- Vibrant maximalist

Every design must feel made **specifically for this business**.

### Design rules
- **Typography:** Distinctive, characterful font pairings. Avoid Arial, Inter, or Roboto as the only voice. Fonts should reflect the brand personality.
- **Color:** One dominant palette with one sharp accent. 2–3 colors done brilliantly beats six done poorly.
- **Layout:** Break the grid where it serves the brand — asymmetry, diagonal flow, generous negative space — **without** covering body copy with imagery (see **Layout safety** in the technical brief). Overlap is for intentional, legible layers only.
- **Motion:** Subtle surprise via **CSS only** — \`:hover\`, \`:focus-visible\`, transitions (see technical section; no inline \`<script>\`).
- **Imagery:** Describe hero visuals, textures, and decorative elements that add atmosphere (placeholders styled if no photos).

### Map to the five required sections
The technical brief below fixes section ids (\`#home\`, \`#services\`, \`#expertise\`, \`#reviews\`, \`#location\`). **\`#home\`** must still contain a **full homepage** (banner, services, testimonials, gallery, contact, address, footer — see checklist). Other tabs hold **expanded** versions: **booking CTAs** on home and services; full **book / call / directions** on \`#location\`; **story / team / trust** on \`#expertise\`. The result should feel like a **premium custom site**, not a cheap template.
`.trim();

/** Creative director layer for desktop operator web apps — precedes technical Task/CSS contract. */
const WEBAPP_CREATIVE_DIRECTIVE = `
## Creative direction (desktop web application)

You are an award-winning **product designer and creative director** for **vertical SaaS and local-business operations software**. You design **desktop web apps** that feel bespoke to the business’s category — not generic admin templates, not a marketing site. Think Notion, Linear, or Stripe Dashboard in terms of craft — adapted to a local-business vertical.

### Product intent first
From the context block, infer:
- Business type, name, and location (or URL-derived industry).
- **Who operates the app?** (owner, front desk, field tech, etc.)
- **Primary jobs:** schedule/calendar, clients & history, pipeline or revenue signals, day-to-day exceptions (“needs attention”).
- What makes tables and labels **credible for that vertical** — not “User 1 / User 2” placeholder rows.

### Commit to a bold product aesthetic
The **Assigned differentiation** block above already chose your lane — execute **that** lane, not a generic default. Supplemental examples only (do not ignore the assigned lane):
- Dense data-forward — Bloomberg-lite clarity; monospace accents; tight tables.
- Warm craft ops — soft surfaces, paper-like panels, human typography for a service back office.
- Luxury concierge console — restrained palette, editorial type, whitespace around KPIs.
- Industrial / logistics — utilitarian chrome, strong dividers, meaningful status color.
- Retro terminal — dark shell, sharp accents, readable “system” feel.
- Soft clinical — calm neutrals for appointment-heavy verticals without feeling sterile.

Never default to all-gray sidebars, interchangeable KPI cards, or **Inter / Roboto / Arial** as the only voice.

### Design rules (web app)
- **Typography:** Distinctive UI pairing — characterful display or condensed for module titles + readable sans for tables. Load distinct Google Fonts; not “system default only.”
- **Color:** Dominant surfaces + **semantic** accents (success / warning / danger or brand) — 2–4 colors executed well. Sidebar/nav should have a distinct tint or background that anchors the app shell.
- **Layout:** Clear **app shell** (sidebar or top + tabs). **Asymmetry** welcome in the KPI band or dashboard grid — not only three equal cards. Use unequal card sizes to create visual hierarchy.
- **Density:** Match the vertical — scannable rows and clear hierarchy; don’t drown tables in padding.
- **Motion:** Subtle **CSS-only** feedback — row hover with background shift, focus rings, active nav indicator (colored bar or pill) — no JavaScript.
- **Imagery / chrome:** Optional small brand moments (logo mark in sidebar, category-specific empty state illustrations) — **no stock-photo hero**; this is a tool.
- **Depth and surface:** Use layered surfaces (cards on tinted backgrounds), subtle shadows, and border-radius to create a sense of premium craft. Avoid flat, border-only boxes everywhere.
- **Status and feedback:** Color-coded badges, progress indicators, and contextual icons that communicate state at a glance — specific to this business vertical.

### Required views (conceptual — technical ids below)
Align with **Dashboard, Clients, Schedule, Settings** (\`#dash\`, \`#clients\`, \`#schedule\`, \`#settings\`):
1. **Dashboard** — Glanceable health of *today*: KPIs with trend indicators (up/down arrows or sparklines as CSS), exceptions list, chart or summary area with **realistic fake data for the vertical**. At least one KPI card should be visually prominent (larger, accent background).
2. **Clients** — Search/filter bar with styled inputs; **data table** with category-specific columns, row hover states, inline action buttons, and status badges. Minimum 5 realistic rows.
3. **Schedule** — Week/day calendar or time blocks that fit how this business books. Color-coded by service type or status. Include realistic appointment details.
4. **Settings** — Credible grouped sections (profile, notifications, integrations) as structured forms with toggle switches, select dropdowns, and save buttons — not just text inputs.

Aim for a **$50K custom product design** engagement — every pixel should feel intentional.
`.trim();

/** Creative director layer for phone-width operator apps — precedes technical Task/CSS contract. */
const MOBILE_CREATIVE_DIRECTIVE = `
## Creative direction (mobile operator app)

You are an award-winning **mobile product designer** for **operator and owner tools** at local businesses — used **on the floor**, between customers, and in motion. Not consumer marketing splash screens; not desktop shrunk down.

### Context first
From the profile or URL context:
- Business name and category.
- **Moment of use:** quick glance (KPI), interruptible flows, **one-thumb** actions.
- **Trust:** use ratings/reviews from context when provided; **realistic names and times** in lists.

### Commit to a bold mobile aesthetic
The **Assigned differentiation** block above already chose your lane — execute **that** lane, not a generic default. Supplemental examples only (do not ignore the assigned lane):
- Premium quiet — charcoal or warm off-white shell; one vivid accent on active tab and primary CTA.
- Expressive illustrative — bold header pattern tied to the vertical (CSS gradients/shapes; no custom JS).
- Swiss minimal — strict type scale, monochrome + single accent.
- Playful service brand — rounded cards; friendly display font for headers only.
- Neo-glass — layered surfaces and **CSS** blur used sparingly and legibly.

Never default to generic **purple gradients**, cookie-cutter onboarding marketing layouts, or illegible thin gray text on dark backgrounds.

### Design rules (mobile)
- **Typography:** Distinctive **display** for screen titles + legible UI sans for lists. Load distinct Google Fonts; avoid Arial/Inter-only. Type scale must create clear hierarchy between screen titles, card headers, and body text.
- **Color:** Dominant shell + **one** confident accent for primary actions and active tab. Use the accent consistently across CTAs, active states, and key indicators. Background tints should shift subtly between screens for visual variety.
- **Layout:** **Thumb reach** — primary actions in the lower half; **44px+** tap targets. Cards should have generous internal padding and clear visual separation (shadow, border-radius, or background tint).
- **Motion:** CSS-only tab/list/button states — light, delightful. Include press/active states on cards and buttons (scale or background shift). Tab transitions should feel polished.
- **Imagery:** Optional abstract/pattern hero on Home — atmosphere without a photo gallery site. Branded empty states with category-specific icons when appropriate.
- **Depth and surface:** Layered card design with soft shadows, rounded corners (12–16px radius), and subtle background gradients. Avoid flat, borderless cards that blend into the background.
- **Status indicators:** Color-coded badges, dot indicators, and contextual icons that communicate appointment status, client activity, or review sentiment at a glance.

### Required screens (conceptual — technical ids below)
Align with **Home, Clients, Book, Reviews** (\`#home\`, \`#clients\`, \`#book\`, \`#reviews\`):
1. **Home** — Status banner or greeting, today’s numbers as styled KPI pills, **today’s schedule** with 3+ plausible rows (name, service, time, status badge); clear path to **Book** via prominent CTA. Include a subtle brand moment (gradient header, pattern, or illustration).
2. **Clients** — Search bar with styled input; vertical-appropriate list with avatar placeholders, name, last visit, and status. Minimum 4 realistic rows. Include an “Add client” floating action or inline button.
3. **Book** — Calendar strip or date picker; available time slots styled as tappable cards or chips; service type selector. The flow must feel purpose-built for this business type.
4. **Reviews** — Aggregate rating display (large star + number), 2+ review cards with author initial avatar, star rating, and realistic snippet text. Optional “Request review” CTA card at the bottom.

Aim for a **native-quality, App Store-featured** concept — every screen should feel like a polished production app, not a mobile web article dressed as an app.
`.trim();

const WEBSITE_LAYOUT_SAFETY = `
## Layout safety (mandatory — readability over decoration)

- Build heroes and follow-on bands with **CSS Grid or flex**. Place photography in a **dedicated column or card** with **fixed aspect-ratio** — **do not** absolutely position large images on top of headings or body copy.
- **Full-bleed background images** require a **gradient or scrim overlay** and foreground copy in a clear stacking layer with padding; body text must meet **WCAG contrast** against its background.
- **Card or image rows** below the hero must follow **normal document flow** (\`gap\`, \`margin-top\`) — **no negative margins** that pull tiles upward over hero typography.
- Avoid **z-index** stacks that put decorative imagery above text unless the text sits on an intentional overlay panel or scrim. Never obscure the business name or primary value proposition.
`.trim();

const WEBSITE_REFERENCE_PATTERNS = `
## Reference patterns (structural inspiration — not copying other brands)

High-end local-business marketing often uses: **generous whitespace**; **rounded-2xl** (or similar) cards; restrained palettes; **light scrims** on photography where text meets image; clear hierarchy (eyebrow → headline → body); icon + label feature rows; optional **bento-style** image grids. Adapt these **patterns** to **this** business’s industry and assigned lane — unique composition and copy, not a literal clone of any example site.
`.trim();

const WEBSITE_VISUAL_CHECKLIST = `
Visual polish (honor **Assigned differentiation** and **Layout safety**):
- Real font pairing and type scale; WCAG-minded contrast on body copy.
- Depth via shadow, border, or color bands as fits the lane — vary rhythm between bands so every prospect does not look like the same “soft card + pill” kit.
- Inline SVG icons and styled placeholders (\`aspect-ratio\`, rounded masks) when photos are absent.
- **Motion:** CSS only (\`:hover\` / \`:focus-visible\`). **Navigation** uses **:target + :has** below — no inline \`<script>\`.
`.trim();

export function buildStitchWebsitePrompt(payload: StitchProspectDesignPayload): string {
  const block =
    payload.kind === "place"
      ? placeContext(payload.place, payload.colorVibe)
      : urlContext(payload.url, payload.pageTitle, payload.metaDescription, payload.colorVibe);

  const differentiation = buildWebsiteAssignedDifferentiationBlock(payload);
  const situationBrief = hasExistingWebsite(payload)
    ? WEBSITE_REDESIGN_BRIEF
    : WEBSITE_NEW_PREMIUM_BRIEF;

  return `${block}

${situationBrief}

${differentiation}

${WEBSITE_CREATIVE_DIRECTIVE}

Task: Output **one complete HTML5 document** (desktop-width marketing **multi-page** experience) for this business. Each “page” is a **separate full-viewport screen** inside the same file: **only one page is visible at a time** — **no long single scroll** stacking all five sections in one document flow. **No** separate HTTP URLs, **no** JS router, **no inline \`<script>\`** (Tailwind CDN \`<script src>\` OK). Interaction = **click nav → swap visible page** using **CSS only** (\`:target\` + \`:has\`).

**Note on \`#home\`:** The home **screen** is still a single \`section#home.page\`, but it must read like a **full marketing homepage**: stack **all** of the bands below (minimum **seven** content blocks + **footer**), with **internal scrolling** via \`overflow-y: auto\` on that section. Deeper detail can still exist on \`#services\`, \`#reviews\`, and \`#location\` — but **do not** leave \`#home\` as a thin hero only.

${WEBSITE_LAYOUT_SAFETY}

${WEBSITE_REFERENCE_PATTERNS}

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

1. **#home** — One \`section#home.page\` with **seven mandatory homepage blocks** in order (scroll inside this section). Each block must be visually distinct and use **real copy** for this business. Obey **Layout safety** throughout.
   - **(1) Principal banner / hero:** Full-width or split hero: business name, tagline, primary + secondary CTA; optional rating line from context.
   - **(2) Services:** **Services overview** — 3–6 cards or categorized rows (industry-specific names, short blurbs or “from $”); \`<a href="#services">\` to the full Services page.
   - **(3) Testimonials:** **Testimonials** — at least **two** quotes (cards or columns), stars, optional aggregate rating from context; \`<a href="#reviews">\` for more reviews.
   - **(4) Gallery:** **Gallery** — bento or grid of 3–5 images (placeholders + captions OK); use grid + \`aspect-ratio\`, no text/image overlap.
   - **(5) Contact us:** **Contact** — section title “Contact us” / “Get in touch”: static form fields (name, email, phone, message) **without** JS submit — use \`mailto:\` / \`tel:\` on buttons or labels, or purely visual form chrome.
   - **(6) Our address:** **Address / visit us** — full address, hours summary, phone, map or map-style placeholder; \`<a href="#location">\` for full details.
   - **(7) Footer:** **Site footer** — business name, mini nav (\`#services\`, \`#expertise\`, \`#reviews\`, \`#location\`), optional Privacy/Terms placeholders, **© year + business name**; footer styling (e.g. dark band) at the **bottom of \`#home\` only** (global nav stays in the header).

2. **#services** — A **different** layout than home: multi-column **priced menu**, categorized lists, or tiered packages (columns or sections with headings). Industry-specific service names and price cues; not the same three cards repeated from \`#home\`.

3. **#expertise** — **Story + proof:** Headline, 2–3 proof points (icons or short paragraphs), optional stat row (years, certifications, review count from context). Two-column (copy + image placeholder) welcome; distinct from \`#services\` and \`#reviews\`.

4. **#reviews** — **Testimonial cards** (2+ quotes) plus an aggregate line if rating/review count exists in context; author initials, role, or neighborhood. Layout must differ from \`#expertise\` (e.g. card grid vs. long-form story).

5. **#location** — **Split layout:** Address, hours, phone; **map or map-style placeholder**; **Get directions** or **Book** CTA; optional compact contact row. Use **listing address and phone** from context when provided.

## Navigation chrome
- **Sticky or fixed top header** with the five anchor links; optional **Book** CTA button as \`<a href="#location">\` or \`tel:\` when phone exists.

## Copy
Each section must have **unique, substantive copy** tied to the business name, category, and location — **not** repeated placeholder paragraphs across sections.

${WEBSITE_VISUAL_CHECKLIST}

Output: polished, pitch-ready HTML document suitable for a prospect preview.`.trim();
}

const WEBAPP_ASSIGNED_AESTHETIC_LANES = [
  "Dense data-forward — Bloomberg-lite clarity, monospace accents, tight tables, dark or neutral shell with vivid status colors",
  "Warm craft ops — soft surfaces, paper-like panels, humanist typography, earthy palette for a service back office",
  "Luxury concierge console — restrained dark palette, editorial serif for module titles, generous whitespace around KPIs",
  "Industrial / logistics — utilitarian chrome, strong dividers, meaningful status color bands, condensed grotesk type",
  "Retro terminal — dark shell with phosphor-green or amber accents, monospace UI, sharp geometry, readable 'system' feel",
  "Soft clinical — calm neutrals (warm gray + white), pastel accent for appointments, clean sans-serif, zero visual clutter",
  "Modern SaaS vibrant — white canvas with one bold brand color, rounded surfaces, playful iconography, generous padding",
  "Neo-brutalist product — stark black/white contrast, visible grid, oversized labels, raw functional aesthetic",
  "Glassmorphic layered — frosted panels over subtle gradient backdrop, depth via blur and translucency (CSS only), refined type",
  "Editorial dashboard — magazine-quality type hierarchy, large display numbers for KPIs, column-rhythm layout, serif accent headings",
] as const;

const WEBAPP_ASSIGNED_LAYOUT_MOTIFS = [
  "Narrow left sidebar (icon + label) with full-width main canvas; KPI band spans top of main area as horizontal stat cards",
  "Compact top bar + vertical secondary tabs in left rail; main area has split pane (list left, detail right)",
  "Wide sidebar with grouped nav sections and mini-profile; main canvas uses bento grid for dashboard cards",
  "Minimal icon-only sidebar that expands on hover; main area features stacked full-width sections with alternating backgrounds",
  "Top horizontal nav bar with pill tabs; main content uses a three-column layout (filters, list, detail preview)",
  "Dark sidebar with accent line on active item; main area has card-based layout with unequal tile sizes for visual hierarchy",
] as const;

const WEBAPP_ASSIGNED_TYPE_DIRECTIONS = [
  "Condensed grotesk for sidebar and labels + wide humanist sans for data tables and body",
  "Geometric sans for nav and headings + monospace for values, timestamps, and status codes",
  "Rounded display for module titles + compact sans for dense table rows",
  "Editorial serif for dashboard headlines and KPI labels + clean sans for UI chrome and forms",
  "Slab serif accent for section headers + neutral sans for everything else — industrial weight contrast",
  "Narrow sans for sidebar labels + slightly wider sans for main content — distinct weights create hierarchy",
] as const;

function buildWebAppAssignedDifferentiationBlock(
  payload: StitchProspectDesignPayload
): string {
  const seed = prospectUniquenessSeed(payload);
  const lane =
    WEBAPP_ASSIGNED_AESTHETIC_LANES[
      stablePickIndex(seed, "webapp-lane", WEBAPP_ASSIGNED_AESTHETIC_LANES.length)
    ];
  const layout =
    WEBAPP_ASSIGNED_LAYOUT_MOTIFS[
      stablePickIndex(seed, "webapp-layout", WEBAPP_ASSIGNED_LAYOUT_MOTIFS.length)
    ];
  const typeDir =
    WEBAPP_ASSIGNED_TYPE_DIRECTIONS[
      stablePickIndex(seed, "webapp-type", WEBAPP_ASSIGNED_TYPE_DIRECTIONS.length)
    ];

  return `
## Assigned differentiation (mandatory — follow exactly)

Each prospect's web app must look **nothing like a generic admin template**. For **this** business, you MUST commit to:

1. **Aesthetic lane:** ${lane}
2. **Layout motif:** ${layout}
3. **Typography direction:** ${typeDir} — load distinct faces via \`<link>\` to Google Fonts; **do not** use Inter, Roboto, or Arial as the only fonts.

**Anti-sameness (hard rules):**
- Do **not** produce the same gray sidebar → three equal KPI cards → generic table pattern you would for an unrelated business.
- Do **not** default to all-white backgrounds with thin gray borders everywhere — use the lane's color story for depth (tinted surfaces, accent panels, contrasting sidebar).
- **Data must be realistic**: use plausible names, dates, service types, prices, and statuses specific to this business vertical — not "User 1", "Item A", or placeholder lorem.
- **Empty states** (if shown) must be category-specific with relevant illustration or icon, not a generic "no data" box.
- The sidebar, nav, and chrome must express the assigned lane — color, type, and density should feel intentional, not default.

Design as if this were a **$50K custom SaaS product** — polished onboarding states, refined data visualization, intentional empty states, premium iconography, and a cohesive visual system throughout.

If **Visual direction** appears in the context block, harmonize with it; otherwise obey the lane above.
`.trim();
}

const WEBAPP_LAYOUT_SAFETY = `
## Layout safety (mandatory — product UI readability)

- **App shell** must have clear visual separation between sidebar/nav and main content area — use border, background tint, or shadow; not just whitespace.
- **Data tables** must have proper column alignment, adequate row height (min 40px), and alternating row tint or clear dividers for scanability.
- **KPI cards** must have sufficient internal padding and readable number sizes; do not cram metrics into tiny boxes.
- **Forms** in Settings must use standard input sizing (min 36px height), clear labels, and grouped sections with visible headings.
- Text must meet **WCAG contrast** against its background in every panel — especially sidebar text on tinted backgrounds.
`.trim();

const WEBAPP_VISUAL_CHECKLIST = `
Visual quality (desktop web product, 2024–2026):
- **App shell:** fixed **left sidebar** (icon + label nav) or compact top bar + secondary tabs — not a marketing hero page.
- **Density:** data tables, KPI stat cards, filter row, pagination or list affordances; realistic placeholder rows (names, dates, statuses, currency) for the vertical.
- Typography and color: cohesive from Visual direction; confident accent on primary actions and active nav item; WCAG-minded contrast.
- Cards, soft shadows, large radii; optional subtle sidebar tint vs main canvas.
- **No inline \`<script>\`** — view swap is CSS \`:target\` / \`:has\` only (Tailwind CDN \`<script src>\` OK).`.trim();

/** Desktop-width **web application** UI (operator / back-office), not a marketing website. */
export function buildStitchWebAppPrompt(payload: StitchProspectDesignPayload): string {
  const block =
    payload.kind === "place"
      ? placeContext(payload.place, payload.colorVibe)
      : urlContext(payload.url, payload.pageTitle, payload.metaDescription, payload.colorVibe);

  const differentiation = buildWebAppAssignedDifferentiationBlock(payload);

  const gmb =
    payload.kind === "place"
      ? "Brand identity must align with the Google Business Profile (name, category, and location above). "
      : "Infer industry from the page title, URL, and description. ";

  return `${block}

${differentiation}

${WEBAPP_CREATIVE_DIRECTIVE}

${WEBAPP_LAYOUT_SAFETY}

Task: ${gmb}Output **one complete HTML5 document** for a **desktop web application** (browser-width product UI) for staff/operators of this business — **not** a public marketing site and **not** a phone mockup. Think **SaaS-style dashboard**: sidebar navigation, main canvas with tables and metrics.

Each main **view** is a full main-area panel; **only one view visible at a time** in the content region. **No** JS router, **no inline \`<script>\`**.

## Page switch pattern (CSS only)
Use a layout with **sidebar** links and \`<main>\` containing \`<section id="dash" class="page">\`, \`id="clients"\`, \`id="schedule"\`, \`id="settings"\` (exact ids). Same \`:target\` + \`:has\` show/hide as the website prompt:

- \`.page\` panels hidden by default; **\`min-height\`** fills the main area below any top bar; **\`overflow-y: auto\`** on the active panel.
- Default show \`#dash\` when no hash; other ids when targeted; hide \`#dash\` when \`#clients\`, \`#schedule\`, or \`#settings\` is \`:target\`.
- **Active sidebar link** styling via \`body:has(#clients:target) aside a[href="#clients"]\`, etc.

Sidebar labels: **Dashboard**, **Clients**, **Schedule**, **Settings** → \`<a href="#dash">\`, \`#clients\`, \`#schedule\`, \`#settings\`.

## Structure checklist
1. **#dash** — Row of KPI cards (e.g. today’s bookings, revenue or pipeline, open tasks); chart or table placeholder; “needs attention” list with realistic items for the category.
2. **#clients** — Search/filter bar; **data table** (name, last visit, status, action); category-appropriate columns (e.g. pet + owner for grooming).
3. **#schedule** — Week or day calendar strip + time blocks or appointment list.
4. **#settings** — Sections for business profile, notifications, integrations (placeholders only).

## Copy
Unique copy per view, tied to business name and vertical — not generic lorem repeated everywhere.

${WEBAPP_VISUAL_CHECKLIST}

Output: polished desktop web-app mockup in one HTML file for a client pitch.`.trim();
}

const MOBILE_ASSIGNED_AESTHETIC_LANES = [
  "Premium quiet — charcoal or warm off-white shell, one vivid accent on active tab and primary CTA, refined spacing",
  "Expressive illustrative — bold header gradient or pattern tied to the vertical (CSS only), vibrant cards, playful energy",
  "Swiss minimal — strict type scale, monochrome + single accent color, geometric precision, zero decorative noise",
  "Playful service brand — rounded cards with generous radius, friendly display font for headers, warm palette",
  "Neo-glass — layered frosted surfaces with CSS blur, translucent panels over subtle gradient, depth without clutter",
  "Dark luxe — deep charcoal or navy shell, gold/copper/warm accent, editorial serif for screen titles, premium feel",
  "Warm earth — cream and terracotta palette, organic shapes, hand-crafted feel for artisan/service businesses",
  "Tech-forward — cool blue-gray shell, neon accent for CTAs, monospace timestamps, dashboard-grade density",
  "Soft pastel — light mint/lavender/peach shell, rounded everything, friendly and approachable for consumer-facing ops",
  "Bold editorial — high-contrast black/white with one vivid accent, large display type, magazine-quality hierarchy",
] as const;

const MOBILE_ASSIGNED_LAYOUT_MOTIFS = [
  "Large hero card on Home with gradient or brand pattern; below it, horizontal scrollable chips for quick actions; vertical list for today’s schedule",
  "Compact KPI row at top (two stat pills); full-width action card below; stacked list cards with avatar + detail + chevron",
  "Status banner with icon + message; bento grid of 2×2 action tiles below; scrollable appointment timeline",
  "Minimal header with business name; segmented control (toggle) for view modes; clean vertical list with inline status badges",
  "Full-bleed gradient header with overlay stats; below-fold cards with rounded tops that overlap the header edge (CSS only)",
  "Tab-scoped header that changes color/pattern per screen; content area uses card stacks with subtle shadow depth",
] as const;

const MOBILE_ASSIGNED_TYPE_DIRECTIONS = [
  "Display serif for screen titles + compact geometric sans for list items and labels",
  "Rounded display sans for headers + clean neutral sans for body — friendly without being childish",
  "Condensed grotesk for screen titles + wide humanist sans for card content — efficient and warm",
  "Bold geometric sans for nav labels + light-weight sans for body text — strong hierarchy through weight alone",
  "Slab serif for section headers + monospace for timestamps and values + sans for everything else",
  "Narrow display for screen titles + slightly wider sans for card text — compact energy",
] as const;

function buildMobileAssignedDifferentiationBlock(
  payload: StitchProspectDesignPayload
): string {
  const seed = prospectUniquenessSeed(payload);
  const lane =
    MOBILE_ASSIGNED_AESTHETIC_LANES[
      stablePickIndex(seed, "mobile-lane", MOBILE_ASSIGNED_AESTHETIC_LANES.length)
    ];
  const layout =
    MOBILE_ASSIGNED_LAYOUT_MOTIFS[
      stablePickIndex(seed, "mobile-layout", MOBILE_ASSIGNED_LAYOUT_MOTIFS.length)
    ];
  const typeDir =
    MOBILE_ASSIGNED_TYPE_DIRECTIONS[
      stablePickIndex(seed, "mobile-type", MOBILE_ASSIGNED_TYPE_DIRECTIONS.length)
    ];

  return `
## Assigned differentiation (mandatory — follow exactly)

Each prospect’s mobile app must look **nothing like a generic mobile template**. For **this** business, you MUST commit to:

1. **Aesthetic lane:** ${lane}
2. **Layout motif:** ${layout}
3. **Typography direction:** ${typeDir} — load distinct faces via \`<link>\` to Google Fonts; **do not** use Inter, Roboto, or Arial as the only fonts.

**Anti-sameness (hard rules):**
- Do **not** produce the same white background → three equal cards → generic list pattern you would for an unrelated business.
- Do **not** default to purple gradients, stock illustration heroes, or thin gray text on white.
- **Data must be realistic**: use plausible names, service types, times, and amounts specific to this business vertical — not “User 1”, “Service A”, or placeholder text.
- The top bar, bottom tabs, and cards must express the assigned lane — color, type, and composition should feel intentional.
- **Card design** must vary: use different card sizes, accent borders, or icon treatments across screens — not identical rectangles everywhere.

Design as a **native-quality, App Store-featured concept** — fluid visual transitions (CSS only), polished card compositions, intentional micro-typography, and a cohesive color story.

If **Visual direction** appears in the context block, harmonize with it; otherwise obey the lane above.
`.trim();
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

  const differentiation = buildMobileAssignedDifferentiationBlock(payload);

  const gmb =
    payload.kind === "place"
      ? "Brand identity must align with the Google Business Profile (name, category, and location above). "
      : "Infer brand from the page title, URL, and description. ";

  return `${block}

${differentiation}

${MOBILE_CREATIVE_DIRECTIVE}

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
