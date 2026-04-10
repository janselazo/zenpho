/**
 * Client-only: short WebM of scrolling through the hosted prospect homepage preview
 * (iframe + html2canvas + MediaRecorder). Tuned for email: quick, sharp-ish, small file.
 */

export type PreviewDeviceTypeForVideo = "MOBILE" | "DESKTOP" | null;

const DESKTOP_VIEW_W = 1280;
const DESKTOP_VIEW_H = 720;
const MOBILE_VIEW_W = 390;
const MOBILE_VIEW_H = 720;

/** Encode size — 720p landscape for desktop (good quality / reasonable weight for email). */
const OUT_DESKTOP_W = 1280;
const OUT_DESKTOP_H = 720;
/** Narrow portrait — lighter than full 720p height, still readable on phones. */
const OUT_MOBILE_W = 540;
const OUT_MOBILE_H = 960;

/** Quick homepage preview (not a long tour) — keeps attachment size down for email. */
const OUTPUT_VIDEO_MS = 10_000;

const CAPTURE_FRAMES_MIN = 22;
const CAPTURE_FRAMES_MAX = 40;

/** Canvas stream frame rate (content is mostly static holds per snap). */
const TARGET_FPS = 12;
const POST_LOAD_SETTLE_MS = 400;

/** Target video bitrate (VP9/WebM) — browsers may approximate; keeps ~2–5 MB typical for ~10s 720p. */
const VIDEO_BITRATE_DESKTOP_BPS = 2_000_000;
const VIDEO_BITRATE_MOBILE_BPS = 1_200_000;

/** html2canvas resolution multiplier (1 = full sharpness at viewport; then scaled to OUT_* with high-quality smoothing). */
const CAPTURE_SCALE = 1;

/** Public for UI (“~10s clip”, email-friendly). */
export const PROSPECT_PREVIEW_VIDEO_DURATION_SEC = Math.round(OUTPUT_VIDEO_MS / 1000);

export const PROSPECT_PREVIEW_VIDEO_EMAIL_HINT =
  "Quick WebM preview (~10s, tuned for small file size — many inboxes cap attachments around 10–25 MB).";

type MimeChoice = { mimeType: string; videoBitsPerSecond: number };

function pickRecorderOptions(isMobile: boolean): MimeChoice {
  const bitrate = isMobile ? VIDEO_BITRATE_MOBILE_BPS : VIDEO_BITRATE_DESKTOP_BPS;
  const candidates: { mime: string }[] = [
    { mime: "video/webm;codecs=vp9" },
    { mime: "video/webm;codecs=vp8" },
    { mime: "video/webm" },
  ];
  if (typeof MediaRecorder === "undefined") {
    return { mimeType: "", videoBitsPerSecond: bitrate };
  }
  for (const c of candidates) {
    if (MediaRecorder.isTypeSupported(c.mime)) {
      return { mimeType: c.mime, videoBitsPerSecond: bitrate };
    }
  }
  return { mimeType: "", videoBitsPerSecond: bitrate };
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function nextPaint(): Promise<void> {
  await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
}

/**
 * Prefer scrolling through the marketing #home section (or app #dash); fallback to full document.
 */
function getWalkthroughScrollRange(
  doc: Document,
  capH: number
): { scrollStart: number; maxScroll: number } {
  const scrollEl = doc.scrollingElement ?? doc.documentElement;
  const fullMax = Math.max(0, scrollEl.scrollHeight - capH);

  const roots = [
    doc.getElementById("home"),
    doc.getElementById("dash"),
  ];

  for (const el of roots) {
    if (!el || el.offsetHeight < 1) continue;
    const top = el.offsetTop;
    const bottom = top + el.offsetHeight;
    const endScroll = Math.min(fullMax, Math.max(0, bottom - capH));
    const start = Math.min(Math.max(0, top), fullMax);
    const range = Math.max(0, endScroll - start);
    return { scrollStart: start, maxScroll: range };
  }

  return { scrollStart: 0, maxScroll: fullMax };
}

function pickCaptureFrameCount(maxScroll: number): number {
  const density = Math.ceil(maxScroll / 140);
  return Math.min(CAPTURE_FRAMES_MAX, Math.max(CAPTURE_FRAMES_MIN, density));
}

export type RecordScrollVideoOptions = {
  html: string;
  deviceType: PreviewDeviceTypeForVideo;
};

/**
 * Scroll-through WebM: short duration, 720p-style encode where possible, bitrate-capped for email.
 */
export async function recordProspectPreviewScrollVideo(
  options: RecordScrollVideoOptions,
): Promise<Blob> {
  if (typeof window === "undefined" || typeof document === "undefined") {
    throw new Error("Scroll video recording runs in the browser only.");
  }

  const isMobile = options.deviceType === "MOBILE";
  const { mimeType, videoBitsPerSecond } = pickRecorderOptions(isMobile);
  if (!mimeType) {
    throw new Error(
      "WebM recording is not supported in this browser. Try Chrome or Edge for scroll video export.",
    );
  }

  const capW = isMobile ? MOBILE_VIEW_W : DESKTOP_VIEW_W;
  const capH = isMobile ? MOBILE_VIEW_H : DESKTOP_VIEW_H;
  const outW = isMobile ? OUT_MOBILE_W : OUT_DESKTOP_W;
  const outH = isMobile ? OUT_MOBILE_H : OUT_DESKTOP_H;

  const { default: html2canvas } = await import("html2canvas");

  const iframe = document.createElement("iframe");
  iframe.setAttribute("title", "Scroll capture");
  iframe.style.cssText = `position:fixed;left:-9999px;top:0;width:${capW}px;height:${capH}px;border:0;visibility:hidden;pointer-events:none;`;
  iframe.srcdoc = options.html;

  await new Promise<void>((resolve, reject) => {
    iframe.onload = () => resolve();
    iframe.onerror = () => reject(new Error("Preview iframe failed to load."));
    document.body.appendChild(iframe);
  });

  await delay(POST_LOAD_SETTLE_MS);

  const win = iframe.contentWindow;
  const doc = iframe.contentDocument;
  if (!win || !doc?.documentElement) {
    iframe.remove();
    throw new Error("Preview document is not accessible.");
  }

  const { scrollStart, maxScroll } = getWalkthroughScrollRange(doc, capH);
  const totalFrames = pickCaptureFrameCount(Math.max(maxScroll, 80));

  const captureEl = doc.documentElement;
  const snaps: HTMLCanvasElement[] = [];

  try {
    for (let frame = 0; frame < totalFrames; frame++) {
      const t = totalFrames <= 1 ? 0 : frame / (totalFrames - 1);
      const scrollTop = scrollStart + maxScroll * t;
      win.scrollTo(0, scrollTop);
      await nextPaint();

      const snap = await html2canvas(captureEl, {
        width: capW,
        height: capH,
        windowWidth: capW,
        windowHeight: capH,
        scrollX: 0,
        scrollY: -win.pageYOffset,
        scale: CAPTURE_SCALE,
        useCORS: true,
        allowTaint: true,
        logging: false,
        foreignObjectRendering: false,
      });
      snaps.push(snap);
    }
  } finally {
    iframe.remove();
  }

  const canvas = document.createElement("canvas");
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) {
    throw new Error("Canvas is not available.");
  }
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  const stream = canvas.captureStream(TARGET_FPS);
  const chunks: BlobPart[] = [];

  const recorderOptions: MediaRecorderOptions = {
    mimeType,
    videoBitsPerSecond,
  };

  let recorder: MediaRecorder;
  try {
    recorder = new MediaRecorder(stream, recorderOptions);
  } catch {
    recorder = new MediaRecorder(stream, { mimeType });
  }

  const blobPromise = new Promise<Blob>((resolve, reject) => {
    recorder.ondataavailable = (e) => {
      if (e.data.size) chunks.push(e.data);
    };
    recorder.onerror = () => reject(new Error("Video recording failed."));
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: mimeType.split(";")[0] || "video/webm" });
      resolve(blob);
    };
  });

  const frameIntervalMs = OUTPUT_VIDEO_MS / snaps.length;
  recorder.start(200);

  for (let i = 0; i < snaps.length; i++) {
    const snap = snaps[i];
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, outW, outH);
    ctx.drawImage(snap, 0, 0, outW, outH);
    await delay(frameIntervalMs);
  }

  recorder.stop();
  const blob = await blobPromise;

  if (!blob || blob.size < 100) {
    throw new Error("Recorded video is empty. Try again or use a simpler preview page.");
  }
  return blob;
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noreferrer";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
