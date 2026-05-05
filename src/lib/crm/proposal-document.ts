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

function inlineMarkdownToHtml(value: string): string {
  return escapeHtml(value)
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/__([^_]+)__/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/_([^_]+)_/g, "<em>$1</em>");
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

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      closeList();
      continue;
    }

    const imageMd = /^!\[([^\]]*)]\(([^)]+)\)$/.exec(line);
    if (imageMd) {
      closeList();
      const alt = escapeHtmlAttr(imageMd[1] ?? "");
      const src = escapeHtmlAttr(imageMd[2]?.trim() ?? "");
      parts.push(`<p><img src="${src}" alt="${alt}" /></p>`);
      continue;
    }

    const subheading = /^#{3,}\s+(.+)$/.exec(line);
    if (subheading) {
      closeList();
      parts.push(`<h3>${inlineMarkdownToHtml(subheading[1] ?? "")}</h3>`);
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
      continue;
    }

    closeList();
    parts.push(`<p>${inlineMarkdownToHtml(line)}</p>`);
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
