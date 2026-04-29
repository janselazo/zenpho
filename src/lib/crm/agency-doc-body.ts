import DOMPurify from "isomorphic-dompurify";

export const AGENCY_DOC_BODY_VERSION = 2 as const;

/** Shared Tailwind for `<table>` in doc preview + editor (keep in sync with AgencyDocBlockEditor). */
export const AGENCY_DOC_TABLE_PROSE_CLASS =
  "[&_table]:my-4 [&_table]:block [&_table]:w-full [&_table]:max-w-full [&_table]:border-collapse [&_table]:text-sm [&_th]:border [&_th]:border-border [&_th]:bg-surface/60 [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:align-top [&_td]:border [&_td]:border-border [&_td]:px-3 [&_td]:py-2 [&_td]:align-top [&_table_p]:m-0 dark:[&_th]:border-zinc-600 dark:[&_td]:border-zinc-600 dark:[&_th]:bg-zinc-800/50";

export type AgencyDocBlock = { id: string; html: string };

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * True when a block can be dropped on save (no meaningful content).
 * Spacing-only blocks (`<p></p>`, `<p><br></p>`, or several of those) are NOT empty —
 * users rely on them for gaps between sections.
 */
export function isEmptyBlockHtml(html: string): boolean {
  const trimmed = html.trim();
  if (!trimmed) return true;

  if (/<\s*hr\b/i.test(trimmed)) return false;
  if (/<\s*ul\b/i.test(trimmed)) return false;
  if (/<\s*ol\b/i.test(trimmed)) return false;
  if (/<\s*blockquote\b/i.test(trimmed)) return false;
  if (/<\s*table\b/i.test(trimmed)) return false;
  if (/<\s*img\b/i.test(trimmed)) return false;

  // Remove paragraphs used only as vertical space (empty or br-only)
  const withoutSpacerPs = trimmed.replace(
    /<p>(?:\s|<br\b[^>]*\/?>)*<\/p>/gi,
    ""
  );
  if (withoutSpacerPs.trim().length === 0) {
    return false;
  }

  const t = withoutSpacerPs
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;|\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return t.length === 0;
}

function legacyPlainToBlocks(body: string): AgencyDocBlock[] {
  return body.split(/\n\n+/).map((chunk, i) => {
    const t = chunk.trim();
    if (!t) return { id: `load-${i}-0`, html: "<p></p>" };
    const inner = escapeHtml(t).replace(/\n/g, "<br />");
    return { id: `load-${i}-${t.length}`, html: `<p>${inner}</p>` };
  });
}

/** Parse stored body: JSON v2 (HTML blocks) or legacy plain text (paragraphs by blank lines). */
export function blocksFromBody(body: string): AgencyDocBlock[] {
  const trimmed = body.trim();
  if (!trimmed) return [];
  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (
      parsed &&
      typeof parsed === "object" &&
      "v" in parsed &&
      (parsed as { v: number }).v === AGENCY_DOC_BODY_VERSION &&
      "blocks" in parsed &&
      Array.isArray((parsed as { blocks: unknown }).blocks)
    ) {
      return (parsed as { blocks: string[] }).blocks.map((html, i) => ({
        id: `load-${i}-${String(html).length}`,
        html: typeof html === "string" ? html : "<p></p>",
      }));
    }
  } catch {
    /* legacy */
  }
  return legacyPlainToBlocks(trimmed);
}

/** Serialize blocks to DB string. Drops empty blocks. */
export function bodyFromBlocks(rows: Pick<AgencyDocBlock, "html">[]): string {
  const blocks = rows
    .map((r) => r.html.trim())
    .filter((h) => h.length > 0 && !isEmptyBlockHtml(h));
  if (blocks.length === 0) return "";
  return JSON.stringify({
    v: AGENCY_DOC_BODY_VERSION,
    blocks,
  });
}

/** Safe HTML for reading / preview (TipTap output). */
export function sanitizeDocHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      "p",
      "br",
      "hr",
      "strong",
      "b",
      "em",
      "i",
      "u",
      "s",
      "strike",
      "span",
      "ul",
      "ol",
      "li",
      "blockquote",
      "code",
      "pre",
      "table",
      "thead",
      "tbody",
      "tr",
      "th",
      "td",
      "img",
    ],
    ALLOWED_ATTR: [
      "class",
      "colspan",
      "rowspan",
      "src",
      "alt",
      "title",
      "style",
    ],
  });
}
