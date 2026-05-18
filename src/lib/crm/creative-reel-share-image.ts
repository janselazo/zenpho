/**
 * Client-side composite: places a 9:16 creative inside a phone bezel for outreach attachments.
 */

const FRAME_W = 390;
const FRAME_H = 844;
const BEZEL = 10;
const RADIUS = 36;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not load thumbnail image."));
    img.src = src;
  });
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

/**
 * Draw thumbnail inside a phone frame and return a PNG blob suitable for email/SMS attach.
 */
export async function compositeCreativeReelSharePng(
  thumbnailObjectUrl: string,
): Promise<Blob> {
  const img = await loadImage(thumbnailObjectUrl);

  const canvas = document.createElement("canvas");
  canvas.width = FRAME_W;
  canvas.height = FRAME_H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported.");

  ctx.fillStyle = "#0c0c0f";
  ctx.fillRect(0, 0, FRAME_W, FRAME_H);

  const innerX = BEZEL;
  const innerY = BEZEL;
  const innerW = FRAME_W - BEZEL * 2;
  const innerH = FRAME_H - BEZEL * 2;

  ctx.save();
  roundRect(ctx, innerX, innerY, innerW, innerH, RADIUS - BEZEL);
  ctx.clip();
  ctx.drawImage(img, innerX, innerY, innerW, innerH);
  ctx.restore();

  ctx.strokeStyle = "#222228";
  ctx.lineWidth = BEZEL;
  roundRect(ctx, BEZEL / 2, BEZEL / 2, FRAME_W - BEZEL, FRAME_H - BEZEL, RADIUS);
  ctx.stroke();

  const cx = FRAME_W / 2;
  const cy = FRAME_H / 2;
  const playR = 28;
  ctx.fillStyle = "rgba(255,255,255,0.92)";
  ctx.beginPath();
  ctx.arc(cx, cy, playR, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#18181b";
  ctx.beginPath();
  ctx.moveTo(cx - 6, cy - 12);
  ctx.lineTo(cx + 14, cy);
  ctx.lineTo(cx - 6, cy + 12);
  ctx.closePath();
  ctx.fill();

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Could not export PNG."));
      },
      "image/png",
      0.92,
    );
  });
}

export function creativeReelShareFilename(businessName: string): string {
  const slug = businessName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
  return `${slug || "business"}-creative-reel-preview.png`;
}
