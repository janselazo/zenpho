"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type ReactNode, type RefObject } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import type { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Image from "@tiptap/extension-image";
import {
  deriveProposalSummary,
  parseProposalDocumentForEditor,
  proposalEditorHtmlToMarkdown,
  proposalMarkdownToEditorHtml,
} from "@/lib/crm/proposal-document";
import type {
  SalesProposalAiVisualRow,
  SalesProposalStatus,
} from "@/lib/crm/sales-proposal-types";
import type { PlacesSearchPlace } from "@/lib/crm/places-types";
import {
  uploadProposalBodyImage,
  uploadProposalSignatureImage,
  clearProposalSignature,
  translateProposalMarkdownToSpanish,
} from "@/app/(crm)/actions/sales-proposals";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Heading1,
  Heading2,
  ImagePlus,
  Italic,
  List,
  ListOrdered,
  ListPlus,
  Loader2,
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

function prospectAttachmentPublicUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "") ?? "";
  return `${base}/storage/v1/object/public/prospect-attachments/${path.replace(/^\//, "")}`;
}

export default function ProposalDocumentCanvas({
  title,
  onTitleChange,
  buyerName,
  markdown,
  onMarkdownChange,
  status,
  place,
  aiVisuals: _aiVisuals = [],
  serviceLines = [],
  totalPriceEstimate,
  proposalId,
  signatureImagePath = null,
  signatureSignerName = "",
  onSignatureSignerNameChange,
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
  proposalId: string;
  signatureImagePath?: string | null;
  signatureSignerName?: string;
  onSignatureSignerNameChange?: (name: string) => void;
}) {
  const doc = parseProposalDocumentForEditor(markdown);
  const latestTitleRef = useRef(title);
  const lastEmittedMarkdownRef = useRef(markdown);
  const englishSnapshotRef = useRef(markdown);
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
      Image.configure({ inline: false, allowBase64: false }),
    ],
    [],
  );
  const photoRefs = place?.photoRefs?.map((p) => p.trim()).filter(Boolean) ?? [];
  const estimate =
    totalPriceEstimate != null && Number.isFinite(totalPriceEstimate)
      ? money(totalPriceEstimate)
      : serviceLines.length > 0
        ? money(serviceLines.reduce((sum, line) => sum + line.unit_price_snapshot, 0))
        : null;

  const [spanishOn, setSpanishOn] = useState(false);
  const [translateBusy, setTranslateBusy] = useState(false);
  const [translateErr, setTranslateErr] = useState<string | null>(null);

  const [sigUploadBusy, setSigUploadBusy] = useState(false);
  const sigFileRef = useRef<HTMLInputElement>(null);
  const bodyImgFileRef = useRef<HTMLInputElement>(null);
  const [bodyImgBusy, setBodyImgBusy] = useState(false);

  useEffect(() => {
    latestTitleRef.current = title;
  }, [title]);

  useEffect(() => {
    if (!spanishOn) {
      englishSnapshotRef.current = markdown;
    }
  }, [markdown, spanishOn]);

  const toggleSpanish = useCallback(async () => {
    setTranslateErr(null);
    if (spanishOn) {
      setSpanishOn(false);
      onMarkdownChange(englishSnapshotRef.current);
      return;
    }
    setTranslateBusy(true);
    try {
      const source =
        lastEmittedMarkdownRef.current || englishSnapshotRef.current;
      const res = await translateProposalMarkdownToSpanish(source);
      if (!res.ok) {
        setTranslateErr(res.error);
        return;
      }
      setSpanishOn(true);
      onMarkdownChange(res.markdown);
    } finally {
      setTranslateBusy(false);
    }
  }, [onMarkdownChange, spanishOn]);

  const editor = useEditor(
    {
      extensions,
      content: editorHtml,
      immediatelyRender: false,
      editorProps: {
        attributes: {
          class:
            "proposal-word-editor min-h-[860px] px-8 py-10 text-[15px] leading-8 text-text-primary outline-none dark:text-zinc-100 sm:px-12 sm:py-12 [&_h1]:heading-display [&_h1]:mb-8 [&_h1]:text-4xl [&_h1]:font-black [&_h1]:leading-tight [&_h1]:text-text-primary dark:[&_h1]:text-white sm:[&_h1]:text-5xl [&_h2]:heading-display [&_h2]:mb-4 [&_h2]:mt-10 [&_h2]:text-2xl [&_h2]:font-black [&_h2]:text-text-primary dark:[&_h2]:text-white [&_h3]:mb-2 [&_h3]:mt-6 [&_h3]:text-sm [&_h3]:font-bold [&_h3]:uppercase [&_h3]:tracking-wide [&_p]:mb-4 [&_ul]:mb-5 [&_ul]:list-disc [&_ul]:pl-7 [&_ol]:mb-5 [&_ol]:list-decimal [&_ol]:pl-7 [&_li]:my-1.5 [&_img]:my-4 [&_img]:max-w-full [&_img]:rounded-lg",
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

  const handleBodyImagePick = useCallback(
    async (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (!file || !editor || !proposalId.trim()) return;
      setBodyImgBusy(true);
      try {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("proposalId", proposalId.trim());
        const res = await uploadProposalBodyImage(fd);
        if ("error" in res && res.error) {
          alert(res.error);
          return;
        }
        if ("url" in res && res.url) {
          editor.chain().focus().setImage({ src: res.url }).run();
        }
      } finally {
        setBodyImgBusy(false);
      }
    },
    [editor, proposalId],
  );

  const handleSignaturePick = useCallback(
    async (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (!file || !proposalId.trim()) return;
      setSigUploadBusy(true);
      try {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("signerName", signatureSignerName.trim());
        const res = await uploadProposalSignatureImage(proposalId.trim(), fd);
        if ("error" in res && res.error) {
          alert(res.error);
          return;
        }
      } finally {
        setSigUploadBusy(false);
      }
    },
    [proposalId, signatureSignerName],
  );

  async function handleClearSignature() {
    if (!proposalId.trim()) return;
    if (!confirm("Remove the saved signature from this proposal?")) return;
    const res = await clearProposalSignature(proposalId.trim());
    if ("error" in res && res.error) alert(res.error);
  }

  const signaturePreviewUrl =
    signatureImagePath?.trim() ? prospectAttachmentPublicUrl(signatureImagePath.trim()) : null;

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

      <div className="border-b border-border bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950 sm:px-6">
        <p className="text-[10px] font-bold uppercase tracking-widest text-text-secondary">
          PDF signature (optional)
        </p>
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <label className="flex min-w-[160px] flex-1 flex-col gap-1">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-text-secondary">
              Signer name
            </span>
            <input
              type="text"
              value={signatureSignerName}
              onChange={(e) => onSignatureSignerNameChange?.(e.target.value)}
              placeholder="Printed name"
              className="rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-blue-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            />
          </label>
          <input
            ref={sigFileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => void handleSignaturePick(e)}
          />
          <button
            type="button"
            disabled={!proposalId.trim() || sigUploadBusy}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => sigFileRef.current?.click()}
            className="rounded-xl border border-border px-4 py-2 text-sm font-semibold disabled:opacity-50 dark:border-zinc-700"
          >
            {sigUploadBusy ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Uploading…
              </span>
            ) : (
              "Upload signature"
            )}
          </button>
          {signaturePreviewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={signaturePreviewUrl}
              alt="Signature preview"
              className="h-14 max-w-[140px] rounded-md border border-border object-contain dark:border-zinc-700"
            />
          ) : null}
          {signatureImagePath ? (
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => void handleClearSignature()}
              className="text-sm font-semibold text-red-600 underline dark:text-red-400"
            >
              Clear signature
            </button>
          ) : null}
        </div>
        <p className="mt-2 text-xs text-text-secondary dark:text-zinc-500">
          When saved, this image is flattened onto generated proposal PDFs (download and email).
        </p>
      </div>

      <div className="p-4 sm:p-6">
        <div className="sticky top-4 z-20 mx-auto mb-4 max-w-5xl overflow-hidden rounded-2xl border border-border bg-white/95 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/95">
          <div className="flex flex-wrap items-center justify-end gap-2 border-b border-border px-2 py-2 dark:border-zinc-800">
            <button
              type="button"
              role="switch"
              aria-checked={spanishOn}
              aria-label={
                spanishOn
                  ? "Proposal text is in Spanish. Click to restore English."
                  : "Proposal text is in English. Click to translate to Spanish."
              }
              disabled={translateBusy}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => void toggleSpanish()}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide transition-colors disabled:opacity-50 ${
                spanishOn
                  ? "border-blue-500/50 bg-blue-500/15 text-blue-900 dark:border-blue-400/45 dark:bg-blue-500/20 dark:text-blue-100"
                  : "border-border/80 bg-white/60 text-text-secondary hover:bg-white dark:border-zinc-600 dark:bg-zinc-900/50 dark:text-zinc-400 dark:hover:bg-zinc-800/70"
              }`}
            >
              {translateBusy ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
              ) : (
                <span className="text-sm leading-none" aria-hidden>
                  🇪🇸
                </span>
              )}
              ES
            </button>
          </div>
          {translateErr ? (
            <p className="border-b border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200">
              {translateErr}
            </p>
          ) : null}
          {editor ? (
            <ProposalEditorToolbar
              editor={editor}
              proposalId={proposalId}
              bodyImageFileRef={bodyImgFileRef}
              bodyImageBusy={bodyImgBusy}
              onBodyImageChange={handleBodyImagePick}
            />
          ) : null}
        </div>

        <div className="mx-auto max-w-5xl overflow-hidden rounded-[1.5rem] bg-white shadow-[0_20px_80px_rgba(15,23,42,0.12)] ring-1 ring-border dark:bg-zinc-950 dark:ring-zinc-800">
          {editor ? (
            <EditorContent editor={editor} />
          ) : (
            <div className="min-h-[860px] animate-pulse bg-white dark:bg-zinc-950" />
          )}
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

function ProposalEditorToolbar({
  editor,
  proposalId,
  bodyImageFileRef,
  bodyImageBusy,
  onBodyImageChange,
}: {
  editor: Editor;
  proposalId: string;
  bodyImageFileRef: RefObject<HTMLInputElement | null>;
  bodyImageBusy: boolean;
  onBodyImageChange: (e: ChangeEvent<HTMLInputElement>) => void;
}) {
  const canImage = Boolean(proposalId.trim());

  function insertSection() {
    const title =
      typeof window !== "undefined"
        ? window.prompt("New section heading", "New section")
        : null;
    const label = (title ?? "New section").trim() || "New section";
    editor
      .chain()
      .focus()
      .insertContent({
        type: "heading",
        attrs: { level: 2 },
        content: [{ type: "text", text: label }],
      })
      .insertContent("<p></p>")
      .run();
  }

  return (
    <div
      className="flex flex-wrap items-center gap-1 px-2 py-2"
      role="toolbar"
      aria-label="Proposal text formatting"
    >
      <input
        ref={bodyImageFileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={onBodyImageChange}
      />
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
      <ToolbarBtn
        editor={editor}
        label="Add section"
        isActive={() => false}
        onPress={insertSection}
      >
        <ListPlus className="h-4 w-4" aria-hidden />
      </ToolbarBtn>
      <span className="mx-1 h-6 w-px bg-border dark:bg-zinc-700" aria-hidden />
      <ToolbarBtn
        editor={editor}
        label="Insert image"
        isActive={() => false}
        disabled={!canImage || bodyImageBusy}
        onPress={() => bodyImageFileRef.current?.click()}
      >
        {bodyImageBusy ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        ) : (
          <ImagePlus className="h-4 w-4" aria-hidden />
        )}
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
  disabled,
  children,
}: {
  editor: Editor;
  label: string;
  isActive: () => boolean;
  onPress: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  const active = isActive();
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onPress}
      disabled={disabled ?? !editor.isEditable}
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
