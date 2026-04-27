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
 * Defensive fallback: if the model used non-standard page IDs (e.g. #concierge instead of #dash),
 * the CSS :target default-show rule won't match and ALL .page sections stay hidden.
 * This ensures the first .page child is visible when no hash target is active.
 */
const PREVIEW_PAGE_FALLBACK_STYLE = `<style id="zenpho-page-target-fallback">
  body:not(:has(.page:target)) .page:first-of-type,
  main:not(:has(.page:target)) > .page:first-of-type {
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
 * Injects footer-focused link colors so Privacy/Terms (and similar) read clearly on generated previews.
 */
export function injectProspectPreviewFooterLinkStyles(html: string): string {
  let h = typeof html === "string" ? html : "";
  if (!h.trim()) return h;

  const needsFooter = !/zenpho-preview-footer-link-accent/i.test(h);
  const needsFallback = !/zenpho-page-target-fallback/i.test(h);
  const needsScrollOffset = !/zenpho-section-scroll-offset/i.test(h);
  if (!needsFooter && !needsFallback && !needsScrollOffset) return h;

  const inject = (needsFallback ? PREVIEW_PAGE_FALLBACK_STYLE : "") +
                 (needsScrollOffset ? PREVIEW_SECTION_SCROLL_STYLE : "") +
                 (needsFooter ? PREVIEW_FOOTER_LINK_STYLE : "");

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
