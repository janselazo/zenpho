import DOMPurify from "isomorphic-dompurify";

const FULL_DOC_ALLOWED_TAGS = [
  "html",
  "head",
  "body",
  "title",
  "meta",
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

const FULL_DOC_ALLOWED_ATTR = [
  "class",
  "style",
  "href",
  "src",
  "alt",
  "title",
  "target",
  "rel",
  "width",
  "height",
  "loading",
  "charset",
  "content",
  "name",
  "http-equiv",
  "media",
  "type",
  "lang",
  "dir",
  "id",
  "role",
  "aria-label",
] as const;

/**
 * Sanitize a full HTML document from the model (allows &lt;style&gt; in &lt;head&gt;; no scripts, no external CSS links).
 */
export function sanitizeProspectPreviewFullDocumentHtml(html: string): string {
  let dirty = (typeof html === "string" ? html : "").trim();
  if (!dirty) {
    dirty =
      "<!DOCTYPE html><html lang=\"en\"><head><meta charset=\"UTF-8\"/><title>Preview</title></head><body><p>Preview</p></body></html>";
  }
  const purified = DOMPurify.sanitize(dirty, {
    WHOLE_DOCUMENT: true,
    ALLOWED_TAGS: [...FULL_DOC_ALLOWED_TAGS],
    ALLOWED_ATTR: [...FULL_DOC_ALLOWED_ATTR],
    ALLOW_DATA_ATTR: false,
    FORBID_TAGS: ["script", "iframe", "object", "embed", "link", "base", "form", "input", "textarea", "select", "option", "template"],
    FORBID_ATTR: [
      "onerror",
      "onload",
      "onclick",
      "onmouseover",
      "onfocus",
      "onblur",
      "oninput",
      "onmouseenter",
      "onmouseleave",
    ],
  });
  const out = typeof purified === "string" ? purified : String(purified);
  const trimmed = out.trim();
  if (/^<!DOCTYPE/i.test(trimmed)) return trimmed;
  return `<!DOCTYPE html>\n${trimmed}`;
}

/**
 * Sanitize LLM-produced body markup for a one-page site preview (inline styles; no scripts).
 */
export function sanitizeProspectPreviewBodyHtml(html: string): string {
  const dirty =
    (typeof html === "string" ? html : "").trim() || "<p>Preview</p>";
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: [
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
    ALLOWED_ATTR: [
      "class",
      "style",
      "href",
      "src",
      "alt",
      "title",
      "target",
      "rel",
      "width",
      "height",
      "loading",
    ],
    ALLOW_DATA_ATTR: false,
  });
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
