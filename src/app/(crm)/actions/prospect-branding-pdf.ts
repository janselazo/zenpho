"use server";

import { PDFDocument, degrees } from "pdf-lib";
import type { MarketIntelReport } from "@/lib/crm/prospect-intel-report";
import type { PlacesSearchPlace } from "@/lib/crm/places-types";
import { requireAgencyStaff } from "@/app/(crm)/actions/prospect-preview-agency";
import {
  generateBrandingSpec,
  type BrandingSpec,
} from "@/lib/crm/prospect-branding-spec-llm";
import {
  generateBrandingImages,
  type BrandingImages,
} from "@/lib/crm/prospect-branding-image-gen";
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
// Main composition
// ----------------------------------------------------------------------------

async function composeBook(
  ctx: BrandBookContext,
  images: BrandingImages,
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
    const wordmark = await embedPngIfAny(pdf, images.logos[0]);
    if (wordmark) {
      drawImageFit(pg, wordmark, { x: boxX, y: boxY, width: boxW, height: boxH });
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
      "Minimum size: 40 px digital / 20 mm print. Always leave clearspace equal to the height of a capital letter around the mark. Prefer the primary color on white; inverse version on dark imagery.",
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

  // 19. Back cover
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
}): Promise<
  | {
      ok: true;
      pdfBase64: string;
      filename: string;
      imageWarnings?: string[];
    }
  | { ok: false; error: string }
> {
  const auth = await requireAgencyStaff();
  if (auth.error) return { ok: false, error: auth.error };

  const businessName = input.businessName.trim() || "Business";

  const specResult = await generateBrandingSpec({
    businessName,
    place: input.place ?? null,
    report: input.report ?? null,
  });
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

  // Image generation runs in parallel with PDF setup; failures are non-fatal.
  const imagesPromise = generateBrandingImages(spec);

  try {
    const pdf = await PDFDocument.create();
    const fonts = await embedBrandBookFonts(pdf, spec.fontPairingId);
    const ctx = buildContext(pdf, spec, fonts);

    const images = await imagesPromise;
    await composeBook(ctx, images);

    const bytes = await pdf.save();
    const pdfBase64 = Buffer.from(bytes).toString("base64");
    const safeName =
      spec.brandName
        .replace(/[^\w\-]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 48) || "brand";

    const imageWarnings = Object.entries(images.errors).map(
      ([slot, err]) => `${slot}: ${err}`,
    );

    return {
      ok: true,
      pdfBase64,
      filename: `${safeName.toLowerCase()}-brand-guidelines.pdf`,
      ...(imageWarnings.length ? { imageWarnings } : {}),
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Brand guidelines PDF could not be generated.";
    return { ok: false, error: msg };
  }
}
