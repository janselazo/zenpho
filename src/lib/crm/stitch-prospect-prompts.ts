import type { PlacesSearchPlace } from "@/lib/crm/places-types";
import { primaryPlaceTypeLabel } from "@/lib/crm/places-search-ui";
import type { StitchProspectDesignPayload } from "@/lib/crm/stitch-prospect-design-types";
import type { BrandColorResult } from "@/lib/crm/brand-color-extract";

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
  "Brutalist luxe — stark display type at 80px+ for the hero headline, visible 12-column grid, near-black (#111) and ivory (#fefcf3) only, raw editorial energy with luxury spacing (48px+ section gaps), thick accent borders (4px) on key elements, every section a bold visual statement",
  "Warm artisan atelier — warm linen (#faf6f0) base, terracotta (#c47d5a) and sage (#8fae7e) accents, editorial serif headings (Cormorant or Playfair Display at 48px+), hand-crafted card depth via stacked box-shadows, soft organic shapes (clip-path or border-radius: 40% 60%), every surface feels tactile and expensive",
  "Luxury minimal — ivory (#fffdf8) canvas with deep charcoal text, ultra-thin hairline rules, editorial serif headlines at 64px+ with generous letter-spacing, one muted accent (dusty rose or champagne), massive whitespace (80px+ between sections), layered shadows on cards, the design breathes authority through restraint",
  "Midnight neon — near-black (#0a0a12) base, vivid neon accent (electric cyan #00f0ff or magenta #ff006e), sharp geometric forms, text that glows (subtle box-shadow on headings with accent color at 30% opacity), frosted glass cards with backdrop-filter blur, the hero section alone should stop the scroll",
  "Art deco grandeur — deep navy (#1a1a3e) or charcoal with gold (#d4a574) accents, symmetric stepped forms and decorative borders, geometric SVG patterns as section dividers, display serif with elegant ligatures, layered surfaces with gold-tinted shadows, every section framed like a premium print advertisement",
  "Soft pastel luxury — creamy off-white (#fdf8f4) base with one confident pastel accent (blush #f8b4b4, sage #a8c5a0, or lavender #b8a9d4), playful rounded shapes (20px+ radius), multi-layered card shadows, friendly display font for headlines + clean sans for body, illustrations via CSS shapes, the design feels approachable yet undeniably premium",
  "Industrial premium — slate (#2d3436) and concrete (#dfe6e9) palette with copper (#b87333) or amber accent, strong 2px dividers between sections, condensed grotesk headlines at 56px+, monospace accents for stats and testimonial metadata, exposed grid structure that feels intentional, depth via heavy layered shadows and surface tints",
  "Editorial magazine — cream (#fefcf0) canvas, refined serif headlines at 72px+ with tight leading, pull-quote styling on testimonials (large italic serif + thin rule above/below), multi-column text where appropriate, byline-style metadata (small caps, muted color), the layout reads like a premium print magazine spread, not a web template",
  "Dark atmospheric — deep gradient background (#0f0f1a to #1a1028), one warm jewel-tone accent (amber #f59e0b, rose #f43f5e, or emerald #10b981), dramatic hero with full-bleed dark gradient + large luminous headline, content sections on floating dark cards with subtle borders and layered shadows, atmospheric depth that makes the business feel exclusive and sophisticated",
  "Vibrant maximalist — bold full-bleed color blocks per section (alternating deep + vivid), confident overlap compositions where cards break section boundaries, large display type at 80px+ in contrasting color, collage energy with intentional layering (CSS only), the design is loud, confident, and impossible to ignore — for bold brands only",
  "Coastal resort — warm sand (#f5f0eb) and sea-blue (#3b82a0) palette, airy whitespace (64px+ between sections), soft rounded cards (24px radius) with delicate shadows, light display sans for headlines, breezy horizontal rules, image placeholders with beach-inspired aspect ratios (3:2, 16:9), the design evokes relaxation and premium seaside luxury",
  "Heritage atelier — deep ink (#1a1a2e) hero + cream (#fdf5e6) content sections, vintage badge/crest motifs via CSS borders and SVG, timeless serif at 56px+ for headlines, copper or gold accent for CTAs and decorative elements, textured backgrounds (CSS gradient noise), the design communicates decades of expertise and trustworthiness without looking dated",
] as const;

const WEBSITE_ASSIGNED_LAYOUT_MOTIFS = [
  "Asymmetric split hero (60/40): bold headline + dual CTAs on the wide side, styled image placeholder or decorative element on the narrow side; services below as bento grid with one dominant card (2x size); alternating section backgrounds for rhythm",
  "Full-bleed hero band (gradient or brand color, 80vh tall) with floating white content cards that overlap the hero edge by -48px (negative margin), creating premium depth; services as overlapping card cascade; review section with offset testimonial cards",
  "Editorial magazine: multi-column text with pull-quote accents, oversized display headline (80px+), thin decorative rules between sections, byline-style metadata on testimonials, the whole page reads like a premium print spread",
  "Centered elegance: huge display wordmark in the hero (100px+ headline), minimal lines, maximum whitespace; services as a single centered column of alternating text-left/text-right cards with image placeholders; reviews as large single-card spotlight carousel",
  "Stacked proof hero: tall hero with headline, then a floating credibility bar (stats, rating badge, trust signals) that overlaps the hero-to-content transition; below: services in tiered packages (3-column price comparison layout); reviews with large star display",
  "Z-pattern flow: diagonal or angled section backgrounds (CSS clip-path or skew transforms on pseudo-elements) alternating light/dark bands; each section feels like a distinct scene; services and reviews use different card styles per section to create visual variety",
  "Bento dashboard: unequal tile grid for services (one large featured tile, 3-4 smaller tiles around it), gallery as a masonry grid with hover overlays, reviews as an asymmetric card layout — nothing is the same size, creating editorial dynamism",
  "Layered glass: frosted panels (backdrop-filter blur) over a subtle gradient or brand-color base, cards float on the surface with visible depth (multi-layered box-shadow), the design has a sophisticated 3D quality that cheap templates never achieve",
  "Immersive dark hero (full-bleed dark gradient, 90vh) with luminous headline and CTA in light/accent colors; scroll reveals content on a contrasting light canvas; the dark-to-light transition with overlapping elements creates a cinematic reveal",
  "Split-screen sections: each major section uses a 50/50 split (text on one side, visual on the other, alternating sides); the hero is a dramatic full-bleed split; generous 40px+ padding inside each half; creates a magazine-editorial rhythm throughout",
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
  "Dramatic typography hero: oversized headline (72–100px display font) + tagline + dual CTAs (primary gradient/filled + secondary ghost); visual element is a CSS gradient mesh, abstract shapes, or decorative pattern — NO generic stock photo. Floating rating badge or trust signal overlaps the hero edge. The headline alone should stop the scroll.",
  "Full-bleed immersive: dark gradient or duotone wash spanning 80vh+, nav floats transparent over it, large luminous headline in light/accent color, subtle CSS animation on the gradient (background-position shift), CTA buttons with glow effect (box-shadow with accent at 30% opacity). Below the fold, white content cards overlap the dark zone by -40px.",
  "Stacked authority: eyebrow label (small caps, accent color) → massive business name (80px+ display) → one-line tagline → single prominent CTA button. Below: a horizontal proof strip with 3–4 trust signals (rating stars, years in business, review count, certifications) in styled pill badges. Services preview as a horizontal scroll of cards (CSS overflow-x).",
  "Split composition (60/40): headline + subhead + Book Now CTA on the larger side; the smaller side has a designed UI card (fake booking widget, hours table, or styled map placeholder with brand colors — NOT an iframe). The card has premium shadow depth and rounded corners. Creates the feeling that the website IS the product.",
  "Whitespace statement: hero is 70% intentional whitespace with one bold asymmetric image placeholder (clip-path polygon or organic border-radius), large headline offset to one side, single CTA. The restraint itself communicates luxury. Below the fold, content enters with generous spacing.",
  "Layered depth hero: three visual layers — background (gradient or brand color), mid-ground (frosted glass panel with headline and CTAs, backdrop-filter blur), foreground (floating badge or decorative element). The parallax-like depth creates a cinematic opening that feels custom-built, not templated.",
  "Bold centered hero: massive centered headline (96px+), animated gradient text fill (CSS background-clip: text), short tagline below, dual CTAs, then a wide decorative band with CSS gradient or pattern below the hero. The typography IS the visual — no need for imagery when the type is this confident.",
  "Hero with floating testimonial: standard split or centered hero with headline + CTA, BUT a premium testimonial card (5 stars, author name, real quote) is positioned as a floating element overlapping the hero-to-content boundary. Social proof is the first thing visitors see after the headline.",
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

**Brand color override:** If a "Brand Identity Colors" section appears above, those extracted hex values **override** the lane's color suggestions. Keep the lane's layout, typography, and composition rules but re-skin the color palette to match the client's actual brand. The prospect must instantly recognize their own brand identity in the design.
`.trim();
}

function hasExistingWebsite(payload: StitchProspectDesignPayload): boolean {
  if (payload.kind === "place") return Boolean(payload.place.websiteUri?.trim());
  return Boolean(payload.url?.trim());
}

/** When the business already has a website, frame the task as a dramatic upgrade. */
const WEBSITE_REDESIGN_BRIEF = `
## Project brief — website redesign (before → after)

This business **already has a live website** (see "Listing website URL" in context above). Your job is to produce a **breathtakingly superior redesign** that makes the original look amateur by comparison. This will be shown to the business owner as a **before vs after** side-by-side — the contrast must be **so dramatic** that they feel embarrassed by their current site and desperate to upgrade.

### Redesign mandate
- **Study the existing site URL** from context. Identify every weakness: generic templates, weak typography, poor visual hierarchy, stock-photo overuse, cramped or bland layout, inconsistent color, missing trust signals, lack of depth, no hover states, no visual rhythm.
- **Preserve brand identity**: keep the business name, real services, location, and contact info. Do NOT invent a different business — show how the **same** content transforms when designed by a world-class team.
- **Elevate EVERYTHING dramatically:**
  - **Typography:** From generic system fonts → premium Google Font pairings with 64px+ display headlines, clear type scale, elegant letter-spacing.
  - **Color:** From random or bland colors → a refined, intentional palette with one confident accent. At least one CSS gradient usage.
  - **Layout:** From cramped template → generous whitespace (48px+ between sections), asymmetric compositions, varied section backgrounds that create scroll rhythm.
  - **Depth:** From flat boxes → layered surfaces with multi-layered box-shadows, floating cards with rounded corners, overlapping elements at section boundaries.
  - **Trust:** From missing or weak → prominent star rating display, premium testimonial cards with avatars, credibility bar (years in business, certifications).
  - **Interactions:** From static → CSS hover states on every card, button, and link (shadow lift, scale, color shift).
- **Add what the old site lacks**: premium gallery/portfolio section, booking page with visual calendar, a full About Us story page, polished contact form with styled inputs.
- **The new design must look like a $50,000+ custom agency build** — the kind of site that wins design awards. The business owner should see it and think "THIS is how my business should look online."
`.trim();

/** When the business has no website at all, frame the task as creating their first premium presence. */
const WEBSITE_NEW_PREMIUM_BRIEF = `
## Project brief — first website (no existing site)

This business **does not have a website yet**. You are creating their **flagship online presence from scratch** — this is the single most important digital asset they will ever own. When potential customers Google this business and find this site, it must instantly communicate: professional, trustworthy, premium, established.

### New-site mandate
- **Infer the ideal site structure** from the Google Business category and types. A restaurant needs an appetizing dark-toned hero, menu with prices in styled cards, reservation CTA, and ambiance gallery. A law firm needs authority-driven serif headlines, practice area cards with icons, attorney bios, and case results. A salon needs a booking-forward hero with gradient accent, service menu with pricing tiers, stylist profiles, and transformation gallery. Tailor every section to what **this specific business type** needs to convert visitors.
- **Design as a $50,000+ custom agency build** that wins design awards:
  - **Typography:** 2+ premium Google Font pairings with 64px+ display headlines, clear hierarchy from H1 to body. The fonts alone should communicate the brand personality.
  - **Color:** A refined palette derived from the business category's emotional register, with one confident accent color. At least one CSS gradient (hero, CTA, or section band).
  - **Layout:** Generous whitespace (48px+ between sections), asymmetric compositions, varied section backgrounds creating scroll rhythm (light → dark → tinted → light). No two consecutive sections with the same background.
  - **Depth:** Every card and panel floats with multi-layered box-shadow. Overlapping elements at section boundaries. 3-level surface depth system throughout.
  - **Interactions:** CSS hover states on every interactive element — shadow lift on cards, color shift on buttons, scale on gallery items.
- **Establish trust from day one**: prominent Google rating display (from context when available), premium testimonial cards with author avatars and realistic quotes, credibility indicators (years of experience, certifications, service count), and clear booking/contact CTAs.
- **Content completeness**: every section must have **substantive, realistic copy** specific to this business — not placeholder lorem. Write headlines, taglines, service descriptions, and testimonial quotes that feel authentic for the category and location.
- **Make it unmistakably custom**: this must look NOTHING like a template. The layout, color story, typography, and depth should make it impossible to confuse with a $49 Wix theme. The business owner should see this and immediately feel that **this IS their brand**.
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

/**
 * Builds a mandatory branding block when brand colors were extracted from
 * the business\u2019s existing website or logo. Injected into every prompt type.
 */
function buildBrandColorDirective(colors: BrandColorResult | null | undefined): string {
  if (!colors?.primary) return "";
  const lines = [
    "## Brand Identity Colors (MANDATORY)",
    "",
    "We extracted these colors from the business\u2019s **existing website or logo**. You **MUST** use them as the foundation of your design \u2014 they are the client\u2019s actual brand identity.",
    "",
    `**Primary brand color:** ${colors.primary}`,
  ];
  if (colors.accent) {
    lines.push(`**Secondary/accent color:** ${colors.accent}`);
  }
  if (colors.palette.length > 2) {
    lines.push(`**Full extracted palette:** ${colors.palette.join(", ")}`);
  }
  lines.push("");
  lines.push("**Rules:**");
  lines.push("- Use the **primary brand color** as the dominant accent throughout \u2014 nav highlights, CTAs, headers/hero backgrounds, link colors, active states, and badge accents.");
  lines.push("- Use the **secondary color** (if present) for supporting elements \u2014 hover states, secondary buttons, borders, chart accents, or gradient endpoints.");
  lines.push("- Derive tints and shades from the brand palette for backgrounds, card tints, and subtle accents (e.g. 10% opacity of primary for card backgrounds).");
  lines.push("- **Do NOT ignore these colors** and substitute a generic blue/purple/teal. The prospect must instantly recognize their own brand in the design.");
  lines.push("- Neutrals (backgrounds, text, borders) should complement the brand palette \u2014 warm neutrals for warm brands, cool neutrals for cool brands.");
  lines.push("- If the extracted palette is dark/saturated, you may lighten it for backgrounds but keep the hue family consistent.");
  lines.push("");
  return lines.join("\n");
}

/** Creative director layer for marketing sites — precedes technical Task/CSS contract in the prompt. */
const WEBSITE_CREATIVE_DIRECTIVE = `
## Creative direction (local business marketing site)

You are an **award-winning creative director** at a **luxury web design agency** specializing in local business websites that convert visitors into customers. Your designs have won Awwwards, CSS Design Awards, and FWA nominations. You do NOT produce template websites — every site you create is a **$50,000+ custom build** that makes the business owner proud and makes competitors jealous.

### Brand identity first
Before designing, deeply understand the business from the context above:
- Business type, name, and location.
- Mood and personality (e.g. cozy & artisan, bold & modern, luxurious & refined, playful & energetic, rustic & authentic).
- Target customer and what makes this business different from competitors.
- **Emotional register:** What should a visitor FEEL within 3 seconds of landing? Trust? Excitement? Warmth? Exclusivity? Design for that emotion.

### Commit to a bold aesthetic direction
The **Assigned differentiation** block above already chose your lane — execute **that** lane with maximum conviction. Do NOT water it down into a generic template.

Every design must feel made **specifically for this one business** — as if a creative team spent weeks crafting it.

### Design rules (mandatory)
- **Typography:** 2+ distinct Google Font families loaded via \`<link>\`. A characterful display font for headlines (48px+ on hero, 32px+ on section titles) + a readable sans or serif for body. The font pairing alone should communicate the brand personality. **Never** use Arial, Inter, or Roboto as the only font.
- **Color:** One dominant palette with one sharp accent. 2–3 colors executed brilliantly. The accent must appear on CTAs, interactive states, and key visual moments. At least one element must use a **CSS gradient** (hero background, CTA button, section divider, or accent card).
- **Layout:** Break the grid where it serves the brand — asymmetry, diagonal flow, generous negative space. Section backgrounds must **vary** (tint, gradient, dark band, texture via CSS) — never one white column wall-to-wall. Obey **Layout safety** in the technical brief.
- **Motion:** Subtle surprise via **CSS only** — \`:hover\` scale/shadow lift on cards, color shift on CTAs, \`:focus-visible\` rings. Every interactive element must have a visible hover state.
- **Imagery:** Styled image placeholders with \`aspect-ratio\`, rounded masks, and CSS gradient overlays when photos are absent. Decorative elements (CSS shapes, gradients, patterns) create atmosphere without relying on stock photos.
- **Depth:** Mandatory 3-level surface system: base background → card surface (with box-shadow) → elevated element (stronger shadow). Cards must visibly float. No flat, borderless, shadowless sections.

### Mandatory luxury signals (must include ALL)
1. **Hero that stops the scroll:** The hero section must be visually dramatic — at least 70vh tall, with a display headline at 64px+, intentional background treatment (gradient, pattern, or dark immersive), and CTAs that look premium (gradient fill, shadow, or glow effect). The hero alone should sell the redesign.
2. **Floating or overlapping elements:** At least one place where a card, badge, or content block crosses a section boundary (e.g. testimonial card overlapping hero-to-content, trust badge floating at section edge) — this creates the sophisticated depth that separates custom from template.
3. **Premium trust section:** The reviews/testimonials section must look like a premium social-proof area — large aggregate star rating (styled, not plain text), testimonial cards with author avatars (initial circles), quoted text in styled type, and a visual design that builds trust immediately.
4. **Gradient accent:** At least one meaningful gradient usage — on the hero background, a CTA button, a section divider band, or a decorative element. Flat monochrome sites feel dated.
5. **Section rhythm and contrast:** Adjacent sections must have visibly different backgrounds (light → dark → tinted → light) creating a visual rhythm as the visitor scrolls. No two consecutive sections should have the same white background.
6. **Card depth everywhere:** Service cards, testimonial cards, gallery items, and contact forms must all have multi-layered box-shadows and rounded corners (12–20px). Every card visibly floats above its background.
7. **Micro-interactions on everything:** Every card, button, and link must have a CSS \`:hover\` transition — shadow lift, scale, or color shift. The site should feel alive and responsive without any JavaScript.

### Map to the seven required sections
The technical brief below fixes section ids (\`#home\`, \`#services\`, \`#about\`, \`#gallery\`, \`#book\`, \`#reviews\`, \`#location\`). **\`#home\`** must contain a **full marketing homepage** (9 blocks — see checklist). Other tabs hold expanded versions. The result must look like a **premium custom site that cost $50,000+**, not a template anyone could buy for $49.
`.trim();

/** Creative director layer for desktop operator web apps — precedes technical Task/CSS contract. */
const WEBAPP_CREATIVE_DIRECTIVE = `
## Creative direction (desktop web application)

You are an award-winning **product designer and creative director** for **vertical SaaS and local-business operations software**. You design **desktop web apps** that feel like **$100K custom product builds** — bespoke to the business's category, visually stunning, and instantly impressive to anyone who sees them. Think Stripe Dashboard, Linear, or Notion in terms of obsessive craft and polish — adapted to a local-business vertical.

### Product intent first
From the context block, infer:
- Business type, name, and location (or URL-derived industry).
- **Who operates the app?** (owner, front desk, field tech, etc.)
- **Primary jobs:** schedule/calendar, clients & history, pipeline or revenue signals, day-to-day exceptions ("needs attention").
- What makes tables and labels **credible for that vertical** — not "User 1 / User 2" placeholder rows.

### Commit to a bold product aesthetic
The **Assigned differentiation** block above already chose your lane — execute **that** lane with maximum conviction. Do not water it down into a generic gray admin template.

Never default to all-gray sidebars, interchangeable KPI cards, or **Inter / Roboto / Arial** as the only voice. Every surface, every card, every number must feel designed with intention.

### Design rules (web app)
- **Typography:** Distinctive UI pairing — characterful display or condensed for module titles (large, confident sizing) + readable sans for tables. Load 2+ distinct Google Fonts via \`<link>\`; **never** system defaults only. KPI numbers must use a display weight at **48px+ minimum** to create visual drama.
- **Color:** Dominant surfaces + **semantic** accents (success / warning / danger or brand) — 2–4 colors executed brilliantly. Sidebar/nav must have a **strong tint, gradient, or dark background** that anchors the app shell and creates clear separation from the main canvas. At least one element must use a **CSS gradient** (header band, CTA button, or accent card).
- **Layout:** Clear **app shell** (sidebar or top + tabs). **Asymmetry** required in the KPI band or dashboard grid — one card must be visually dominant (2x size, accent background, or hero treatment). Vary card heights and widths for editorial rhythm. Never three identical cards in a row.
- **Density:** Match the vertical — scannable rows and clear hierarchy; don't drown tables in padding.
- **Motion:** Subtle **CSS-only** feedback — row hover with background shift and shadow lift, card hover with \`transform: translateY(-2px)\` + shadow increase, focus rings, active nav indicator (colored bar, pill, or glow) — no JavaScript.
- **Imagery / chrome:** Brand moments required: logo mark or branded icon in sidebar header, category-specific icons or illustrations for empty states and section headers. **No stock photos**; this is a tool, but it must feel branded and premium.
- **Depth and surface:** **Mandatory 3-level depth system** — base background, card surface (with box-shadow), and elevated surface (modal/popover shadow). Use layered surfaces, multiple box-shadows for realistic depth, and rounded corners (12–16px). Avoid flat border-only boxes. Cards must float off their background with visible shadow.
- **Status and feedback:** Color-coded badges as **rounded pills** with subtle background tint + bold text (not plain text). Progress indicators and contextual icons that communicate state at a glance — specific to this business vertical. Use colored left-borders (3–4px) on list items for severity/status coding.

### Mandatory luxury signals (must include ALL)
1. **Hero metric:** At least one **oversized KPI display** — a number rendered at 48–64px in a display font, with a trend indicator (arrow + percentage) and a subtle accent background or gradient behind the card. This is the first thing the eye should hit.
2. **Branded sidebar:** Sidebar must have a distinct, intentional background (dark, tinted, or gradient) with a logo mark or business initial at the top, polished nav items with an accent-color active indicator (vertical bar, filled pill, or tinted background), and clear visual hierarchy between sections.
3. **Gradient or accent band:** At least one area of the UI must use a CSS gradient — on the header/greeting area, a CTA button, a card accent, or a section divider band. Not flat monochrome everywhere.
4. **Greeting personalization:** Top bar or dashboard header must include a personalized greeting ("Good morning, [Business Name]" or "Welcome back") with today's date, styled as a branded moment (not plain text).
5. **Premium chart area:** Dashboard must include a visually impressive data visualization — CSS-only bar chart, sparkline, or styled summary with realistic numbers. Not a placeholder box or missing chart.
6. **Card depth and hover:** Every card must have multi-layered box-shadow for depth and a CSS \`:hover\` transition (shadow lift + slight translateY). No flat or borderless cards.
7. **Table polish:** Data tables must have alternating row tints or clear dividers, colored status badges in pill format, hover state on rows, and action buttons with hover states. Minimum 5 realistic data rows.

### Required views (conceptual — technical ids below)
Align with **Dashboard, Clients, Schedule, Reviews** (\`#dash\`, \`#clients\`, \`#schedule\`, \`#reviews\`):
1. **Dashboard** — The showpiece view. Personalized greeting header with date. Hero KPI card (oversized, accent treatment) flanked by supporting stat cards including **auto-reminders sent** and **no-show rate**. Below: a CSS-only chart or visualization, "follow-ups due today" mini-list, "needs attention" exception list with colored left-border severity indicators, and recent activity timeline (include entries like "SMS reminder sent", "New 5★ review", "Online booking confirmed"). **Realistic fake data for the vertical** — not placeholder text.
2. **Clients** — **Simple CRM for repeat business.** Search/filter bar with filter chips (All, Active, Needs Follow-up). **Polished data table** with columns for name, last visit, next appointment, total visits, and follow-up status. Inline "Send Reminder" and "Book" action buttons per row. Avatar placeholder (circle with initial) per row. Minimum 5 realistic rows. Pagination or "showing X of Y" footer.
3. **Schedule** — Week/day calendar with online booking integration. Color-coded by service type or status with a clear legend. Each appointment block shows client name, service, time, status badge, and SMS reminder icon. Include appointments labeled "Online booking". A "Share Booking Link" secondary button. Mini-calendar sidebar for date navigation.
4. **Reviews** — Google Reviews management hub. Large aggregate rating display (4.8 ★) with total count. Star distribution bar chart. Growth metric ("Reviews this month: 14, +40%"). Recent review cards with author avatar, star rating, and realistic text. Prominent "Request a Review" CTA with SMS/WhatsApp send options.

Design this so that when a business owner sees it, they immediately think: **"I need this. How much does it cost?"**
`.trim();

/** Creative director layer for phone-width operator apps — precedes technical Task/CSS contract. */
const MOBILE_CREATIVE_DIRECTIVE = `
## Creative direction (mobile operator app)

You are an award-winning **mobile product designer** creating **operator and owner tools** for local businesses — used **on the floor**, between customers, and in motion. These are **$80K custom native-app concepts** — not consumer marketing splash screens, not desktop shrunk down, and definitely not a wireframe.

### Context first
From the profile or URL context:
- Business name and category.
- **Moment of use:** quick glance (KPI), interruptible flows, **one-thumb** actions.
- **Trust:** use ratings/reviews from context when provided; **realistic names and times** in lists.

### Commit to a bold mobile aesthetic
The **Assigned differentiation** block above already chose your lane — execute **that** lane with absolute conviction. Every screen must feel like a **polished, published app** that could appear in an App Store feature story.

Never default to generic **purple gradients**, cookie-cutter onboarding layouts, flat white backgrounds with gray text, or wireframe-quality UI.

### Design rules (mobile)
- **Typography:** Distinctive **display** font for screen titles (28–36px, bold or medium weight, characterful) + legible UI sans for lists and labels. Load 2+ distinct Google Fonts via \`<link>\`; never Arial/Inter-only. KPI numbers must use **40px+ display sizing** to create visual impact.
- **Color:** Dominant shell + **one** confident accent for primary actions, active tab, and key indicators. Use the accent **consistently** across all screens. Background should **not** be pure white (#fff) — use a subtle warm or cool tint. At least one element must use a **CSS gradient** (header, CTA button, or hero card).
- **Layout:** **Thumb reach** — primary actions in the lower half; **48px+** tap targets. Cards must have **generous internal padding** (16–20px), **16–20px border-radius**, and **clear visual separation** via shadow + background tint. Vary card sizes across the screen for visual rhythm.
- **Motion:** CSS-only tab/list/button states. Include **:active** states on cards and buttons (\`transform: scale(0.98)\` or background shift). Tab transitions should feel polished with smooth indicator movement.
- **Imagery:** Required: **abstract/pattern hero or gradient header** on Home that creates atmosphere and brand presence. Category-specific icons for services and status indicators.
- **Depth and surface:** **Mandatory 3-level depth** — base background, card surface (with multi-layered box-shadow), elevated surface (modals/overlays). Cards must visibly float above their background. Use 16–24px border-radius. Bottom tab bar must have a distinct surface treatment (frosted glass blur, distinct tint, or shadow above).
- **Status indicators:** Color-coded badges as **rounded pills** with tinted background, dot indicators for active/inactive, and contextual icons that communicate appointment status, client activity, or review sentiment at a glance.

### Mandatory luxury signals (must include ALL)
1. **Immersive header:** Home screen must have a branded header area (gradient, pattern, or dark banner, 140px+ tall) with personalized greeting ("Good morning, [Business Name]") and key stat overlaid. Not a flat white bar with plain text.
2. **Premium bottom tab bar:** The bottom tab bar must feel intentional and premium — use a frosted glass effect (\`backdrop-filter: blur\`), a distinct tinted background, or an elevated shadow. Active tab must have a clear indicator (filled pill, accent dot, or tinted icon). Never a plain dark-gray bar.
3. **Oversized KPI moment:** At least one number on the Home screen must be rendered at 40px+ in a display font — the primary metric that catches the eye immediately (today's bookings, revenue, or appointments).
4. **Service cards with visual richness:** Service items (in Book or Home) must have color-coded left borders, category-specific icons, and price information styled distinctly — not plain text rows.
5. **Card depth on every card:** Every card must have a visible multi-layered box-shadow and rounded corners. No flat, borderless, shadowless rectangles. Cards must clearly float above the background.
6. **Overlapping composition:** At least one place where a card or content block overlaps the boundary between two color zones (e.g. white cards overlapping a gradient header) — this creates the sophisticated layering that separates premium from template.
7. **Consistent accent system:** The accent color must appear on: active tab indicator, primary CTA button, important badges, and key metrics. This creates visual coherence across screens.

### Required screens (conceptual — technical ids below)
Align with **Home, Clients, Book, Reviews** (\`#home\`, \`#clients\`, \`#book\`, \`#reviews\`):
1. **Home** — The showpiece screen. Immersive header area (gradient/pattern, 140px+) with personalized greeting and date. Below: oversized KPI number (40px+) for today's primary metric + supporting stat pills including **"Reminders Sent"** and **"No-Shows: 0"**. **Today's schedule** with 3+ realistic appointment cards (avatar, client name, service, time, colored status badge, SMS reminder bell icon). A **"Follow-ups Due"** notification card. Prominent **"Book Now"** CTA. The Home screen alone should sell the product.
2. **Clients** — **Simple CRM for repeat business.** Search bar + filter chips (All, Active, Needs Follow-up). Vertical list with avatar, client name, **last visit**, **total visits**, and **follow-up status badge**. Inline SMS reminder button per row. Minimum 4 realistic rows. "Add Client" floating action button. Communicates that tracking repeat customers drives most revenue.
3. **Book** — **Easy online booking** — "Clients can book 24/7". Calendar strip with accent-highlighted selected day; tappable time slot chips (available/booked states); service type selector. Booking form with "Confirm Booking" button + a **"Share Booking Link"** secondary action for SMS/link sharing. Must feel like a real booking system that replaces phone-tag and increases conversions.
4. **Reviews** — **Google Reviews growth engine.** Large aggregate rating (48px, e.g. "4.8") with review count. Growth metric: "This month: 14 new reviews (+40%)". Star distribution bars. 3+ review cards with avatar, stars, realistic text, date. **"Request a Review"** CTA with SMS and WhatsApp send options — "Going from a few reviews to 100+ boosts trust and inbound leads automatically.".

Design this so that when a business owner sees it on their phone, they think: **"This is MY app. I need this."**
`.trim();

const WEBSITE_LAYOUT_SAFETY = `
## Layout safety (mandatory — readability over decoration)

- Build heroes and follow-on bands with **CSS Grid or flex**. Place photography in a **dedicated column or card** with **fixed aspect-ratio** — **do not** absolutely position large images on top of headings or body copy.
- **Full-bleed background images** require a **gradient or scrim overlay** and foreground copy in a clear stacking layer with padding; body text must meet **WCAG contrast** against its background.
- **Card or image rows** below the hero must follow **normal document flow** (\`gap\`, \`margin-top\`) — **no negative margins** that pull tiles upward over hero typography.
- Avoid **z-index** stacks that put decorative imagery above text unless the text sits on an intentional overlay panel or scrim. Never obscure the business name or primary value proposition.
`.trim();

const WEBSITE_REFERENCE_PATTERNS = `
## Reference patterns (structural inspiration for premium local-business sites)

Award-winning local-business websites share these premium patterns — adapt them to **this** business's industry and assigned lane:

**Hero patterns:** Immersive full-viewport heroes with gradient or dark backgrounds, luminous display typography (64px+), floating trust badges, transparent nav overlays, dual CTAs with distinct hierarchy (primary filled/gradient + secondary ghost).

**Section rhythm:** Alternating background treatments per section (light → dark → tinted → light), generous 48–80px vertical spacing, decorative section dividers (gradient bands, angled clip-paths, or thin decorative rules).

**Card design:** Multi-layered box-shadows for realistic depth (3+ shadow values), 12–20px border-radius, generous internal padding (24–32px), hover transitions (translateY + shadow increase). Service cards with icons/color accents. Testimonial cards with styled quote marks, author circles, and star ratings.

**Trust architecture:** Large aggregate star rating (styled, prominent), credibility bar (years in business, certifications, service count as badges), floating social-proof cards, author avatars on testimonials, real review quotes with specific service references.

**Premium details:** CSS gradients on at least one element, overlapping compositions at section boundaries, styled form inputs (not browser defaults), icon system using inline SVG, responsive image placeholders with \`aspect-ratio\` and rounded masks, animated hover states on every interactive element.

Adapt these **patterns** to **this** business — unique composition, real copy, and the assigned aesthetic lane. Not a literal clone of any example.
`.trim();

const WEBSITE_VISUAL_CHECKLIST = `
Visual quality — premium marketing site (mandatory budgets):

**Depth budget (3 levels minimum):**
- Level 1: Section backgrounds (vary between white, off-white, tinted, dark — never all pure #fff)
- Level 2: Card surfaces with multi-layered shadow: \`box-shadow: 0 1px 3px rgba(0,0,0,0.06), 0 8px 24px rgba(0,0,0,0.06)\` and 12–20px border-radius
- Level 3: Floating/overlapping elements (testimonial cards crossing section boundaries, hero badges) with stronger shadow
- Every card, form, and content panel must visibly float — no flat, borderless, shadowless boxes

**Color budget:**
- Section backgrounds must alternate (light → dark → tinted → light) — never consecutive same-background sections
- At least one CSS gradient usage (hero background, CTA button, section divider band, or decorative element)
- One confident accent color used consistently on CTAs, links, active states, and key visual moments
- WCAG contrast on all text surfaces

**Typography budget:**
- Hero headline: 64px+ display font, bold or medium weight — the largest element on the page
- Section headings: 36–48px, clear hierarchy
- Body text: 16–18px, readable line-height (1.6+)
- 2+ distinct Google Font families loaded via \`<link>\` — never system defaults or single-family

**Animation budget (CSS only):**
- Card hover: \`transform: translateY(-4px)\` + shadow increase transition (0.2–0.3s ease)
- CTA button hover: background color shift, gradient animation, or shadow glow
- Gallery items: subtle scale on hover with overlay fade-in
- Links: color transition on hover
- Navigation uses **:target + :has** — no inline \`<script>\` (Tailwind CDN \`<script src>\` OK)

**Pitch-winning moments (include at least 3):**
- Floating card that overlaps two sections (hero-to-content boundary or section-to-section)
- Gradient hero background (2–3 stop gradient, 70vh+ tall) with luminous text
- Oversized display typography (80px+) as the hero visual — type IS the design
- Animated gradient CTA button (background-position shift on hover)
- Layered shadow composition on cards (3+ box-shadow values for photorealistic depth)
- Section with alternating 50/50 split layout (text left / visual right, then swap)
- Bento-style service grid with one dominant tile (2x size) creating visual hierarchy
- Premium testimonial card with large styled quote marks, author avatar circle, and star rating

**Anti-template rule:** If any section looks like it came from a free Wix/Squarespace template, redesign it. Every surface must have intentional depth, every heading must use the display font, every interactive element must have a hover state, every section must have a different background treatment from its neighbors.
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
  const brandDirective = buildBrandColorDirective(payload.brandColors);

  return `${block}

${brandDirective}${situationBrief}

${differentiation}

${WEBSITE_CREATIVE_DIRECTIVE}

Task: Output **one complete HTML5 document** (desktop-width marketing **multi-page** experience) for this business. Each “page” is a **separate full-viewport screen** inside the same file: **only one page is visible at a time** — **no long single scroll** stacking all eight sections in one document flow. **No** separate HTTP URLs, **no** JS router, **no inline \`<script>\`** (Tailwind CDN \`<script src>\` OK). Interaction = **click nav → swap visible page** using **CSS only** (\`:target\` + \`:has\`).

**Note on \`#home\`:** The home **screen** is still a single \`section#home.page\`, but it must read like a **full marketing homepage**: stack **all** of the bands below (minimum **nine** content blocks including footer), with **internal scrolling** via \`overflow-y: auto\` on that section. Reviews and location must appear in full on the homepage (not just teasers). Deeper expanded versions exist on \`#services\`, \`#about\`, \`#gallery\`, \`#book\`, \`#reviews\`, and \`#location\` — but **do not** leave \`#home\` as a thin hero only.

${WEBSITE_LAYOUT_SAFETY}

${WEBSITE_REFERENCE_PATTERNS}

## Page switch pattern (required — copy this behavior in \`<style>\`)
Wrap all page \`<section>\`s in \`<main>\` (or one clear wrapper). Each page: \`<section id="home" class="page">\` … \`</section>\` (ids exactly: \`home\`, \`services\`, \`about\`, \`gallery\`, \`book\`, \`reviews\`, \`location\`).

Use CSS equivalent to:

- Hide every \`.page\` by default; **\`min-height: 100vh\`** per page; **\`overflow-y: auto\`** inside a page if its content is tall (so the **outer document** does not become one giant scroll of all pages).
- **Initial view:** \`body:not(:has(main .page:target)) #home\` **and** \`#home:target\` → \`display: block\` (or flex).
- When \`#services\`, \`#about\`, \`#gallery\`, \`#book\`, \`#reviews\`, or \`#location\` matches \`:target\`, show that section the same way.
- When a **non-home** page is \`:target\`, hide \`#home\` via \`body:has(#services:target) #home\`, \`body:has(#about:target) #home\`, \`body:has(#gallery:target) #home\`, \`body:has(#book:target) #home\`, etc.
- **Active nav styling (no JS):** e.g. \`body:has(#services:target) nav a[href="#services"] { font-weight: 700; border-bottom: … }\` (repeat per tab: \`#about\`, \`#gallery\`, \`#book\`, \`#reviews\`, \`#location\`).

Nav links: \`<a href="#home">\`, \`#services\`, \`#about\`, \`#gallery\`, \`#book\`, \`#reviews\`, \`#location\`. **Do not** rely on \`scroll-behavior\` or stacked \`min-height:100vh\` sections in one scroll — use **show/hide** as above.

## Structure checklist (required \`id\`s on \`<section class="page">\`)

1. **#home** \u2014 One \`section#home.page\` with **nine mandatory homepage blocks** in order (scroll inside this section). Each block must be visually distinct and use **real copy** for this business. Obey **Layout safety** throughout. The homepage must feel **complete** \u2014 a visitor should be able to read reviews, see the address and hours, and contact the business **without leaving the homepage**.
   - **(1) Principal banner / hero:** Full-width or split hero: business name, tagline, primary CTA **\u201cBook Now\u201d** (linking to \`#book\`) + secondary CTA (e.g. \u201cOur Services\u201d linking to \`#services\`); optional rating line from context. The **Book Now** button must be prominent and visually distinct (filled/solid style, contrasting color).
   - **(2) Services:** **Services overview** \u2014 3\u20136 cards or categorized rows (industry-specific names, short blurbs or \u201cfrom $\u201d); \`<a href="#services">\` to the full Services page.
   - **(3) Gallery:** **Gallery** \u2014 bento or grid of 3\u20135 images (placeholders + captions OK); use grid + \`aspect-ratio\`, no text/image overlap.
   - **(4) Reviews:** **Customer reviews** \u2014 a **full reviews section** on the homepage (not just a teaser). Show the aggregate rating (large star + number, e.g. \u201c4.8 \u2605 from 127 reviews\u201d) prominently, then at least **three** styled review cards with author name/initial avatar, star rating, and a realistic review quote specific to this business type. This must look like a premium social-proof section that builds trust immediately. Optional \`<a href="#reviews">\` to see all reviews.
   - **(5) Contact us:** **Contact** \u2014 section title \u201cContact us\u201d / \u201cGet in touch\u201d: static form fields (name, email, phone, message) **without** JS submit \u2014 use \`mailto:\` / \`tel:\` on buttons or labels, or purely visual form chrome.
   - **(6) Visit us / Location:** **Full location section** on the homepage \u2014 not a brief address line. Include: a styled heading (\u201cVisit Us\u201d / \u201cFind Us\u201d), the **complete address** on its own visual block, **business hours** as a clean table or day-by-day list, **phone number** with \`tel:\` link, and a **map-style placeholder or styled directions panel**. Include a \u201cGet Directions\u201d CTA button. This section must be visually rich and feel like a proper Location page embedded in the homepage.
   - **(7) Booking / CTA band:** A visually distinct call-to-action band \u2014 \u201cReady to book?\u201d / \u201cSchedule your visit\u201d with a prominent **Book Now** button linking to \`#book\`. Contrasting background color from surrounding sections.
   - **(8) Appointment request:** A separate styled **appointment request or inquiry form** area (name, phone, service type, preferred date) \u2014 purely visual, no JS submit. Distinct from the \u201cContact us\u201d section above by focusing on booking/scheduling.
   - **(9) Footer:** **Site footer** \u2014 business name, mini nav (\`#services\`, \`#about\`, \`#gallery\`, \`#book\`, \`#reviews\`, \`#location\`), optional Privacy/Terms placeholders, **\u00a9 year + business name**; footer styling (e.g. dark band) at the **bottom of \`#home\` only** (global nav stays in the header).

2. **#services** — A **different** layout than home: multi-column **priced menu**, categorized lists, or tiered packages (columns or sections with headings). Industry-specific service names and price cues; not the same three cards repeated from \`#home\`. Include a prominent **Book Now** CTA at the top and bottom of the page.

3. **#about** — **About Us / Our Story page:** A dedicated page telling the business’s story. Include: founder/team story with a warm narrative tone, mission/values section, team photo placeholders with names and roles, credentials/certifications/awards, years in business, and a “why choose us” value proposition section. Use a two-column layout (story text + image placeholder) for the main block. Distinct from \`#services\` and \`#reviews\`. This replaces the old \`#expertise\` page with richer, more personal content.

4. **#gallery** — **Portfolio / Gallery page:** A full-page visual showcase. Use a **masonry or bento grid** layout with 8–12 image placeholders of varying aspect ratios. Each image should have a hover overlay with a caption or service tag. Include a brief intro paragraph at the top (“Our Work” / “Portfolio” / “Gallery”). The layout must feel premium and editorial — not a flat grid of equal squares. Optional: categorized filter tabs (CSS only) for different service types.

5. **#book** — **Booking / Appointment page:** A dedicated scheduling page with:
   - A **visual weekly calendar** showing the current week with day columns (Mon–Sun) and time slots. Style time slots as tappable/selectable chips or cards (e.g. “9:00 AM”, “10:30 AM”, “2:00 PM”). Show 3–5 available slots per day with some marked as “Booked” (greyed out) for realism.
   - A **service type selector** above or beside the calendar (dropdown or styled radio/chip group with the business’s actual services).
   - A **booking form** below the calendar: name, phone, email, selected service (pre-filled from selector), preferred date/time, and optional notes. Prominent “Request Appointment” submit button.
   - This is purely visual / static (no JS logic) but must **look and feel like a real booking system**. Use \`tel:\` or \`mailto:\` on the submit button as a fallback action.

6. **#reviews** — **Extended testimonial gallery** — all reviews in a card grid (4+ quotes) plus aggregate summary, author initials, role, or neighborhood. Layout must differ from the homepage reviews (e.g. masonry grid vs. carousel-style cards). This page is the deep-dive; the homepage already shows the key reviews.

7. **#location** — **Full-page location experience:** Large map or map-style placeholder at the top, complete address and hours in a polished two-column layout, phone with click-to-call, **Get directions** and **Book** CTA buttons, optional nearby landmarks or parking notes. This is the expanded version of the homepage location section — must feel more spacious and detailed.

## Navigation chrome
- **Sticky or fixed top header** with all section anchor links; **Book Now** CTA button as \`<a href="#book">\` (always present, filled/accent style, right-aligned in nav).

## Copy
Each section must have **unique, substantive copy** tied to the business name, category, and location — **not** repeated placeholder paragraphs across sections.

${WEBSITE_VISUAL_CHECKLIST}

Output: polished, pitch-ready HTML document suitable for a prospect preview.`.trim();
}

const WEBAPP_ASSIGNED_AESTHETIC_LANES = [
  "Executive command center — deep obsidian (#0f1117) shell, amber/gold data highlights on dark surfaces, monospace stat displays with oversized display numbers (48px+), Bloomberg-terminal authority with boutique polish, layered card surfaces with 3-level shadow depth",
  "Artisan atelier — warm linen (#faf6f0) background, hand-set editorial serif headings (Playfair Display or Cormorant), terracotta/sage accent, paper-texture depth via stacked box-shadows on every card, soft rounded corners (16px), every panel feels hand-crafted and expensive",
  "Midnight luxe dashboard — near-black (#0a0a0f) base, frosted glass cards with backdrop-filter: blur(20px) and rgba white borders, champagne gold (#d4a574) accent on KPIs and active states, large cinematic numbers for metrics, subtle gradient mesh background",
  "Nordic precision — cool off-white (#f5f5f7) canvas, one bold accent color (electric blue or coral), hairline dividers, Swiss-grid alignment, oversized KPI numbers in light-weight display font, generous 32px card padding, Apple-level polish",
  "Copper & slate industrial — charcoal slate (#2d3436) sidebar, brushed copper (#b87333) accent on active states and CTAs, condensed grotesk type for labels, thick 3px left-border on status items, raw concrete-inspired card backgrounds with subtle noise texture (CSS gradient)",
  "Emerald concierge — deep forest green (#1a3c34) sidebar, cream (#fdf8ef) main canvas, gold accent on primary actions, editorial serif for module titles, generous whitespace around each KPI card (24px+ gap), status badges as rounded pills with jewel-tone colors",
  "Warm SaaS studio — creamy white (#fffbf5) canvas, one confident warm accent (coral #ff6b6b or amber #f59e0b), rounded 20px cards with soft multi-layered shadows, friendly but professional iconography (Lucide-style), 48px+ hero metric with trend sparkline",
  "Electric dark mode — rich dark (#111827) canvas, electric violet (#8b5cf6) or cyan (#06b6d4) accent, glassmorphic sidebar with subtle blur, neon glow on active nav items (box-shadow with accent color at 40% opacity), monospace timestamps, large rounded stat cards floating on the dark surface",
  "Ivory editorial — warm ivory (#fefcf3) base, charcoal text, one muted accent (dusty rose or sage), magazine-quality type hierarchy with display serif for KPI labels (64px numbers), column-rhythm layout, pull-quote style for key metrics, thin elegant borders",
  "Obsidian glass — layered dark surfaces (#0f0f12 base, #1a1a2e cards, #252542 elevated), frosted panels with backdrop-filter blur and 1px rgba(255,255,255,0.08) borders, vivid status colors (emerald/amber/rose) that pop against the dark, refined condensed type, premium depth through 4-level shadow system",
] as const;

const WEBAPP_ASSIGNED_LAYOUT_MOTIFS = [
  "Narrow left sidebar (icon + label, tinted or dark) with full-width main canvas; top of main has one oversized hero KPI card (2x width, 48px+ number with trend arrow) flanked by smaller stat cards; below: split content area",
  "Compact top bar with avatar + greeting + search; left rail with vertical secondary tabs (accent bar on active); main area has split pane (list left with search/filter, detail right with tabbed content)",
  "Wide sidebar with grouped nav sections, mini-profile card at top, and subtle gradient or tinted background; main canvas uses bento grid with one dominant 2x hero metric card and smaller cards around it",
  "Dark branded sidebar with accent-line active indicator and logo mark at top; main area starts with a full-width gradient or tinted header band containing KPIs as floating glass cards that overlap the transition into the white content area below",
  "Minimal icon-only sidebar that reveals labels on hover (smooth CSS transition); main area uses a two-tier layout: top tier = summary strip with 3-4 glass-style stat cards on subtle gradient; bottom tier = full-width data table with generous spacing",
  "Top horizontal nav bar with pill-shaped tabs (active pill filled with accent color); below: three-column layout (filter sidebar, scrollable list, detail preview panel with breadcrumb); KPI band above the columns as a full-width accent strip",
  "Sidebar + top bar combo: narrow dark sidebar for primary nav, light top bar for search + profile + notifications; main canvas uses masonry/bento card layout where dashboard cards have varying heights creating an editorial rhythm",
  "Full-bleed accent header band (gradient or brand color) spanning the top of the main area with white KPI cards floating on it (negative margin overlap effect); below the band: clean white canvas with card-based sections separated by subtle dividers",
  "Compact top bar only (no sidebar); content uses a wide centered column (max-width 1200px) with generous margins; dashboard as stacked full-width sections with alternating subtle background tints (white / off-white / light tint); each section has its own heading and card grid",
  "Command palette style: dark sidebar with search at top, grouped nav below; main area has a prominent greeting/status banner, then a 3-column bento grid where the left column is a tall activity timeline, center is KPI cards, right is a mini calendar or schedule preview",
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
- **Brand color override:** If a "Brand Identity Colors" section appears above, those extracted hex values **override** the lane's color suggestions. Keep the lane's layout and composition rules but re-skin the color palette to match the client's actual brand identity.

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
Visual quality — premium desktop product (mandatory budgets):

**Depth budget (3 levels minimum):**
- Level 1: Base background (subtle tint or off-white, never pure #fff everywhere)
- Level 2: Card surfaces with \`box-shadow: 0 1px 3px rgba(0,0,0,0.08), 0 4px 12px rgba(0,0,0,0.04)\` and 12–16px border-radius
- Level 3: Elevated elements (modals, dropdowns, hover states) with stronger shadow: \`0 8px 30px rgba(0,0,0,0.12)\`
- Every card must visibly float above its background — no flat, borderless, shadowless boxes

**Color budget:**
- Sidebar/nav: strong intentional background (dark, brand-tinted, or gradient) — never default gray
- At least one CSS gradient usage (header band, CTA button, hero card, or accent element)
- Status colors: distinct pills for each state (emerald/success, amber/warning, rose/danger, blue/info) — not plain text
- WCAG contrast compliance on all text

**Typography budget:**
- Hero KPI numbers: 48px+ in display font weight — the largest element on screen
- Section headings: clear hierarchy (24–32px) using the display font
- Body/table text: readable sans at 14–16px
- 2+ distinct Google Font families loaded via \`<link>\` — never system defaults or single-family

**Animation budget (CSS only):**
- Card hover: \`transform: translateY(-2px)\` + shadow increase transition (0.2s ease)
- Row hover: subtle background tint shift
- Button hover: background color shift or shadow glow
- Active nav: smooth indicator transition (if sidebar uses moving bar/pill)
- No inline \`<script>\` — view swap is CSS \`:target\` / \`:has\` only (Tailwind CDN \`<script src>\` OK)

**Anti-wireframe rule:** If any view could be mistaken for a wireframe or unstyled mockup, it fails. Every surface must have intentional background treatment, every card must have shadow depth, every interactive element must have a hover state.
`.trim();

const WEBAPP_PITCH_MOMENTS = `
## Pitch-winning moments (pick at least 3 and execute them brilliantly)

These are the "wow" techniques that make a prospect say "I want this." You MUST include at least **three** of the following in your design:

1. **Glassmorphic card:** At least one card with \`backdrop-filter: blur(16px)\` over a gradient or tinted background, with a subtle rgba white border — creates luxurious depth.
2. **Gradient mesh or accent band:** A header area, sidebar header, or section divider that uses a multi-stop CSS gradient (not flat color) — creates visual richness and brand personality.
3. **Oversized hero metric:** The primary KPI rendered at 56–72px in a display font with a large trend indicator — cinematic data presentation that dominates the dashboard.
4. **Animated gradient CTA:** Primary action buttons with a subtle CSS gradient that shifts on hover (\`background-position\` animation) — creates a sense of interactivity and premium polish.
5. **Floating overlap card:** A card or KPI band that visually overlaps the boundary between two sections (e.g. a dark header and white content area) using negative margin or transform — creates sophisticated layering.
6. **Layered shadow composition:** Cards with multiple \`box-shadow\` values (e.g. \`0 1px 2px rgba(0,0,0,0.05), 0 4px 12px rgba(0,0,0,0.08), 0 12px 24px rgba(0,0,0,0.04)\`) — creates photorealistic depth that cheap templates never achieve.
7. **Color-coded status system:** A consistent severity/status system using colored left-borders (4px) + matching pill badges throughout all views — creates a cohesive visual language that feels like a mature product.
8. **Activity timeline:** A vertical dot-and-line timeline component for recent activity — creates a sense of a living, active system.
`.trim();

/** Desktop-width **web application** UI (operator / back-office), not a marketing website. */
export function buildStitchWebAppPrompt(payload: StitchProspectDesignPayload): string {
  const block =
    payload.kind === "place"
      ? placeContext(payload.place, payload.colorVibe)
      : urlContext(payload.url, payload.pageTitle, payload.metaDescription, payload.colorVibe);

  const differentiation = buildWebAppAssignedDifferentiationBlock(payload);
  const brandDirective = buildBrandColorDirective(payload.brandColors);

  const gmb =
    payload.kind === "place"
      ? "Brand identity must align with the Google Business Profile (name, category, and location above). "
      : "Infer industry from the page title, URL, and description. ";

  return `${block}

${brandDirective}${differentiation}

${WEBAPP_CREATIVE_DIRECTIVE}

${WEBAPP_LAYOUT_SAFETY}

Task: ${gmb}Output **one complete HTML5 document** for a **desktop web application** (browser-width product UI) for staff/operators of this business — **not** a public marketing site and **not** a phone mockup. Think **SaaS-style dashboard**: sidebar navigation, main canvas with tables and metrics.

Each main **view** is a full main-area panel; **only one view visible at a time** in the content region. **No** JS router, **no inline \`<script>\`**.

## Page switch pattern (CSS only) — EXACT IDS REQUIRED

**CRITICAL: You MUST use these EXACT section ids and sidebar labels. Do NOT rename, customize, or adapt them to the business type. The navigation depends on these exact strings.**

Use a layout with a **sidebar** (\`<aside>\`) containing nav links and \`<main>\` containing exactly these four sections:

\`\`\`html
<section id="dash" class="page">...</section>
<section id="clients" class="page">...</section>
<section id="schedule" class="page">...</section>
<section id="reviews" class="page">...</section>
\`\`\`

CSS rules (copy exactly):
- \`.page { display: none; min-height: calc(100vh - 64px); overflow-y: auto; }\`
- \`body:not(:has(main .page:target)) #dash { display: block; }\` (default view)
- \`#dash:target, #clients:target, #schedule:target, #reviews:target { display: block; }\`
- \`body:has(#clients:target) #dash, body:has(#schedule:target) #dash, body:has(#reviews:target) #dash { display: none; }\`
- Active sidebar styling: \`body:has(#clients:target) aside a[href="#clients"] { ... }\` (repeat per section)

Sidebar labels MUST be exactly: **Dashboard**, **Clients**, **Schedule**, **Reviews** → \`<a href="#dash">\`, \`<a href="#clients">\`, \`<a href="#schedule">\`, \`<a href="#reviews">\`.

**Do NOT rename these to business-specific names** (e.g. do NOT use "Concierge", "Guest Registry", "Spa Services", etc.). The labels Dashboard/Clients/Schedule/Reviews are intentional and universal.

## Structure checklist (every view must feel like a finished product, not a wireframe)
1. **#dash** — The **hero view** that sells the product — a data-rich command center:
   - **Greeting header:** "Good morning, [Business Name]" with today’s date, styled as a branded banner or accent band (gradient, tinted background, or dark header with light text). Include a circular avatar placeholder and notification bell icon.
   - **KPI band (4 cards):** One **hero metric card** (2x width, 48–64px display number, trend arrow + percentage, accent background or gradient) for today’s revenue. Three supporting stat cards: **Today’s Bookings** (number + trend), **Auto-Reminders Sent** (e.g. "12 sent · 0 no-shows" with green check), and **Review Score** (e.g. "4.8 ★ · 127 reviews" linking to #reviews). Each card with its own trend indicator.
   - **Charts row (2 side-by-side CSS-only graphs):**
     1. **Weekly Revenue bar chart** — 7 vertical bars (Mon–Sun) using CSS flexbox/grid with realistic dollar amounts, axis labels, and a total. Bars colored with brand accent gradient. The current day’s bar highlighted or pulsing. Must look like a real analytics chart — not a placeholder.
     2. **Bookings vs No-Shows line/area chart** — A 7-day trend showing bookings (accent color, filled area) vs no-shows (red, thin line near zero). Use CSS-only shapes (stacked divs, clip-path, or border tricks). Include axis labels and a legend. Communicates the impact of automated reminders.
   - **Additional mini-charts (below the main row):**
     3. **New vs Returning Clients donut/ring** — A CSS-only ring chart (conic-gradient or stacked borders) showing e.g. "72% returning, 28% new" with a label in the center. Reinforces that repeat business drives revenue.
     4. **Review Growth sparkline** — A compact horizontal trend (CSS bars or stepped divs) showing monthly review counts for the last 6 months with the current month highlighted. Small and compact, not full-width.
   - **Follow-ups due:** A compact card titled "Follow-ups Due Today" showing 2–3 clients who haven’t visited recently, each with avatar initial, name, last visit date, and a small "Send SMS" accent button.
   - **Needs attention:** Exception list with 3–4 items, each with a **colored left-border** (4px) for severity (red = urgent, amber = warning, green = ready), avatar/icon, client name, service, and status badge as a colored pill. Include at least one "Pending review request" item.
   - **Activity timeline:** 3–5 recent activity items with timestamps and subtle icons. Include entries like "SMS reminder sent to [Client]", "New 5★ review from [Client]", "Online booking confirmed". Use a vertical line or dot timeline pattern.
2. **#clients** — **Simple CRM for tracking repeat customers.** Search/filter bar with styled inputs and **filter chip pills** (All, Active, Needs Follow-up). **Premium data table** with: circular avatar placeholder (initial) per row, columns for **Name**, **Last Visit** (date), **Next Appt** (date or "—"), **Visits** (total count), **Follow-up** status (colored pill: "Due" in amber, "Sent" in green, "Scheduled" in blue), category-specific column (e.g. pet name for grooming, case type for legal). Alternating row tints, **colored status pill** badges, row hover with shadow lift. Inline action buttons: **"Send Reminder"** (SMS icon) and **"Book"** per row. Minimum **6 realistic rows** showing a mix of active, due-for-follow-up, and recently visited clients. Pagination footer showing "Showing 1–6 of 24". The table must communicate that most revenue comes from repeat customers, not new ones.
3. **#schedule** — **Full calendar view with online booking:** week or day layout with a mini-month calendar sidebar or header date picker. Time blocks **color-coded by service type** with a visible legend. Each appointment block shows: client name, service, time, duration, status badge, and a small **reminder icon** (✉ or bell) with tooltip "SMS reminder sent". Include 4+ realistic appointments — at least one labeled "Online booking" (from the self-service link). A **"+ New Appointment"** button styled as an accent CTA. Next to it, a **"Share Booking Link"** secondary button (link icon) for sharing the online booking page with clients. A small banner or badge: "Clients can book 24/7 — even after hours". The calendar must feel like a real scheduling tool that reduces phone-tag and no-shows.
4. **#reviews** — **Google Reviews management — the growth engine for trust and inbound leads:**
   - **Aggregate rating hero:** Large display number (48px+) of the average rating (e.g. "4.8") with filled star icons and total review count ("127 reviews"). Accent background or gradient card.
   - **Star distribution:** Horizontal bar chart showing 5-star to 1-star breakdown with percentages and colored bars (green gradient for 5★, descending to red for 1★).
   - **Growth metric:** A card or badge: "Reviews this month: 14 (+40% vs last month)" with a trend arrow.
   - **Recent reviews:** 3+ review cards, each with: circular author avatar (colored initial), star rating (filled/empty stars), realistic review text specific to this business type, date. Mix of 5-star and 4-star reviews.
   - **Request a Review CTA:** Prominent accent card at the bottom: "Request a Review" with SMS and WhatsApp icons, a note like "Send a review link via SMS or WhatsApp after each appointment. Going from a few reviews to 100+ boosts trust and inbound leads." Styled as a primary action, not an afterthought.

## Copy
Unique copy per view, tied to business name and vertical — not generic lorem repeated everywhere.

${WEBAPP_VISUAL_CHECKLIST}

${WEBAPP_PITCH_MOMENTS}

Output: polished desktop web-app mockup in one HTML file for a client pitch.`.trim();
}

const MOBILE_ASSIGNED_AESTHETIC_LANES = [
  "Premium quiet — warm off-white (#faf8f5) shell, one vivid accent (deep teal or coral) on active tab and primary CTA, 16px card radius with layered shadows, editorial serif for screen titles, generous 20px internal padding on every card — whisper-luxury that feels expensive",
  "Immersive gradient — bold header gradient (two-stop, brand-derived) spanning the full top bar and hero area, white cards with 20px radius that overlap the gradient edge creating depth, vibrant accent on CTAs, soft shadows on every surface — the header gradient IS the brand moment",
  "Swiss precision — strict 4px grid, monochrome palette + single electric accent color, geometric sans at precise sizes, hairline dividers, oversized KPI numbers (40px+) in light-weight font, zero decorative noise — Apple-level restraint that communicates mastery",
  "Warm artisan — creamy off-white (#fdf8ef) shell, terracotta/sage/amber accent, rounded 20px cards with soft multi-layered shadows, friendly display serif for screen titles, organic icon style, cards feel like hand-crafted paper — premium warmth for service businesses",
  "Midnight glass — deep navy (#0a0e27) shell, frosted glass cards with backdrop-filter: blur(20px) and 1px rgba white border, electric accent (violet or cyan) on active states and CTAs, large luminous KPI numbers that glow against the dark, bottom tab bar with frosted glass effect — luxury tech feel",
  "Dark luxe — rich charcoal (#1a1a2e) shell, champagne gold (#d4a574) accent on active tab + CTAs + badge highlights, editorial serif for screen titles (Cormorant or Playfair), generous whitespace around every element, cards with subtle gold-tinted borders — boutique concierge quality",
  "Coral studio — warm white shell with coral (#ff6b6b) as dominant accent, large rounded cards (24px radius) with soft shadows, playful but professional iconography, gradient coral-to-peach on the primary CTA button, status badges as colorful pills — energetic and premium",
  "Forest retreat — deep forest green (#1a3c34) header gradient fading to cream canvas, emerald accent on CTAs, warm serif for screen titles, cards with subtle green-tinted shadows, gold accents on star ratings and premium badges — nature-inspired luxury",
  "Obsidian mode — near-black (#111118) shell, vivid status colors (emerald/amber/rose) that pop against the dark, frosted card surfaces (#1e1e2e with blur), monospace for timestamps and values, large cinematic KPI numbers, neon glow (box-shadow) on active elements — command-center authority",
  "Bold editorial — high-contrast black and white with one signature accent (electric blue or vivid coral), oversized display type (48px+) for KPI numbers, magazine-quality hierarchy with clear editorial rhythm, thick accent borders (4px) on featured cards, pull-quote styling on key metrics — statement design that demands attention",
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
- **Brand color override:** If a "Brand Identity Colors" section appears above, those extracted hex values **override** the lane's color suggestions. Keep the lane's layout and composition rules but re-skin the color palette to match the client's actual brand identity.

Design as a **native-quality, App Store-featured concept** — fluid visual transitions (CSS only), polished card compositions, intentional micro-typography, and a cohesive color story.

If **Visual direction** appears in the context block, harmonize with it; otherwise obey the lane above.
`.trim();
}


const MOBILE_VISUAL_CHECKLIST = `
Visual quality — premium mobile operator app (mandatory budgets):

**Depth budget (3 levels minimum):**
- Level 1: Base background (subtle warm or cool tint — never pure #fff; use #faf8f5, #f5f5f7, #f0f4f8, or similar)
- Level 2: Card surfaces with multi-layered shadow: \`box-shadow: 0 1px 3px rgba(0,0,0,0.06), 0 6px 16px rgba(0,0,0,0.06)\` and 16–20px border-radius
- Level 3: Elevated elements (FAB, modals, bottom tab bar) with stronger shadow and optional \`backdrop-filter: blur(12px)\`
- Every card must visibly float above the background — no flat, borderless rectangles

**Color budget:**
- Base: subtle tinted background (not pure white)
- Header/hero: gradient or brand-tinted area — never flat white or plain gray
- Accent: one confident color used consistently on active tab, primary CTA, key metrics, and status highlights
- At least one CSS gradient usage (header area, CTA button, or hero card)
- Status colors: distinct pills for each state (emerald/amber/rose/blue) with tinted background
- WCAG contrast on all text surfaces

**Typography budget:**
- Primary KPI number: 40px+ in display font — the biggest element on screen
- Screen titles: 24–28px display font, bold or medium weight
- Card headers: 16–18px, semi-bold
- Body text: 14–15px, readable sans
- 2+ distinct Google Font families loaded via \`<link>\`

**Animation budget (CSS only):**
- Card active/press state: \`transform: scale(0.98)\` transition (0.15s ease)
- Bottom tab active indicator: smooth accent pill or highlight
- Button hover/active: background color shift or gradient animation
- No inline \`<script>\` — page swap is CSS \`:target\` / \`:has\` only (CDN \`<script src>\` for Tailwind OK)

**Top app bar:** Circular avatar placeholder (brand color with white initial), business name (from context), bell/notification icon with optional dot indicator; polished spacing and clear background treatment.

**Bottom tab bar:** Four tabs with **icon + label**; premium active state (filled accent pill, tinted icon, or highlighted background + accent underline). Tab bar must have its own surface treatment (frosted blur, tinted background, or top shadow) — never a plain dark-gray bar.

**Anti-wireframe rule:** If any screen could be mistaken for a wireframe or prototype, it fails. Every card must have shadow and rounded corners, every header must have intentional background treatment, every button must have hover/active state, every list item must have visual richness (avatar, badge, icon, or color accent).
`.trim();

const MOBILE_PITCH_MOMENTS = `
## Pitch-winning moments (pick at least 3 and execute them brilliantly)

These are the "wow" techniques that make a prospect pick up their phone and say "I want this app." You MUST include at least **three**:

1. **Immersive gradient header with overlap:** Home screen header uses a rich gradient (2–3 stops) spanning 160px+ tall, with white content cards overlapping the gradient edge by -24px to -32px (negative margin) — creates premium depth that screams custom design.
2. **Frosted glass bottom tab bar:** Bottom tab bar uses \`backdrop-filter: blur(16px)\` with a semi-transparent background and subtle top border — every swipe feels premium.
3. **Oversized cinematic metric:** The primary KPI on Home rendered at 48–56px in a display font with a large trend arrow — makes the first impression unforgettable.
4. **Gradient CTA button:** The primary "Book Now" button uses a CSS gradient background with a subtle \`background-position\` shift on :active — feels alive and interactive.
5. **Color-coded service system:** Every service type has a consistent color accent (left border on cards, tinted badge, colored icon) that repeats across Home, Book, and Clients — creates a cohesive visual language.
6. **Layered shadow composition:** Cards with multiple box-shadow values (e.g. \`0 1px 2px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.06), 0 12px 24px rgba(0,0,0,0.04)\`) — photorealistic depth that cheap templates never achieve.
7. **Avatar system:** Consistent circular avatar placeholders with colored backgrounds and white initials throughout all screens — creates a professional, app-like consistency.
8. **Star rating visualization:** Review screen uses filled/empty star icons with a horizontal bar chart for rating distribution — makes the reviews section look like a real analytics dashboard.
`.trim();

export function buildStitchMobilePrompt(payload: StitchProspectDesignPayload): string {
  const block =
    payload.kind === "place"
      ? placeContext(payload.place, payload.colorVibe)
      : urlContext(payload.url, payload.pageTitle, payload.metaDescription, payload.colorVibe);

  const differentiation = buildMobileAssignedDifferentiationBlock(payload);
  const brandDirective = buildBrandColorDirective(payload.brandColors);

  const gmb =
    payload.kind === "place"
      ? "Brand identity must align with the Google Business Profile (name, category, and location above). "
      : "Infer brand from the page title, URL, and description. ";

  return `${block}

${brandDirective}${differentiation}

${MOBILE_CREATIVE_DIRECTIVE}

Task: ${gmb}Output **one complete HTML5 document** for a **phone-width operator / owner app** (not a consumer marketing site). Each tab is a **separate full-screen** — **only one screen visible at a time** (no one long scroll through all tabs). Same file, **no JS router**, **no inline \`<script>\`**.

## Page switch pattern (required — CSS only)
Use \`<section id="home" class="page">\`, \`id="clients"\`, \`id="book"\`, \`id="reviews"\` inside \`<main>\`. CSS same idea as the website prompt:

- All \`.page\` hidden by default; **\`min-height: 100vh\`** (minus fixed chrome); **\`overflow-y: auto\`** on the active page content so **only that tab scrolls**, not the whole document stacked.
- **Default:** show \`#home\` when no hash: \`body:not(:has(main .page:target)) #home\` and \`#home:target\` → visible.
- Show \`#clients\`, \`#book\`, \`#reviews\` when those ids are \`:target\`; when any of those is targeted, **hide** \`#home\` via \`body:has(#clients:target) #home\`, \`body:has(#book:target) #home\`, \`body:has(#reviews:target) #home\`.
- **Bottom tab active state:** \`body:has(#book:target) nav.bottom-tabs a[href="#book"] { … }\` (repeat per tab: \`#about\`, \`#gallery\`, \`#book\`, \`#reviews\`, \`#location\`). Fixed **bottom** nav with four \`<a href="#home">\` … \`#reviews\`.

## Structure checklist (every screen must feel like a polished, published app)
1. **#home** (dashboard) — The **hero screen** that sells the product — a data-rich snapshot:
   - **Immersive header area:** Gradient, pattern, or dark banner (140px+ tall) with personalized greeting ("Good morning, [Business Name]"), today’s date, and circular avatar placeholder. This header IS the brand moment.
   - **KPI hero:** One oversized metric (40px+ display font) for today’s revenue with trend indicator (arrow + percentage). Flanked by 2 supporting stat pills: **"Reminders Sent: 8"** (green check icon) and **"No-Shows: 0"** (showing the impact of automated reminders).
   - **Mini charts (2 side-by-side compact graphs):**
     1. **Weekly Revenue bar chart** — 7 compact vertical bars (M–S) using CSS flexbox, accent-colored, with the current day highlighted. Dollar total below. Fits in a card width.
     2. **New vs Returning donut** — A small CSS-only ring chart (conic-gradient) showing e.g. "72% returning" with a centered label. Reinforces repeat-business value. Both charts in a single horizontal row of 2 cards.
   - **Today’s schedule:** 3+ appointment cards, each with: circular avatar placeholder (colored initial), client name, service type, time, **colored status badge** (pill: "Confirmed" green, "Pending" amber), and a small **bell icon** indicating "SMS reminder sent". Cards must have shadow, rounded corners, and a service-type color accent. At least one card labeled "Via online booking".
   - **Primary CTA:** "+ Book Now" as \`<a href="#book">\` — styled as a **gradient or filled accent button** (full-width or floating), not a plain text link.
   - **Follow-ups due:** A notification-style card: "2 clients due for follow-up" with client initials and a "Send SMS" accent button. Reinforces that most revenue comes from repeat business.
   - **Review nudge:** A small accent card or banner: "★ 4.8 · 127 reviews · Request a review" linking to \`#reviews\`.

2. **#clients** — **Simple CRM for tracking repeat customers.** Search bar with styled input (rounded, icon). **Filter chips** at top: "All", "Active", "Needs Follow-up". **Vertical list** with: **circular avatar** (colored initial), client name, **last visit date**, **total visits count**, and **follow-up status badge** (colored pill: "Due" in amber, "Sent" in green, "Scheduled" in blue). Each row includes a small **SMS icon** button to send a reminder. Minimum 4 realistic rows with subtle card separation (shadow or divider) showing a mix of active and follow-up-due clients. **"Add Client"** floating action button (accent color, circular, bottom-right corner with shadow). Each row: chevron, 48px+ tap target height. The list must communicate that tracking repeat customers and following up drives most revenue.

3. **#book** — **Easy online booking — no more phone-tag:**
   - **Header banner:** A small accent banner: "Clients can book 24/7 — even after hours" with a link/share icon.
   - **Calendar strip:** Horizontal scrollable days (7-day strip) with the selected day highlighted (accent background, bold). Show day name + date number.
   - **Time slots:** Available times as **styled chip cards** (rounded pill shape, 48px+ height) — available slots have accent-tinted border or subtle background; booked slots are greyed/muted with "Booked" overlay. Show 4–6 slots per day.
   - **Service selector:** Styled chips or segmented control above the calendar for service types (with service-specific icons or colors).
   - **Booking summary card:** Below slots — selected service, date, time, with a prominent "Confirm Booking" gradient/accent button. Below the button, a **"Share Booking Link"** secondary action (link icon + "Copy link" or "Share via SMS") so the business can send the booking page to clients. Must feel like a **real booking system** that increases conversions by letting people book without calling.

4. **#reviews** — **Google Reviews — the growth engine for trust and inbound leads:**
   - **Aggregate rating hero:** Large display number (48px+) of the average rating (e.g. "4.8") with filled star icons and total review count ("127 reviews"). Accent background card or gradient.
   - **Growth metric:** A pill or card: "This month: 14 new reviews (+40%)" with a green trend arrow. Communicates momentum.
   - **Star distribution:** Visual bar chart (5-star to 1-star with horizontal bars, colored green-to-red gradient).
   - **Recent reviews:** 3+ review cards: circular author avatar (colored initial), star rating (filled/empty stars), realistic review text specific to this business type, date. Mix of 5-star and 4-star.
   - **Request a Review CTA:** Prominent accent card at the bottom: "Request a Review" with **SMS and WhatsApp icons** and send buttons. A note: "Going from a few reviews to 100+ boosts trust and brings in new customers automatically." Styled as a primary action — this is the single most impactful feature for inbound lead generation.
## Chrome
- **Fixed top bar** (avatar, business name, bell).
- **Fixed bottom** tab bar: Home, Clients, Book, Reviews → \`<a href="#home">\`, \`#clients\`, \`#book\`, \`#reviews\` with inline SVG or icon \`<link>\` (e.g. Google Fonts / Material icons).

## Copy
Unique copy per section, tied to the business name and vertical — not the same paragraph repeated.

${MOBILE_VISUAL_CHECKLIST}

${MOBILE_PITCH_MOMENTS}

Output: polished multi-screen mobile mockup in one HTML file, suitable for a client pitch.`.trim();
}
