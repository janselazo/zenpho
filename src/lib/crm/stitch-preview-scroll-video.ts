/**
 * Client-only: short WebM of scrolling through the hosted prospect homepage preview
 * (iframe + html2canvas + MediaRecorder). Tuned for prospect outreach: polished scroll
 * with intro/outro holds, eased motion, and sharp capture.
 */

export type PreviewDeviceTypeForVideo = "MOBILE" | "DESKTOP" | null;

const DESKTOP_VIEW_W = 1280;
const DESKTOP_VIEW_H = 720;
const MOBILE_VIEW_W = 390;
const MOBILE_VIEW_H = 720;

const OUT_DESKTOP_W = 1280;
const OUT_DESKTOP_H = 720;
const OUT_MOBILE_W = 540;
const OUT_MOBILE_H = 960;

const OUTPUT_VIDEO_MS = 15_000;

const CAPTURE_FRAMES_MIN = 35;
const CAPTURE_FRAMES_MAX = 60;

const TARGET_FPS = 20;
const POST_LOAD_SETTLE_MS = 500;

const VIDEO_BITRATE_DESKTOP_BPS = 3_000_000;
const VIDEO_BITRATE_MOBILE_BPS = 1_800_000;

/** html2canvas resolution multiplier — 1.5 for sharper text rendering on Stitch designs. */
const CAPTURE_SCALE = 1.5;

/** Intro hold: show the hero for this many ms before scrolling begins. */
const INTRO_HOLD_MS = 2_000;
/** Outro hold: hold the final frame for this many ms after scrolling ends. */
const OUTRO_HOLD_MS = 2_000;

/** Public for UI. */
export const PROSPECT_PREVIEW_VIDEO_DURATION_SEC = Math.round(OUTPUT_VIDEO_MS / 1000);

export const PROSPECT_PREVIEW_VIDEO_EMAIL_HINT =
  `${PROSPECT_PREVIEW_VIDEO_DURATION_SEC}s homepage walkthrough (WebM) with intro/outro holds — attach to email or convert to MP4 for universal playback.`;

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

/** Cosine ease-in-out: starts slow, accelerates, then decelerates. */
function easeInOut(t: number): number {
  return 0.5 - 0.5 * Math.cos(Math.PI * t);
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
  const density = Math.ceil(maxScroll / 100);
  return Math.min(CAPTURE_FRAMES_MAX, Math.max(CAPTURE_FRAMES_MIN, density));
}

export type RecordScrollVideoOptions = {
  html: string;
  deviceType: PreviewDeviceTypeForVideo;
};

/**
 * Scroll-through WebM with intro/outro holds and eased scroll motion.
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
    const loadTimeout = setTimeout(() => {
      iframe.remove();
      reject(new Error("Preview iframe timed out after 30 s."));
    }, 30_000);
    iframe.onload = () => { clearTimeout(loadTimeout); resolve(); };
    iframe.onerror = () => { clearTimeout(loadTimeout); reject(new Error("Preview iframe failed to load.")); };
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
      const rawT = totalFrames <= 1 ? 0 : frame / (totalFrames - 1);
      const easedT = easeInOut(rawT);
      const scrollTop = scrollStart + maxScroll * easedT;
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

  const scrollDurationMs = OUTPUT_VIDEO_MS - INTRO_HOLD_MS - OUTRO_HOLD_MS;
  const frameIntervalMs = scrollDurationMs / Math.max(snaps.length - 1, 1);
  recorder.start(200);

  // Intro hold: show hero for a beat
  const firstSnap = snaps[0];
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, outW, outH);
  ctx.drawImage(firstSnap, 0, 0, outW, outH);
  await delay(INTRO_HOLD_MS);

  // Scroll through captured frames with eased timing
  for (let i = 0; i < snaps.length; i++) {
    const snap = snaps[i];
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, outW, outH);
    ctx.drawImage(snap, 0, 0, outW, outH);
    if (i < snaps.length - 1) {
      await delay(frameIntervalMs);
    }
  }

  // Outro hold: linger on the final view
  await delay(OUTRO_HOLD_MS);

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
