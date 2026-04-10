/**
 * Client-only: records a short WebM of vertically scrolling through hosted prospect HTML
 * (iframe + html2canvas + MediaRecorder). Import only from client components.
 */

export type PreviewDeviceTypeForVideo = "MOBILE" | "DESKTOP" | null;

const DESKTOP_VIEW_W = 1280;
const DESKTOP_VIEW_H = 720;
const MOBILE_VIEW_W = 390;
const MOBILE_VIEW_H = 720;

/** Output video dimensions. */
const OUT_DESKTOP_W = 960;
const OUT_DESKTOP_H = 540;
const OUT_MOBILE_W = 312;
const OUT_MOBILE_H = 576;

/** Target playback duration for the exported WebM. */
const SCROLL_MS = 8000;
const TARGET_FPS = 10;
const POST_LOAD_SETTLE_MS = 400;

function pickVideoMimeType(): string {
  if (typeof MediaRecorder === "undefined") return "";
  const candidates = [
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8",
    "video/webm",
  ];
  for (const c of candidates) {
    if (MediaRecorder.isTypeSupported(c)) return c;
  }
  return "";
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function nextPaint(): Promise<void> {
  await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
}

export type RecordScrollVideoOptions = {
  html: string;
  deviceType: PreviewDeviceTypeForVideo;
};

/**
 * Builds a scroll-through WebM from full-document HTML (same as hosted preview).
 * Phase 1 captures frames (slow); phase 2 plays them to canvas at fixed FPS so the clip is ~SCROLL_MS long.
 */
export async function recordProspectPreviewScrollVideo(
  options: RecordScrollVideoOptions,
): Promise<Blob> {
  if (typeof window === "undefined" || typeof document === "undefined") {
    throw new Error("Scroll video recording runs in the browser only.");
  }

  const mimeType = pickVideoMimeType();
  if (!mimeType) {
    throw new Error(
      "WebM recording is not supported in this browser. Try Chrome or Edge for scroll video export.",
    );
  }

  const isMobile = options.deviceType === "MOBILE";
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

  const scrollRoot = doc.scrollingElement ?? doc.documentElement;
  const maxScroll = Math.max(0, scrollRoot.scrollHeight - capH);
  const totalFrames = Math.max(2, Math.ceil((SCROLL_MS / 1000) * TARGET_FPS));

  const captureEl = doc.documentElement;
  const snaps: HTMLCanvasElement[] = [];

  try {
    for (let frame = 0; frame < totalFrames; frame++) {
      const t = totalFrames <= 1 ? 0 : frame / (totalFrames - 1);
      const scrollTop = maxScroll * t;
      win.scrollTo(0, scrollTop);
      await nextPaint();

      const snap = await html2canvas(captureEl, {
        width: capW,
        height: capH,
        windowWidth: capW,
        windowHeight: capH,
        scrollX: 0,
        scrollY: -win.pageYOffset,
        scale: 0.85,
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
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas is not available.");
  }

  const stream = canvas.captureStream(TARGET_FPS);
  const chunks: BlobPart[] = [];
  const recorder = new MediaRecorder(stream, { mimeType });

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

  const frameIntervalMs = SCROLL_MS / totalFrames;
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
