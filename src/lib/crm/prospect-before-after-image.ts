/**
 * Client-only: compose a before/after comparison PNG from two image sources
 * (existing website screenshot + Stitch preview) using an off-screen canvas.
 */

const CANVAS_W = 1600;
const CANVAS_H = 960;
const HEADER_H = 64;
const DIVIDER_W = 2;
const LABEL_PADDING_Y = 28;
const IMAGE_PADDING = 16;
const HALF_W = (CANVAS_W - DIVIDER_W) / 2;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    img.src = src;
  });
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

export type ComposeBeforeAfterOptions = {
  beforeImageUrl: string;
  afterImageUrl: string;
  businessName?: string;
};

/**
 * Composes a before/after comparison image and returns a PNG Blob.
 * Both images are scaled to fit their half while maintaining aspect ratio.
 */
export async function composeBeforeAfterImage(
  options: ComposeBeforeAfterOptions,
): Promise<Blob> {
  if (typeof document === "undefined") {
    throw new Error("composeBeforeAfterImage runs in the browser only.");
  }

  const [beforeImg, afterImg] = await Promise.all([
    loadImage(options.beforeImageUrl),
    loadImage(options.afterImageUrl),
  ]);

  const canvas = document.createElement("canvas");
  canvas.width = CANVAS_W;
  canvas.height = CANVAS_H;
  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) throw new Error("Canvas 2D context unavailable.");

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  // Background
  ctx.fillStyle = "#0f0f11";
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  // Header: business name
  const title = options.businessName?.trim() || "";
  if (title) {
    ctx.fillStyle = "#ffffff";
    ctx.font = "600 20px system-ui, -apple-system, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(title, CANVAS_W / 2, HEADER_H / 2, CANVAS_W - 40);
  }

  const imageAreaTop = HEADER_H;
  const imageAreaH = CANVAS_H - imageAreaTop;

  // Labels
  const labelY = imageAreaTop + LABEL_PADDING_Y;
  ctx.font = "700 13px system-ui, -apple-system, sans-serif";
  ctx.textBaseline = "top";

  // "Before" label (left half)
  ctx.textAlign = "center";
  ctx.fillStyle = "#ef4444";
  ctx.fillText("BEFORE", HALF_W / 2, labelY);

  // "After" label (right half)
  ctx.fillStyle = "#22c55e";
  ctx.fillText("AFTER", HALF_W + DIVIDER_W + HALF_W / 2, labelY);

  const thumbnailTop = labelY + 28;
  const thumbnailH = imageAreaH - (thumbnailTop - imageAreaTop) - IMAGE_PADDING;
  const thumbnailW = HALF_W - IMAGE_PADDING * 2;

  function drawFittedImage(
    c: CanvasRenderingContext2D,
    img: HTMLImageElement,
    destX: number,
    destY: number,
    destW: number,
    destH: number,
  ) {
    const scale = Math.min(destW / img.width, destH / img.height);
    const drawW = img.width * scale;
    const drawH = img.height * scale;
    const offsetX = destX + (destW - drawW) / 2;
    const offsetY = destY;

    c.save();
    drawRoundedRect(c, offsetX, offsetY, drawW, drawH, 8);
    c.clip();
    c.drawImage(img, offsetX, offsetY, drawW, drawH);
    c.restore();

    c.strokeStyle = "rgba(255,255,255,0.12)";
    c.lineWidth = 1;
    drawRoundedRect(c, offsetX, offsetY, drawW, drawH, 8);
    c.stroke();
  }

  drawFittedImage(
    ctx,
    beforeImg,
    IMAGE_PADDING,
    thumbnailTop,
    thumbnailW,
    thumbnailH,
  );

  drawFittedImage(
    ctx,
    afterImg,
    HALF_W + DIVIDER_W + IMAGE_PADDING,
    thumbnailTop,
    thumbnailW,
    thumbnailH,
  );

  // Center divider
  const dividerGrad = ctx.createLinearGradient(0, imageAreaTop, 0, CANVAS_H);
  dividerGrad.addColorStop(0, "rgba(255,255,255,0)");
  dividerGrad.addColorStop(0.15, "rgba(255,255,255,0.25)");
  dividerGrad.addColorStop(0.85, "rgba(255,255,255,0.25)");
  dividerGrad.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = dividerGrad;
  ctx.fillRect(HALF_W, imageAreaTop, DIVIDER_W, imageAreaH);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Canvas toBlob returned null."));
      },
      "image/png",
      1.0,
    );
  });
}
