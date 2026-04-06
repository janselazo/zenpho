/**
 * Outer shell for MOBILE prospect previews: constrains Stitch HTML to a phone-width
 * viewport so `position: fixed` footers and %-width layouts match the Stitch canvas.
 */

function escapeHtmlAttr(url: string): string {
  return url
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Full HTML document that embeds the raw preview URL in a fixed-width iframe. */
export function buildMobilePreviewFrameDocument(innerPreviewUrl: string): string {
  const src = escapeHtmlAttr(innerPreviewUrl);
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="robots" content="noindex,nofollow" />
  <title>Mobile preview</title>
  <style>
    html, body { height: 100%; margin: 0; background: #0c0c0f; }
    .zenpho-preview-frame-root {
      min-height: 100%;
      display: flex;
      justify-content: center;
      align-items: flex-start;
      padding: max(12px, env(safe-area-inset-top)) 12px 28px;
      box-sizing: border-box;
    }
    .zenpho-preview-device {
      width: 390px;
      max-width: 100%;
      height: min(844px, calc(100vh - 56px));
      border-radius: 36px;
      overflow: hidden;
      box-shadow: 0 24px 80px rgba(0, 0, 0, 0.5);
      border: 10px solid #222228;
      background: #000;
      box-sizing: border-box;
    }
    .zenpho-preview-device iframe {
      width: 100%;
      height: 100%;
      border: 0;
      display: block;
      background: #fff;
    }
  </style>
</head>
<body>
  <div class="zenpho-preview-frame-root">
    <div class="zenpho-preview-device" role="presentation">
      <iframe src="${src}" title="Prospect mobile preview"></iframe>
    </div>
  </div>
</body>
</html>`;
}
