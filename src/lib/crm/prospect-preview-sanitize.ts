import sanitizeHtml from "sanitize-html";
import type { IOptions } from "sanitize-html";

const FULL_DOC_ALLOWED_TAGS = [
  "html",
  "head",
  "body",
  "title",
  "meta",
  "link",
  "style",
  "div",
  "section",
  "article",
  "header",
  "footer",
  "main",
  "nav",
  "aside",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "p",
  "a",
  "span",
  "img",
  "strong",
  "b",
  "em",
  "i",
  "ul",
  "ol",
  "li",
  "br",
  "hr",
  "blockquote",
  "figure",
  "figcaption",
  "small",
  "table",
  "thead",
  "tbody",
  "tr",
  "th",
  "td",
  "button",
  /** Stitch / Tailwind CDN builds rely on this; inline script is still stripped in exclusiveFilter. */
  "script",
] as const;

/** Shared: no event handlers, no data-*; URLs restricted in options. */
const baseSanitizeOptions: IOptions = {
  allowedSchemes: ["http", "https", "mailto", "tel"],
  allowProtocolRelative: false,
  disallowedTagsMode: "discard",
  enforceHtmlBoundary: false,
  parseStyleAttributes: true,
  allowedSchemesAppliedToAttributes: ["href", "src", "cite"],
};

const fullDocumentOptions: IOptions = {
  ...baseSanitizeOptions,
  allowedTags: [...FULL_DOC_ALLOWED_TAGS],
  allowedAttributes: {
    "*": [
      "class",
      "style",
      "id",
      "role",
      "aria-label",
      "title",
      "lang",
      "dir",
      "width",
      "height",
      "loading",
      "colspan",
      "rowspan",
      "charset",
      "content",
      "name",
      "http-equiv",
      "media",
      "type",
    ],
    a: ["href", "target", "rel"],
    img: ["src", "alt", "srcset", "sizes"],
    link: [
      "rel",
      "href",
      "crossorigin",
      "media",
      "type",
      "sizes",
      "as",
      "integrity",
    ],
    script: ["src", "type", "async", "defer", "crossorigin", "integrity", "nomodule"],
  },
  exclusiveFilter(frame) {
    if (frame.tag === "link") {
      const href = String(frame.attribs?.href ?? "").trim();
      if (!href) return true;
      return !prospectPreviewTrustedLinkHref(href);
    }
    if (frame.tag === "script") {
      const inner = String(frame.text ?? "").trim();
      if (inner) return true;
      const src = String(frame.attribs?.src ?? "").trim();
      if (!src) return true;
      if (!prospectPreviewTrustedScriptSrc(src)) return true;
      const typ = String(frame.attribs?.type ?? "").trim().toLowerCase();
      if (
        typ &&
        typ !== "text/javascript" &&
        typ !== "application/javascript" &&
        typ !== "module"
      ) {
        return true;
      }
      return false;
    }
    return false;
  },
};

/**
 * Allow stylesheets, font preconnects, and icons from trusted CDNs used by Stitch / LLM exports.
 * Without this, &lt;link&gt; tags are dropped and Material Icons render as ligature text (e.g. "star").
 */
function prospectPreviewTrustedLinkHref(href: string): boolean {
  try {
    const u = new URL(href);
    if (u.protocol !== "https:") return false;
    const h = u.hostname.toLowerCase();
    if (h === "fonts.googleapis.com") return true;
    if (h === "fonts.gstatic.com") return true;
    if (h === "www.gstatic.com" || h.endsWith(".gstatic.com")) return true;
    if (h === "stitch.withgoogle.com" || h.endsWith(".withgoogle.com")) return true;
    if (h === "cdn.tailwindcss.com") return true;
    if (h === "cdn.jsdelivr.net") return true;
    if (h === "unpkg.com") return true;
    if (h === "cdnjs.cloudflare.com") return true;
    return false;
  } catch {
    return false;
  }
}

/**
 * Tailwind (and some Tailwind v4 browser builds) load from &lt;script src&gt;. We allow only HTTPS
 * CDNs that Stitch exports commonly use — no inline script (XSS).
 */
function prospectPreviewTrustedScriptSrc(src: string): boolean {
  try {
    const u = new URL(src);
    if (u.protocol !== "https:") return false;
    const h = u.hostname.toLowerCase();
    if (h === "cdn.tailwindcss.com") return true;
    if (h === "cdn.jsdelivr.net") {
      const p = u.pathname.toLowerCase();
      return (
        p.startsWith("/npm/tailwindcss") ||
        p.startsWith("/npm/@tailwindcss/") ||
        p.startsWith("/gh/tailwindlabs/")
      );
    }
    if (h === "unpkg.com") {
      const p = u.pathname.toLowerCase();
      return p.startsWith("/tailwindcss") || p.startsWith("/@tailwindcss/");
    }
    return false;
  } catch {
    return false;
  }
}

const bodyFragmentOptions: IOptions = {
  ...baseSanitizeOptions,
  allowedTags: [
    "div",
    "section",
    "article",
    "header",
    "footer",
    "main",
    "nav",
    "aside",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "p",
    "a",
    "span",
    "img",
    "strong",
    "b",
    "em",
    "i",
    "ul",
    "ol",
    "li",
    "br",
    "hr",
    "blockquote",
    "figure",
    "figcaption",
    "small",
    "table",
    "thead",
    "tbody",
    "tr",
    "th",
    "td",
  ],
  allowedAttributes: {
    "*": ["class", "style", "id", "role", "aria-label", "title"],
    a: ["href", "target", "rel"],
    img: ["src", "alt", "title", "width", "height", "loading", "srcset", "sizes"],
  },
};

function textFromHtmlFragment(value: string): string {
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function collectSectionIds(html: string): Set<string> {
  const ids = new Set<string>();
  const re = /<section\b[^>]*\bid=["']([^"']+)["'][^>]*>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) ids.add(m[1].trim().toLowerCase());
  return ids;
}

function sectionTargetForLabel(label: string, sectionIds: Set<string>): string | null {
  const key = label
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
  const candidatesByLabel: Record<string, string[]> = {
    home: ["home"],
    inicio: ["home"],
    services: ["services"],
    service: ["services"],
    servicios: ["services"],
    "our services": ["services"],
    gallery: ["gallery", "stories"],
    galeria: ["gallery", "stories"],
    galería: ["gallery", "stories"],
    pricing: ["pricing", "services", "book", "visit"],
    prices: ["pricing", "services", "book", "visit"],
    testimonials: ["testimonials", "reviews", "stories"],
    testimonial: ["testimonials", "reviews", "stories"],
    reviews: ["reviews", "testimonials", "stories"],
    reseñas: ["reviews", "testimonials", "stories"],
    about: ["about"],
    "about us": ["about"],
    "about-us": ["about"],
    "our story": ["about", "stories"],
    "our-story": ["about", "stories"],
    story: ["about", "stories"],
    team: ["about"],
    "our team": ["about"],
    stories: ["stories", "reviews", "testimonials"],
    visit: ["visit", "contact", "location", "book"],
    "find us": ["visit", "location", "contact"],
    "find-us": ["visit", "location", "contact"],
    hours: ["visit", "location"],
    address: ["visit", "location", "contact"],
    "our address": ["visit", "location", "contact"],
    book: ["visit", "book"],
    "book now": ["visit", "book"],
    "book-now": ["visit", "book"],
    "book appointment": ["visit", "book"],
    "book-appointment": ["visit", "book"],
    "book-an-appointment": ["visit", "book"],
    "book an appointment": ["visit", "book"],
    booking: ["visit", "book"],
    appointment: ["visit", "book"],
    appointments: ["visit", "book"],
    schedule: ["visit", "book"],
    reserve: ["visit", "book"],
    cita: ["visit", "book"],
    faq: ["faq", "visit"],
    faqs: ["faq", "visit"],
    "preguntas frecuentes": ["faq", "visit"],
    location: ["visit", "location"],
    contacto: ["visit", "contact"],
    contact: ["visit", "contact"],
    "contact us": ["visit", "contact"],
    "get in touch": ["visit", "contact"],
  };
  const candidates = candidatesByLabel[key];
  if (!candidates) return null;
  const found = candidates.find((candidate) => sectionIds.has(candidate));
  return found ? `#${found}` : null;
}

function repairBrokenSectionNavigation(html: string): string {
  const sectionIds = collectSectionIds(html);
  if (sectionIds.size === 0) return html;

  // 1. Rewrite empty/javascript anchors when the inner label maps to a known section.
  let out = html.replace(
    /<a\b([^>]*)\bhref=["'](?:#|javascript:void\(0\)|)["']([^>]*)>([\s\S]*?)<\/a>/gi,
    (full: string, before: string, after: string, inner: string) => {
      const target = sectionTargetForLabel(textFromHtmlFragment(inner), sectionIds);
      return target ? `<a${before} href="${target}"${after}>${inner}</a>` : full;
    },
  );

  // 2. Rewrite #anchors that point to a hash that does NOT exist as a top-level section
  //    when the link's label maps to a known section id (e.g. <a href="#our-team">About</a>
  //    becomes <a href="#about">About</a> when only #about exists).
  out = out.replace(
    /<a\b([^>]*?)\bhref=["']#([^"']+)["']([^>]*)>([\s\S]*?)<\/a>/gi,
    (full: string, before: string, hash: string, after: string, inner: string) => {
      const normalized = String(hash).trim().toLowerCase();
      if (!normalized) return full;
      if (sectionIds.has(normalized)) return full;
      const target = sectionTargetForLabel(textFromHtmlFragment(inner), sectionIds);
      return target ? `<a${before} href="${target}"${after}>${inner}</a>` : full;
    },
  );

  // 3. Convert <button> primary navigation into anchors when the label maps to a section.
  out = out.replace(
    /<button\b([^>]*)>([\s\S]*?)<\/button>/gi,
    (full: string, attrs: string, inner: string) => {
      const target = sectionTargetForLabel(textFromHtmlFragment(inner), sectionIds);
      if (!target) return full;
      const safeAttrs = attrs
        .replace(/\s*type=["'][^"']*["']/gi, "")
        .replace(/\s*onclick=["'][\s\S]*?["']/gi, "");
      return `<a${safeAttrs} href="${target}" role="button">${inner}</a>`;
    },
  );

  return out;
}

/**
 * Optional prospect metadata used to fill synthesized stub sections so anchor
 * links never dead-end when the model skips required sections.
 */
export type ProspectPreviewSectionMeta = {
  businessName?: string | null;
  businessAddress?: string | null;
  city?: string | null;
  primaryCategory?: string | null;
  listingPhone?: string | null;
  websiteUrl?: string | null;
};

const REQUIRED_NAV_TARGETS = [
  "services",
  "about",
  "stories",
  "testimonials",
  "reviews",
  "gallery",
  "pricing",
  "faq",
  "visit",
  "contact",
  "location",
  "book",
] as const;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function collectAnchorHashTargets(html: string): Set<string> {
  const targets = new Set<string>();
  const re = /<a\b[^>]*\bhref=["']#([^"']+)["'][^>]*>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const id = m[1].trim().toLowerCase();
    if (id && id !== "home") targets.add(id);
  }
  return targets;
}

function buildStubSection(
  id: string,
  meta: ProspectPreviewSectionMeta,
): string {
  const business = escapeHtml((meta.businessName ?? "this business").trim() || "this business");
  const address = meta.businessAddress?.trim() ? escapeHtml(meta.businessAddress.trim()) : null;
  const city = meta.city?.trim() ? escapeHtml(meta.city.trim()) : null;
  const phone = meta.listingPhone?.trim() ? escapeHtml(meta.listingPhone.trim()) : null;
  const cat = meta.primaryCategory?.trim() ? escapeHtml(meta.primaryCategory.trim()) : null;

  const altBg =
    "bg-gradient-to-br from-white via-slate-50 to-white dark:from-slate-950 dark:via-slate-900 dark:to-slate-950";
  const ctaClasses =
    "inline-flex items-center gap-2 rounded-full px-7 py-3 text-sm font-bold text-white shadow-lg transition-transform hover:scale-105 bg-gradient-to-r from-indigo-700 to-blue-600";

  switch (id) {
    case "services": {
      const focus = cat || "premium services tailored to your needs";
      return `
<section id="services" class="relative w-full ${altBg} py-24 px-6 md:px-12">
  <div class="max-w-7xl mx-auto">
    <div class="max-w-3xl">
      <span class="inline-block text-xs font-bold tracking-[0.3em] uppercase text-blue-700 dark:text-blue-300">What we offer</span>
      <h2 class="mt-3 text-4xl md:text-5xl font-black tracking-tight text-slate-900 dark:text-white">Services built around ${business}</h2>
      <p class="mt-5 text-lg text-slate-600 dark:text-slate-300 leading-relaxed">
        Every offering at ${business} is crafted around ${focus}. Explore our full lineup designed to deliver an experience our clients keep coming back for.
      </p>
    </div>
    <div class="mt-14 grid grid-cols-1 md:grid-cols-3 gap-6">
      <article class="rounded-3xl bg-white dark:bg-slate-900 p-8 shadow-[0_10px_32px_-4px_rgba(15,23,42,0.08)] border border-slate-100 dark:border-slate-800">
        <div class="h-12 w-12 rounded-2xl bg-blue-50 dark:bg-blue-950 grid place-items-center text-blue-700 dark:text-blue-300 font-black text-lg">01</div>
        <h3 class="mt-5 text-xl font-bold text-slate-900 dark:text-white">Signature Experience</h3>
        <p class="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">A flagship service that captures everything ${business} stands for — quality, attention to detail, and unmistakable craft.</p>
      </article>
      <article class="rounded-3xl bg-white dark:bg-slate-900 p-8 shadow-[0_10px_32px_-4px_rgba(15,23,42,0.08)] border border-slate-100 dark:border-slate-800">
        <div class="h-12 w-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950 grid place-items-center text-indigo-700 dark:text-indigo-300 font-black text-lg">02</div>
        <h3 class="mt-5 text-xl font-bold text-slate-900 dark:text-white">Tailored Packages</h3>
        <p class="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">Flexible options designed to match your goals, your timeline, and your budget — without compromise.</p>
      </article>
      <article class="rounded-3xl bg-white dark:bg-slate-900 p-8 shadow-[0_10px_32px_-4px_rgba(15,23,42,0.08)] border border-slate-100 dark:border-slate-800">
        <div class="h-12 w-12 rounded-2xl bg-amber-50 dark:bg-amber-950 grid place-items-center text-amber-700 dark:text-amber-300 font-black text-lg">03</div>
        <h3 class="mt-5 text-xl font-bold text-slate-900 dark:text-white">Concierge Care</h3>
        <p class="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">Friendly, attentive service from your first conversation to your final follow-up — the way every client should be treated.</p>
      </article>
    </div>
    <div class="mt-12">
      <a class="${ctaClasses}" href="#visit">Book your visit <span aria-hidden="true">→</span></a>
    </div>
  </div>
</section>`;
    }
    case "about": {
      const where = city ? `in ${city}` : address ? `at ${address}` : "in our community";
      return `
<section id="about" class="relative w-full bg-white dark:bg-slate-950 py-24 px-6 md:px-12">
  <div class="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
    <div class="lg:col-span-5">
      <span class="inline-block text-xs font-bold tracking-[0.3em] uppercase text-blue-700 dark:text-blue-300">Our story</span>
      <h2 class="mt-3 text-4xl md:text-5xl font-black tracking-tight text-slate-900 dark:text-white">Built on craft, run with heart</h2>
    </div>
    <div class="lg:col-span-7 space-y-5 text-lg leading-relaxed text-slate-600 dark:text-slate-300">
      <p>${business} began with a simple belief: every client deserves to feel like the most important person in the room. That belief drives every detail of how we operate ${where}.</p>
      <p>Today, our team is known for a calm, premium experience that blends professionalism with genuine warmth. We invest in our people, our space, and the small touches that turn first-time visitors into long-term regulars.</p>
      <div class="grid grid-cols-3 gap-6 pt-4">
        <div>
          <div class="text-3xl font-black text-slate-900 dark:text-white">5★</div>
          <div class="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 mt-1">Client rating</div>
        </div>
        <div>
          <div class="text-3xl font-black text-slate-900 dark:text-white">100%</div>
          <div class="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 mt-1">Locally owned</div>
        </div>
        <div>
          <div class="text-3xl font-black text-slate-900 dark:text-white">7d</div>
          <div class="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 mt-1">Easy booking</div>
        </div>
      </div>
    </div>
  </div>
</section>`;
    }
    case "stories":
    case "testimonials":
    case "reviews": {
      return `
<section id="${id}" class="relative w-full ${altBg} py-24 px-6 md:px-12">
  <div class="max-w-7xl mx-auto">
    <div class="max-w-3xl">
      <span class="inline-block text-xs font-bold tracking-[0.3em] uppercase text-blue-700 dark:text-blue-300">From our community</span>
      <h2 class="mt-3 text-4xl md:text-5xl font-black tracking-tight text-slate-900 dark:text-white">Real stories from real clients</h2>
    </div>
    <div class="mt-14 grid grid-cols-1 md:grid-cols-2 gap-6">
      <figure class="rounded-3xl bg-white dark:bg-slate-900 p-8 shadow-[0_10px_32px_-4px_rgba(15,23,42,0.08)] border border-slate-100 dark:border-slate-800">
        <div class="text-amber-500 text-lg tracking-wider">★★★★★</div>
        <blockquote class="mt-4 text-lg leading-relaxed text-slate-700 dark:text-slate-200">“The level of care at ${business} is unmatched. From the moment I walked in I knew I'd be coming back. Worth every second.”</blockquote>
        <figcaption class="mt-6 text-sm font-semibold text-slate-900 dark:text-white">A long-time client</figcaption>
      </figure>
      <figure class="rounded-3xl bg-white dark:bg-slate-900 p-8 shadow-[0_10px_32px_-4px_rgba(15,23,42,0.08)] border border-slate-100 dark:border-slate-800">
        <div class="text-amber-500 text-lg tracking-wider">★★★★★</div>
        <blockquote class="mt-4 text-lg leading-relaxed text-slate-700 dark:text-slate-200">“Beautiful space, talented team, and a genuinely premium experience from start to finish. Highly recommended.”</blockquote>
        <figcaption class="mt-6 text-sm font-semibold text-slate-900 dark:text-white">Verified visitor</figcaption>
      </figure>
    </div>
  </div>
</section>`;
    }
    case "gallery": {
      return `
<section id="gallery" class="relative w-full bg-white dark:bg-slate-950 py-24 px-6 md:px-12">
  <div class="max-w-7xl mx-auto">
    <span class="inline-block text-xs font-bold tracking-[0.3em] uppercase text-blue-700 dark:text-blue-300">Gallery</span>
    <h2 class="mt-3 text-4xl md:text-5xl font-black tracking-tight text-slate-900 dark:text-white">A look inside</h2>
    <div class="mt-10 grid grid-cols-2 md:grid-cols-4 gap-3">
      <div class="aspect-[3/4] rounded-2xl bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-800 dark:to-slate-900"></div>
      <div class="aspect-[3/4] rounded-2xl bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900 dark:to-blue-950"></div>
      <div class="aspect-[3/4] rounded-2xl bg-gradient-to-br from-amber-100 to-amber-200 dark:from-amber-900 dark:to-amber-950"></div>
      <div class="aspect-[3/4] rounded-2xl bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-800 dark:to-slate-900"></div>
    </div>
  </div>
</section>`;
    }
    case "pricing": {
      return `
<section id="pricing" class="relative w-full ${altBg} py-24 px-6 md:px-12">
  <div class="max-w-7xl mx-auto">
    <span class="inline-block text-xs font-bold tracking-[0.3em] uppercase text-blue-700 dark:text-blue-300">Plans</span>
    <h2 class="mt-3 text-4xl md:text-5xl font-black tracking-tight text-slate-900 dark:text-white">Simple, premium pricing</h2>
    <p class="mt-5 max-w-2xl text-lg text-slate-600 dark:text-slate-300">Choose the option that fits — every plan includes the same uncompromising quality.</p>
    <div class="mt-12 text-center">
      <a class="${ctaClasses}" href="#visit">Talk to our team <span aria-hidden="true">→</span></a>
    </div>
  </div>
</section>`;
    }
    case "faq": {
      return `
<section id="faq" class="relative w-full bg-white dark:bg-slate-950 py-24 px-6 md:px-12">
  <div class="max-w-4xl mx-auto">
    <span class="inline-block text-xs font-bold tracking-[0.3em] uppercase text-blue-700 dark:text-blue-300">Questions</span>
    <h2 class="mt-3 text-4xl md:text-5xl font-black tracking-tight text-slate-900 dark:text-white">Frequently asked</h2>
    <div class="mt-10 space-y-6">
      <div class="rounded-2xl border border-slate-100 dark:border-slate-800 p-6">
        <h3 class="text-lg font-bold text-slate-900 dark:text-white">How do I book?</h3>
        <p class="mt-2 text-slate-600 dark:text-slate-300">Use the “Book Appointment” button at the top of the page or call us directly${phone ? ` at ${phone}` : ""}.</p>
      </div>
      <div class="rounded-2xl border border-slate-100 dark:border-slate-800 p-6">
        <h3 class="text-lg font-bold text-slate-900 dark:text-white">Where are you located?</h3>
        <p class="mt-2 text-slate-600 dark:text-slate-300">${address ? `You can find us at ${address}.` : `See the Visit section for location details.`}</p>
      </div>
      <div class="rounded-2xl border border-slate-100 dark:border-slate-800 p-6">
        <h3 class="text-lg font-bold text-slate-900 dark:text-white">Do you accept new clients?</h3>
        <p class="mt-2 text-slate-600 dark:text-slate-300">Absolutely. ${business} is always welcoming new clients — we'd love to meet you.</p>
      </div>
    </div>
  </div>
</section>`;
    }
    case "visit":
    case "contact":
    case "location":
    case "book": {
      const cardClass =
        "rounded-3xl bg-white dark:bg-slate-900 p-8 shadow-[0_10px_32px_-4px_rgba(15,23,42,0.08)] border border-slate-100 dark:border-slate-800";
      return `
<section id="${id}" class="relative w-full ${altBg} py-24 px-6 md:px-12">
  <div class="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
    <div class="lg:col-span-6">
      <span class="inline-block text-xs font-bold tracking-[0.3em] uppercase text-blue-700 dark:text-blue-300">Visit ${business}</span>
      <h2 class="mt-3 text-4xl md:text-5xl font-black tracking-tight text-slate-900 dark:text-white">Come see us in person</h2>
      <p class="mt-5 text-lg text-slate-600 dark:text-slate-300 leading-relaxed">We can't wait to welcome you. Stop by, give us a call, or book your appointment online — whichever works best for you.</p>
      <div class="mt-8 flex flex-wrap gap-3">
        <a class="${ctaClasses}" href="#visit">Book Appointment <span aria-hidden="true">→</span></a>
        ${phone ? `<a class="inline-flex items-center gap-2 rounded-full px-7 py-3 text-sm font-bold text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" href="tel:${phone}">Call ${phone}</a>` : ""}
      </div>
    </div>
    <div class="lg:col-span-6 grid grid-cols-1 gap-4">
      ${address ? `<div class="${cardClass}"><div class="text-xs font-bold tracking-[0.2em] uppercase text-blue-700 dark:text-blue-300">Address</div><div class="mt-2 text-lg font-semibold text-slate-900 dark:text-white leading-snug">${address}</div></div>` : ""}
      ${phone ? `<div class="${cardClass}"><div class="text-xs font-bold tracking-[0.2em] uppercase text-blue-700 dark:text-blue-300">Phone</div><div class="mt-2 text-lg font-semibold text-slate-900 dark:text-white">${phone}</div></div>` : ""}
      <div class="${cardClass}">
        <div class="text-xs font-bold tracking-[0.2em] uppercase text-blue-700 dark:text-blue-300">Hours</div>
        <div class="mt-2 text-base text-slate-700 dark:text-slate-200">Open by appointment — see you soon.</div>
      </div>
    </div>
  </div>
</section>`;
    }
    default:
      return "";
  }
}

const SECTION_INSERT_ORDER = [
  "services",
  "about",
  "stories",
  "testimonials",
  "reviews",
  "gallery",
  "pricing",
  "faq",
  "visit",
  "contact",
  "location",
  "book",
] as const;

function injectStubsIntoHtml(html: string, stubs: string): string {
  if (!stubs) return html;

  const lower = html.toLowerCase();

  // Prefer inserting before </main>, just after the hero/main flow.
  const mainClose = lower.lastIndexOf("</main>");
  if (mainClose !== -1) {
    return html.slice(0, mainClose) + stubs + html.slice(mainClose);
  }

  // Otherwise insert just before <footer>.
  const footerOpen = lower.indexOf("<footer");
  if (footerOpen !== -1) {
    return html.slice(0, footerOpen) + stubs + html.slice(footerOpen);
  }

  // Otherwise insert just before </body>.
  const bodyClose = lower.lastIndexOf("</body>");
  if (bodyClose !== -1) {
    return html.slice(0, bodyClose) + stubs + html.slice(bodyClose);
  }

  return html + stubs;
}

/**
 * Safety net for non-deterministic AI HTML output: when the document references
 * `#services`, `#about`, `#stories`, `#visit`, etc. via nav anchors but the
 * matching `<section id>` is missing, synthesize branded stub sections inline
 * using the prospect's real metadata. This guarantees navigation links never
 * dead-end and the preview reads as a multi-section site even when the model
 * cuts corners.
 */
export function ensureProspectPreviewRequiredSections(
  html: string,
  meta: ProspectPreviewSectionMeta,
): string {
  const input = typeof html === "string" ? html : "";
  if (!input.trim()) return input;

  // Only intervene when there is at least one `<section id>` already (i.e. the
  // model gave us real content). For empty docs, do nothing.
  const sectionIds = collectSectionIds(input);
  if (sectionIds.size === 0) return input;

  const anchorTargets = collectAnchorHashTargets(input);

  const missing = new Set<string>();
  for (const id of REQUIRED_NAV_TARGETS) {
    if (anchorTargets.has(id) && !sectionIds.has(id)) missing.add(id);
  }

  if (missing.size === 0) return input;

  const stubs = SECTION_INSERT_ORDER
    .filter((id) => missing.has(id))
    .map((id) => buildStubSection(id, meta))
    .filter(Boolean)
    .join("\n");

  if (!stubs) return input;
  return injectStubsIntoHtml(input, stubs);
}

/* ──────────────────────────────────────────────────────────────────────────
 * Web-app dashboard navigation repair
 *
 * Stitch's web-app prompt asks for CSS-only `:target` view switching with
 * canonical ids (`#dash`, `#pipeline`, `#clients`, `#inbox`, `#schedule`,
 * `#reviews`). In practice the model often:
 *   1. emits sidebar items with valid hashes but no matching panel,
 *   2. uses `<div id="X">` instead of `<section id="X" class="page">`,
 *   3. leaves "Settings" / "Support" with `href="#"` or `href="javascript:".
 * Either way, clicking the sidebar changes the URL hash but nothing visible
 * happens. The functions below post-process the document so every sidebar
 * link maps to a real `class="page"` panel.
 * ────────────────────────────────────────────────────────────────────────── */

type WebAppNavSlug = string;

type WebAppSidebarItem = { slug: WebAppNavSlug; label: string };

/**
 * Canonical web-app sidebar slugs. The repair only triggers when at least
 * a couple of these are detected so it stays a no-op on marketing pages.
 */
const CANONICAL_WEBAPP_SLUGS: ReadonlySet<string> = new Set([
  "dash",
  "pipeline",
  "clients",
  "inbox",
  "schedule",
  "reviews",
  "inventory",
  "analytics",
  "settings",
  "support",
]);

const WEBAPP_NAV_LABEL_RULES: Array<{
  patterns: RegExp[];
  slug: WebAppNavSlug;
}> = [
  { patterns: [/\bdashboard\b/i, /\bhome\b/i, /\boverview\b/i, /\bdash\b/i], slug: "dash" },
  {
    patterns: [
      /\boperations?\b/i,
      /\bworkflow\b/i,
      /\bops\b/i,
      /\bproduction\b/i,
      /\bpipeline\b/i,
      /\bdeals?\b/i,
      /\bsales\b/i,
      /\bfulfillment\b/i,
    ],
    slug: "pipeline",
  },
  { patterns: [/\binventory\b/i, /\bstock\b/i, /\bcatalog\b/i, /\bproducts?\b/i], slug: "inventory" },
  {
    patterns: [
      /\bclients?\b/i,
      /\bcustomers?\b/i,
      /\bpatients?\b/i,
      /\bmembers?\b/i,
      /\bcontacts?\b/i,
    ],
    slug: "clients",
  },
  {
    patterns: [/\binbox\b/i, /\bconversations?\b/i, /\bmessages?\b/i, /\bmail\b/i, /\bchat\b/i],
    slug: "inbox",
  },
  {
    patterns: [
      /\bschedule\b/i,
      /\bcalendar\b/i,
      /\bappointments?\b/i,
      /\bbookings?\b/i,
      /\bagenda\b/i,
    ],
    slug: "schedule",
  },
  {
    patterns: [/\breviews?\b/i, /\breputation\b/i, /\bratings?\b/i, /\bfeedback\b/i],
    slug: "reviews",
  },
  {
    patterns: [
      /\banalytics?\b/i,
      /\breports?\b/i,
      /\binsights?\b/i,
      /\bmetrics?\b/i,
      /\bstats?\b/i,
    ],
    slug: "analytics",
  },
  {
    patterns: [/\bsettings?\b/i, /\bpreferences?\b/i, /\baccount\b/i, /\bconfiguration\b/i],
    slug: "settings",
  },
  { patterns: [/\bsupport\b/i, /\bhelp\b/i, /\bassistance\b/i], slug: "support" },
];

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Strip Material Symbols / SVG icons and tags so we can read the sidebar's visible label. */
function extractSidebarLabel(inner: string): string {
  let s = inner
    .replace(
      /<span\b[^>]*class=["'][^"']*material-symbols[^"']*["'][^>]*>[\s\S]*?<\/span>/gi,
      " ",
    )
    .replace(/<svg\b[\s\S]*?<\/svg>/gi, " ")
    .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[\s\S]*?<\/style>/gi, " ");
  s = s.replace(/<[^>]+>/g, " ");
  s = s
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
  return s.replace(/\s+/g, " ").trim();
}

/** Return a canonical web-app slug for a sidebar label, or null when none matches. */
function deriveCanonicalSlugFromLabel(label: string): WebAppNavSlug | null {
  const t = label.trim();
  if (!t) return null;
  for (const rule of WEBAPP_NAV_LABEL_RULES) {
    if (rule.patterns.some((p) => p.test(t))) return rule.slug;
  }
  return null;
}

function isAlreadyValidWebAppSlug(hash: string): WebAppNavSlug | null {
  const trimmed = hash.replace(/^#/, "").trim();
  if (!trimmed) return null;
  if (!/^[a-z][a-z0-9_-]{0,40}$/i.test(trimmed)) return null;
  return trimmed.toLowerCase();
}

function appendClassToOpenTag(openTag: string, className: string): string {
  const classRe = /\bclass=("|')([^"']*)\1/i;
  if (classRe.test(openTag)) {
    return openTag.replace(classRe, (_full, quote: string, value: string) => {
      const tokens = String(value).split(/\s+/).filter(Boolean);
      if (tokens.includes(className)) return `class=${quote}${value}${quote}`;
      tokens.push(className);
      return `class=${quote}${tokens.join(" ")}${quote}`;
    });
  }
  return openTag.replace(/^<(\w+)/, `<$1 class="${className}"`);
}

function findMatchingCloseAfterOpen(
  html: string,
  openTagStartIdx: number,
  tagName: string,
): number {
  let i = html.indexOf(">", openTagStartIdx);
  if (i === -1) return -1;
  i += 1;
  const openRe = new RegExp(`<${escapeRegex(tagName)}\\b`, "gi");
  const closeRe = new RegExp(`</${escapeRegex(tagName)}\\s*>`, "gi");
  let depth = 1;
  let pos = i;
  while (depth > 0 && pos < html.length) {
    openRe.lastIndex = pos;
    closeRe.lastIndex = pos;
    const oNext = openRe.exec(html);
    const cNext = closeRe.exec(html);
    if (!cNext) return -1;
    if (oNext && oNext.index < cNext.index) {
      depth += 1;
      pos = oNext.index + oNext[0].length;
    } else {
      depth -= 1;
      pos = cNext.index + cNext[0].length;
      if (depth === 0) return pos;
    }
  }
  return -1;
}

function findElementById(
  html: string,
  id: string,
): { startIdx: number; endIdx: number; tagName: string; openTag: string } | null {
  const re = new RegExp(
    `<([a-zA-Z][a-zA-Z0-9]*)\\b[^>]*\\bid=["']${escapeRegex(id)}["'][^>]*>`,
    "i",
  );
  const match = re.exec(html);
  if (!match) return null;
  const tagName = match[1];
  const startIdx = match.index;
  const endIdx = findMatchingCloseAfterOpen(html, startIdx, tagName);
  if (endIdx === -1) return null;
  return { startIdx, endIdx, tagName, openTag: match[0] };
}

function buildWebAppPagePanelStub(
  slug: WebAppNavSlug,
  label: string,
  meta: ProspectPreviewSectionMeta,
): string {
  const business = escapeHtml((meta.businessName ?? "this business").trim() || "this business");
  const safeLabel = escapeHtml(label || slug.replace(/[-_]/g, " "));
  const lower = safeLabel.toLowerCase();
  const tone =
    "rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-6 shadow-[0_10px_32px_-12px_rgba(0,0,0,0.4)]";
  return `
<section id="${escapeHtml(slug)}" class="page max-w-7xl mx-auto space-y-8">
  <header class="flex flex-wrap items-end justify-between gap-6">
    <div>
      <span class="inline-block text-[10px] font-semibold tracking-[0.3em] uppercase opacity-60">${business}</span>
      <h2 class="mt-3 text-3xl md:text-4xl font-semibold tracking-tight">${safeLabel}</h2>
      <p class="mt-3 text-sm opacity-70 max-w-2xl">A focused workspace for ${lower}. Live data, quick actions, and the controls your team uses every day will live here.</p>
    </div>
    <a href="#dash" class="inline-flex items-center gap-2 rounded-full border border-current/30 px-5 py-2 text-xs font-semibold uppercase tracking-widest opacity-80 hover:opacity-100">Back to dashboard <span aria-hidden="true">&rarr;</span></a>
  </header>
  <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
    <div class="${tone}">
      <div class="text-[11px] uppercase tracking-widest opacity-60">Status</div>
      <div class="mt-3 text-2xl font-semibold">Live</div>
      <p class="mt-2 text-sm opacity-70">${safeLabel} is online and routing in real time.</p>
    </div>
    <div class="${tone}">
      <div class="text-[11px] uppercase tracking-widest opacity-60">Owner</div>
      <div class="mt-3 text-2xl font-semibold">${business}</div>
      <p class="mt-2 text-sm opacity-70">Permissions and data scoped to your team.</p>
    </div>
    <div class="${tone}">
      <div class="text-[11px] uppercase tracking-widest opacity-60">Last update</div>
      <div class="mt-3 text-2xl font-semibold">Today</div>
      <p class="mt-2 text-sm opacity-70">All ${lower} activity from this session is captured.</p>
    </div>
  </div>
  <div class="${tone}">
    <h3 class="text-lg font-semibold">${safeLabel} workspace</h3>
    <p class="mt-2 text-sm opacity-70">This panel is a placeholder. The production build of this view will surface filters, tables, and inline actions tailored to ${business}'s ${lower} workflow.</p>
  </div>
</section>
`.trim();
}

const WEBAPP_HASH_ANCHOR_RE =
  /<a\b([^>]*?)\bhref=(["'])([^"']*)\2([^>]*)>([\s\S]*?)<\/a>/gi;

/**
 * Detect, fix, and back-fill sidebar nav links so the produced web-app preview
 * actually navigates between views via CSS `:target`.
 */
export function repairWebAppDashboardNavigation(
  html: string,
  meta: ProspectPreviewSectionMeta,
): string {
  if (typeof html !== "string" || !html.trim()) return html;

  // Cheap structural gate so this is safe to call from the route-handler
  // self-heal path even on marketing-style previews.
  const hasSidebar = /<(nav|aside)\b[^>]*>/i.test(html);
  if (!hasSidebar) return html;
  const hasHashLink = /<a\b[^>]*\bhref=["']#/i.test(html);
  if (!hasHashLink) return html;

  // First, scan anchors WITHOUT mutating to count canonical sidebar items.
  // This keeps the repair a hard no-op on marketing pages (which have hash
  // anchors like `#services`, `#about`, etc. that are not canonical).
  const canonicalAnchors: Array<{ slug: WebAppNavSlug; label: string }> = [];
  for (const m of html.matchAll(WEBAPP_HASH_ANCHOR_RE)) {
    const hrefRaw = m[3] ?? "";
    const inner = m[5] ?? "";
    const href = hrefRaw.trim();
    const looksHash =
      href === "" ||
      href === "#" ||
      /^javascript:/i.test(href) ||
      href.startsWith("#");
    if (!looksHash) continue;
    const label = extractSidebarLabel(inner);
    const existingSlug = href.startsWith("#")
      ? isAlreadyValidWebAppSlug(href)
      : null;
    const labelSlug = deriveCanonicalSlugFromLabel(label);
    let slug: WebAppNavSlug | null = null;
    if (existingSlug && CANONICAL_WEBAPP_SLUGS.has(existingSlug)) {
      slug = existingSlug;
    } else if (labelSlug) {
      slug = labelSlug;
    }
    if (!slug) continue;
    canonicalAnchors.push({ slug, label: label || slug });
  }

  // Require at least 3 canonical sidebar items so we don't false-positive on
  // marketing pages that happen to have a `<nav>` with hash links.
  if (canonicalAnchors.length < 3) return html;

  const itemSlugs = new Set(canonicalAnchors.map((a) => a.slug));

  // Pass 1: walk hash anchors and rewrite bad/empty hrefs (and strip
  // `target="_blank"` / `onX=`) for the anchors that map to canonical slugs.
  const items = new Map<WebAppNavSlug, WebAppSidebarItem>();
  const rewritten = html.replace(
    WEBAPP_HASH_ANCHOR_RE,
    (full, before: string, _quote: string, hrefRaw: string, after: string, inner: string) => {
      const href = (hrefRaw ?? "").trim();
      const looksHash =
        href === "" ||
        href === "#" ||
        /^javascript:/i.test(href) ||
        href.startsWith("#");
      if (!looksHash) return full;

      const label = extractSidebarLabel(inner);
      const existingSlug = href.startsWith("#")
        ? isAlreadyValidWebAppSlug(href)
        : null;
      const labelSlug = deriveCanonicalSlugFromLabel(label);
      let slug: WebAppNavSlug | null = null;
      if (existingSlug && CANONICAL_WEBAPP_SLUGS.has(existingSlug)) {
        slug = existingSlug;
      } else if (labelSlug) {
        slug = labelSlug;
      }
      if (!slug) return full;

      if (!items.has(slug)) {
        items.set(slug, { slug, label: label || slug });
      }

      const cleanedBefore = before
        .replace(/\s+target=["'][^"']*["']/gi, "")
        .replace(/\s+on[a-z]+=["'][^"']*["']/gi, "")
        .replace(/\s+$/u, "");
      const cleanedAfter = after
        .replace(/\s+target=["'][^"']*["']/gi, "")
        .replace(/\s+on[a-z]+=["'][^"']*["']/gi, "");
      return `<a${cleanedBefore} href="#${slug}"${cleanedAfter}>${inner}</a>`;
    },
  );

  if (items.size === 0 || itemSlugs.size === 0) return rewritten;

  // Pass 2: ensure every slug has a `class="page"` panel. Add the class to
  // existing panels and synthesize stubs for missing ones.
  let withPanels = rewritten;
  const missing: WebAppSidebarItem[] = [];
  let dashCloseIdx = -1;

  for (const item of items.values()) {
    const located = findElementById(withPanels, item.slug);
    if (located) {
      const newOpenTag = appendClassToOpenTag(located.openTag, "page");
      if (newOpenTag !== located.openTag) {
        withPanels =
          withPanels.slice(0, located.startIdx) +
          newOpenTag +
          withPanels.slice(located.startIdx + located.openTag.length);
      }
      if (item.slug === "dash") {
        const refreshed = findElementById(withPanels, "dash");
        if (refreshed) dashCloseIdx = refreshed.endIdx;
      }
    } else {
      missing.push(item);
    }
  }

  if (missing.length === 0) return withPanels;

  const stubs = missing
    .map((item) => buildWebAppPagePanelStub(item.slug, item.label, meta))
    .filter(Boolean)
    .join("\n");
  if (!stubs) return withPanels;

  if (dashCloseIdx > 0) {
    return (
      withPanels.slice(0, dashCloseIdx) + "\n" + stubs + withPanels.slice(dashCloseIdx)
    );
  }

  const lower = withPanels.toLowerCase();
  const mainClose = lower.lastIndexOf("</main>");
  if (mainClose !== -1) {
    return withPanels.slice(0, mainClose) + "\n" + stubs + withPanels.slice(mainClose);
  }
  const bodyClose = lower.lastIndexOf("</body>");
  if (bodyClose !== -1) {
    return withPanels.slice(0, bodyClose) + "\n" + stubs + withPanels.slice(bodyClose);
  }
  return withPanels + "\n" + stubs;
}

/**
 * Sanitize a full HTML document from the model (allows &lt;style&gt;, vetted &lt;link&gt;, and
 * vetted external &lt;script src&gt; for Tailwind CDN — no inline script).
 */
export function sanitizeProspectPreviewFullDocumentHtml(html: string): string {
  let dirty = (typeof html === "string" ? html : "").trim();
  if (!dirty) {
    dirty =
      "<!DOCTYPE html><html lang=\"en\"><head><meta charset=\"UTF-8\"/><title>Preview</title></head><body><p>Preview</p></body></html>";
  }
  dirty = repairBrokenSectionNavigation(dirty);
  const purified = sanitizeHtml(dirty, fullDocumentOptions);
  const out = purified.trim();
  if (/^<!DOCTYPE/i.test(out)) return out;
  if (/^<html\b/i.test(out)) return `<!DOCTYPE html>\n${out}`;
  return `<!DOCTYPE html>\n${out}`;
}

/**
 * Sanitize LLM-produced body markup for a one-page site preview (inline styles; no scripts).
 */
export function sanitizeProspectPreviewBodyHtml(html: string): string {
  const dirty =
    (typeof html === "string" ? html : "").trim() || "<p>Preview</p>";
  return sanitizeHtml(dirty, bodyFragmentOptions);
}

export function buildProspectPreviewDocument(bodyInner: string): string {
  const safe = sanitizeProspectPreviewBodyHtml(bodyInner);
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="robots" content="noindex,nofollow" />
  <title>Site preview</title>
</head>
<body>
${safe}
</body>
</html>`;
}

/**
 * CSS-only view switching for web-app dashboard previews. Hides every `.page`
 * panel by default and shows the one whose id matches the URL hash. When no
 * hash is active (or it points outside the document), the canonical `#dash`
 * panel is shown; if that doesn't exist, the first `.page` child of `<main>`
 * (or `<body>`) is shown as a final fallback.
 *
 * Marketing-website previews have no `.page` elements, so these rules are
 * inert there.
 */
const PREVIEW_PAGE_FALLBACK_STYLE = `<style id="zenpho-page-target-fallback">
  .page { display: none; }
  .page:target { display: block; }
  body:not(:has(.page:target)) #dash.page,
  main:not(:has(.page:target)) #dash.page,
  body:not(:has(.page:target)) #dash,
  main:not(:has(.page:target)) #dash,
  body:not(:has(:target)) main > .page:first-child,
  body:not(:has(:target)) > .page:first-child {
    display: block !important;
    opacity: 1 !important;
    visibility: visible !important;
    position: relative !important;
    pointer-events: auto !important;
  }
</style>`;

/** Warm accent for legal/footer links in hosted previews (Stitch + LLM HTML). */
const PREVIEW_FOOTER_LINK_STYLE = `<style id="zenpho-preview-footer-link-accent">
  footer a,
  [role="contentinfo"] a,
  .footer a,
  .site-footer a {
    color: #f59e0b !important;
  }
  footer a:hover,
  [role="contentinfo"] a:hover,
  .footer a:hover,
  .site-footer a:hover {
    color: #ea580c !important;
  }
</style>`;

/**
 * Smooth scroll + sticky-header offset for the Stitch / LLM previews. Without this, anchor
 * clicks jump abruptly and the destination heading is hidden behind the floating glass nav.
 */
const PREVIEW_SECTION_SCROLL_STYLE = `<style id="zenpho-section-scroll-offset">
  html { scroll-behavior: smooth; }
  section[id] { scroll-margin-top: 96px; }
</style>`;

/**
 * Stitch often emits Tailwind class names from a custom design token system
 * (`text-on-surface`, `bg-primary-container`, etc.) without exporting the token
 * definitions. When hosted outside Stitch, those classes are no-ops and can
 * create white text on white cards, especially on mobile.
 */
const PREVIEW_STITCH_READABILITY_STYLE = `<style id="zenpho-stitch-readability-repair">
  :root {
    --zp-preview-primary: #014372;
    --zp-preview-primary-dark: #002c4e;
    --zp-preview-primary-soft: #e6f3fa;
    --zp-preview-secondary: #f2c98b;
    --zp-preview-surface: #ffffff;
    --zp-preview-surface-muted: #f1f7fb;
    --zp-preview-text: #0f172a;
    --zp-preview-muted: #334155;
  }

  .text-on-surface,
  .text-on-surface * {
    color: var(--zp-preview-text) !important;
  }

  .text-on-surface-variant,
  .text-on-surface-variant * {
    color: var(--zp-preview-muted) !important;
  }

  .text-primary-container,
  .text-primary-container * {
    color: var(--zp-preview-primary) !important;
  }

  .text-secondary-container,
  .text-secondary-container * {
    color: #92400e !important;
  }

  .bg-primary,
  .bg-primary-container {
    background: linear-gradient(135deg, var(--zp-preview-primary), var(--zp-preview-primary-dark)) !important;
    color: #ffffff !important;
  }

  .bg-primary *,
  .bg-primary-container * {
    color: inherit;
  }

  .bg-primary .text-secondary-container,
  .bg-primary-container .text-secondary-container {
    color: var(--zp-preview-secondary) !important;
  }

  .bg-secondary-container,
  .bg-surface-variant {
    background: var(--zp-preview-primary-soft) !important;
  }

  .glass-panel {
    background: rgba(255, 255, 255, 0.92) !important;
    color: var(--zp-preview-text);
  }

  .line-clamp-2 {
    display: block !important;
    -webkit-line-clamp: unset !important;
    line-clamp: unset !important;
    overflow: visible !important;
  }

  section.page:has(.workspace),
  section.page:has([class*="workspace"]) {
    display: none !important;
  }

  @media (max-width: 640px) {
    html,
    body {
      max-width: 100%;
      overflow-x: hidden;
    }

    body {
      background: #ffffff;
    }

    section {
      max-width: 100%;
    }

    .glass-panel {
      background: rgba(255, 255, 255, 0.96) !important;
      backdrop-filter: blur(8px) !important;
      -webkit-backdrop-filter: blur(8px) !important;
      box-shadow: 0 10px 30px rgba(15, 23, 42, 0.12) !important;
    }

    .custom-radius {
      border-radius: 18px !important;
    }

    .text-h1,
    h1 {
      font-size: clamp(2rem, 10vw, 3.35rem) !important;
      line-height: 1.05 !important;
      letter-spacing: -0.035em;
    }

    .text-h2,
    h2 {
      font-size: clamp(1.75rem, 8vw, 2.6rem) !important;
      line-height: 1.12 !important;
    }

    .text-h3,
    h3 {
      font-size: clamp(1.2rem, 5vw, 1.55rem) !important;
      line-height: 1.2 !important;
    }

    p,
    a,
    li,
    blockquote {
      overflow-wrap: anywhere;
    }

    .min-h-screen {
      min-height: auto !important;
    }
  }
</style>`;

/**
 * Injects footer-focused link colors so Privacy/Terms (and similar) read clearly on generated previews.
 */
export function injectProspectPreviewFooterLinkStyles(html: string): string {
  let h = typeof html === "string" ? html : "";
  if (!h.trim()) return h;

  h = stripErrantWebAppPanelsFromMarketingPreview(h);

  const needsFooter = !/zenpho-preview-footer-link-accent/i.test(h);
  const needsFallback = !/zenpho-page-target-fallback/i.test(h);
  const needsScrollOffset = !/zenpho-section-scroll-offset/i.test(h);
  const needsReadability = !/zenpho-stitch-readability-repair/i.test(h);
  if (!needsFooter && !needsFallback && !needsScrollOffset && !needsReadability) return h;

  const inject = (needsFallback ? PREVIEW_PAGE_FALLBACK_STYLE : "") +
                 (needsScrollOffset ? PREVIEW_SECTION_SCROLL_STYLE : "") +
                 (needsFooter ? PREVIEW_FOOTER_LINK_STYLE : "") +
                 (needsReadability ? PREVIEW_STITCH_READABILITY_STYLE : "");

  const lower = h.toLowerCase();
  const headClose = lower.lastIndexOf("</head>");
  if (headClose !== -1) {
    return h.slice(0, headClose) + inject + h.slice(headClose);
  }

  const bodyOpen = lower.indexOf("<body");
  if (bodyOpen !== -1) {
    const tagEnd = h.indexOf(">", bodyOpen);
    if (tagEnd !== -1) {
      return h.slice(0, tagEnd + 1) + inject + h.slice(tagEnd + 1);
    }
  }

  return inject + h;
}

function stripErrantWebAppPanelsFromMarketingPreview(html: string): string {
  const h = typeof html === "string" ? html : "";
  if (!h.trim()) return h;

  const hasMarketingSections =
    /<section\b[^>]*\bid=["'](?:home|services|about|stories|visit)["'][^>]*>/i.test(h);
  const hasWorkspaceStub =
    /\bclass=["'][^"']*\bpage\b[^"']*["'][\s\S]{0,3000}\bworkspace\b/i.test(h) ||
    /This panel is a placeholder\. The production build of this view will surface/i.test(h);

  if (!hasMarketingSections || !hasWorkspaceStub) return h;

  return h.replace(
    /<section\b(?=[^>]*\bclass=["'][^"']*\bpage\b[^"']*["'])[^>]*>[\s\S]*?(?:This panel is a placeholder\. The production build of this view will surface[\s\S]*?|<h3[^>]*>[^<]*workspace<\/h3>[\s\S]*?)<\/section>/gi,
    ""
  );
}
