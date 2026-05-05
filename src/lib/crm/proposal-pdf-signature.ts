import { Buffer } from "node:buffer";
import type { PDFDocument, PDFImage, PDFPage } from "pdf-lib";
import { rgb } from "pdf-lib";
import {
  type BrandBookContext,
  CONTENT_W,
  SAFE_MARGIN,
  embedPngIfAny,
} from "@/lib/crm/pdf-brand-book";
import { createAdminClient } from "@/lib/supabase/admin";

const BUCKET = "prospect-attachments";

export function isSafeProposalSignaturePath(path: string): boolean {
  const p = path.trim();
  return p.startsWith("proposal-signatures/") && !p.includes("..");
}

export async function downloadProposalSignatureBytesFromPath(
  storagePath: string,
): Promise<Buffer | null> {
  if (!isSafeProposalSignaturePath(storagePath)) return null;
  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return null;
  }
  try {
    const { data, error } = await admin.storage
      .from(BUCKET)
      .download(storagePath.trim());
    if (error || !data) return null;
    const buf = Buffer.from(await data.arrayBuffer());
    return buf.byteLength > 32 ? buf : null;
  } catch {
    return null;
  }
}

export async function embedSignatureImageForPdf(
  pdf: PDFDocument,
  bytes: Buffer,
): Promise<PDFImage | null> {
  if (!bytes.byteLength) return null;
  if (bytes[0] === 0x89 && bytes[1] === 0x50) {
    return embedPngIfAny(pdf, bytes);
  }
  if (bytes[0] === 0xff && bytes[1] === 0xd8) {
    try {
      return await pdf.embedJpg(bytes);
    } catch {
      return null;
    }
  }
  return null;
}

/** Flattened signature block on the bottom-left of the given page. */
export function drawAgencySignatureBlockOnPage(
  page: PDFPage,
  ctx: BrandBookContext,
  opts: {
    image: PDFImage;
    signerName: string;
    dateLabel: string;
  },
): void {
  const boxW = Math.min(280, CONTENT_W * 0.42);
  const sigImgH = 38;
  const boxH = 96;
  const x = SAFE_MARGIN;
  const baseY = SAFE_MARGIN;

  const border = rgb(0.62, 0.64, 0.7);
  const muted = rgb(0.38, 0.4, 0.45);

  page.drawRectangle({
    x,
    y: baseY,
    width: boxW,
    height: boxH,
    borderColor: border,
    borderWidth: 0.75,
    color: rgb(1, 1, 1),
    opacity: 0.94,
  });

  page.drawText("Authorized signature", {
    x: x + 10,
    y: baseY + boxH - 14,
    size: 7.5,
    font: ctx.fonts.body,
    color: muted,
  });

  const iw = opts.image.width;
  const ih = opts.image.height;
  const scale = sigImgH / ih;
  const drawW = Math.min(iw * scale, boxW - 20);

  page.drawImage(opts.image, {
    x: x + 10,
    y: baseY + boxH - 56,
    width: drawW,
    height: sigImgH,
  });

  const nameLine =
    opts.signerName.trim() || "Authorized representative";
  page.drawText(nameLine.slice(0, 72), {
    x: x + 10,
    y: baseY + 22,
    size: 9,
    font: ctx.fonts.body,
    color: rgb(0.12, 0.13, 0.16),
  });

  page.drawText(opts.dateLabel.trim().slice(0, 48), {
    x: x + 10,
    y: baseY + 10,
    size: 7.5,
    font: ctx.fonts.body,
    color: muted,
  });
}
