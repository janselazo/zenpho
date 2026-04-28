import path from "node:path";
import { promises as fs } from "node:fs";
import {
  PDFDocument,
  PDFFont,
  PDFImage,
  PDFPage,
  StandardFonts,
  rgb,
  type RGB,
} from "pdf-lib";
import {
  BRANDING_FONT_PAIRINGS,
  getBrandingFontPairing,
  type BrandingFontPairing,
} from "@/lib/crm/branding-font-pairings";
import type { BrandingSpec } from "@/lib/crm/prospect-branding-spec-llm";

// ----------------------------------------------------------------------------
// Page geometry (landscape A4)
// ----------------------------------------------------------------------------
export const PAGE_W = 842;
export const PAGE_H = 595;
export const SAFE_MARGIN = 48;
export const GUTTER = 24;
export const CONTENT_W = PAGE_W - SAFE_MARGIN * 2;

// ----------------------------------------------------------------------------
// Color helpers
// ----------------------------------------------------------------------------

export type Rgb = [number, number, number];

export function hexToRgb(hex: string | null | undefined, fallback: Rgb = [0.1, 0.1, 0.1]): Rgb {
  const m = (hex ?? "").trim().match(/^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/);
  if (!m) return fallback;
  let h = m[1];
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  return [
    parseInt(h.slice(0, 2), 16) / 255,
    parseInt(h.slice(2, 4), 16) / 255,
    parseInt(h.slice(4, 6), 16) / 255,
  ];
}

export function rgbColor([r, g, b]: Rgb): RGB {
  return rgb(r, g, b);
}

/** Relative luminance per WCAG 2.1. */
function luminance(c: Rgb): number {
  const linearize = (x: number) => (x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4);
  const [r, g, b] = c.map(linearize);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Near-white or near-black text color that has the higher WCAG contrast against bg. */
export function contrastTextRgb(bg: Rgb): Rgb {
  return luminance(bg) > 0.5 ? [0.08, 0.08, 0.1] : [0.97, 0.97, 0.96];
}

export function mixRgb(a: Rgb, b: Rgb, t: number): Rgb {
  return [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t,
  ];
}

export function rgbToCmyk([r, g, b]: Rgb): [number, number, number, number] {
  const k = 1 - Math.max(r, g, b);
  if (k >= 1) return [0, 0, 0, 100];
  const c = (1 - r - k) / (1 - k);
  const m = (1 - g - k) / (1 - k);
  const y = (1 - b - k) / (1 - k);
  return [Math.round(c * 100), Math.round(m * 100), Math.round(y * 100), Math.round(k * 100)];
}

export function rgbToHsl([r, g, b]: Rgb): [number, number, number] {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      default:
        h = (r - g) / d + 4;
    }
    h /= 6;
  }
  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}

export function hexUpper(hex: string): string {
  const m = hex.trim().match(/^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/);
  if (!m) return "#111111";
  let h = m[1];
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  return `#${h.toUpperCase()}`;
}

// ----------------------------------------------------------------------------
// Text sanitation for embedded TTFs
// ----------------------------------------------------------------------------

/**
 * Strip codepoints the embedded latin TTFs don't ship glyphs for. Keeps:
 *   - Basic Latin (U+0020..U+007E)
 *   - Latin-1 Supplement (U+00A0..U+00FF)
 *   - Common typographic punctuation (smart quotes, dashes, bullet, ellipsis)
 *   - Tab / newline / CR
 * Everything else (emoji, CJK, etc.) becomes a space.
 */
const KEEP_EXTRA = new Set<number>([
  0x0152, 0x0153, 0x0178, 0x20ac,
  0x2013, 0x2014, 0x2018, 0x2019, 0x201c, 0x201d, 0x2022, 0x2026,
  0x00a9, 0x00ae, 0x2122,
  0x2713, 0x2717,
]);

export function sanitizeForBrandBook(input: string): string {
  let out = "";
  for (const ch of input) {
    const cp = ch.codePointAt(0) ?? 0;
    if (cp === 0x09 || cp === 0x0a || cp === 0x0d) {
      out += ch;
      continue;
    }
    if (cp >= 0x20 && cp <= 0x7e) {
      out += ch;
      continue;
    }
    if (cp >= 0xa0 && cp <= 0xff) {
      out += ch;
      continue;
    }
    if (KEEP_EXTRA.has(cp)) {
      out += ch;
      continue;
    }
    out += " ";
  }
  return out;
}

// ----------------------------------------------------------------------------
// Font loading
// ----------------------------------------------------------------------------

export type BrandBookFonts = {
  display: PDFFont;
  body: PDFFont;
  fallback: PDFFont;
  /** The pairing's metadata for specimen captions. */
  pairing: BrandingFontPairing;
};

async function readFontBytes(fileName: string): Promise<Uint8Array> {
  const fp = path.join(process.cwd(), "public", "fonts", "brand-book", fileName);
  const buf = await fs.readFile(fp);
  // pdf-lib accepts Uint8Array or ArrayBuffer.
  return new Uint8Array(buf);
}

/** Registers fontkit + embeds the pairing's TTFs on the given PDF document. */
export async function embedBrandBookFonts(
  pdf: PDFDocument,
  pairingId: string,
): Promise<BrandBookFonts> {
  // Dynamic require — @pdf-lib/fontkit is CJS/UMD and fails Turbopack static analysis.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const fontkit = require("@pdf-lib/fontkit");
  pdf.registerFontkit(fontkit.default ?? fontkit);
  const pairing = getBrandingFontPairing(pairingId);
  const [displayBytes, bodyBytes] = await Promise.all([
    readFontBytes(pairing.displayFile),
    readFontBytes(pairing.bodyFile),
  ]);
  const display = await pdf.embedFont(displayBytes, { subset: true });
  const body = await pdf.embedFont(bodyBytes, { subset: true });
  const fallback = await pdf.embedFont(StandardFonts.Helvetica);
  return { display, body, fallback, pairing };
}

// ----------------------------------------------------------------------------
// Page context
// ----------------------------------------------------------------------------

export type BrandBookContext = {
  pdf: PDFDocument;
  spec: BrandingSpec;
  fonts: BrandBookFonts;
  /** Primary brand color as rgb. */
  primary: Rgb;
  /** Second primary color (or mixed primary) for accents. */
  accent: Rgb;
  /** Neutral surface color (first secondary, or near-white). */
  surface: Rgb;
  /** Near-black ink color (auto-computed from primary, falls back to dark grey). */
  ink: Rgb;
};

export function buildContext(
  pdf: PDFDocument,
  spec: BrandingSpec,
  fonts: BrandBookFonts,
): BrandBookContext {
  const primary = hexToRgb(spec.primaryColors[0]?.hex, [0.09, 0.12, 0.2]);
  const accent = hexToRgb(
    spec.primaryColors[1]?.hex || spec.secondaryColors[0]?.hex,
    mixRgb(primary, [1, 1, 1], 0.5),
  );
  const neutralPick = spec.secondaryColors.find((c) => {
    const [, s, l] = rgbToHsl(hexToRgb(c.hex));
    return s < 15 && l > 85;
  });
  const surface = hexToRgb(
    neutralPick?.hex || spec.secondaryColors[0]?.hex || "#F7F6F2",
    [0.97, 0.96, 0.94],
  );
  return {
    pdf,
    spec,
    fonts,
    primary,
    accent,
    surface,
    ink: [0.08, 0.08, 0.1],
  };
}

// ----------------------------------------------------------------------------
// Text layout helpers (works with embedded fonts, measures widths accurately)
// ----------------------------------------------------------------------------

/** Wrap `text` to `maxWidth` using the font's glyph advances. Honors manual
 *  newlines and falls back to character-splitting for overlong words. */
export function wrapText(
  text: string,
  font: PDFFont,
  size: number,
  maxWidth: number,
): string[] {
  const safe = sanitizeForBrandBook(text);
  const paragraphs = safe.split(/\n/);
  const out: string[] = [];
  for (const para of paragraphs) {
    if (!para.trim()) {
      out.push("");
      continue;
    }
    const words = para.split(/\s+/);
    let line = "";
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      const w = font.widthOfTextAtSize(candidate, size);
      if (w <= maxWidth) {
        line = candidate;
        continue;
      }
      if (line) out.push(line);
      if (font.widthOfTextAtSize(word, size) > maxWidth) {
        // hard-split the word
        let chunk = "";
        for (const ch of word) {
          const cand = chunk + ch;
          if (font.widthOfTextAtSize(cand, size) > maxWidth) {
            if (chunk) out.push(chunk);
            chunk = ch;
          } else chunk = cand;
        }
        line = chunk;
      } else {
        line = word;
      }
    }
    if (line) out.push(line);
  }
  return out;
}

export type DrawTextOpts = {
  x: number;
  y: number;
  size: number;
  font: PDFFont;
  color: Rgb;
  lineGap?: number;
  maxWidth?: number;
  opacity?: number;
};

/** Draws wrapped text. Returns the y-coordinate after the last line (top-down
 *  cursor: the value is below the bottom of the final line by one line height). */
export function drawWrappedText(
  page: PDFPage,
  text: string,
  opts: DrawTextOpts,
): number {
  const maxWidth = opts.maxWidth ?? CONTENT_W;
  const lineGap = opts.lineGap ?? opts.size * 0.35;
  const lineHeight = opts.size + lineGap;
  const lines = wrapText(text, opts.font, opts.size, maxWidth);
  let y = opts.y;
  for (const line of lines) {
    page.drawText(line, {
      x: opts.x,
      y,
      size: opts.size,
      font: opts.font,
      color: rgbColor(opts.color),
      ...(opts.opacity != null ? { opacity: opts.opacity } : {}),
    });
    y -= lineHeight;
  }
  return y + lineGap;
}

/** Letter-spaced text — emulated by drawing one glyph at a time, since pdf-lib
 *  doesn't expose `characterSpacing` on `drawText`. Best used for short labels. */
export function drawTrackedText(
  page: PDFPage,
  text: string,
  opts: {
    x: number;
    y: number;
    size: number;
    font: PDFFont;
    color: Rgb;
    tracking?: number;
    opacity?: number;
  },
): number {
  const tracking = opts.tracking ?? opts.size * 0.12;
  let x = opts.x;
  const clean = sanitizeForBrandBook(text);
  for (const ch of clean) {
    page.drawText(ch, {
      x,
      y: opts.y,
      size: opts.size,
      font: opts.font,
      color: rgbColor(opts.color),
      ...(opts.opacity != null ? { opacity: opts.opacity } : {}),
    });
    x += opts.font.widthOfTextAtSize(ch, opts.size) + tracking;
  }
  return x;
}

// ----------------------------------------------------------------------------
// Page primitives
// ----------------------------------------------------------------------------

export function addBlankPage(pdf: PDFDocument, bg: Rgb = [1, 1, 1]): PDFPage {
  const page = pdf.addPage([PAGE_W, PAGE_H]);
  page.drawRectangle({
    x: 0,
    y: 0,
    width: PAGE_W,
    height: PAGE_H,
    color: rgbColor(bg),
    borderWidth: 0,
  });
  return page;
}

export function drawRunningFooter(
  page: PDFPage,
  ctx: BrandBookContext,
  opts: { pageNumber: number; sectionLabel: string; onDark?: boolean },
): void {
  const col = opts.onDark ? contrastTextRgb(ctx.primary) : ctx.ink;
  const y = 24;
  page.drawLine({
    start: { x: SAFE_MARGIN, y: y + 14 },
    end: { x: PAGE_W - SAFE_MARGIN, y: y + 14 },
    thickness: 0.5,
    color: rgbColor(col),
    opacity: 0.25,
  });
  const leftText = sanitizeForBrandBook(
    `${ctx.spec.brandName || "Brand"}  ·  Brand Guidelines`,
  ).toUpperCase();
  page.drawText(leftText, {
    x: SAFE_MARGIN,
    y,
    size: 7.5,
    font: ctx.fonts.body,
    color: rgbColor(col),
  });
  const rightText = sanitizeForBrandBook(
    `${opts.sectionLabel.toUpperCase()}  ·  ${String(opts.pageNumber).padStart(2, "0")}`,
  );
  const rightW = ctx.fonts.body.widthOfTextAtSize(rightText, 7.5);
  page.drawText(rightText, {
    x: PAGE_W - SAFE_MARGIN - rightW,
    y,
    size: 7.5,
    font: ctx.fonts.body,
    color: rgbColor(col),
  });
}

export function drawSectionEyebrow(
  page: PDFPage,
  ctx: BrandBookContext,
  { x, y, label, color }: { x: number; y: number; label: string; color?: Rgb },
): void {
  page.drawText(sanitizeForBrandBook(label.toUpperCase()), {
    x,
    y,
    size: 9,
    font: ctx.fonts.body,
    color: rgbColor(color ?? ctx.primary),
  });
}

export function drawPageTitle(
  page: PDFPage,
  ctx: BrandBookContext,
  {
    x,
    y,
    text,
    size = 44,
    color,
    maxWidth,
  }: { x: number; y: number; text: string; size?: number; color?: Rgb; maxWidth?: number },
): number {
  return drawWrappedText(page, text, {
    x,
    y,
    size,
    font: ctx.fonts.display,
    color: color ?? ctx.ink,
    lineGap: size * 0.12,
    maxWidth: maxWidth ?? CONTENT_W,
  });
}

// ----------------------------------------------------------------------------
// Cover page
// ----------------------------------------------------------------------------

export async function drawCoverPage(
  ctx: BrandBookContext,
  coverImage: PDFImage | null,
): Promise<PDFPage> {
  const page = addBlankPage(ctx.pdf, ctx.primary);
  const fg = contrastTextRgb(ctx.primary);

  if (coverImage) {
    const img = coverImage;
    const scale = Math.max(PAGE_W / img.width, PAGE_H / img.height);
    const w = img.width * scale;
    const h = img.height * scale;
    page.drawImage(img, {
      x: (PAGE_W - w) / 2,
      y: (PAGE_H - h) / 2,
      width: w,
      height: h,
      opacity: 0.88,
    });
    page.drawRectangle({
      x: 0,
      y: 0,
      width: PAGE_W,
      height: PAGE_H,
      color: rgbColor(ctx.primary),
      opacity: 0.45,
    });
  }

  drawSectionEyebrow(page, ctx, {
    x: SAFE_MARGIN,
    y: PAGE_H - SAFE_MARGIN - 4,
    label: "Brand Guidelines",
    color: fg,
  });

  const titleSize = 96;
  const brand = sanitizeForBrandBook(ctx.spec.brandName || "Brand");
  const titleLines = wrapText(brand, ctx.fonts.display, titleSize, PAGE_W - SAFE_MARGIN * 2);
  let y = PAGE_H / 2 + (titleLines.length * titleSize) / 2 - titleSize * 0.75;
  for (const line of titleLines) {
    page.drawText(line, {
      x: SAFE_MARGIN,
      y,
      size: titleSize,
      font: ctx.fonts.display,
      color: rgbColor(fg),
    });
    y -= titleSize * 1.05;
  }

  if (ctx.spec.tagline) {
    drawWrappedText(page, ctx.spec.tagline, {
      x: SAFE_MARGIN,
      y: y - 4,
      size: 20,
      font: ctx.fonts.body,
      color: fg,
      maxWidth: (PAGE_W - SAFE_MARGIN * 2) * 0.75,
      lineGap: 6,
    });
  }

  const date = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const footer = sanitizeForBrandBook(
    `${ctx.spec.industry || "Local business"}  ·  ${date}`,
  ).toUpperCase();
  page.drawText(footer, {
    x: SAFE_MARGIN,
    y: 36,
    size: 8.5,
    font: ctx.fonts.body,
    color: rgbColor(fg),
  });

  return page;
}

// ----------------------------------------------------------------------------
// Pull quote + two-column body
// ----------------------------------------------------------------------------

export function drawPullQuote(
  page: PDFPage,
  ctx: BrandBookContext,
  { x, y, text, width, size = 30 }: { x: number; y: number; text: string; width: number; size?: number },
): number {
  const quoteMark = `\u201C`;
  page.drawText(quoteMark, {
    x,
    y: y + size * 0.05,
    size: size * 2.2,
    font: ctx.fonts.display,
    color: rgbColor(ctx.primary),
    opacity: 0.18,
  });
  return drawWrappedText(page, text, {
    x: x + 6,
    y: y - size * 0.3,
    size,
    font: ctx.fonts.display,
    color: ctx.ink,
    maxWidth: width,
    lineGap: size * 0.18,
  });
}

export function drawTwoColumnBody(
  page: PDFPage,
  ctx: BrandBookContext,
  {
    x,
    y,
    width,
    text,
    size = 10.5,
    gutter = 24,
    color,
    maxLines,
  }: {
    x: number;
    y: number;
    width: number;
    text: string;
    size?: number;
    gutter?: number;
    color?: Rgb;
    maxLines?: number;
  },
): void {
  const colW = (width - gutter) / 2;
  const lines = wrapText(text, ctx.fonts.body, size, colW);
  const lineH = size * 1.5;
  const totalLines = maxLines
    ? Math.min(lines.length, maxLines * 2)
    : lines.length;
  const perCol = Math.ceil(totalLines / 2);
  const col1 = lines.slice(0, perCol);
  const col2 = lines.slice(perCol, totalLines);
  const cLeft = color ?? ctx.ink;
  let yi = y;
  for (const line of col1) {
    page.drawText(line, {
      x,
      y: yi,
      size,
      font: ctx.fonts.body,
      color: rgbColor(cLeft),
    });
    yi -= lineH;
  }
  let yj = y;
  for (const line of col2) {
    page.drawText(line, {
      x: x + colW + gutter,
      y: yj,
      size,
      font: ctx.fonts.body,
      color: rgbColor(cLeft),
    });
    yj -= lineH;
  }
}

// ----------------------------------------------------------------------------
// Full-page color chip
// ----------------------------------------------------------------------------

export function drawColorChipFullPage(
  ctx: BrandBookContext,
  color: { name: string; hex: string },
  opts: { pageNumber: number; sectionLabel: string; totalLabel?: string },
): PDFPage {
  const bg = hexToRgb(color.hex);
  const fg = contrastTextRgb(bg);
  const page = addBlankPage(ctx.pdf, bg);

  drawSectionEyebrow(page, ctx, {
    x: SAFE_MARGIN,
    y: PAGE_H - SAFE_MARGIN - 4,
    label: opts.totalLabel ?? "Color",
    color: fg,
  });

  // huge hex block
  const hexText = hexUpper(color.hex).replace("#", "");
  const hexSize = 140;
  const hexY = PAGE_H / 2 - 20;
  page.drawText(`#`, {
    x: SAFE_MARGIN,
    y: hexY + hexSize * 0.55,
    size: hexSize * 0.45,
    font: ctx.fonts.display,
    color: rgbColor(fg),
    opacity: 0.6,
  });
  page.drawText(hexText, {
    x: SAFE_MARGIN + hexSize * 0.4,
    y: hexY,
    size: hexSize,
    font: ctx.fonts.display,
    color: rgbColor(fg),
  });

  page.drawText(sanitizeForBrandBook(color.name), {
    x: SAFE_MARGIN,
    y: hexY - 48,
    size: 24,
    font: ctx.fonts.display,
    color: rgbColor(fg),
  });

  // sidebar with RGB / CMYK / HSL stacked
  const [r, g, b] = hexToRgb(color.hex);
  const [c, m, yy, kk] = rgbToCmyk([r, g, b]);
  const [hh, ss, ll] = rgbToHsl([r, g, b]);
  const specs = [
    { label: "HEX", value: hexUpper(color.hex) },
    {
      label: "RGB",
      value: `${Math.round(r * 255)} · ${Math.round(g * 255)} · ${Math.round(b * 255)}`,
    },
    { label: "CMYK", value: `${c} · ${m} · ${yy} · ${kk}` },
    { label: "HSL", value: `${hh}° · ${ss}% · ${ll}%` },
  ];
  let sy = PAGE_H - SAFE_MARGIN - 40;
  const sx = PAGE_W - SAFE_MARGIN - 180;
  for (const s of specs) {
    page.drawText(s.label, {
      x: sx,
      y: sy,
      size: 8,
      font: ctx.fonts.body,
      color: rgbColor(fg),
      opacity: 0.7,
    });
    page.drawText(s.value, {
      x: sx,
      y: sy - 14,
      size: 12,
      font: ctx.fonts.body,
      color: rgbColor(fg),
    });
    sy -= 40;
  }

  drawRunningFooter(page, ctx, {
    pageNumber: opts.pageNumber,
    sectionLabel: opts.sectionLabel,
    onDark: luminance(bg) < 0.5,
  });
  return page;
}

// ----------------------------------------------------------------------------
// Color ratio bar (60/30/10 visualization)
// ----------------------------------------------------------------------------

export function drawColorRatioBar(
  page: PDFPage,
  ctx: BrandBookContext,
  {
    x,
    y,
    width,
    height,
  }: { x: number; y: number; width: number; height: number },
): void {
  const spec = ctx.spec;
  const ratio = spec.colorRatio;
  const segments: { color: Rgb; label: string; pct: number }[] = [
    {
      color: hexToRgb(spec.primaryColors[0]?.hex, ctx.primary),
      label: `${spec.primaryColors[0]?.name || "Primary"}`,
      pct: ratio.primaryPct,
    },
    {
      color: hexToRgb(
        spec.secondaryColors[0]?.hex || spec.primaryColors[1]?.hex,
        ctx.surface,
      ),
      label: `${spec.secondaryColors[0]?.name || spec.primaryColors[1]?.name || "Secondary"}`,
      pct: ratio.secondaryPct,
    },
    {
      color: hexToRgb(
        spec.primaryColors[1]?.hex || spec.secondaryColors[1]?.hex,
        ctx.accent,
      ),
      label: `${spec.primaryColors[1]?.name || spec.secondaryColors[1]?.name || "Accent"}`,
      pct: ratio.accentPct,
    },
  ];

  let cx = x;
  for (const seg of segments) {
    const w = (seg.pct / 100) * width;
    page.drawRectangle({
      x: cx,
      y,
      width: w,
      height,
      color: rgbColor(seg.color),
    });
    const fg = contrastTextRgb(seg.color);
    const lblText = sanitizeForBrandBook(`${seg.pct}%`);
    const lblSize = 22;
    const lblW = ctx.fonts.display.widthOfTextAtSize(lblText, lblSize);
    if (w > lblW + 16) {
      page.drawText(lblText, {
        x: cx + 14,
        y: y + height / 2 - lblSize / 3,
        size: lblSize,
        font: ctx.fonts.display,
        color: rgbColor(fg),
      });
      const nameSize = 9;
      page.drawText(sanitizeForBrandBook(seg.label).toUpperCase(), {
        x: cx + 14,
        y: y + 12,
        size: nameSize,
        font: ctx.fonts.body,
        color: rgbColor(fg),
        opacity: 0.85,
      });
    }
    cx += w;
  }
}

// ----------------------------------------------------------------------------
// Type specimen
// ----------------------------------------------------------------------------

export function drawTypeSpecimen(
  page: PDFPage,
  ctx: BrandBookContext,
  { x, y, width }: { x: number; y: number; width: number },
): void {
  const { display, body, pairing } = ctx.fonts;

  page.drawText("Aa", {
    x,
    y: y - 180,
    size: 240,
    font: display,
    color: rgbColor(ctx.primary),
  });

  const nameX = x + 260;
  let ny = y;
  drawSectionEyebrow(page, ctx, {
    x: nameX,
    y: ny,
    label: "Display",
    color: ctx.primary,
  });
  ny -= 22;
  page.drawText(sanitizeForBrandBook(pairing.displayFamily), {
    x: nameX,
    y: ny,
    size: 28,
    font: display,
    color: rgbColor(ctx.ink),
  });
  ny -= 48;
  drawSectionEyebrow(page, ctx, {
    x: nameX,
    y: ny,
    label: "Body",
    color: ctx.primary,
  });
  ny -= 22;
  page.drawText(sanitizeForBrandBook(pairing.bodyFamily), {
    x: nameX,
    y: ny,
    size: 22,
    font: body,
    color: rgbColor(ctx.ink),
  });
  ny -= 40;
  drawWrappedText(
    page,
    "Pack my box with five dozen liquor jugs — 0123456789. Whereas disregard and contempt for human rights have resulted in barbarous acts which have outraged the conscience of mankind.",
    {
      x: nameX,
      y: ny,
      size: 11,
      font: body,
      color: ctx.ink,
      maxWidth: width - 260,
      lineGap: 5,
    },
  );
}

export function drawTypeScale(
  page: PDFPage,
  ctx: BrandBookContext,
  { x, y, width }: { x: number; y: number; width: number },
): number {
  const steps: { size: number; label: string; text: string; font: PDFFont }[] = [
    { size: 56, label: "H1 / Display", text: "Headline", font: ctx.fonts.display },
    { size: 36, label: "H2 / Title", text: "Section title", font: ctx.fonts.display },
    { size: 22, label: "H3 / Subtitle", text: "Subsection", font: ctx.fonts.display },
    { size: 13, label: "Body", text: "Body copy at comfortable reading size.", font: ctx.fonts.body },
    { size: 9, label: "Caption", text: "Small caption / legal / microcopy.", font: ctx.fonts.body },
  ];
  let yi = y;
  for (const step of steps) {
    page.drawText(step.label.toUpperCase(), {
      x,
      y: yi,
      size: 7.5,
      font: ctx.fonts.body,
      color: rgbColor(ctx.primary),
    });
    page.drawText(sanitizeForBrandBook(step.text), {
      x: x + 150,
      y: yi - step.size * 0.08,
      size: step.size,
      font: step.font,
      color: rgbColor(ctx.ink),
      maxWidth: width - 150,
    });
    yi -= step.size + 22;
  }
  return yi;
}

// ----------------------------------------------------------------------------
// Card rendering (used on tone-of-voice, dos/donts, merch)
// ----------------------------------------------------------------------------

export function drawCard(
  page: PDFPage,
  ctx: BrandBookContext,
  {
    x,
    y,
    width,
    height,
    eyebrow,
    title,
    body,
    accent,
  }: {
    x: number;
    y: number;
    width: number;
    height: number;
    eyebrow?: string;
    title?: string;
    body?: string;
    accent?: Rgb;
  },
): void {
  page.drawRectangle({
    x,
    y,
    width,
    height,
    color: rgbColor([0.99, 0.98, 0.97]),
    borderColor: rgbColor([0.88, 0.87, 0.85]),
    borderWidth: 0.75,
  });
  if (accent) {
    page.drawRectangle({
      x,
      y: y + height - 4,
      width,
      height: 4,
      color: rgbColor(accent),
    });
  }
  const padX = 16;
  let yy = y + height - 28;
  if (eyebrow) {
    drawSectionEyebrow(page, ctx, {
      x: x + padX,
      y: yy,
      label: eyebrow,
      color: accent ?? ctx.primary,
    });
    yy -= 20;
  }
  if (title) {
    const titleWidth = width - padX * 2;
    let titleSize = 16;
    let titleLines = wrapText(title, ctx.fonts.display, titleSize, titleWidth);
    if (titleLines.length > 2) {
      titleSize = 14;
      titleLines = wrapText(title, ctx.fonts.display, titleSize, titleWidth);
    }
    const visibleTitleLines = titleLines.slice(0, 3);
    const titleLineHeight = titleSize + 5;
    visibleTitleLines.forEach((line, idx) => {
      page.drawText(line, {
        x: x + padX,
        y: yy - 4 - idx * titleLineHeight,
        size: titleSize,
        font: ctx.fonts.display,
        color: rgbColor(ctx.ink),
      });
    });
    yy -= visibleTitleLines.length * titleLineHeight + 10;
  }
  if (body) {
    drawWrappedText(page, body, {
      x: x + padX,
      y: yy,
      size: 10,
      font: ctx.fonts.body,
      color: ctx.ink,
      maxWidth: width - padX * 2,
      lineGap: 4,
    });
  }
}

// ----------------------------------------------------------------------------
// Image embedding
// ----------------------------------------------------------------------------

export async function embedPngIfAny(
  pdf: PDFDocument,
  buf: Buffer | null,
): Promise<PDFImage | null> {
  if (!buf) return null;
  try {
    return await pdf.embedPng(buf);
  } catch {
    try {
      return await pdf.embedJpg(buf);
    } catch {
      return null;
    }
  }
}

export function drawImageFit(
  page: PDFPage,
  img: PDFImage,
  rect: { x: number; y: number; width: number; height: number },
  mode: "contain" | "cover" = "contain",
): void {
  const ratio = img.width / img.height;
  const boxRatio = rect.width / rect.height;
  let w = rect.width;
  let h = rect.height;
  if (mode === "contain") {
    if (ratio > boxRatio) {
      h = rect.width / ratio;
    } else {
      w = rect.height * ratio;
    }
  } else {
    if (ratio > boxRatio) {
      w = rect.height * ratio;
    } else {
      h = rect.width / ratio;
    }
  }
  page.drawImage(img, {
    x: rect.x + (rect.width - w) / 2,
    y: rect.y + (rect.height - h) / 2,
    width: w,
    height: h,
  });
}

/** Draws an "image placeholder" rectangle with a dashed outline and a label — used
 *  when `gpt-image-2` fails to return the image for a slot so the page still flows. */
export function drawImagePlaceholder(
  page: PDFPage,
  ctx: BrandBookContext,
  { x, y, width, height, label }: {
    x: number;
    y: number;
    width: number;
    height: number;
    label: string;
  },
): void {
  page.drawRectangle({
    x,
    y,
    width,
    height,
    color: rgbColor([0.96, 0.95, 0.93]),
    borderColor: rgbColor(ctx.primary),
    borderWidth: 0.75,
    borderDashArray: [4, 4],
    opacity: 0.9,
  });
  const size = 11;
  const lines = wrapText(label, ctx.fonts.body, size, width - 40);
  let yy = y + height / 2 + (lines.length * size) / 2;
  for (const line of lines) {
    const w = ctx.fonts.body.widthOfTextAtSize(line, size);
    page.drawText(line, {
      x: x + (width - w) / 2,
      y: yy,
      size,
      font: ctx.fonts.body,
      color: rgbColor(ctx.ink),
      opacity: 0.7,
    });
    yy -= size * 1.4;
  }
}

// ----------------------------------------------------------------------------
// Exported pairing registry for discoverability
// ----------------------------------------------------------------------------

export { BRANDING_FONT_PAIRINGS };
