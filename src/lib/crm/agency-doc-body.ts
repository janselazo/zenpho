import DOMPurify from "isomorphic-dompurify";

export const AGENCY_DOC_BODY_VERSION = 2 as const;

export type AgencyDocBlock = { id: string; html: string };

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** True when the block has no visible text (allows empty tags / br only). */
export function isEmptyBlockHtml(html: string): boolean {
  const t = html
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
    ],
    ALLOWED_ATTR: ["class"],
  });
}
