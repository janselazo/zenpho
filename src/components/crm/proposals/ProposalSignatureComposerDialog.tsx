"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { Editor } from "@tiptap/core";
import { Image as ImageIcon, Keyboard, Loader2, PenLine } from "lucide-react";
import { uploadProposalSignatureImage } from "@/app/(crm)/actions/sales-proposals";

const GOOGLE_FONTS_HREF =
  "https://fonts.googleapis.com/css2?family=Allura&family=Caveat:wght@400;600&family=Dancing+Script:wght@400;700&family=Great+Vibes&family=Mr+Dafoe&family=Pacifico&family=Sacramento&family=Satisfy&display=swap";

export const HANDWRITING_SIGNATURE_STYLES = [
  { id: "dancing", label: "Dancing Script", family: "Dancing Script" },
  { id: "great-vibes", label: "Great Vibes", family: "Great Vibes" },
  { id: "pacifico", label: "Pacifico", family: "Pacifico" },
  { id: "caveat", label: "Caveat", family: "Caveat" },
  { id: "satisfy", label: "Satisfy", family: "Satisfy" },
  { id: "allura", label: "Allura", family: "Allura" },
  { id: "sacramento", label: "Sacramento", family: "Sacramento" },
  { id: "mr-dafoe", label: "Mr Dafoe", family: "Mr Dafoe" },
] as const;

const FONT_LINK_ID = "zenpho-proposal-signature-fonts";

function ensureSignatureFontsLoaded() {
  if (typeof document === "undefined") return;
  if (document.getElementById(FONT_LINK_ID)) return;
  const link = document.createElement("link");
  link.id = FONT_LINK_ID;
  link.rel = "stylesheet";
  link.href = GOOGLE_FONTS_HREF;
  document.head.appendChild(link);
}

const PREVIEW_CSS_W = 520;
const PREVIEW_CSS_H = 160;
const EXPORT_CSS_W = 900;
const EXPORT_CSS_H = 260;

function drawSignatureLine(
  ctx: CanvasRenderingContext2D,
  cssW: number,
  cssH: number,
  text: string,
  family: string,
) {
  ctx.clearRect(0, 0, cssW, cssH);
  const trimmed = text.trim();
  if (!trimmed) return;

  let fontSize = Math.min(
    72,
    Math.floor(cssW / Math.max(6, trimmed.length * 0.55)),
  );
  for (; fontSize >= 26; fontSize -= 2) {
    ctx.font = `${fontSize}px "${family}", cursive`;
    const w = ctx.measureText(trimmed).width;
    if (w <= cssW - 56) break;
  }

  ctx.fillStyle = "#0f172a";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(trimmed, cssW / 2, cssH / 2 - 6);

  const baselineY = cssH / 2 + fontSize * 0.38;
  ctx.strokeStyle = "rgba(59, 130, 246, 0.55)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(28, baselineY);
  ctx.lineTo(cssW - 28, baselineY);
  ctx.stroke();
}

function setupCanvasDpi(canvas: HTMLCanvasElement, cssW: number, cssH: number) {
  const dpr = Math.min(
    2,
    typeof window !== "undefined" ? window.devicePixelRatio || 1 : 2,
  );
  canvas.width = Math.round(cssW * dpr);
  canvas.height = Math.round(cssH * dpr);
  canvas.style.width = `${cssW}px`;
  canvas.style.height = `${cssH}px`;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.scale(dpr, dpr);
  return ctx;
}

async function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) =>
        b ? resolve(b) : reject(new Error("Could not create signature image.")),
      "image/png",
      1,
    );
  });
}

type Tab = "type" | "image";

export default function ProposalSignatureComposerDialog({
  open,
  onClose,
  proposalId,
  signerName,
  onSignerNameChange,
  editor,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  proposalId: string;
  signerName: string;
  onSignerNameChange?: (name: string) => void;
  editor: Editor | null;
  onSuccess?: () => void;
}) {
  const titleId = useId();
  const previewRef = useRef<HTMLCanvasElement>(null);
  const exportRef = useRef<HTMLCanvasElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [tab, setTab] = useState<Tab>("type");
  const [typedName, setTypedName] = useState("");
  const [styleIndex, setStyleIndex] = useState(0);
  const [insertInDocument, setInsertInDocument] = useState(true);
  const [fontEpoch, setFontEpoch] = useState(0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const family =
    HANDWRITING_SIGNATURE_STYLES[styleIndex]?.family ?? "Dancing Script";

  useEffect(() => {
    if (!open) return;
    ensureSignatureFontsLoaded();
    setTypedName(signerName.trim() || "");
    setErr(null);
    setTab("type");
  }, [open, signerName]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void (async () => {
      try {
        await document.fonts.ready;
        await document.fonts.load(`64px "${family}"`);
      } catch {
        /* draw anyway */
      }
      if (!cancelled) setFontEpoch((e) => e + 1);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, family]);

  const redrawPreview = useCallback(() => {
    const canvas = previewRef.current;
    if (!canvas) return;
    const ctx = setupCanvasDpi(canvas, PREVIEW_CSS_W, PREVIEW_CSS_H);
    if (!ctx) return;
    drawSignatureLine(ctx, PREVIEW_CSS_W, PREVIEW_CSS_H, typedName, family);
  }, [typedName, family]);

  useEffect(() => {
    if (!open) return;
    redrawPreview();
  }, [open, redrawPreview, fontEpoch]);

  async function applyTypedSignature() {
    const trimmed = typedName.trim();
    if (!trimmed) {
      setErr("Type your name to create a signature.");
      return;
    }
    if (!proposalId.trim()) return;

    const exportCanvas = exportRef.current;
    if (!exportCanvas) return;
    const ctx = setupCanvasDpi(exportCanvas, EXPORT_CSS_W, EXPORT_CSS_H);
    if (!ctx) return;
    drawSignatureLine(ctx, EXPORT_CSS_W, EXPORT_CSS_H, trimmed, family);

    setBusy(true);
    setErr(null);
    try {
      const blob = await canvasToPngBlob(exportCanvas);
      const file = new File([blob], "signature.png", { type: "image/png" });
      const fd = new FormData();
      fd.append("file", file);
      fd.append("signerName", trimmed);
      const res = await uploadProposalSignatureImage(proposalId.trim(), fd);
      if ("error" in res && res.error) {
        setErr(res.error);
        return;
      }
      if ("ok" in res && res.ok && res.publicUrl && insertInDocument && editor) {
        editor
          .chain()
          .focus()
          .setImage({ src: res.publicUrl, alt: `Signature: ${trimmed}` })
          .run();
      }
      onSignerNameChange?.(trimmed);
      onSuccess?.();
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not save signature.");
    } finally {
      setBusy(false);
    }
  }

  async function applyUploadedFile() {
    const file = fileRef.current?.files?.[0];
    if (!file || !proposalId.trim()) {
      setErr("Choose an image file.");
      return;
    }
    const nameForRow = (signerName.trim() || typedName.trim()) || null;
    setBusy(true);
    setErr(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      if (nameForRow) fd.append("signerName", nameForRow);
      const res = await uploadProposalSignatureImage(proposalId.trim(), fd);
      if ("error" in res && res.error) {
        setErr(res.error);
        return;
      }
      if ("ok" in res && res.ok && res.publicUrl && insertInDocument && editor) {
        const alt = nameForRow || "Signature";
        editor
          .chain()
          .focus()
          .setImage({ src: res.publicUrl, alt: `Signature: ${alt}` })
          .run();
      }
      if (nameForRow) onSignerNameChange?.(nameForRow);
      onSuccess?.();
      onClose();
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <canvas
        ref={exportRef}
        aria-hidden
        className="pointer-events-none fixed left-[-9999px] top-0 h-px w-px opacity-0"
        width={32}
        height={32}
      />

      {open ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/55 p-4 backdrop-blur-[2px]"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-zinc-700 bg-zinc-950 text-zinc-100 shadow-2xl"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="border-b border-zinc-800 px-5 pt-5">
              <h2 id={titleId} className="text-lg font-bold text-white">
                Sign yourself
              </h2>
              <p className="mt-1 pb-4 text-xs text-zinc-400">
                Type your name in a handwriting style for PDFs, or use a photo of
                your signature. Edit the text and style, then apply.
              </p>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => setTab("type")}
                  className={`flex items-center gap-2 rounded-t-lg px-3 py-2 text-xs font-semibold uppercase tracking-wide ${
                    tab === "type"
                      ? "border-b-2 border-sky-500 text-sky-400"
                      : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  <Keyboard className="h-3.5 w-3.5" aria-hidden />
                  Type
                </button>
                <button
                  type="button"
                  onClick={() => setTab("image")}
                  className={`flex items-center gap-2 rounded-t-lg px-3 py-2 text-xs font-semibold uppercase tracking-wide ${
                    tab === "image"
                      ? "border-b-2 border-sky-500 text-sky-400"
                      : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  <ImageIcon className="h-3.5 w-3.5" aria-hidden />
                  Image
                </button>
              </div>
            </div>

            <div className="space-y-4 px-5 py-4">
              {tab === "type" ? (
                <>
                  <label className="block">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                      Your name
                    </span>
                    <input
                      type="text"
                      value={typedName}
                      onChange={(e) => setTypedName(e.target.value)}
                      placeholder="e.g. Janse Lazo"
                      className="mt-1.5 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-sky-500"
                      autoComplete="name"
                    />
                  </label>

                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                      Preview
                    </span>
                    <div className="relative mt-1.5 overflow-hidden rounded-xl border border-zinc-700 bg-white">
                      <canvas
                        ref={previewRef}
                        className="block w-full"
                        aria-label="Signature preview"
                      />
                    </div>
                  </div>

                  <label className="block">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                      Handwriting style
                    </span>
                    <select
                      value={styleIndex}
                      onChange={(e) => setStyleIndex(Number(e.target.value))}
                      className="mt-1.5 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-sky-500"
                    >
                      {HANDWRITING_SIGNATURE_STYLES.map((s, i) => (
                        <option key={s.id} value={i}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-zinc-400">
                    Upload PNG, JPG, or WebP (max 2 MB). Use the signer name field
                    on the proposal for the printed line on PDFs.
                  </p>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="text-sm text-zinc-300 file:mr-3 file:rounded-lg file:border-0 file:bg-sky-600 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white"
                  />
                </div>
              )}

              <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-300">
                <input
                  type="checkbox"
                  checked={insertInDocument}
                  onChange={(e) => setInsertInDocument(e.target.checked)}
                  className="rounded border-zinc-600"
                />
                Also insert signature image into the proposal document
              </label>

              {err ? (
                <p className="rounded-lg border border-red-900/50 bg-red-950/40 px-3 py-2 text-xs text-red-200">
                  {err}
                </p>
              ) : null}
            </div>

            <div className="flex justify-end gap-2 border-t border-zinc-800 px-5 py-4">
              <button
                type="button"
                onClick={onClose}
                disabled={busy}
                className="rounded-xl border border-zinc-600 px-4 py-2 text-sm font-semibold text-zinc-200 hover:bg-zinc-900 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  void (tab === "type" ? applyTypedSignature() : applyUploadedFile())
                }
                className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-500 disabled:opacity-50"
              >
                {busy ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  <PenLine className="h-4 w-4" aria-hidden />
                )}
                Apply
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
