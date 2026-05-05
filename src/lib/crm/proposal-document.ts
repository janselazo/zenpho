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

export function replaceProposalSection(
  markdown: string,
  sectionIdToReplace: string,
  patch: Partial<Pick<ProposalDocumentSection, "title" | "body">>,
): string {
  const doc = parseProposalDocument(markdown);
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
  const doc = parseProposalDocument(markdown);
  const titleBody = doc.sections.find((s) => /^proposal title$/i.test(s.title))?.body.trim();
  const exec = doc.sections.find((s) => /^executive summary$/i.test(s.title))?.body.trim();
  const investment = doc.sections.find((s) => /investment|pricing/i.test(s.title))?.body.trim();
  return {
    titleLine: titleBody?.split("\n").find(Boolean)?.trim() || null,
    executiveSummary: exec || null,
    investment: investment || null,
  };
}
