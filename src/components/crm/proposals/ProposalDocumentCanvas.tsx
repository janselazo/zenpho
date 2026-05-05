"use client";

import { useEffect, useMemo, useRef, type ReactNode } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import type { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import {
  deriveProposalSummary,
  parseProposalDocument,
  proposalEditorHtmlToMarkdown,
  proposalMarkdownToEditorHtml,
} from "@/lib/crm/proposal-document";
import type {
  SalesProposalAiVisualRow,
  SalesProposalStatus,
} from "@/lib/crm/sales-proposal-types";
import type { PlacesSearchPlace } from "@/lib/crm/places-types";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Heading1,
  Heading2,
  Italic,
  List,
  ListOrdered,
  Redo2,
  Undo2,
  Underline as UnderlineIcon,
} from "lucide-react";

type ServiceLine = {
  id?: string;
  description_snapshot: string;
  unit_price_snapshot: number;
};

function money(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(n);
}

function VisualPanel({
  photoRef,
  caption,
  index,
}: {
  photoRef?: string | null;
  caption: string;
  index: number;
}) {
  return (
    <aside className="overflow-hidden rounded-[1.5rem] bg-white/75 shadow-sm ring-1 ring-border/70 dark:bg-zinc-950/70 dark:ring-zinc-800">
      <div className="relative min-h-[160px] bg-gradient-to-br from-accent/10 via-sky-100/70 to-emerald-100/70 dark:from-accent/20 dark:via-zinc-900 dark:to-emerald-950/30">
        {photoRef ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/api/crm/google-place-photo?photo=${encodeURIComponent(photoRef)}`}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div className="absolute inset-0">
            <div className="absolute right-6 top-6 h-24 w-24 rounded-full bg-accent/20 blur-2xl" />
            <div className="absolute bottom-8 left-8 h-20 w-32 rounded-full bg-emerald-400/20 blur-2xl" />
            <div className="absolute inset-x-8 bottom-8 h-16 rounded-2xl border border-white/50 bg-white/40 backdrop-blur dark:border-white/10 dark:bg-white/5" />
          </div>
        )}
      </div>
      <div className="p-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-accent">
          Visual {String(index + 1).padStart(2, "0")}
        </p>
        <p className="mt-2 text-xs leading-relaxed text-text-secondary dark:text-zinc-400">
          {caption}
        </p>
      </div>
    </aside>
  );
}

export default function ProposalDocumentCanvas({
  title,
  onTitleChange,
  buyerName,
  markdown,
  onMarkdownChange,
  status,
  place,
  aiVisuals = [],
  serviceLines = [],
  totalPriceEstimate,
}: {
  title: string;
  onTitleChange: (nextTitle: string) => void;
  buyerName: string | null;
  markdown: string;
  onMarkdownChange: (nextMarkdown: string) => void;
  status?: SalesProposalStatus;
  place?: PlacesSearchPlace | null;
  aiVisuals?: SalesProposalAiVisualRow[];
  serviceLines?: ServiceLine[];
  totalPriceEstimate?: number | null;
}) {
  const doc = parseProposalDocument(markdown);
  const latestTitleRef = useRef(title);
  const lastEmittedMarkdownRef = useRef(markdown);
  const visibleSections = doc.sections.filter(
    (section) => !/^proposal title$/i.test(section.title),
  );
  const editorHtml = useMemo(
    () => proposalMarkdownToEditorHtml(markdown, title),
    [markdown, title],
  );
  const extensions = useMemo(
    () => [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Underline,
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
    ],
    [],
  );
  const photoRefs = place?.photoRefs?.map((p) => p.trim()).filter(Boolean) ?? [];
  const visuals = [
    ...photoRefs.slice(0, 3).map((ref) => ({
      kind: "photo" as const,
      photoRef: ref,
      caption: "Business context and location imagery for the proposal.",
    })),
    ...aiVisuals.slice(0, 3).map((v) => ({
      kind: "ai" as const,
      photoRef: null,
      caption: v.caption || "AI concept visualization for the proposed work.",
    })),
  ];
  const fallbackVisual = visuals.length === 0;
  const estimate =
    totalPriceEstimate != null && Number.isFinite(totalPriceEstimate)
      ? money(totalPriceEstimate)
      : serviceLines.length > 0
        ? money(serviceLines.reduce((sum, line) => sum + line.unit_price_snapshot, 0))
        : null;

  useEffect(() => {
    latestTitleRef.current = title;
  }, [title]);

  const editor = useEditor(
    {
      extensions,
      content: editorHtml,
      immediatelyRender: false,
      editorProps: {
        attributes: {
          class:
            "proposal-word-editor min-h-[860px] px-8 py-10 text-[15px] leading-8 text-text-primary outline-none dark:text-zinc-100 sm:px-12 sm:py-12 [&_h1]:heading-display [&_h1]:mb-8 [&_h1]:text-4xl [&_h1]:font-black [&_h1]:leading-tight [&_h1]:text-text-primary dark:[&_h1]:text-white sm:[&_h1]:text-5xl [&_h2]:heading-display [&_h2]:mb-4 [&_h2]:mt-10 [&_h2]:text-2xl [&_h2]:font-black [&_h2]:text-text-primary dark:[&_h2]:text-white [&_h3]:mb-2 [&_h3]:mt-6 [&_h3]:text-sm [&_h3]:font-bold [&_h3]:uppercase [&_h3]:tracking-wide [&_p]:mb-4 [&_ul]:mb-5 [&_ul]:list-disc [&_ul]:pl-7 [&_ol]:mb-5 [&_ol]:list-decimal [&_ol]:pl-7 [&_li]:my-1.5",
        },
      },
      onUpdate: ({ editor: ed }) => {
        const nextMarkdown = proposalEditorHtmlToMarkdown(
          ed.getHTML(),
          latestTitleRef.current || "Untitled proposal",
        );
        lastEmittedMarkdownRef.current = nextMarkdown;
        onMarkdownChange(nextMarkdown);
        const nextSummary = deriveProposalSummary(nextMarkdown);
        if (
          nextSummary.titleLine &&
          nextSummary.titleLine !== latestTitleRef.current
        ) {
          latestTitleRef.current = nextSummary.titleLine;
          onTitleChange(nextSummary.titleLine);
        }
      },
    },
    [],
  );

  useEffect(() => {
    if (!editor || editor.isFocused) return;
    if (markdown === lastEmittedMarkdownRef.current) return;
    if (editor.getHTML() === editorHtml) return;
    editor.commands.setContent(editorHtml, { emitUpdate: false });
    lastEmittedMarkdownRef.current = markdown;
  }, [editor, editorHtml, markdown]);

  return (
    <article className="overflow-hidden rounded-[2rem] border border-border bg-zinc-100/80 shadow-soft-lg dark:border-zinc-800 dark:bg-zinc-950">
      <header className="relative overflow-hidden bg-surface p-6 dark:bg-zinc-900 sm:p-8">
        {photoRefs[0] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/api/crm/google-place-photo?photo=${encodeURIComponent(photoRefs[0])}`}
            alt=""
            className="absolute inset-0 h-full w-full object-cover opacity-30"
          />
        ) : (
          <div className="absolute right-[-8rem] top-[-8rem] h-80 w-80 rounded-full bg-accent/15 blur-3xl" />
        )}
        <div className="relative z-10 max-w-4xl">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300">
              Business proposal
            </span>
            {status ? (
              <span className="rounded-full bg-white/80 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-text-secondary shadow-sm dark:bg-zinc-950/70">
                {status}
              </span>
            ) : null}
          </div>
          <p className="mt-8 max-w-2xl text-sm leading-relaxed text-text-secondary dark:text-zinc-300">
            Click into the page below to edit the title, headings, paragraphs,
            lists, and formatting directly.
          </p>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-text-secondary dark:text-zinc-300">
            Prepared for{" "}
            <span className="font-semibold text-text-primary dark:text-white">
              {buyerName || "your team"}
            </span>
          </p>
        </div>
      </header>

      <section className="grid gap-4 border-y border-border bg-white px-6 py-4 dark:border-zinc-800 dark:bg-zinc-950 sm:grid-cols-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-text-secondary">
            Buyer
          </p>
          <p className="mt-1 font-semibold text-text-primary dark:text-zinc-100">
            {buyerName || "Unassigned"}
          </p>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-text-secondary">
            Sections
          </p>
          <p className="mt-1 font-semibold text-text-primary dark:text-zinc-100">
            {visibleSections.length}
          </p>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-text-secondary">
            Estimate
          </p>
          <p className="mt-1 font-semibold text-text-primary dark:text-zinc-100">
            {estimate || "See scope"}
          </p>
        </div>
      </section>

      <div className="p-4 sm:p-6">
        <div className="sticky top-4 z-20 mx-auto mb-4 max-w-5xl overflow-hidden rounded-2xl border border-border bg-white/95 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/95">
          {editor ? <ProposalEditorToolbar editor={editor} /> : null}
        </div>

        <div className="mx-auto max-w-5xl overflow-hidden rounded-[1.5rem] bg-white shadow-[0_20px_80px_rgba(15,23,42,0.12)] ring-1 ring-border dark:bg-zinc-950 dark:ring-zinc-800">
          {editor ? (
            <EditorContent editor={editor} />
          ) : (
            <div className="min-h-[860px] animate-pulse bg-white dark:bg-zinc-950" />
          )}
          <div className="grid gap-4 px-8 pb-10 sm:px-12 md:grid-cols-3">
            {visuals.length > 0
              ? visuals.slice(0, 3).map((visual, idx) => (
                  <VisualPanel
                    key={`${visual.kind}-${idx}`}
                    index={idx}
                    photoRef={visual.photoRef}
                    caption={visual.caption}
                  />
                ))
              : fallbackVisual
                ? (
                    <VisualPanel
                      index={0}
                      caption="Zenpho proposal visual system: structured scope, clear outcomes, and polished delivery."
                    />
                  )
                : null}
          </div>
        </div>

        {serviceLines.length > 0 ? (
          <section className="mx-auto mt-6 max-w-5xl rounded-[1.75rem] border border-emerald-200 bg-emerald-50/80 p-6 dark:border-emerald-900 dark:bg-emerald-950/20">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300">
              Services referenced
            </p>
            <ul className="mt-4 space-y-3">
              {serviceLines.map((line, idx) => (
                <li
                  key={line.id ?? idx}
                  className="flex justify-between gap-4 text-sm"
                >
                  <span className="text-text-primary dark:text-zinc-100">
                    {line.description_snapshot.split("\n")[0] || "Service"}
                  </span>
                  <span className="font-semibold">
                    {money(line.unit_price_snapshot)}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <details className="mx-auto mt-6 max-w-5xl rounded-2xl border border-border bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
          <summary className="cursor-pointer text-xs font-bold uppercase tracking-widest text-text-secondary">
            Raw Markdown fallback
          </summary>
          <textarea
            rows={16}
            value={markdown}
            onChange={(e) => onMarkdownChange(e.target.value)}
            className="mt-3 w-full rounded-xl border border-border bg-white px-3 py-2 font-mono text-xs leading-relaxed outline-none focus:border-blue-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
          />
        </details>
      </div>
    </article>
  );
}

function ProposalEditorToolbar({ editor }: { editor: Editor }) {
  return (
    <div
      className="flex flex-wrap items-center gap-1 px-2 py-2"
      role="toolbar"
      aria-label="Proposal text formatting"
    >
      <ToolbarBtn
        editor={editor}
        label="Undo"
        isActive={() => false}
        onPress={() => editor.chain().focus().undo().run()}
      >
        <Undo2 className="h-4 w-4" aria-hidden />
      </ToolbarBtn>
      <ToolbarBtn
        editor={editor}
        label="Redo"
        isActive={() => false}
        onPress={() => editor.chain().focus().redo().run()}
      >
        <Redo2 className="h-4 w-4" aria-hidden />
      </ToolbarBtn>
      <span className="mx-1 h-6 w-px bg-border dark:bg-zinc-700" aria-hidden />
      <ToolbarBtn
        editor={editor}
        label="Heading 1"
        isActive={() => editor.isActive("heading", { level: 1 })}
        onPress={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
      >
        <Heading1 className="h-4 w-4" aria-hidden />
      </ToolbarBtn>
      <ToolbarBtn
        editor={editor}
        label="Heading 2"
        isActive={() => editor.isActive("heading", { level: 2 })}
        onPress={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      >
        <Heading2 className="h-4 w-4" aria-hidden />
      </ToolbarBtn>
      <span className="mx-1 h-6 w-px bg-border dark:bg-zinc-700" aria-hidden />
      <ToolbarBtn
        editor={editor}
        label="Bold"
        isActive={() => editor.isActive("bold")}
        onPress={() => editor.chain().focus().toggleBold().run()}
      >
        <Bold className="h-4 w-4" aria-hidden />
      </ToolbarBtn>
      <ToolbarBtn
        editor={editor}
        label="Italic"
        isActive={() => editor.isActive("italic")}
        onPress={() => editor.chain().focus().toggleItalic().run()}
      >
        <Italic className="h-4 w-4" aria-hidden />
      </ToolbarBtn>
      <ToolbarBtn
        editor={editor}
        label="Underline"
        isActive={() => editor.isActive("underline")}
        onPress={() => editor.chain().focus().toggleUnderline().run()}
      >
        <UnderlineIcon className="h-4 w-4" aria-hidden />
      </ToolbarBtn>
      <span className="mx-1 h-6 w-px bg-border dark:bg-zinc-700" aria-hidden />
      <ToolbarBtn
        editor={editor}
        label="Bullet list"
        isActive={() => editor.isActive("bulletList")}
        onPress={() => editor.chain().focus().toggleBulletList().run()}
      >
        <List className="h-4 w-4" aria-hidden />
      </ToolbarBtn>
      <ToolbarBtn
        editor={editor}
        label="Numbered list"
        isActive={() => editor.isActive("orderedList")}
        onPress={() => editor.chain().focus().toggleOrderedList().run()}
      >
        <ListOrdered className="h-4 w-4" aria-hidden />
      </ToolbarBtn>
      <span className="mx-1 h-6 w-px bg-border dark:bg-zinc-700" aria-hidden />
      <ToolbarBtn
        editor={editor}
        label="Align left"
        isActive={() =>
          (editor.getAttributes("paragraph").textAlign ?? "left") === "left"
        }
        onPress={() => editor.chain().focus().setTextAlign("left").run()}
      >
        <AlignLeft className="h-4 w-4" aria-hidden />
      </ToolbarBtn>
      <ToolbarBtn
        editor={editor}
        label="Align center"
        isActive={() => editor.isActive({ textAlign: "center" })}
        onPress={() => editor.chain().focus().setTextAlign("center").run()}
      >
        <AlignCenter className="h-4 w-4" aria-hidden />
      </ToolbarBtn>
      <ToolbarBtn
        editor={editor}
        label="Align right"
        isActive={() => editor.isActive({ textAlign: "right" })}
        onPress={() => editor.chain().focus().setTextAlign("right").run()}
      >
        <AlignRight className="h-4 w-4" aria-hidden />
      </ToolbarBtn>
    </div>
  );
}

function ToolbarBtn({
  editor,
  label,
  isActive,
  onPress,
  children,
}: {
  editor: Editor;
  label: string;
  isActive: () => boolean;
  onPress: () => void;
  children: ReactNode;
}) {
  const active = isActive();
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onPress}
      disabled={!editor.isEditable}
      className={`rounded-lg p-2 text-text-secondary transition-colors hover:bg-surface disabled:opacity-40 dark:text-zinc-400 dark:hover:bg-zinc-800 ${
        active ? "bg-surface text-accent dark:bg-zinc-800 dark:text-blue-400" : ""
      }`}
      aria-label={label}
      aria-pressed={active}
    >
      {children}
    </button>
  );
}
