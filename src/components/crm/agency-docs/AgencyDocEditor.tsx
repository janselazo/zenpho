"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { saveAgencyWorkspaceDoc } from "@/app/(crm)/actions/agency-docs";
import AgencyDocPreview from "@/components/crm/agency-docs/AgencyDocPreview";
import AgencyDocBlockEditor, {
  type AgencyDocBlockEditorHandle,
} from "@/components/crm/agency-docs/AgencyDocBlockEditor";
import {
  AGENCY_DOC_TABLE_PROSE_CLASS,
  blocksFromBody,
  bodyFromBlocks,
  isEmptyBlockHtml,
  sanitizeDocHtml,
  type AgencyDocBlock,
} from "@/lib/crm/agency-doc-body";
import type { AgencyDocType } from "@/lib/crm/agency-custom-doc";

type AgencyDocEditorProps = {
  slug: string;
  initialBody: string;
  canPersist: boolean;
  docType?: AgencyDocType;
};

function newBlockRow(): AgencyDocBlock {
  return { id: `b-${crypto.randomUUID()}`, html: "<p></p>" };
}

export default function AgencyDocEditor({
  slug,
  docType = "doc",
  initialBody,
  canPersist,
}: AgencyDocEditorProps) {
  const [blocks, setBlocks] = useState<AgencyDocBlock[]>(() =>
    blocksFromBody(initialBody)
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const blockEditorRef = useRef<AgencyDocBlockEditorHandle>(null);

  useEffect(() => {
    setBlocks(blocksFromBody(initialBody));
    setEditingId(null);
  }, [initialBody]);

  function persist(nextRows: AgencyDocBlock[]) {
    if (!canPersist) return;
    const text = bodyFromBlocks(nextRows);
    setErrorMessage(null);
    startTransition(async () => {
      const res = await saveAgencyWorkspaceDoc(slug, text, docType);
      if ("error" in res && res.error) {
        setErrorMessage(res.error);
        return;
      }
      setBlocks(blocksFromBody(text));
      setEditingId(null);
    });
  }

  function rowIndex(id: string) {
    return blocks.findIndex((b) => b.id === id);
  }

  function startEdit(id: string) {
    const i = rowIndex(id);
    if (i < 0) return;
    setEditingId(id);
  }

  function commitEdit() {
    if (editingId === null) return;
    const i = rowIndex(editingId);
    if (i < 0) return;
    const html = blockEditorRef.current?.getHtml() ?? blocks[i].html;
    const next = blocks.map((b, j) => (j === i ? { ...b, html } : b));
    setBlocks(next);
    setEditingId(null);
    persist(next);
  }

  function cancelEdit() {
    setEditingId(null);
  }

  function addAfter(id: string) {
    const i = rowIndex(id);
    if (i < 0) return;
    const row = newBlockRow();
    const next = [...blocks.slice(0, i + 1), row, ...blocks.slice(i + 1)];
    setBlocks(next);
    setEditingId(row.id);
  }

  function removeAt(id: string) {
    if (!window.confirm("Remove this paragraph?")) return;
    const next = blocks.filter((b) => b.id !== id);
    setBlocks(next);
    if (editingId === id) {
      setEditingId(null);
    }
    persist(next);
  }

  function addFirstParagraph() {
    const row = newBlockRow();
    setBlocks([row]);
    setEditingId(row.id);
  }

  function addAtEnd() {
    const row = newBlockRow();
    setBlocks([...blocks, row]);
    setEditingId(row.id);
  }

  if (!canPersist) {
    return (
      <div className="space-y-4">
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
          Supabase isn’t configured or the database isn’t reachable — showing the
          default template only. Set{" "}
          <code className="rounded bg-black/5 px-1 dark:bg-white/10">
            NEXT_PUBLIC_SUPABASE_URL
          </code>{" "}
          and{" "}
          <code className="rounded bg-black/5 px-1 dark:bg-white/10">
            NEXT_PUBLIC_SUPABASE_ANON_KEY
          </code>
          , apply migrations (including{" "}
          <code className="rounded bg-black/5 px-1 dark:bg-white/10">
            agency_workspace_doc
          </code>
          ), then restart the dev server.
        </p>
        <AgencyDocPreview
          text={initialBody}
          emptyLabel="No content yet — connect Supabase to edit this doc."
        />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {errorMessage ? (
        <p className="text-sm font-medium text-red-600 dark:text-red-400">
          {errorMessage}
        </p>
      ) : null}
      {pending ? (
        <p className="text-xs text-text-secondary dark:text-zinc-500">Saving…</p>
      ) : null}

      <div
        className="w-full space-y-1 text-justify text-base leading-relaxed text-text-secondary dark:text-zinc-400"
        role="region"
        aria-label="Document content"
      >
        {blocks.length === 0 ? (
          <div className="space-y-4 py-2">
            <p className="text-sm text-text-secondary dark:text-zinc-500">
              No paragraphs yet. Add one to get started.
            </p>
            <button
              type="button"
              onClick={addFirstParagraph}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-white px-3 py-2 text-sm font-medium text-text-primary shadow-sm transition-colors hover:bg-surface dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
            >
              <Plus className="h-4 w-4" aria-hidden />
              Add paragraph
            </button>
          </div>
        ) : (
          blocks.map((row) => (
            <div
              key={row.id}
              className="group flex items-start gap-3 rounded-xl py-2 pr-1 transition-colors hover:bg-surface/60 dark:hover:bg-zinc-800/35"
            >
              <div className="min-w-0 flex-1">
                {editingId === row.id ? (
                  <div className="space-y-2">
                    <AgencyDocBlockEditor
                      ref={blockEditorRef}
                      key={`edit-${editingId}`}
                      initialHtml={
                        row.html?.trim() ? row.html : "<p></p>"
                      }
                      disabled={pending}
                      autoFocus
                      slug={slug}
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => void commitEdit()}
                        disabled={pending}
                        className="rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-white hover:bg-accent-hover disabled:opacity-50 dark:bg-blue-600 dark:hover:bg-blue-500"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={cancelEdit}
                        className="rounded-lg px-3 py-1.5 text-xs font-medium text-text-secondary hover:bg-surface dark:text-zinc-400 dark:hover:bg-zinc-800"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : isEmptyBlockHtml(row.html) ? (
                  <p className="italic text-text-secondary/60 dark:text-zinc-600">
                    Empty paragraph — use edit to add text
                  </p>
                ) : (
                  <div
                    className={`max-w-full overflow-x-auto ${AGENCY_DOC_TABLE_PROSE_CLASS} [&_code]:rounded [&_code]:bg-black/[0.06] [&_code]:px-1 [&_code]:text-sm [&_code]:dark:bg-white/10 [&_em]:italic [&_hr]:my-4 [&_hr]:border-border dark:[&_hr]:border-zinc-600 [&_img]:my-4 [&_img]:max-w-full [&_img]:rounded-lg [&_li]:my-0.5 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mb-2 [&_p:last-child]:mb-0 [&_strong]:font-semibold [&_u]:underline [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5`}
                    dangerouslySetInnerHTML={{
                      __html: sanitizeDocHtml(row.html),
                    }}
                  />
                )}
              </div>

              {editingId !== row.id ? (
                <div className="flex shrink-0 items-center gap-0.5 pt-0.5 transition-opacity duration-150 motion-reduce:transition-none [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 [@media(hover:hover)]:group-focus-within:opacity-100">
                  <button
                    type="button"
                    onClick={() => addAfter(row.id)}
                    disabled={pending}
                    className="rounded-md p-2 text-text-secondary transition-colors hover:bg-white hover:text-accent dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-blue-400"
                    aria-label="Add paragraph after"
                  >
                    <Plus className="h-4 w-4" aria-hidden strokeWidth={2} />
                  </button>
                  <button
                    type="button"
                    onClick={() => startEdit(row.id)}
                    disabled={pending}
                    className="rounded-md p-2 text-text-secondary transition-colors hover:bg-white hover:text-accent dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-blue-400"
                    aria-label="Edit paragraph"
                  >
                    <Pencil className="h-4 w-4" aria-hidden strokeWidth={2} />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeAt(row.id)}
                    disabled={pending}
                    className="rounded-md p-2 text-text-secondary transition-colors hover:bg-red-50 hover:text-red-600 dark:text-zinc-400 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                    aria-label="Delete paragraph"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden strokeWidth={2} />
                  </button>
                </div>
              ) : null}
            </div>
          ))
        )}
      </div>

      {blocks.length > 0 ? (
        <button
          type="button"
          onClick={addAtEnd}
          disabled={pending || editingId !== null}
          className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-dashed border-border px-3 py-2 text-sm font-medium text-text-secondary transition-colors hover:border-accent/40 hover:bg-surface hover:text-text-primary disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800/60 dark:hover:text-zinc-100"
        >
          <Plus className="h-4 w-4" aria-hidden />
          Add paragraph at end
        </button>
      ) : null}
    </div>
  );
}
