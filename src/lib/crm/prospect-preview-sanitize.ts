import DOMPurify from "isomorphic-dompurify";

/**
 * Sanitize LLM-produced body markup for a one-page site preview (inline styles; no scripts).
 */
export function sanitizeProspectPreviewBodyHtml(html: string): string {
  const dirty = html.trim() || "<p>Preview</p>";
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
