"use client";

import {
  parseProposalDocument,
  replaceProposalSection,
  serializeProposalDocument,
} from "@/lib/crm/proposal-document";

const editorInput =
  "w-full rounded-xl border border-border bg-white px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100";

export default function ProposalSectionEditor({
  markdown,
  onChange,
}: {
  markdown: string;
  onChange: (nextMarkdown: string) => void;
}) {
  const doc = parseProposalDocument(markdown);

  if (!doc.sections.length) {
    return (
      <textarea
        rows={18}
        value={markdown}
        onChange={(e) => onChange(e.target.value)}
        className={`${editorInput} font-mono text-xs leading-relaxed`}
        placeholder="Generate or write proposal Markdown…"
      />
    );
  }

  return (
    <div className="space-y-4">
      {doc.sections.map((section, idx) => (
        <section
          key={section.id}
          className="rounded-2xl border border-border bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950"
        >
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-text-secondary">
              Section {idx + 1}
            </p>
            <span className="rounded-full bg-surface px-2.5 py-1 text-[10px] font-semibold text-text-secondary dark:bg-zinc-900">
              editable
            </span>
          </div>
          <label className="block text-[10px] font-bold uppercase tracking-wide text-text-secondary">
            Heading
            <input
              value={section.title}
              onChange={(e) =>
                onChange(
                  replaceProposalSection(markdown, section.id, {
                    title: e.target.value,
                  }),
                )
              }
              className={`${editorInput} mt-1 font-semibold`}
            />
          </label>
          <label className="mt-3 block text-[10px] font-bold uppercase tracking-wide text-text-secondary">
            Copy
            <textarea
              rows={Math.min(14, Math.max(5, section.body.split("\n").length + 2))}
              value={section.body}
              onChange={(e) =>
                onChange(
                  replaceProposalSection(markdown, section.id, {
                    body: e.target.value,
                  }),
                )
              }
              className={`${editorInput} mt-1 font-mono text-xs leading-relaxed`}
            />
          </label>
        </section>
      ))}

      <details className="rounded-2xl border border-border bg-surface p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
        <summary className="cursor-pointer text-xs font-bold uppercase tracking-wide text-text-secondary">
          Raw Markdown fallback
        </summary>
        <textarea
          rows={16}
          value={serializeProposalDocument(doc)}
          onChange={(e) => onChange(e.target.value)}
          className={`${editorInput} mt-3 font-mono text-xs leading-relaxed`}
        />
      </details>
    </div>
  );
}
