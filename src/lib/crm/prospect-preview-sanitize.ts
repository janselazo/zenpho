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
  },
  exclusiveFilter(frame) {
    if (frame.tag !== "link") return false;
    const href = String(frame.attribs?.href ?? "").trim();
    if (!href) return true;
    return !prospectPreviewTrustedLinkHref(href);
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
 * Sanitize a full HTML document from the model (allows &lt;style&gt; and vetted &lt;link&gt; for fonts/CSS; no scripts).
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
