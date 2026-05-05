export type ProposalDocumentSection = {
  id: string;
  title: string;
  body: string;
};

export type ProposalDocument = {
  preamble: string;
  sections: ProposalDocumentSection[];
};

export type ProposalTextBlock =
  | { type: "paragraph"; text: string }
  | { type: "bullet"; text: string }
  | { type: "subheading"; text: string };

const PROPOSAL_TITLE_HEADING = "Proposal Title";

function sectionId(title: string, index: number): string {
  const slug = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return `${slug || "section"}-${index}`;
}

export function stripProposalImageMarkdown(markdown: string): string {
  return markdown
    .replace(/!\[[^\]]*]\([^)]*\)/g, "")
    .replace(/<img\b[^>]*>/gi, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Parses proposal markdown for the TipTap editor and previews: keeps `![]()` / `<img>` lines in section bodies.
 */
export function parseProposalDocumentForEditor(markdown: string): ProposalDocument {
  const normalized = markdown.replace(/\r\n/g, "\n");
  if (!normalized.trim()) return { preamble: "", sections: [] };

  const lines = normalized.split("\n");
  const preamble: string[] = [];
  const sections: ProposalDocumentSection[] = [];
  let currentTitle: string | null = null;
  let currentBody: string[] = [];

  const flush = () => {
    if (!currentTitle) return;
    sections.push({
      id: sectionId(currentTitle, sections.length),
      title: currentTitle.trim() || "Untitled section",
      body: currentBody.join("\n").trim(),
    });
    currentTitle = null;
    currentBody = [];
  };

  for (const line of lines) {
    const heading = /^##\s+(.+)$/.exec(line);
    if (heading) {
      flush();
      currentTitle = heading[1]?.trim() || "Untitled section";
      continue;
    }

    if (currentTitle) currentBody.push(line);
    else preamble.push(line);
  }
  flush();

  if (!sections.length && normalized.trim()) {
    sections.push({
      id: sectionId("Proposal", 0),
      title: "Proposal",
      body: normalized.trim(),
    });
    return { preamble: "", sections };
  }

  return {
    preamble: preamble.join("\n").trim(),
    sections,
  };
}

export function parseProposalDocument(markdown: string): ProposalDocument {
  const normalized = stripProposalImageMarkdown(markdown.replace(/\r\n/g, "\n"));
  if (!normalized.trim()) return { preamble: "", sections: [] };

  const lines = normalized.split("\n");
  const preamble: string[] = [];
  const sections: ProposalDocumentSection[] = [];
  let currentTitle: string | null = null;
  let currentBody: string[] = [];

  const flush = () => {
    if (!currentTitle) return;
    sections.push({
      id: sectionId(currentTitle, sections.length),
      title: currentTitle.trim() || "Untitled section",
      body: currentBody.join("\n").trim(),
    });
    currentTitle = null;
    currentBody = [];
  };

  for (const line of lines) {
    const heading = /^##\s+(.+)$/.exec(line);
    if (heading) {
      flush();
      currentTitle = heading[1]?.trim() || "Untitled section";
      continue;
    }

    if (currentTitle) currentBody.push(line);
    else preamble.push(line);
  }
  flush();

  if (!sections.length && normalized.trim()) {
    sections.push({
      id: sectionId("Proposal", 0),
      title: "Proposal",
      body: normalized.trim(),
    });
    return { preamble: "", sections };
  }

  return {
    preamble: preamble.join("\n").trim(),
    sections,
  };
}

export function serializeProposalDocument(doc: ProposalDocument): string {
  const parts: string[] = [];
  if (doc.preamble.trim()) parts.push(doc.preamble.trim());
  for (const section of doc.sections) {
    parts.push(`## ${section.title.trim() || "Untitled section"}\n\n${section.body.trim()}`);
  }
  return parts.join("\n\n").trim();
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Minimal escaping for `src` / `alt` in editor HTML attributes. */
function escapeHtmlAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;");
}

function applyBoldItalicAfterEscape(escaped: string): string {
  return escaped
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/__([^_]+)__/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/_([^_]+)_/g, "<em>$1</em>");
}

/** Inline markdown: links, bold, italic (link labels are escaped; URLs attribute-escaped). */
function inlineMarkdownToHtml(value: string): string {
  const chunks: string[] = [];
  let pos = 0;
  const re = /\[([^\]]*)\]\(([^)]+)\)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(value)) !== null) {
    chunks.push(
      applyBoldItalicAfterEscape(escapeHtml(value.slice(pos, m.index))),
    );
    const label = m[1] ?? "";
    const href = (m[2] ?? "").trim();
    chunks.push(
      `<a href="${escapeHtmlAttr(href)}" target="_blank" rel="noopener noreferrer nofollow">${applyBoldItalicAfterEscape(escapeHtml(label))}</a>`,
    );
    pos = m.index + m[0].length;
  }
  chunks.push(applyBoldItalicAfterEscape(escapeHtml(value.slice(pos))));
  return chunks.join("");
}

function parseMarkdownTableDataRow(line: string): string[] | null {
  const t = line.trim();
  if (!t || !t.includes("|")) return null;
  let s = t;
  if (s.startsWith("|")) s = s.slice(1);
  if (s.endsWith("|")) s = s.slice(0, -1);
  const cells = s.split("|").map((c) => c.trim());
  return cells.length ? cells : null;
}

function isMarkdownTableSeparatorRow(line: string): boolean {
  const cells = parseMarkdownTableDataRow(line);
  if (!cells || cells.length < 2) return false;
  return cells.every((c) => /^:?-{2,}:?$/.test(c.trim()));
}

function tryParseMarkdownTableBlock(
  lines: string[],
  start: number,
): { html: string; end: number } | null {
  const headerLine = lines[start]?.trim() ?? "";
  const sepLine = lines[start + 1]?.trim() ?? "";
  if (!headerLine.startsWith("|") || !isMarkdownTableSeparatorRow(sepLine)) {
    return null;
  }
  const header = parseMarkdownTableDataRow(headerLine);
  if (!header || header.length < 2) return null;

  const bodyRows: string[][] = [];
  let i = start + 2;
  while (i < lines.length) {
    const trimmed = lines[i]?.trim() ?? "";
    if (!trimmed) break;
    if (!trimmed.startsWith("|")) break;
    const row = parseMarkdownTableDataRow(trimmed);
    if (!row) break;
    bodyRows.push(row);
    i += 1;
  }

  let html = "<table><thead><tr>";
  for (const c of header) {
    html += `<th><p>${inlineMarkdownToHtml(c)}</p></th>`;
  }
  html += "</tr></thead><tbody>";
  for (const row of bodyRows) {
    html += "<tr>";
    for (let ci = 0; ci < header.length; ci += 1) {
      const c = row[ci] ?? "";
      html += `<td><p>${inlineMarkdownToHtml(c)}</p></td>`;
    }
    html += "</tr>";
  }
  html += "</tbody></table>";
  return { html, end: i };
}

function escapeGfmTableCell(value: string): string {
  return value.replace(/\|/g, "\\|").replace(/\n+/g, " ").trim();
}

function tableElementToMarkdown(table: Element): string {
  const allRows = Array.from(table.querySelectorAll("tr")).map((tr) =>
    Array.from(tr.querySelectorAll("th, td")).map((cell) =>
      markdownTextFromElement(cell),
    ),
  );
  if (!allRows.length || !allRows[0]?.length) return "";
  const colCount = Math.max(...allRows.map((r) => r.length));
  const padRow = (cells: string[]) => {
    const next = [...cells];
    while (next.length < colCount) next.push("");
    return next.slice(0, colCount);
  };
  const header = padRow(allRows[0]);
  const lines: string[] = [
    "| " + header.map(escapeGfmTableCell).join(" | ") + " |",
    "| " + header.map(() => "---").join(" | ") + " |",
  ];
  for (let ri = 1; ri < allRows.length; ri += 1) {
    const row = padRow(allRows[ri]);
    lines.push("| " + row.map(escapeGfmTableCell).join(" | ") + " |");
  }
  return lines.join("\n");
}

function markdownBodyToEditorHtml(body: string): string {
  const lines = body.replace(/\r\n/g, "\n").split("\n");
  const parts: string[] = [];
  let list: "ul" | "ol" | null = null;

  const closeList = () => {
    if (!list) return;
    parts.push(`</${list}>`);
    list = null;
  };

  let idx = 0;
  while (idx < lines.length) {
    const rawLine = lines[idx];
    const line = rawLine.trim();
    if (!line) {
      closeList();
      idx += 1;
      continue;
    }

    const tableBlock = tryParseMarkdownTableBlock(lines, idx);
    if (tableBlock) {
      closeList();
      parts.push(tableBlock.html);
      idx = tableBlock.end;
      continue;
    }

    const imageMd = /^!\[([^\]]*)]\(([^)]+)\)$/.exec(line);
    if (imageMd) {
      closeList();
      const alt = escapeHtmlAttr(imageMd[1] ?? "");
      const src = escapeHtmlAttr(imageMd[2]?.trim() ?? "");
      parts.push(`<p><img src="${src}" alt="${alt}" /></p>`);
      idx += 1;
      continue;
    }

    const subheading = /^#{3,}\s+(.+)$/.exec(line);
    if (subheading) {
      closeList();
      parts.push(`<h3>${inlineMarkdownToHtml(subheading[1] ?? "")}</h3>`);
      idx += 1;
      continue;
    }

    const bullet = /^[-*]\s+(.+)$/.exec(line);
    if (bullet) {
      if (list !== "ul") {
        closeList();
        parts.push("<ul>");
        list = "ul";
      }
      parts.push(`<li>${inlineMarkdownToHtml(bullet[1] ?? "")}</li>`);
      idx += 1;
      continue;
    }

    const numbered = /^\d+[.)]\s+(.+)$/.exec(line);
    if (numbered) {
      if (list !== "ol") {
        closeList();
        parts.push("<ol>");
        list = "ol";
      }
      parts.push(`<li>${inlineMarkdownToHtml(numbered[1] ?? "")}</li>`);
      idx += 1;
      continue;
    }

    closeList();
    parts.push(`<p>${inlineMarkdownToHtml(line)}</p>`);
    idx += 1;
  }

  closeList();
  return parts.join("\n");
}

export function proposalMarkdownToEditorHtml(
  markdown: string,
  fallbackTitle = "Untitled proposal",
): string {
  const doc = parseProposalDocumentForEditor(markdown);
  const titleLine =
    doc.sections
      .find((section) => /^proposal title$/i.test(section.title))
      ?.body.split("\n")
      .find((line) => line.trim())
      ?.trim() ||
    fallbackTitle.trim() ||
    "Untitled proposal";
  const visibleSections = doc.sections.filter(
    (section) => !/^proposal title$/i.test(section.title),
  );
  const parts = [`<h1>${inlineMarkdownToHtml(titleLine)}</h1>`];

  if (doc.preamble.trim()) {
    parts.push(markdownBodyToEditorHtml(doc.preamble));
  }

  for (const section of visibleSections) {
    parts.push(`<h2>${inlineMarkdownToHtml(section.title)}</h2>`);
    const bodyHtml = markdownBodyToEditorHtml(section.body);
    if (bodyHtml) parts.push(bodyHtml);
  }

  return parts.join("\n\n");
}

function markdownInlineFromNode(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? "";
  if (node.nodeType !== Node.ELEMENT_NODE) return "";

  const element = node as Element;
  const tag = element.tagName.toLowerCase();
  if (tag === "img") {
    const src = element.getAttribute("src")?.trim() ?? "";
    const alt = element.getAttribute("alt")?.trim() ?? "";
    return src ? `![${alt}](${src})` : "";
  }
  const text = Array.from(element.childNodes).map(markdownInlineFromNode).join("");
  switch (tag) {
    case "a": {
      const href = element.getAttribute("href")?.trim() ?? "";
      if (!href) return text;
      return `[${text}](${href})`;
    }
    case "strong":
    case "b":
      return text.trim() ? `**${text}**` : "";
    case "em":
    case "i":
      return text.trim() ? `*${text}*` : "";
    case "br":
      return "\n";
    default:
      return text;
  }
}

function markdownTextFromElement(element: Element): string {
  return Array.from(element.childNodes).map(markdownInlineFromNode).join("").trim();
}

function editorHtmlToPlainMarkdown(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|h[1-6]|li|ul|ol|div|section)>/gi, "\n")
    .replace(/<li[^>]*>/gi, "- ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function proposalEditorHtmlToMarkdown(
  html: string,
  fallbackTitle = "Untitled proposal",
): string {
  if (typeof DOMParser === "undefined") return editorHtmlToPlainMarkdown(html);

  const parser = new DOMParser();
  const parsed = parser.parseFromString(html || "", "text/html");
  const sections: ProposalDocumentSection[] = [];
  let title = fallbackTitle.trim() || "Untitled proposal";
  let currentTitle: string | null = null;
  let currentBody: string[] = [];

  const flush = () => {
    if (!currentTitle) return;
    sections.push({
      id: sectionId(currentTitle, sections.length),
      title: currentTitle,
      body: currentBody.join("\n\n").trim(),
    });
    currentTitle = null;
    currentBody = [];
  };

  const appendBody = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    if (!currentTitle) currentTitle = "Executive Summary";
    currentBody.push(trimmed);
  };

  for (const element of Array.from(parsed.body.children)) {
    const tag = element.tagName.toLowerCase();
    if (tag === "h1") {
      const nextTitle = markdownTextFromElement(element);
      if (nextTitle) title = nextTitle;
      continue;
    }

    if (tag === "h2") {
      flush();
      currentTitle = markdownTextFromElement(element) || "Untitled section";
      continue;
    }

    if (tag === "div") {
      const tbl = element.querySelector(":scope > table");
      if (tbl) {
        appendBody(tableElementToMarkdown(tbl));
        continue;
      }
    }

    if (tag === "table") {
      appendBody(tableElementToMarkdown(element));
      continue;
    }

    if (tag === "img") {
      const src = element.getAttribute("src")?.trim() ?? "";
      const alt = element.getAttribute("alt")?.trim() ?? "";
      if (src) appendBody(`![${alt}](${src})`);
      continue;
    }

    if (tag === "figure") {
      const im = element.querySelector("img");
      if (im) {
        const src = im.getAttribute("src")?.trim() ?? "";
        const alt = im.getAttribute("alt")?.trim() ?? "";
        if (src) appendBody(`![${alt}](${src})`);
      }
      continue;
    }

    if (tag === "h3" || tag === "h4" || tag === "h5" || tag === "h6") {
      appendBody(`### ${markdownTextFromElement(element)}`);
      continue;
    }

    if (tag === "ul" || tag === "ol") {
      const lines = Array.from(element.children)
        .filter((child) => child.tagName.toLowerCase() === "li")
        .map((child, idx) => {
          const marker = tag === "ol" ? `${idx + 1}.` : "-";
          return `${marker} ${markdownTextFromElement(child)}`;
        })
        .filter((line) => line.trim().length > 2);
      appendBody(lines.join("\n"));
      continue;
    }

    if (tag === "p") {
      const onlyImg =
        element.querySelectorAll("img").length === 1 &&
        Array.from(element.childNodes).every((n) => {
          if (n.nodeType === Node.TEXT_NODE)
            return !(n.textContent ?? "").trim();
          if (n.nodeType !== Node.ELEMENT_NODE) return false;
          return (n as Element).tagName.toLowerCase() === "img";
        });
      if (onlyImg) {
        const im = element.querySelector("img");
        if (im) {
          const src = im.getAttribute("src")?.trim() ?? "";
          const alt = im.getAttribute("alt")?.trim() ?? "";
          if (src) appendBody(`![${alt}](${src})`);
          continue;
        }
      }
    }

    if (tag === "blockquote") {
      const quote = markdownTextFromElement(element);
      appendBody(
        quote
          .split("\n")
          .map((line) => `> ${line}`)
          .join("\n"),
      );
      continue;
    }

    appendBody(markdownTextFromElement(element));
  }

  flush();
  if (!sections.length) {
    sections.push({
      id: sectionId("Executive Summary", 0),
      title: "Executive Summary",
      body: "",
    });
  }

  return serializeProposalDocument({
    preamble: "",
    sections: [
      {
        id: sectionId(PROPOSAL_TITLE_HEADING, 0),
        title: PROPOSAL_TITLE_HEADING,
        body: title,
      },
      ...sections,
    ],
  });
}

export function replaceProposalSection(
  markdown: string,
  sectionIdToReplace: string,
  patch: Partial<Pick<ProposalDocumentSection, "title" | "body">>,
): string {
  const doc = parseProposalDocumentForEditor(markdown);
  const sections = doc.sections.map((section) =>
    section.id === sectionIdToReplace
      ? {
          ...section,
          ...patch,
        }
      : section,
  );
  return serializeProposalDocument({ ...doc, sections });
}

export function markdownBodyToBlocks(body: string): ProposalTextBlock[] {
  const blocks: ProposalTextBlock[] = [];
  for (const paragraph of body.split(/\n{2,}/)) {
    const lines = paragraph
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    for (const line of lines) {
      if (/^#{3,}\s+/.test(line)) {
        blocks.push({ type: "subheading", text: line.replace(/^#{3,}\s+/, "").trim() });
      } else if (/^[-*]\s+/.test(line)) {
        blocks.push({ type: "bullet", text: line.replace(/^[-*]\s+/, "").trim() });
      } else {
        blocks.push({ type: "paragraph", text: line });
      }
    }
  }
  return blocks;
}

export function deriveProposalSummary(markdown: string): {
  titleLine: string | null;
  executiveSummary: string | null;
  investment: string | null;
} {
  const doc = parseProposalDocumentForEditor(markdown);
  const titleBody = doc.sections.find((s) => /^proposal title$/i.test(s.title))?.body.trim();
  const exec = doc.sections.find((s) => /^executive summary$/i.test(s.title))?.body.trim();
  const investment = doc.sections.find((s) => /investment|pricing/i.test(s.title))?.body.trim();
  return {
    titleLine: titleBody?.split("\n").find(Boolean)?.trim() || null,
    executiveSummary: exec || null,
    investment: investment || null,
  };
}
