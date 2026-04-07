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
 * Injects footer-focused link colors so Privacy/Terms (and similar) read clearly on generated previews.
 */
export function injectProspectPreviewFooterLinkStyles(html: string): string {
  const h = typeof html === "string" ? html : "";
  if (!h.trim()) return h;
  if (/zenpho-preview-footer-link-accent/i.test(h)) return h;

  const lower = h.toLowerCase();
  const headClose = lower.lastIndexOf("</head>");
  if (headClose !== -1) {
    return h.slice(0, headClose) + PREVIEW_FOOTER_LINK_STYLE + h.slice(headClose);
  }

  const bodyOpen = lower.indexOf("<body");
  if (bodyOpen !== -1) {
    const tagEnd = h.indexOf(">", bodyOpen);
    if (tagEnd !== -1) {
      return h.slice(0, tagEnd + 1) + PREVIEW_FOOTER_LINK_STYLE + h.slice(tagEnd + 1);
    }
  }

  return PREVIEW_FOOTER_LINK_STYLE + h;
}
