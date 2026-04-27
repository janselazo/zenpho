"use server";

import { PDFDocument, degrees } from "pdf-lib";
import type { MarketIntelReport } from "@/lib/crm/prospect-intel-report";
import type { PlacesSearchPlace } from "@/lib/crm/places-types";
import { requireAgencyStaff } from "@/app/(crm)/actions/prospect-preview-agency";
import {
  generateBrandingSpec,
  type BrandingSpec,
  type ExtractedBrandPalette,
} from "@/lib/crm/prospect-branding-spec-llm";
import {
  generateBrandingImages,
  type BrandingImages,
} from "@/lib/crm/prospect-branding-image-gen";
import {
  generateAdsFunnelSpec,
  type AdsFunnelSpec,
} from "@/lib/crm/prospect-ads-funnel-spec-llm";
import {
  generateAdsFunnelImages,
  type AdsImages,
} from "@/lib/crm/prospect-ads-image-gen";
import { resolveProspectBrandAssets } from "@/lib/crm/prospect-branding-asset-resolve";
import {
  classifyProspectVertical,
  verticalLabel,
  type ProspectVertical,
} from "@/lib/crm/prospect-vertical-classify";
import { uploadBrandingFunnelPdf } from "@/lib/crm/branding-funnel-pdf-storage";
import {
  PAGE_W,
  PAGE_H,
  SAFE_MARGIN,
  CONTENT_W,
  addBlankPage,
  buildContext,
  drawCoverPage,
  drawCard,
  drawColorChipFullPage,
  drawColorRatioBar,
  drawImageFit,
  drawImagePlaceholder,
  drawPageTitle,
  drawPullQuote,
  drawRunningFooter,
  drawSectionEyebrow,
  drawTypeScale,
  drawTypeSpecimen,
  drawWrappedText,
  embedBrandBookFonts,
  embedPngIfAny,
  hexToRgb,
  mixRgb,
  rgbColor,
  sanitizeForBrandBook,
  wrapText,
  type BrandBookContext,
  type Rgb,
} from "@/lib/crm/pdf-brand-book";

// NOTE: `export const maxDuration = 300` cannot live in a "use server" file —
// Next.js only allows async function exports, so we configure the timeout in
// `vercel.json` (function pattern matches this action's compiled output) and
// at the route level for any page that invokes this action.

// ----------------------------------------------------------------------------
// Page builders
// ----------------------------------------------------------------------------

function drawBrandStoryPage(ctx: BrandBookContext, pageNumber: number): void {
  const page = addBlankPage(ctx.pdf, [0.99, 0.98, 0.96]);
  drawSectionEyebrow(page, ctx, {
    x: SAFE_MARGIN,
    y: PAGE_H - SAFE_MARGIN,
    label: "01 · Brand story",
  });
  drawPageTitle(page, ctx, {
    x: SAFE_MARGIN,
    y: PAGE_H - SAFE_MARGIN - 18,
    text: "Why we exist.",
    size: 56,
  });

  const half = (CONTENT_W - 48) / 2;
  drawPullQuote(page, ctx, {
    x: SAFE_MARGIN,
    y: PAGE_H - SAFE_MARGIN - 120,
    text: ctx.spec.mission || "Our mission in one line.",
    width: half,
    size: 26,
  });

  drawSectionEyebrow(page, ctx, {
    x: SAFE_MARGIN + half + 48,
    y: PAGE_H - SAFE_MARGIN - 120,
    label: "Our story",
  });
  drawWrappedText(page, ctx.spec.brandStory || "", {
    x: SAFE_MARGIN + half + 48,
    y: PAGE_H - SAFE_MARGIN - 140,
    size: 11,
    font: ctx.fonts.body,
    color: ctx.ink,
    maxWidth: half,
    lineGap: 5,
  });

  if (ctx.spec.industry) {
    const pill = sanitizeForBrandBook(ctx.spec.industry.toUpperCase());
    const pw = ctx.fonts.body.widthOfTextAtSize(pill, 8.5);
    page.drawRectangle({
      x: PAGE_W - SAFE_MARGIN - pw - 22,
      y: PAGE_H - SAFE_MARGIN - 2,
      width: pw + 22,
      height: 22,
      color: rgbColor(ctx.primary),
    });
    page.drawText(pill, {
      x: PAGE_W - SAFE_MARGIN - pw - 11,
      y: PAGE_H - SAFE_MARGIN + 5,
      size: 8.5,
      font: ctx.fonts.body,
      color: rgbColor([1, 1, 1]),
    });
  }

  drawRunningFooter(page, ctx, { pageNumber, sectionLabel: "Brand story" });
}

function drawPersonalityPage(ctx: BrandBookContext, pageNumber: number): void {
  const page = addBlankPage(ctx.pdf, [1, 1, 1]);
  drawSectionEyebrow(page, ctx, {
    x: SAFE_MARGIN,
    y: PAGE_H - SAFE_MARGIN,
    label: "02 · Personality",
  });
  drawPageTitle(page, ctx, {
    x: SAFE_MARGIN,
    y: PAGE_H - SAFE_MARGIN - 18,
    text: "How we show up.",
    size: 56,
  });

  const traits = ctx.spec.brandPersonality.slice(0, 3);
  const cardCount = Math.max(traits.length, 1);
  const gap = 24;
  const cardW = (CONTENT_W - gap * (cardCount - 1)) / cardCount;
  const cardH = 210;
  const cardY = SAFE_MARGIN + 60;

  for (let i = 0; i < cardCount; i++) {
    const trait = traits[i] || "—";
    drawCard(page, ctx, {
      x: SAFE_MARGIN + i * (cardW + gap),
      y: cardY,
      width: cardW,
      height: cardH,
      eyebrow: `0${i + 1}`,
      title: trait,
      body:
        i === 0
          ? `Lead with this every time you write, design, or speak as ${ctx.spec.brandName}.`
          : i === 1
            ? `Use in moments where the brand has room to breathe — long-form copy, campaigns.`
            : `Reserve for moments of delight — packaging, social cameos, micro-copy.`,
      accent: ctx.primary,
    });
  }

  if (ctx.spec.targetAudience) {
    drawSectionEyebrow(page, ctx, {
      x: SAFE_MARGIN,
      y: SAFE_MARGIN + 320,
      label: "For",
    });
    drawWrappedText(page, ctx.spec.targetAudience, {
      x: SAFE_MARGIN,
      y: SAFE_MARGIN + 300,
      size: 16,
      font: ctx.fonts.display,
      color: ctx.ink,
      maxWidth: CONTENT_W,
      lineGap: 6,
    });
  }

  drawRunningFooter(page, ctx, { pageNumber, sectionLabel: "Personality" });
}

// ----------------------------------------------------------------------------
// Sales Funnel section
// ----------------------------------------------------------------------------

type FunnelComposeInput = {
  spec: AdsFunnelSpec;
  images: AdsImages;
  vertical: ProspectVertical;
};

function emptyBrandingImages(reason?: string): BrandingImages {
  const errors: BrandingImages["errors"] = reason
    ? {
        cover: reason,
        "logo-wordmark": reason,
        "logo-icon": reason,
        "logo-emblem": reason,
        moodboard: reason,
        pattern: reason,
        merch: reason,
      }
    : {};
  return {
    cover: null,
    logos: [null, null, null],
    moodboard: null,
    pattern: null,
    merch: null,
    errors,
  };
}

function shouldGenerateLegacyBrandImages(): boolean {
  return (
    (process.env.BRANDING_GENERATE_LEGACY_IMAGES || "")
      .trim()
      .toLowerCase() === "true"
  );
}

/** Draws a small platform pill (e.g. "Facebook" / "Instagram" / "Google"). */
function drawPlatformPill(
  page: import("pdf-lib").PDFPage,
  ctx: BrandBookContext,
  { x, y, label, color }: { x: number; y: number; label: string; color?: Rgb },
): { width: number; height: number } {
  const text = sanitizeForBrandBook(label.toUpperCase());
  const size = 8.5;
  const padX = 10;
  const height = 18;
  const w = ctx.fonts.body.widthOfTextAtSize(text, size);
  const width = w + padX * 2;
  const fill = color ?? ctx.primary;
  page.drawRectangle({
    x,
    y,
    width,
    height,
    color: rgbColor(fill),
  });
  page.drawText(text, {
    x: x + padX,
    y: y + 5,
    size,
    font: ctx.fonts.body,
    color: rgbColor([1, 1, 1]),
  });
  return { width, height };
}

/** Filled CTA chip (used for ad mocks + landing page). */
function drawCtaChip(
  page: import("pdf-lib").PDFPage,
  ctx: BrandBookContext,
  { x, y, label, color }: { x: number; y: number; label: string; color?: Rgb },
): number {
  const text = sanitizeForBrandBook(label || "Learn more");
  const size = 10;
  const padX = 14;
  const height = 26;
  const w = ctx.fonts.body.widthOfTextAtSize(text, size);
  const width = w + padX * 2;
  page.drawRectangle({
    x,
    y,
    width,
    height,
    color: rgbColor(color ?? ctx.primary),
  });
  page.drawText(text, {
    x: x + padX,
    y: y + 8,
    size,
    font: ctx.fonts.body,
    color: rgbColor([1, 1, 1]),
  });
  return width;
}

/** Renders an ad image inside a phone-style mock frame. Falls back to a
 *  placeholder when the image is missing. */
async function drawAdMock(
  ctx: BrandBookContext,
  page: import("pdf-lib").PDFPage,
  buf: Buffer | null,
  rect: { x: number; y: number; width: number; height: number },
  label: string,
): Promise<void> {
  page.drawRectangle({
    x: rect.x - 6,
    y: rect.y - 6,
    width: rect.width + 12,
    height: rect.height + 12,
    color: rgbColor([0.97, 0.96, 0.94]),
    borderColor: rgbColor([0.85, 0.84, 0.82]),
    borderWidth: 0.5,
  });
  const img = await embedPngIfAny(ctx.pdf, buf);
  if (img) {
    drawImageFit(page, img, rect, "cover");
  } else {
    drawImagePlaceholder(page, ctx, { ...rect, label });
  }
}

async function drawFunnelSection(
  ctx: BrandBookContext,
  funnel: FunnelComposeInput,
  nextPage: (label: string) => number,
): Promise<void> {
  const { spec: f, images, vertical } = funnel;
  const accent = ctx.accent;

  // ---- 1. Section divider -------------------------------------------------
  {
    const pageNum = nextPage("Sales funnel");
    const page = addBlankPage(ctx.pdf, ctx.primary);
    const fg = [0.98, 0.97, 0.94] as Rgb;

    drawSectionEyebrow(page, ctx, {
      x: SAFE_MARGIN,
      y: PAGE_H - SAFE_MARGIN,
      label: "06 · Sales funnel",
      color: fg,
    });
    drawPageTitle(page, ctx, {
      x: SAFE_MARGIN,
      y: PAGE_H - SAFE_MARGIN - 28,
      text: "From awareness\nto revenue.",
      size: 64,
      color: fg,
      maxWidth: CONTENT_W * 0.85,
    });

    drawWrappedText(page, f.funnelStrategy.awareness || "", {
      x: SAFE_MARGIN,
      y: SAFE_MARGIN + 140,
      size: 13,
      font: ctx.fonts.body,
      color: fg,
      maxWidth: CONTENT_W * 0.7,
      lineGap: 6,
      opacity: 0.92,
    });

    drawSectionEyebrow(page, ctx, {
      x: SAFE_MARGIN,
      y: SAFE_MARGIN + 60,
      label: `Vertical · ${verticalLabel(vertical)}`,
      color: fg,
    });

    drawRunningFooter(page, ctx, {
      pageNumber: pageNum,
      sectionLabel: "Sales funnel",
      onDark: true,
    });
  }

  // ---- 2. Strategy spread (3 cards: awareness/consideration/conversion) ---
  {
    const pageNum = nextPage("Funnel strategy");
    const page = addBlankPage(ctx.pdf, [0.99, 0.98, 0.96]);
    drawSectionEyebrow(page, ctx, {
      x: SAFE_MARGIN,
      y: PAGE_H - SAFE_MARGIN,
      label: "06.1 · Strategy",
    });
    drawPageTitle(page, ctx, {
      x: SAFE_MARGIN,
      y: PAGE_H - SAFE_MARGIN - 18,
      text: "Three plays, one customer.",
      size: 36,
    });

    const stages: { label: string; title: string; body: string; tone: Rgb }[] = [
      {
        label: "Top of funnel",
        title: "Awareness",
        body: f.funnelStrategy.awareness || "",
        tone: ctx.primary,
      },
      {
        label: "Middle of funnel",
        title: "Consideration",
        body: f.funnelStrategy.consideration || "",
        tone: accent,
      },
      {
        label: "Bottom of funnel",
        title: "Conversion",
        body: f.funnelStrategy.conversion || "",
        tone: mixRgb(ctx.primary, accent, 0.5),
      },
    ];

    const gutter = 18;
    const cardW = (CONTENT_W - gutter * 2) / 3;
    const cardH = 320;
    const cardY = SAFE_MARGIN + 60;
    stages.forEach((s, i) => {
      drawCard(page, ctx, {
        x: SAFE_MARGIN + i * (cardW + gutter),
        y: cardY,
        width: cardW,
        height: cardH,
        eyebrow: s.label,
        title: s.title,
        body: s.body,
        accent: s.tone,
      });
    });

    drawRunningFooter(page, ctx, {
      pageNumber: pageNum,
      sectionLabel: "Funnel strategy",
    });
  }

  // ---- 3. Audiences page --------------------------------------------------
  {
    const pageNum = nextPage("Audiences");
    const page = addBlankPage(ctx.pdf, [1, 1, 1]);
    drawSectionEyebrow(page, ctx, {
      x: SAFE_MARGIN,
      y: PAGE_H - SAFE_MARGIN,
      label: "06.2 · Audiences",
    });
    drawPageTitle(page, ctx, {
      x: SAFE_MARGIN,
      y: PAGE_H - SAFE_MARGIN - 18,
      text: "Who buys, and why.",
      size: 36,
    });

    const audiences = f.audiences.slice(0, 3);
    const fallback = [
      { name: "Primary buyer", description: "" },
      { name: "Niche buyer", description: "" },
      { name: "Retargeting pool", description: "" },
    ];
    while (audiences.length < 3) audiences.push(fallback[audiences.length]);

    const gutter = 18;
    const cardW = (CONTENT_W - gutter * 2) / 3;
    const cardH = 280;
    const cardY = SAFE_MARGIN + 60;
    audiences.forEach((a, i) => {
      drawCard(page, ctx, {
        x: SAFE_MARGIN + i * (cardW + gutter),
        y: cardY,
        width: cardW,
        height: cardH,
        eyebrow: `Audience ${i + 1}`,
        title: a.name,
        body: a.description,
        accent: i === 0 ? ctx.primary : i === 1 ? accent : mixRgb(ctx.primary, accent, 0.5),
      });
    });

    drawRunningFooter(page, ctx, {
      pageNumber: pageNum,
      sectionLabel: "Audiences",
    });
  }

  // ---- 4. Landing page sample --------------------------------------------
  {
    const pageNum = nextPage("Landing page");
    const page = addBlankPage(ctx.pdf, [1, 1, 1]);
    drawSectionEyebrow(page, ctx, {
      x: SAFE_MARGIN,
      y: PAGE_H - SAFE_MARGIN,
      label: "06.3 · Landing page",
    });

    // Hero image takes the top 55% of the content area.
    const heroH = 280;
    const heroY = PAGE_H - SAFE_MARGIN - 30 - heroH;
    const heroRect = {
      x: SAFE_MARGIN,
      y: heroY,
      width: CONTENT_W,
      height: heroH,
    };
    const heroImg = await embedPngIfAny(ctx.pdf, images.landingHero);
    if (heroImg) {
      drawImageFit(page, heroImg, heroRect, "cover");
    } else {
      drawImagePlaceholder(page, ctx, {
        ...heroRect,
        label: "Landing page hero (image unavailable)",
      });
    }

    // Hero copy overlay block on the lower-left of the image.
    const overlayPad = 20;
    const overlayW = CONTENT_W * 0.55;
    const overlayH = 120;
    const overlayX = SAFE_MARGIN + overlayPad;
    const overlayY = heroY + overlayPad;
    page.drawRectangle({
      x: overlayX,
      y: overlayY,
      width: overlayW,
      height: overlayH,
      color: rgbColor([1, 1, 1]),
      opacity: 0.92,
    });
    drawWrappedText(page, f.landingPage.hero || "Landing headline.", {
      x: overlayX + 16,
      y: overlayY + overlayH - 22,
      size: 22,
      font: ctx.fonts.display,
      color: ctx.ink,
      maxWidth: overlayW - 32,
      lineGap: 4,
    });
    drawWrappedText(page, f.landingPage.subhero || "", {
      x: overlayX + 16,
      y: overlayY + overlayH - 70,
      size: 10.5,
      font: ctx.fonts.body,
      color: ctx.ink,
      maxWidth: overlayW - 32,
      lineGap: 3,
    });
    drawCtaChip(page, ctx, {
      x: overlayX + 16,
      y: overlayY + 12,
      label: f.landingPage.ctaPrimary || "Get started",
    });

    // Below-the-hero zone: value props in two columns + sections list right.
    const belowY = heroY - 22;
    const colGutter = 24;
    const colW = (CONTENT_W * 0.6 - colGutter) / 2;
    const valueProps = f.landingPage.valueProps.slice(0, 4);
    let yp = belowY;
    drawSectionEyebrow(page, ctx, {
      x: SAFE_MARGIN,
      y: yp,
      label: "Value props",
    });
    yp -= 18;
    valueProps.forEach((vp, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const xx = SAFE_MARGIN + col * (colW + colGutter);
      const yy = yp - row * 50;
      page.drawRectangle({
        x: xx,
        y: yy - 8,
        width: 4,
        height: 32,
        color: rgbColor(ctx.primary),
      });
      drawWrappedText(page, vp, {
        x: xx + 12,
        y: yy + 14,
        size: 10.5,
        font: ctx.fonts.body,
        color: ctx.ink,
        maxWidth: colW - 16,
        lineGap: 3,
      });
    });

    // Sections list on the right.
    const rightX = SAFE_MARGIN + CONTENT_W * 0.62;
    const rightW = CONTENT_W - (rightX - SAFE_MARGIN);
    drawSectionEyebrow(page, ctx, {
      x: rightX,
      y: belowY,
      label: "Page sections",
    });
    let rightY = belowY - 18;
    f.landingPage.sections.slice(0, 5).forEach((s, i) => {
      page.drawText(`${i + 1}.  ${sanitizeForBrandBook(s)}`, {
        x: rightX,
        y: rightY,
        size: 10.5,
        font: ctx.fonts.body,
        color: rgbColor(ctx.ink),
        maxWidth: rightW,
      });
      rightY -= 18;
    });

    drawRunningFooter(page, ctx, {
      pageNumber: pageNum,
      sectionLabel: "Landing page",
    });
  }

  // ---- 5. Facebook ads page ----------------------------------------------
  {
    const pageNum = nextPage("Facebook ads");
    const page = addBlankPage(ctx.pdf, [1, 1, 1]);
    drawSectionEyebrow(page, ctx, {
      x: SAFE_MARGIN,
      y: PAGE_H - SAFE_MARGIN,
      label: "06.4 · Paid ads · Meta",
    });
    drawPageTitle(page, ctx, {
      x: SAFE_MARGIN,
      y: PAGE_H - SAFE_MARGIN - 18,
      text: "Facebook feed.",
      size: 32,
    });

    const adW = 280;
    const adH = 280;
    const adX = SAFE_MARGIN;
    const adY = SAFE_MARGIN + 60;
    await drawAdMock(
      ctx,
      page,
      images.adFbFeed,
      { x: adX, y: adY, width: adW, height: adH },
      "Facebook feed creative",
    );

    const copyX = adX + adW + 32;
    const copyW = CONTENT_W - (copyX - SAFE_MARGIN);
    let cy = adY + adH;

    drawPlatformPill(page, ctx, {
      x: copyX,
      y: cy - 24,
      label: `Facebook · ${f.facebook.objective || "Leads"}`,
      color: hexToRgb("#1877F2"),
    });
    cy -= 40;

    drawSectionEyebrow(page, ctx, {
      x: copyX,
      y: cy,
      label: "Targeting",
    });
    cy -= 16;
    cy = drawWrappedText(page, f.facebook.targeting || "", {
      x: copyX,
      y: cy,
      size: 9.5,
      font: ctx.fonts.body,
      color: ctx.ink,
      maxWidth: copyW,
      lineGap: 3,
    });
    cy -= 18;

    drawSectionEyebrow(page, ctx, {
      x: copyX,
      y: cy,
      label: "Primary text",
    });
    cy -= 16;
    cy = drawWrappedText(page, f.facebook.primaryText || "", {
      x: copyX,
      y: cy,
      size: 11,
      font: ctx.fonts.body,
      color: ctx.ink,
      maxWidth: copyW,
      lineGap: 4,
    });
    cy -= 14;

    drawSectionEyebrow(page, ctx, {
      x: copyX,
      y: cy,
      label: "Headline",
    });
    cy -= 18;
    cy = drawWrappedText(page, f.facebook.headline || "", {
      x: copyX,
      y: cy,
      size: 14,
      font: ctx.fonts.display,
      color: ctx.ink,
      maxWidth: copyW,
      lineGap: 4,
    });
    cy -= 6;
    cy = drawWrappedText(page, f.facebook.description || "", {
      x: copyX,
      y: cy,
      size: 9.5,
      font: ctx.fonts.body,
      color: ctx.ink,
      maxWidth: copyW,
      lineGap: 3,
      opacity: 0.7,
    });
    cy -= 14;

    drawCtaChip(page, ctx, {
      x: copyX,
      y: cy - 24,
      label: f.facebook.cta || "Learn more",
      color: hexToRgb("#1877F2"),
    });

    drawRunningFooter(page, ctx, {
      pageNumber: pageNum,
      sectionLabel: "Facebook ads",
    });
  }

  // ---- 6. Instagram ads page (feed + story) -------------------------------
  {
    const pageNum = nextPage("Instagram ads");
    const page = addBlankPage(ctx.pdf, [1, 1, 1]);
    drawSectionEyebrow(page, ctx, {
      x: SAFE_MARGIN,
      y: PAGE_H - SAFE_MARGIN,
      label: "06.5 · Paid ads · Instagram",
    });
    drawPageTitle(page, ctx, {
      x: SAFE_MARGIN,
      y: PAGE_H - SAFE_MARGIN - 18,
      text: "Feed + Story.",
      size: 32,
    });

    const igPink: Rgb = hexToRgb("#E1306C");

    // Left: IG feed (square)
    const feedW = 240;
    const feedH = 240;
    const feedX = SAFE_MARGIN;
    const feedY = SAFE_MARGIN + 70;
    await drawAdMock(
      ctx,
      page,
      images.adIgFeed,
      { x: feedX, y: feedY, width: feedW, height: feedH },
      "Instagram feed creative",
    );

    drawPlatformPill(page, ctx, {
      x: feedX,
      y: feedY + feedH + 14,
      label: "Instagram · Feed",
      color: igPink,
    });

    let lcy = feedY - 12;
    lcy = drawWrappedText(page, f.instagram.feedHeadline || "", {
      x: feedX,
      y: lcy,
      size: 13,
      font: ctx.fonts.display,
      color: ctx.ink,
      maxWidth: feedW,
      lineGap: 3,
    });
    lcy = drawWrappedText(page, f.instagram.feedPrimaryText || "", {
      x: feedX,
      y: lcy - 4,
      size: 9.5,
      font: ctx.fonts.body,
      color: ctx.ink,
      maxWidth: feedW,
      lineGap: 3,
    });
    drawCtaChip(page, ctx, {
      x: feedX,
      y: lcy - 26,
      label: f.instagram.feedCta || "Learn more",
      color: igPink,
    });

    // Right: IG Story (9:16 portrait)
    const storyW = 200;
    const storyH = 320;
    const storyX = SAFE_MARGIN + CONTENT_W - storyW;
    const storyY = SAFE_MARGIN + 30;
    await drawAdMock(
      ctx,
      page,
      images.adIgStory,
      { x: storyX, y: storyY, width: storyW, height: storyH },
      "Instagram story creative",
    );

    // Hook overlay near the top of the story image.
    if (f.instagram.storyHook) {
      const overlayY2 = storyY + storyH - 50;
      page.drawRectangle({
        x: storyX + 10,
        y: overlayY2 - 4,
        width: storyW - 20,
        height: 36,
        color: rgbColor([1, 1, 1]),
        opacity: 0.88,
      });
      drawWrappedText(page, f.instagram.storyHook, {
        x: storyX + 16,
        y: overlayY2 + 22,
        size: 11,
        font: ctx.fonts.display,
        color: ctx.ink,
        maxWidth: storyW - 32,
        lineGap: 2,
      });
    }
    // CTA on the bottom of the story image.
    drawCtaChip(page, ctx, {
      x: storyX + 12,
      y: storyY + 12,
      label: f.instagram.storyCta || "Swipe up",
      color: igPink,
    });

    drawPlatformPill(page, ctx, {
      x: storyX,
      y: storyY + storyH + 14,
      label: "Instagram · Story",
      color: igPink,
    });

    drawRunningFooter(page, ctx, {
      pageNumber: pageNum,
      sectionLabel: "Instagram ads",
    });
  }

  // ---- 7. Google ads page (Search RSA + Display) --------------------------
  {
    const pageNum = nextPage("Google ads");
    const page = addBlankPage(ctx.pdf, [1, 1, 1]);
    drawSectionEyebrow(page, ctx, {
      x: SAFE_MARGIN,
      y: PAGE_H - SAFE_MARGIN,
      label: "06.6 · Paid ads · Google",
    });
    drawPageTitle(page, ctx, {
      x: SAFE_MARGIN,
      y: PAGE_H - SAFE_MARGIN - 18,
      text: "Search + Display.",
      size: 32,
    });

    const googleBlue: Rgb = hexToRgb("#4285F4");

    // Top half: Responsive Search Ad mock card.
    const rsaY = PAGE_H / 2 + 14;
    const rsaH = PAGE_H - SAFE_MARGIN - 60 - rsaY;
    const rsaX = SAFE_MARGIN;
    const rsaW = CONTENT_W;
    page.drawRectangle({
      x: rsaX,
      y: rsaY,
      width: rsaW,
      height: rsaH,
      color: rgbColor([0.99, 0.99, 0.99]),
      borderColor: rgbColor([0.86, 0.86, 0.88]),
      borderWidth: 0.5,
    });
    page.drawText("Sponsored", {
      x: rsaX + 16,
      y: rsaY + rsaH - 22,
      size: 9,
      font: ctx.fonts.body,
      color: rgbColor([0.4, 0.4, 0.42]),
    });

    let rsaCy = rsaY + rsaH - 44;
    const headlines = f.google.searchHeadlines.slice(0, 3);
    headlines.forEach((h, i) => {
      page.drawText(sanitizeForBrandBook(h), {
        x: rsaX + 16,
        y: rsaCy,
        size: 14,
        font: ctx.fonts.display,
        color: rgbColor(googleBlue),
      });
      if (i < headlines.length - 1) {
        page.drawText("|", {
          x:
            rsaX +
            16 +
            ctx.fonts.display.widthOfTextAtSize(sanitizeForBrandBook(h), 14) +
            8,
          y: rsaCy,
          size: 14,
          font: ctx.fonts.display,
          color: rgbColor([0.7, 0.7, 0.74]),
        });
      }
      rsaCy -= 24;
    });
    rsaCy -= 4;
    f.google.searchDescriptions.slice(0, 2).forEach((d) => {
      rsaCy = drawWrappedText(page, d, {
        x: rsaX + 16,
        y: rsaCy,
        size: 10.5,
        font: ctx.fonts.body,
        color: [0.25, 0.25, 0.27],
        maxWidth: rsaW - 32,
        lineGap: 3,
      });
      rsaCy -= 4;
    });

    // Bottom half: Display creative + hero banner thumbnail
    const dispW = 220;
    const dispH = 220;
    const dispX = SAFE_MARGIN;
    const dispY = SAFE_MARGIN + 30;
    await drawAdMock(
      ctx,
      page,
      images.adGoogleDisplay,
      { x: dispX, y: dispY, width: dispW, height: dispH },
      "Google Display creative",
    );
    drawPlatformPill(page, ctx, {
      x: dispX,
      y: dispY + dispH + 8,
      label: "Google · Display",
      color: googleBlue,
    });

    const banW = CONTENT_W - dispW - 32;
    const banH = 160;
    const banX = dispX + dispW + 32;
    const banY = dispY + dispH - banH;
    await drawAdMock(
      ctx,
      page,
      images.adHeroBanner,
      { x: banX, y: banY, width: banW, height: banH },
      "Hero / display banner",
    );

    // Display copy below the hero banner.
    let dy = banY - 18;
    dy = drawWrappedText(page, f.google.displayHeadline || "", {
      x: banX,
      y: dy,
      size: 14,
      font: ctx.fonts.display,
      color: ctx.ink,
      maxWidth: banW,
      lineGap: 3,
    });
    dy = drawWrappedText(page, f.google.displayDescription || "", {
      x: banX,
      y: dy - 2,
      size: 10,
      font: ctx.fonts.body,
      color: ctx.ink,
      maxWidth: banW,
      lineGap: 3,
    });
    drawCtaChip(page, ctx, {
      x: banX,
      y: dy - 28,
      label: f.google.displayCta || "Learn more",
      color: googleBlue,
    });

    drawRunningFooter(page, ctx, {
      pageNumber: pageNum,
      sectionLabel: "Google ads",
    });
  }

  // ---- 8. Budget + KPIs ---------------------------------------------------
  {
    const pageNum = nextPage("Budget & KPIs");
    const page = addBlankPage(ctx.pdf, [0.99, 0.98, 0.96]);
    drawSectionEyebrow(page, ctx, {
      x: SAFE_MARGIN,
      y: PAGE_H - SAFE_MARGIN,
      label: "06.7 · Budget & KPIs",
    });
    drawPageTitle(page, ctx, {
      x: SAFE_MARGIN,
      y: PAGE_H - SAFE_MARGIN - 18,
      text: "Spend smart, track tight.",
      size: 36,
    });

    const cardW = CONTENT_W * 0.55;
    const cardH = 280;
    const cardX = SAFE_MARGIN;
    const cardY = SAFE_MARGIN + 60;
    page.drawRectangle({
      x: cardX,
      y: cardY,
      width: cardW,
      height: cardH,
      color: rgbColor(ctx.primary),
    });
    const fg = [0.98, 0.97, 0.94] as Rgb;
    drawSectionEyebrow(page, ctx, {
      x: cardX + 22,
      y: cardY + cardH - 24,
      label: "Daily ad spend (USD)",
      color: fg,
    });
    const range = `$${f.budgetGuidance.dailyMin} – $${f.budgetGuidance.dailyMax}`;
    page.drawText(sanitizeForBrandBook(range), {
      x: cardX + 22,
      y: cardY + cardH - 86,
      size: 56,
      font: ctx.fonts.display,
      color: rgbColor(fg),
    });
    drawWrappedText(page, "Combined across Meta + Google. Scale once a CAC target is locked.", {
      x: cardX + 22,
      y: cardY + cardH - 110,
      size: 11,
      font: ctx.fonts.body,
      color: fg,
      maxWidth: cardW - 44,
      lineGap: 4,
      opacity: 0.85,
    });
    drawWrappedText(page, f.budgetGuidance.rationale || "", {
      x: cardX + 22,
      y: cardY + cardH - 160,
      size: 11,
      font: ctx.fonts.body,
      color: fg,
      maxWidth: cardW - 44,
      lineGap: 4,
      opacity: 0.92,
    });

    // KPIs column on the right.
    const kpiX = cardX + cardW + 32;
    const kpiW = CONTENT_W - (kpiX - SAFE_MARGIN);
    let kpiY = cardY + cardH - 16;
    drawSectionEyebrow(page, ctx, {
      x: kpiX,
      y: kpiY,
      label: "Track these KPIs",
    });
    kpiY -= 24;
    f.kpis.slice(0, 6).forEach((k) => {
      page.drawRectangle({
        x: kpiX,
        y: kpiY - 4,
        width: 4,
        height: 16,
        color: rgbColor(ctx.primary),
      });
      kpiY = drawWrappedText(page, k, {
        x: kpiX + 12,
        y: kpiY + 8,
        size: 11,
        font: ctx.fonts.body,
        color: ctx.ink,
        maxWidth: kpiW - 16,
        lineGap: 3,
      });
      kpiY -= 12;
    });

    drawRunningFooter(page, ctx, {
      pageNumber: pageNum,
      sectionLabel: "Budget & KPIs",
    });
  }
}

// ----------------------------------------------------------------------------
// Main composition
// ----------------------------------------------------------------------------

async function composeBook(
  ctx: BrandBookContext,
  images: BrandingImages,
  realLogoPng: Buffer | null,
  funnel: FunnelComposeInput | null,
): Promise<void> {
  const pdf = ctx.pdf;

  // 1. Cover — uses the cover image if it came back from OpenAI
  const coverImg = await embedPngIfAny(pdf, images.cover);
  await drawCoverPage(ctx, coverImg);

  // Build a rolling TOC while we place content. We need to reserve the TOC
  // page slot first so it lands at position 2 in the final document.
  const tocEntries: Array<{ label: string; page: number }> = [];
  // Reserve TOC page (we will fill it at the end)
  const tocPlaceholder = addBlankPage(pdf, [1, 1, 1]);
  let page = 2;

  const nextPage = (label: string): number => {
    page += 1;
    tocEntries.push({ label, page });
    return page;
  };

  // 3. Brand story
  drawBrandStoryPage(ctx, nextPage("Brand story"));

  // 4. Personality
  drawPersonalityPage(ctx, nextPage("Personality & audience"));

  // 5. Logo — primary
  {
    const pageNum = nextPage("Logo");
    const pg = addBlankPage(pdf, [1, 1, 1]);
    drawSectionEyebrow(pg, ctx, {
      x: SAFE_MARGIN,
      y: PAGE_H - SAFE_MARGIN,
      label: "03 · Logo",
    });
    drawPageTitle(pg, ctx, {
      x: SAFE_MARGIN,
      y: PAGE_H - SAFE_MARGIN - 18,
      text: "The primary mark.",
      size: 40,
    });
    const boxW = 340;
    const boxH = 340;
    const boxX = SAFE_MARGIN + (CONTENT_W - boxW) / 2;
    const boxY = PAGE_H / 2 - boxH / 2 - 20;
    // dotted clearspace frame
    pg.drawRectangle({
      x: boxX - 28,
      y: boxY - 28,
      width: boxW + 56,
      height: boxH + 56,
      borderColor: rgbColor(ctx.primary),
      borderWidth: 0.5,
      borderDashArray: [2, 3],
      color: rgbColor([1, 1, 1]),
    });
    const realMark = await embedPngIfAny(pdf, realLogoPng);
    const aiWordmark = realMark
      ? null
      : await embedPngIfAny(pdf, images.logos[0]);
    const mark = realMark ?? aiWordmark;
    if (mark) {
      drawImageFit(pg, mark, { x: boxX, y: boxY, width: boxW, height: boxH });
    } else {
      drawImagePlaceholder(pg, ctx, {
        x: boxX,
        y: boxY,
        width: boxW,
        height: boxH,
        label: "Wordmark logo (generated image unavailable)",
      });
    }
    const notes = sanitizeForBrandBook(
      realMark
        ? "This is the prospect's actual mark, captured from their live website. Always leave clearspace equal to the height of a capital letter around it. Prefer the primary color on white; inverse version on dark imagery."
        : "Minimum size: 40 px digital / 20 mm print. Always leave clearspace equal to the height of a capital letter around the mark. Prefer the primary color on white; inverse version on dark imagery.",
    );
    drawWrappedText(pg, notes, {
      x: SAFE_MARGIN,
      y: boxY - 48,
      size: 10.5,
      font: ctx.fonts.body,
      color: ctx.ink,
      maxWidth: CONTENT_W,
      lineGap: 5,
    });
    drawRunningFooter(pg, ctx, { pageNumber: pageNum, sectionLabel: "Logo" });
  }

  // 6. Logo — variants (wordmark / icon / emblem)
  {
    const pageNum = nextPage("Logo variants");
    const pg = addBlankPage(pdf, [1, 1, 1]);
    drawSectionEyebrow(pg, ctx, {
      x: SAFE_MARGIN,
      y: PAGE_H - SAFE_MARGIN,
      label: "03 · Logo",
    });
    drawPageTitle(pg, ctx, {
      x: SAFE_MARGIN,
      y: PAGE_H - SAFE_MARGIN - 18,
      text: "Variants.",
      size: 40,
    });
    const labels = ["Wordmark", "Icon / symbol", "Emblem / seal"];
    const subs = [
      "Primary usage. Default across most surfaces.",
      "Favicons, app tiles, social avatars.",
      "Packaging, merch, signage.",
    ];
    const gap = 18;
    const cellW = (CONTENT_W - gap * 2) / 3;
    const cellH = 220;
    const cellY = PAGE_H / 2 - cellH / 2 + 10;
    for (let i = 0; i < 3; i++) {
      const cellX = SAFE_MARGIN + i * (cellW + gap);
      pg.drawRectangle({
        x: cellX,
        y: cellY,
        width: cellW,
        height: cellH,
        color: rgbColor([0.99, 0.98, 0.97]),
        borderColor: rgbColor([0.88, 0.87, 0.85]),
        borderWidth: 0.5,
      });
      const img = await embedPngIfAny(pdf, images.logos[i]);
      if (img) {
        drawImageFit(pg, img, {
          x: cellX + 18,
          y: cellY + 18,
          width: cellW - 36,
          height: cellH - 36,
        });
      } else {
        drawImagePlaceholder(pg, ctx, {
          x: cellX + 18,
          y: cellY + 18,
          width: cellW - 36,
          height: cellH - 36,
          label: `${labels[i]} unavailable`,
        });
      }
      pg.drawText(sanitizeForBrandBook(labels[i]), {
        x: cellX,
        y: cellY - 22,
        size: 12,
        font: ctx.fonts.display,
        color: rgbColor(ctx.ink),
      });
      drawWrappedText(pg, subs[i], {
        x: cellX,
        y: cellY - 38,
        size: 9,
        font: ctx.fonts.body,
        color: ctx.ink,
        maxWidth: cellW,
        lineGap: 3,
      });
    }
    drawRunningFooter(pg, ctx, { pageNumber: pageNum, sectionLabel: "Logo" });
  }

  // 7. Logo — don'ts
  {
    const pageNum = nextPage("Logo misuse");
    const pg = addBlankPage(pdf, [1, 1, 1]);
    drawSectionEyebrow(pg, ctx, {
      x: SAFE_MARGIN,
      y: PAGE_H - SAFE_MARGIN,
      label: "03 · Logo",
    });
    drawPageTitle(pg, ctx, {
      x: SAFE_MARGIN,
      y: PAGE_H - SAFE_MARGIN - 18,
      text: "Don't do this.",
      size: 40,
    });
    const wm = await embedPngIfAny(pdf, images.logos[0]);
    const dontRules = [
      "Don't stretch or squash",
      "Don't rotate",
      "Don't add drop shadows",
      "Don't recolor to random hues",
    ];
    const cellW = (CONTENT_W - 36) / 4;
    const cellH = 170;
    const cellY = PAGE_H / 2 - cellH / 2 + 20;
    for (let i = 0; i < 4; i++) {
      const cellX = SAFE_MARGIN + i * (cellW + 12);
      pg.drawRectangle({
        x: cellX,
        y: cellY,
        width: cellW,
        height: cellH,
        color: rgbColor([0.99, 0.98, 0.97]),
        borderColor: rgbColor([0.88, 0.87, 0.85]),
        borderWidth: 0.5,
      });
      if (wm) {
        const inset = 18;
        const w = cellW - inset * 2;
        const h = cellH - inset * 2;
        if (i === 0) {
          pg.drawImage(wm, { x: cellX + inset, y: cellY + inset + 20, width: w, height: h - 40 });
        } else if (i === 1) {
          pg.drawImage(wm, {
            x: cellX + inset,
            y: cellY + inset,
            width: w,
            height: h,
            rotate: degrees(15),
          });
        } else {
          pg.drawImage(wm, { x: cellX + inset, y: cellY + inset, width: w, height: h, opacity: i === 2 ? 0.45 : 0.7 });
        }
      } else {
        drawImagePlaceholder(pg, ctx, {
          x: cellX + 14,
          y: cellY + 14,
          width: cellW - 28,
          height: cellH - 28,
          label: dontRules[i],
        });
      }
      // strike
      pg.drawLine({
        start: { x: cellX + 10, y: cellY + 10 },
        end: { x: cellX + cellW - 10, y: cellY + cellH - 10 },
        thickness: 2,
        color: rgbColor([0.85, 0.14, 0.14]),
      });
      pg.drawText(sanitizeForBrandBook(dontRules[i]), {
        x: cellX,
        y: cellY - 18,
        size: 9.5,
        font: ctx.fonts.body,
        color: rgbColor(ctx.ink),
      });
    }
    drawRunningFooter(pg, ctx, { pageNumber: pageNum, sectionLabel: "Logo" });
  }

  // 8. Primary color — full-bleed per primary
  ctx.spec.primaryColors.slice(0, 3).forEach((c, i) => {
    const pageNum = nextPage(
      i === 0 ? "Primary color" : `Primary color · ${c.name}`,
    );
    drawColorChipFullPage(ctx, c, {
      pageNumber: pageNum,
      sectionLabel: "Color",
      totalLabel: `04 · ${i === 0 ? "Primary color" : "Primary palette"}`,
    });
  });

  // 9. Secondary colors on a single spread
  if (ctx.spec.secondaryColors.length > 0) {
    const pageNum = nextPage("Secondary palette");
    const pg = addBlankPage(pdf, [1, 1, 1]);
    drawSectionEyebrow(pg, ctx, {
      x: SAFE_MARGIN,
      y: PAGE_H - SAFE_MARGIN,
      label: "04 · Secondary palette",
    });
    drawPageTitle(pg, ctx, {
      x: SAFE_MARGIN,
      y: PAGE_H - SAFE_MARGIN - 18,
      text: "Supporting hues.",
      size: 40,
    });
    const cols = Math.min(ctx.spec.secondaryColors.length, 4);
    const gap = 12;
    const cellW = (CONTENT_W - gap * (cols - 1)) / cols;
    const cellH = 260;
    const cellY = PAGE_H / 2 - cellH / 2 - 20;
    ctx.spec.secondaryColors.slice(0, cols).forEach((c, i) => {
      const bg = hexToRgb(c.hex);
      const cellX = SAFE_MARGIN + i * (cellW + gap);
      pg.drawRectangle({
        x: cellX,
        y: cellY,
        width: cellW,
        height: cellH,
        color: rgbColor(bg),
      });
      const fg: Rgb = bg[0] * 0.299 + bg[1] * 0.587 + bg[2] * 0.114 > 0.6
        ? [0.08, 0.08, 0.1]
        : [0.97, 0.97, 0.96];
      pg.drawText(sanitizeForBrandBook(c.name), {
        x: cellX + 16,
        y: cellY + cellH - 28,
        size: 14,
        font: ctx.fonts.display,
        color: rgbColor(fg),
      });
      pg.drawText(c.hex.toUpperCase(), {
        x: cellX + 16,
        y: cellY + 16,
        size: 10,
        font: ctx.fonts.body,
        color: rgbColor(fg),
      });
    });
    drawRunningFooter(pg, ctx, { pageNumber: pageNum, sectionLabel: "Color" });
  }

  // 10. Color ratio bar
  {
    const pageNum = nextPage("Color ratio");
    const pg = addBlankPage(pdf, [1, 1, 1]);
    drawSectionEyebrow(pg, ctx, {
      x: SAFE_MARGIN,
      y: PAGE_H - SAFE_MARGIN,
      label: "04 · Color · ratio",
    });
    drawPageTitle(pg, ctx, {
      x: SAFE_MARGIN,
      y: PAGE_H - SAFE_MARGIN - 18,
      text: "How the palette is used.",
      size: 40,
    });
    drawColorRatioBar(pg, ctx, {
      x: SAFE_MARGIN,
      y: PAGE_H / 2 - 90,
      width: CONTENT_W,
      height: 180,
    });
    drawWrappedText(
      pg,
      `Aim for a ${ctx.spec.colorRatio.primaryPct}/${ctx.spec.colorRatio.secondaryPct}/${ctx.spec.colorRatio.accentPct} split across most executions. The primary anchors the brand, secondary carries long-form content, and the accent earns its keep by staying rare.`,
      {
        x: SAFE_MARGIN,
        y: PAGE_H / 2 - 120,
        size: 11,
        font: ctx.fonts.body,
        color: ctx.ink,
        maxWidth: CONTENT_W,
        lineGap: 5,
      },
    );
    drawRunningFooter(pg, ctx, { pageNumber: pageNum, sectionLabel: "Color" });
  }

  // 11. Typography specimen
  {
    const pageNum = nextPage("Typography");
    const pg = addBlankPage(pdf, [1, 1, 1]);
    drawSectionEyebrow(pg, ctx, {
      x: SAFE_MARGIN,
      y: PAGE_H - SAFE_MARGIN,
      label: "05 · Typography",
    });
    drawPageTitle(pg, ctx, {
      x: SAFE_MARGIN,
      y: PAGE_H - SAFE_MARGIN - 18,
      text: "The brand's voice, set in type.",
      size: 40,
    });
    drawTypeSpecimen(pg, ctx, {
      x: SAFE_MARGIN,
      y: PAGE_H - SAFE_MARGIN - 120,
      width: CONTENT_W,
    });
    drawRunningFooter(pg, ctx, { pageNumber: pageNum, sectionLabel: "Typography" });
  }

  // 12. Type scale
  {
    const pageNum = nextPage("Type scale");
    const pg = addBlankPage(pdf, [1, 1, 1]);
    drawSectionEyebrow(pg, ctx, {
      x: SAFE_MARGIN,
      y: PAGE_H - SAFE_MARGIN,
      label: "05 · Typography · scale",
    });
    drawPageTitle(pg, ctx, {
      x: SAFE_MARGIN,
      y: PAGE_H - SAFE_MARGIN - 18,
      text: "A consistent rhythm.",
      size: 40,
    });
    drawTypeScale(pg, ctx, {
      x: SAFE_MARGIN,
      y: PAGE_H - SAFE_MARGIN - 120,
      width: CONTENT_W,
    });
    drawRunningFooter(pg, ctx, { pageNumber: pageNum, sectionLabel: "Typography" });
  }

  // 13. Imagery & photography
  {
    const pageNum = nextPage("Imagery");
    const pg = addBlankPage(pdf, [1, 1, 1]);
    const moodImg = await embedPngIfAny(pdf, images.moodboard);
    const heroH = PAGE_H * 0.55;
    if (moodImg) {
      drawImageFit(
        pg,
        moodImg,
        { x: 0, y: PAGE_H - heroH, width: PAGE_W, height: heroH },
        "cover",
      );
    } else {
      drawImagePlaceholder(pg, ctx, {
        x: SAFE_MARGIN,
        y: PAGE_H - heroH + 24,
        width: PAGE_W - SAFE_MARGIN * 2,
        height: heroH - 48,
        label: "Moodboard unavailable",
      });
    }
    drawSectionEyebrow(pg, ctx, {
      x: SAFE_MARGIN,
      y: PAGE_H - heroH - 24,
      label: "06 · Imagery & photography",
    });
    drawPageTitle(pg, ctx, {
      x: SAFE_MARGIN,
      y: PAGE_H - heroH - 44,
      text: "A consistent way of seeing.",
      size: 32,
    });
    drawWrappedText(
      pg,
      ctx.spec.imageryStyle ||
        "Warm, natural light. Real people, real moments. Editorial crop, plenty of room to breathe.",
      {
        x: SAFE_MARGIN,
        y: PAGE_H - heroH - 90,
        size: 11,
        font: ctx.fonts.body,
        color: ctx.ink,
        maxWidth: CONTENT_W,
        lineGap: 5,
      },
    );
    drawRunningFooter(pg, ctx, { pageNumber: pageNum, sectionLabel: "Imagery" });
  }

  // 14. Pattern & texture
  {
    const pageNum = nextPage("Pattern & texture");
    const pg = addBlankPage(pdf, [1, 1, 1]);
    drawSectionEyebrow(pg, ctx, {
      x: SAFE_MARGIN,
      y: PAGE_H - SAFE_MARGIN,
      label: "07 · Pattern & texture",
    });
    drawPageTitle(pg, ctx, {
      x: SAFE_MARGIN,
      y: PAGE_H - SAFE_MARGIN - 18,
      text: "Repeat with restraint.",
      size: 40,
    });
    const patt = await embedPngIfAny(pdf, images.pattern);
    const panelW = CONTENT_W * 0.62;
    const panelH = PAGE_H - SAFE_MARGIN - 170;
    const panelX = SAFE_MARGIN;
    const panelY = SAFE_MARGIN + 40;
    if (patt) {
      // 3x3 tile within the panel
      const tileW = panelW / 3;
      const tileH = panelH / 3;
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
          pg.drawImage(patt, {
            x: panelX + c * tileW,
            y: panelY + r * tileH,
            width: tileW,
            height: tileH,
          });
        }
      }
    } else {
      drawImagePlaceholder(pg, ctx, {
        x: panelX,
        y: panelY,
        width: panelW,
        height: panelH,
        label: "Pattern unavailable",
      });
    }
    const textX = panelX + panelW + 36;
    const textW = CONTENT_W - panelW - 36;
    drawSectionEyebrow(pg, ctx, {
      x: textX,
      y: panelY + panelH - 20,
      label: "Usage",
    });
    drawWrappedText(
      pg,
      "Use at 15-25% opacity behind long-form copy or as a full-bleed accent on internal pages. Avoid overlaying on busy imagery and keep scale consistent within a single surface.",
      {
        x: textX,
        y: panelY + panelH - 40,
        size: 11,
        font: ctx.fonts.body,
        color: ctx.ink,
        maxWidth: textW,
        lineGap: 5,
      },
    );
    drawRunningFooter(pg, ctx, { pageNumber: pageNum, sectionLabel: "Pattern" });
  }

  // 15. Tone of voice cards
  {
    const pageNum = nextPage("Tone of voice");
    const pg = addBlankPage(pdf, [1, 1, 1]);
    drawSectionEyebrow(pg, ctx, {
      x: SAFE_MARGIN,
      y: PAGE_H - SAFE_MARGIN,
      label: "08 · Tone of voice",
    });
    drawPageTitle(pg, ctx, {
      x: SAFE_MARGIN,
      y: PAGE_H - SAFE_MARGIN - 18,
      text: "How we sound.",
      size: 40,
    });

    drawWrappedText(pg, ctx.spec.toneOfVoice || "", {
      x: SAFE_MARGIN,
      y: PAGE_H - SAFE_MARGIN - 80,
      size: 12,
      font: ctx.fonts.body,
      color: ctx.ink,
      maxWidth: CONTENT_W,
      lineGap: 6,
    });

    const gap = 18;
    const cardW = (CONTENT_W - gap * 2) / 3;
    const cardH = 220;
    const cardY = SAFE_MARGIN + 40;
    const ex = ctx.spec.toneExamples;
    const slots: Array<{ eyebrow: string; title: string; body: string }> = [
      { eyebrow: "Headline", title: ex.headline || "—", body: "Used in ads, homepage heroes, launch moments." },
      { eyebrow: "Social post", title: "Instagram", body: ex.socialPost || "—" },
      { eyebrow: "Support reply", title: "Email", body: ex.supportReply || "—" },
    ];
    slots.forEach((s, i) => {
      drawCard(pg, ctx, {
        x: SAFE_MARGIN + i * (cardW + gap),
        y: cardY,
        width: cardW,
        height: cardH,
        eyebrow: s.eyebrow,
        title: s.title,
        body: s.body,
        accent: ctx.primary,
      });
    });
    drawRunningFooter(pg, ctx, { pageNumber: pageNum, sectionLabel: "Voice" });
  }

  // 16. We say / We don't say
  {
    const pageNum = nextPage("We say / We don't say");
    const pg = addBlankPage(pdf, [1, 1, 1]);
    drawSectionEyebrow(pg, ctx, {
      x: SAFE_MARGIN,
      y: PAGE_H - SAFE_MARGIN,
      label: "08 · Voice · lexicon",
    });
    drawPageTitle(pg, ctx, {
      x: SAFE_MARGIN,
      y: PAGE_H - SAFE_MARGIN - 18,
      text: "Words we choose.",
      size: 40,
    });
    const colW = (CONTENT_W - 36) / 2;
    const colY = PAGE_H - SAFE_MARGIN - 120;
    const drawWordList = (
      x: number,
      title: string,
      items: string[],
      color: Rgb,
    ) => {
      drawSectionEyebrow(pg, ctx, { x, y: colY + 18, label: title, color });
      let yy = colY - 10;
      for (const it of items.slice(0, 6)) {
        pg.drawText(sanitizeForBrandBook(`— ${it}`), {
          x,
          y: yy,
          size: 13,
          font: ctx.fonts.display,
          color: rgbColor(ctx.ink),
          maxWidth: colW,
        });
        yy -= 28;
      }
    };
    drawWordList(SAFE_MARGIN, "We say", ctx.spec.weSay, ctx.primary);
    drawWordList(
      SAFE_MARGIN + colW + 36,
      "We don't say",
      ctx.spec.weDontSay,
      [0.78, 0.2, 0.2],
    );
    drawRunningFooter(pg, ctx, { pageNumber: pageNum, sectionLabel: "Voice" });
  }

  // 17. Merchandising
  {
    const pageNum = nextPage("Merchandising");
    const pg = addBlankPage(pdf, [1, 1, 1]);
    drawSectionEyebrow(pg, ctx, {
      x: SAFE_MARGIN,
      y: PAGE_H - SAFE_MARGIN,
      label: "09 · Merchandising",
    });
    drawPageTitle(pg, ctx, {
      x: SAFE_MARGIN,
      y: PAGE_H - SAFE_MARGIN - 18,
      text: "How the brand shows up in the world.",
      size: 32,
    });
    const merchImg = await embedPngIfAny(pdf, images.merch);
    const imgW = CONTENT_W * 0.6;
    const imgH = PAGE_H - SAFE_MARGIN - 170;
    const imgY = SAFE_MARGIN + 40;
    if (merchImg) {
      drawImageFit(pg, merchImg, {
        x: SAFE_MARGIN,
        y: imgY,
        width: imgW,
        height: imgH,
      });
    } else {
      drawImagePlaceholder(pg, ctx, {
        x: SAFE_MARGIN,
        y: imgY,
        width: imgW,
        height: imgH,
        label: "Merch mock unavailable",
      });
    }
    const listX = SAFE_MARGIN + imgW + 36;
    let ly = imgY + imgH - 20;
    drawSectionEyebrow(pg, ctx, { x: listX, y: ly, label: "Ideas" });
    ly -= 28;
    for (const idea of ctx.spec.merchIdeas.slice(0, 6)) {
      const lines = wrapText(
        `— ${idea}`,
        ctx.fonts.body,
        11,
        CONTENT_W - imgW - 36,
      );
      for (const l of lines) {
        pg.drawText(l, {
          x: listX,
          y: ly,
          size: 11,
          font: ctx.fonts.body,
          color: rgbColor(ctx.ink),
        });
        ly -= 18;
      }
      ly -= 4;
    }
    drawRunningFooter(pg, ctx, { pageNumber: pageNum, sectionLabel: "Merchandising" });
  }

  // 18. Do's and Don'ts
  {
    const pageNum = nextPage("Do's & Don'ts");
    const pg = addBlankPage(pdf, [1, 1, 1]);
    drawSectionEyebrow(pg, ctx, {
      x: SAFE_MARGIN,
      y: PAGE_H - SAFE_MARGIN,
      label: "10 · Do's & Don'ts",
    });
    drawPageTitle(pg, ctx, {
      x: SAFE_MARGIN,
      y: PAGE_H - SAFE_MARGIN - 18,
      text: "Keep us consistent.",
      size: 40,
    });
    const colW = (CONTENT_W - 36) / 2;
    const colY = PAGE_H - SAFE_MARGIN - 120;
    const renderCol = (
      x: number,
      title: string,
      items: string[],
      accent: Rgb,
      glyph: string,
    ) => {
      drawSectionEyebrow(pg, ctx, { x, y: colY + 18, label: title, color: accent });
      let yy = colY - 10;
      for (const it of items.slice(0, 6)) {
        pg.drawText(glyph, {
          x,
          y: yy,
          size: 14,
          font: ctx.fonts.display,
          color: rgbColor(accent),
        });
        drawWrappedText(pg, it, {
          x: x + 22,
          y: yy,
          size: 10.5,
          font: ctx.fonts.body,
          color: ctx.ink,
          maxWidth: colW - 22,
          lineGap: 3,
        });
        yy -= 36;
      }
    };
    renderCol(SAFE_MARGIN, "Do", ctx.spec.dos, [0.13, 0.56, 0.32], "+");
    renderCol(
      SAFE_MARGIN + colW + 36,
      "Don't",
      ctx.spec.donts,
      [0.78, 0.2, 0.2],
      "×",
    );
    drawRunningFooter(pg, ctx, { pageNumber: pageNum, sectionLabel: "Do's & Don'ts" });
  }

  // 19. Sales funnel section (only when we have a funnel spec)
  if (funnel) {
    await drawFunnelSection(ctx, funnel, nextPage);
  }

  // 20. Back cover
  {
    const pageNum = nextPage("Back cover");
    const bg = mixRgb(ctx.primary, [0, 0, 0], 0.4);
    const pg = addBlankPage(pdf, bg);
    const fg: Rgb = [0.97, 0.97, 0.96];
    drawSectionEyebrow(pg, ctx, {
      x: SAFE_MARGIN,
      y: PAGE_H - SAFE_MARGIN,
      label: "Thank you",
      color: fg,
    });
    const title = sanitizeForBrandBook(ctx.spec.brandName || "Brand");
    const titleSize = 68;
    const titleLines = wrapText(title, ctx.fonts.display, titleSize, CONTENT_W);
    let yy = PAGE_H / 2 + titleLines.length * titleSize * 0.55;
    for (const line of titleLines) {
      pg.drawText(line, {
        x: SAFE_MARGIN,
        y: yy,
        size: titleSize,
        font: ctx.fonts.display,
        color: rgbColor(fg),
      });
      yy -= titleSize;
    }
    const date = new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    pg.drawText(
      sanitizeForBrandBook(
        `Brand Guidelines · v1 · ${date}`,
      ).toUpperCase(),
      {
        x: SAFE_MARGIN,
        y: SAFE_MARGIN + 8,
        size: 8.5,
        font: ctx.fonts.body,
        color: rgbColor(fg),
      },
    );
    drawRunningFooter(pg, ctx, {
      pageNumber: pageNum,
      sectionLabel: "Colophon",
      onDark: true,
    });
  }

  // ---------- Fill TOC placeholder (page 2) now that we know all page numbers ----------
  {
    drawSectionEyebrow(tocPlaceholder, ctx, {
      x: SAFE_MARGIN,
      y: PAGE_H - SAFE_MARGIN,
      label: "Contents",
    });
    drawPageTitle(tocPlaceholder, ctx, {
      x: SAFE_MARGIN,
      y: PAGE_H - SAFE_MARGIN - 20,
      text: "Contents",
      size: 56,
    });

    const colW = (CONTENT_W - 48) / 2;
    const size = 11.5;
    const lineH = 24;
    const startY = PAGE_H - SAFE_MARGIN - 140;
    const perCol = Math.ceil(tocEntries.length / 2);

    const drawEntry = (
      e: { label: string; page: number },
      x: number,
      y: number,
    ) => {
      const label = sanitizeForBrandBook(e.label);
      const num = String(e.page).padStart(2, "0");
      const numW = ctx.fonts.body.widthOfTextAtSize(num, size);
      const labelW = ctx.fonts.body.widthOfTextAtSize(label, size);
      tocPlaceholder.drawText(label, {
        x,
        y,
        size,
        font: ctx.fonts.body,
        color: rgbColor(ctx.ink),
      });
      tocPlaceholder.drawText(num, {
        x: x + colW - numW,
        y,
        size,
        font: ctx.fonts.body,
        color: rgbColor(ctx.ink),
      });
      const dotStart = x + labelW + 6;
      const dotEnd = x + colW - numW - 6;
      if (dotEnd > dotStart) {
        tocPlaceholder.drawLine({
          start: { x: dotStart, y: y + 2 },
          end: { x: dotEnd, y: y + 2 },
          thickness: 0.5,
          color: rgbColor(ctx.ink),
          opacity: 0.3,
          dashArray: [1, 3],
        });
      }
    };

    tocEntries.slice(0, perCol).forEach((e, i) => {
      drawEntry(e, SAFE_MARGIN, startY - i * lineH);
    });
    tocEntries.slice(perCol).forEach((e, i) => {
      drawEntry(e, SAFE_MARGIN + colW + 48, startY - i * lineH);
    });

    drawRunningFooter(tocPlaceholder, ctx, {
      pageNumber: 2,
      sectionLabel: "Contents",
    });
  }
}

// ----------------------------------------------------------------------------
// Public server action
// ----------------------------------------------------------------------------

export async function generateProspectBrandingPdfAction(input: {
  businessName: string;
  place?: PlacesSearchPlace | null;
  report?: MarketIntelReport | null;
  /** When set (e.g. lead detail later), uploads the PDF to storage and attaches to the lead. */
  leadId?: string | null;
}): Promise<
  | {
      ok: true;
      pdfUrl: string;
      pdfPath: string;
      filename: string;
      imageWarnings?: string[];
    }
  | { ok: false; error: string }
> {
  const t0 = Date.now();
  console.info(
    `[branding-pdf] action start business="${input.businessName}" hasPlace=${Boolean(
      input.place,
    )} hasReport=${Boolean(input.report)}`,
  );

  const auth = await requireAgencyStaff();
  if (auth.error) {
    console.warn(`[branding-pdf] auth failed: ${auth.error}`);
    return { ok: false, error: auth.error };
  }

  const businessName = input.businessName.trim() || "Business";

  // Resolve real brand assets (palette + logo) from the prospect's website
  // BEFORE invoking any LLM, so the brand spec and PDF wash use the real
  // identity instead of LLM-invented colors.
  const effectiveWebsiteUrl =
    input.place?.websiteUri?.trim() ||
    input.report?.customWebsites?.[0]?.trim() ||
    null;
  const realAssets = await resolveProspectBrandAssets({
    websiteUrl: effectiveWebsiteUrl,
  });
  const extractedPalette: ExtractedBrandPalette | null =
    realAssets.primary
      ? {
          primary: realAssets.primary,
          accent: realAssets.accent,
          palette: realAssets.palette,
        }
      : null;
  console.info(
    `[branding-pdf] real-assets palette=${realAssets.palette.length} primary=${
      realAssets.primary ?? "none"
    } logoSource=${realAssets.logoSourceUrl ?? "none"} (${Date.now() - t0}ms)`,
  );

  const vertical: ProspectVertical = classifyProspectVertical({
    place: input.place ?? null,
    signals: null,
  });
  console.info(`[branding-pdf] vertical=${verticalLabel(vertical)}`);

  const specResult = await generateBrandingSpec({
    businessName,
    place: input.place ?? null,
    report: input.report ?? null,
    extractedPalette,
    vertical,
  });
  console.info(
    `[branding-pdf] spec ${specResult.ok ? "ok" : "fail"} (${Date.now() - t0}ms)`,
  );
  if (!specResult.ok) {
    return {
      ok: false,
      error: `Brand spec generation failed: ${specResult.error}`,
    };
  }
  const spec: BrandingSpec = {
    ...specResult.data,
    brandName: specResult.data.brandName || businessName,
  };

  // The original brand-book visuals add 7 image generations on top of the new
  // 6 sales-funnel visuals. On Vercel this can exceed maxDuration, so the
  // default production path keeps the full brand book layout and real logo but
  // uses placeholders for decorative legacy image slots. Set
  // BRANDING_GENERATE_LEGACY_IMAGES=true for slower, all-image exports.
  const imagesPromise = shouldGenerateLegacyBrandImages()
    ? generateBrandingImages(spec)
    : Promise.resolve(
        emptyBrandingImages(
          "Legacy brand-book image generation skipped to keep the sales-funnel PDF within function timeout.",
        ),
      );
  const funnelPromise: Promise<{
    spec: AdsFunnelSpec;
    images: AdsImages;
  } | null> = (async () => {
    const funnelSpecRes = await generateAdsFunnelSpec({
      spec,
      vertical,
      place: input.place ?? null,
      report: input.report ?? null,
    });
    if (!funnelSpecRes.ok) {
      console.warn(`[branding-pdf] funnel spec failed: ${funnelSpecRes.error}`);
      return null;
    }
    const funnelImages = await generateAdsFunnelImages(
      spec,
      funnelSpecRes.data,
      vertical,
    );
    return { spec: funnelSpecRes.data, images: funnelImages };
  })();

  try {
    const pdf = await PDFDocument.create();
    const fonts = await embedBrandBookFonts(pdf, spec.fontPairingId);
    const ctx = buildContext(pdf, spec, fonts);

    const [images, funnelResult] = await Promise.all([
      imagesPromise,
      funnelPromise,
    ]);
    console.info(
      `[branding-pdf] images done (${Date.now() - t0}ms) failed=${Object.keys(
        images.errors,
      ).length}/7 funnel=${funnelResult ? "ok" : "skipped"}`,
    );

    const funnelInput: FunnelComposeInput | null = funnelResult
      ? {
          spec: funnelResult.spec,
          images: funnelResult.images,
          vertical,
        }
      : null;

    await composeBook(ctx, images, realAssets.logoPng, funnelInput);

    const bytes = await pdf.save();
    const safeName =
      spec.brandName
        .replace(/[^\w\-]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 48) || "brand";

    const filename = `${safeName.toLowerCase()}-brand-guidelines.pdf`;
    const lid = input.leadId?.trim();
    const uploaded = await uploadBrandingFunnelPdf({
      bytes: Buffer.from(bytes),
      filename,
      leadId: lid || null,
      userId: auth.user?.id ?? null,
    });
    if (!uploaded.ok) {
      return {
        ok: false,
        error: `Brand guidelines PDF generated but could not be stored: ${uploaded.error}`,
      };
    }

    if (lid && auth.supabase) {
      const { error: linkErr } = await auth.supabase
        .from("lead")
        .update({
          branding_funnel_pdf_path: uploaded.path,
          branding_funnel_pdf_created_at: new Date().toISOString(),
        })
        .eq("id", lid);
      if (linkErr) {
        console.warn("[branding-pdf] persist to lead failed:", linkErr.message);
      }
    }

    const imageWarnings: string[] = [];
    for (const [slot, err] of Object.entries(images.errors)) {
      imageWarnings.push(`${slot}: ${err}`);
    }
    if (funnelResult) {
      for (const [slot, err] of Object.entries(funnelResult.images.errors)) {
        imageWarnings.push(`funnel.${slot}: ${err}`);
      }
    }

    console.info(
      `[branding-pdf] done ${bytes.length} bytes, stored=${uploaded.path} (${
        Date.now() - t0
      }ms)`,
    );

    return {
      ok: true,
      pdfUrl: uploaded.publicUrl,
      pdfPath: uploaded.path,
      filename,
      ...(imageWarnings.length ? { imageWarnings } : {}),
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Brand guidelines PDF could not be generated.";
    console.error(`[branding-pdf] fail ${msg} (${Date.now() - t0}ms)`, e);
    return { ok: false, error: msg };
  }
}
