/**
 * Convert pasted plain text (markdown pipe tables or TSV) into a safe HTML table string
 * for TipTap insertContent. Used to preserve rows/columns when pasting from docs or sheets.
 */

function escapeCell(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function splitPipeRow(line: string): string[] {
  let s = line.trim();
  if (s.startsWith("|")) s = s.slice(1);
  if (s.endsWith("|")) s = s.slice(0, -1);
  return s.split("|").map((c) => c.trim());
}

function isMarkdownSeparatorRow(cells: string[]): boolean {
  if (cells.length === 0) return false;
  return cells.every((c) => {
    const t = c.trim();
    return /^:?-{2,}:?$/.test(t);
  });
}

/** TipTap table cells require block content (`block+`), so wrap text in `<p>`. */
function cellBlock(text: string): string {
  return `<p>${escapeCell(text)}</p>`;
}

function buildTableHtml(header: string[], bodyRows: string[][]): string {
  const colCount = Math.max(
    header.length,
    ...bodyRows.map((r) => r.length),
    2
  );

  let html = "<table><thead><tr>";
  for (let i = 0; i < colCount; i++) {
    html += `<th>${cellBlock(header[i] ?? "")}</th>`;
  }
  html += "</tr></thead><tbody>";
  for (const row of bodyRows) {
    html += "<tr>";
    for (let i = 0; i < colCount; i++) {
      html += `<td>${cellBlock(row[i] ?? "")}</td>`;
    }
    html += "</tr>";
  }
  html += "</tbody></table>";
  return html;
}

function tryParsePipeTable(text: string): string | null {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const pipeLines = lines.filter((l) => l.includes("|"));
  if (pipeLines.length < 2) return null;

  const rows = lines.map(splitPipeRow);
  const colCounts = rows.map((r) => r.length);
  if (colCounts.some((n) => n < 2)) return null;

  const maxCols = Math.max(...colCounts);

  if (rows.length >= 2 && isMarkdownSeparatorRow(rows[1])) {
    const header = rows[0];
    const body = rows
      .slice(2)
      .filter((r) => !isMarkdownSeparatorRow(r));
    if (body.length === 0) return null;
    return buildTableHtml(header, body);
  }

  if (rows.length >= 2) {
    const header = rows[0];
    const body = rows.slice(1).filter((r) => !isMarkdownSeparatorRow(r));
    return buildTableHtml(header, body);
  }

  return null;
}

function tryParseTsvTable(text: string): string | null {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return null;

  const rows = lines.map((line) => line.split("\t").map((c) => c.trim()));
  const n = rows[0].length;
  if (n < 2) return null;
  if (!rows.every((r) => r.length === n)) return null;

  const header = rows[0];
  const body = rows.slice(1);
  return buildTableHtml(header, body);
}

/**
 * Returns sanitized table HTML or null if the clipboard text does not look like a table.
 */
export function plainTextToTableHtml(text: string): string | null {
  const trimmed = text.trim();
  if (trimmed.length < 3) return null;

  const pipe = tryParsePipeTable(trimmed);
  if (pipe) return pipe;

  const tsv = tryParseTsvTable(trimmed);
  if (tsv) return tsv;

  return null;
}
