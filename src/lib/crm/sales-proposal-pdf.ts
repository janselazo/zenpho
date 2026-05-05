/**
 * Branded landscape narrative proposal PDF (shared design system with brand guidelines).
 */

import { Buffer } from "node:buffer";
import { PDFDocument, type PDFImage, type PDFPage } from "pdf-lib";
import {
  type BrandBookContext,
  CONTENT_W,
  PAGE_H,
  PAGE_W,
  SAFE_MARGIN,
  addBlankPage,
  buildContext,
  drawCoverPage,
  drawImageFitClipped,
  drawPageTitle,
  drawRunningFooter,
  drawSectionEyebrow,
  drawWrappedText,
  embedBrandBookFonts,
  embedPngIfAny,
  sanitizeForBrandBook,
} from "@/lib/crm/pdf-brand-book";
import {
  buildSyntheticProposalBrandingSpec,
  industryLineFromPlaceTypes,
  parseProposalH2Sections,
} from "@/lib/crm/proposal-pdf-brand-spec";
import type { ProposalPdfRasterSlot } from "@/lib/crm/proposal-pdf-rasters";
import { stripMarkdownForProposalPdf } from "@/lib/crm/proposal-enrichment-context";
import type { ResolvedBrandAssets } from "@/lib/crm/prospect-branding-asset-resolve";
import {
  hasProspectBrandVisualCues,
  readZenphoPdfLogoPng,
  readZenphoPdfMarkPng,
} from "@/lib/crm/proposal-brand-cues";

const DOC_LABEL = "Business proposal";

export function slugifyPdfFilenameSegment(name: string): string {
  const t = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 56);
  return t || "client";
}

export type SalesProposalPdfInput = {
  proposalTitle: string;
  /** Buyer line (name / company) — also seeds synthetic brand name. */
  clientLine: string;
  investmentLine: string;
  markdownBody: string;
  generatedAtLabel: string;
  embeddedRasters?: ProposalPdfRasterSlot[];
  /** Homepage scrape — drives palette + primary in synthetic spec. */
  brandAssets?: ResolvedBrandAssets | null;
  /** Google place `types` for cover footer industry line. */
  placeTypes?: string[] | null;
};

type FlowResult = { page: PDFPage; y: number; pageNum: number };

function renderWrappedFlow(
  pdf: PDFDocument,
  ctx: BrandBookContext,
  start: FlowResult,
  text: string,
  opts: {
    narrowX: number;
    narrowW: number;
    size: number;
    sectionLabel: string;
    documentLabel: string;
    publisherMark?: PDFImage | null;
  },
): FlowResult {
  const marginBottom = SAFE_MARGIN + 32;
  const blocks = text.split(/\n\n+/).map((b) => b.trim()).filter(Boolean);
  let { page, y, pageNum } = start;
  let useNarrow = true;

  for (const block of blocks) {
    const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
    for (const line of lines) {
      const marked = /^[-*]\s+/.test(line)
        ? `• ${line.replace(/^[-*]\s+/, "")}`
        : line;
      const safe = sanitizeForBrandBook(marked);
      const x = useNarrow ? opts.narrowX : SAFE_MARGIN;
      const maxWidth = useNarrow ? opts.narrowW : CONTENT_W;
      const nextY = drawWrappedText(page, safe, {
        x,
        y,
        size: opts.size,
        font: ctx.fonts.body,
        color: ctx.ink,
        maxWidth,
        lineGap: 4,
      });
      y = nextY - 8;
      if (y < marginBottom) {
        drawRunningFooter(page, ctx, {
          pageNumber: pageNum,
          sectionLabel: opts.sectionLabel,
          documentLabel: opts.documentLabel,
          ...(opts.publisherMark ? { publisherMark: opts.publisherMark } : {}),
        });
        pageNum += 1;
        page = addBlankPage(pdf, ctx.surface);
        y = PAGE_H - SAFE_MARGIN;
        useNarrow = false;
      }
    }
    y -= 4;
  }
  return { page, y, pageNum };
}

export async function buildSalesProposalPdfBytes(
  input: SalesProposalPdfInput,
): Promise<Uint8Array> {
  const industry = industryLineFromPlaceTypes(input.placeTypes);
  const spec = buildSyntheticProposalBrandingSpec({
    buyerDisplayName: input.clientLine.trim() || input.proposalTitle,
    proposalTitle: input.proposalTitle,
    markdownBody: input.markdownBody,
    industryLine: industry,
    brandAssets: input.brandAssets ?? null,
  });

  const pdf = await PDFDocument.create();
  const fonts = await embedBrandBookFonts(pdf, spec.fontPairingId);
  const ctx = buildContext(pdf, spec, fonts);

  const useZenphoVisual = !hasProspectBrandVisualCues(input.brandAssets ?? null);
  const [zenphoLogoBuf, zenphoMarkBuf] = await Promise.all([
    useZenphoVisual ? readZenphoPdfLogoPng() : Promise.resolve(null),
    useZenphoVisual ? readZenphoPdfMarkPng() : Promise.resolve(null),
  ]);
  const zenphoLogoImg =
    zenphoLogoBuf?.length ?
      await embedPngIfAny(pdf, Buffer.from(zenphoLogoBuf))
    : null;
  const zenphoMarkImg =
    zenphoMarkBuf?.length ?
      await embedPngIfAny(pdf, Buffer.from(zenphoMarkBuf))
    : null;
  const publisherMark = useZenphoVisual ? zenphoMarkImg : null;

  const rasters = input.embeddedRasters ?? [];
  const coverBuf =
    rasters[0]?.bytes?.length ? Buffer.from(rasters[0].bytes) : null;
  const coverImg = await embedPngIfAny(pdf, coverBuf);
  const coverPage = await drawCoverPage(ctx, coverImg, {
    eyebrowLabel: DOC_LABEL,
    ...(useZenphoVisual && !coverImg ?
      ({ variant: "lightSurface" } as const)
    : {}),
  });

  if (useZenphoVisual && zenphoLogoImg && !coverImg) {
    const lh = 38;
    const lw = (zenphoLogoImg.width / zenphoLogoImg.height) * lh;
    coverPage.drawImage(zenphoLogoImg, {
      x: PAGE_W - SAFE_MARGIN - lw,
      y: SAFE_MARGIN,
      width: lw,
      height: lh,
    });
  } else if (useZenphoVisual && zenphoMarkImg && coverImg) {
    const mh = 11;
    const mw = (zenphoMarkImg.width / zenphoMarkImg.height) * mh;
    coverPage.drawImage(zenphoMarkImg, {
      x: PAGE_W - SAFE_MARGIN - mw,
      y: SAFE_MARGIN + 4,
      width: mw,
      height: mh,
      opacity: 0.94,
    });
  }

  let parsed = parseProposalH2Sections(input.markdownBody);
  if (!parsed.length) {
    parsed = [
      {
        title: "Proposal",
        body: stripMarkdownForProposalPdf(input.markdownBody).trim(),
      },
    ];
  }

  const hasInvestHeading = parsed.some((s) =>
    /\binvestment\b|\bpricing\b/i.test(s.title),
  );
  const appendix =
    input.investmentLine.trim().length > 0 && !hasInvestHeading
      ? { title: "Investment estimate", body: input.investmentLine.trim() }
      : null;
  const allSections = appendix ? [...parsed, appendix] : parsed;

  let pageNum = 1;

  const tocPage = addBlankPage(pdf, ctx.surface);
  pageNum += 1;
  drawSectionEyebrow(tocPage, ctx, {
    x: SAFE_MARGIN,
    y: PAGE_H - SAFE_MARGIN,
    label: "Contents",
  });
  drawPageTitle(tocPage, ctx, {
    x: SAFE_MARGIN,
    y: PAGE_H - SAFE_MARGIN - 72,
    text: "Proposal sections",
    size: 44,
  });
  const tocLines = allSections
    .map((s, i) => `${i + 1}. ${sanitizeForBrandBook(s.title)}`)
    .join("\n");
  drawWrappedText(tocPage, tocLines, {
    x: SAFE_MARGIN,
    y: PAGE_H - SAFE_MARGIN - 130,
    size: 11,
    font: ctx.fonts.body,
    color: ctx.ink,
    maxWidth: CONTENT_W,
    lineGap: 7,
  });
  drawRunningFooter(tocPage, ctx, {
    pageNumber: pageNum,
    sectionLabel: "Contents",
    documentLabel: DOC_LABEL,
    ...(publisherMark ? { publisherMark } : {}),
  });

  const rasterPool = rasters.length ? rasters : [];

  for (let si = 0; si < allSections.length; si++) {
    const section = allSections[si];
    const part = String(si + 1).padStart(2, "0");
    const footerLabel = sanitizeForBrandBook(section.title).slice(0, 42);

    pageNum += 1;
    let page = addBlankPage(pdf, ctx.surface);
    drawSectionEyebrow(page, ctx, {
      x: SAFE_MARGIN,
      y: PAGE_H - SAFE_MARGIN,
      label: `${part} · Section`,
    });
    const titleBottom = drawPageTitle(page, ctx, {
      x: SAFE_MARGIN,
      y: PAGE_H - SAFE_MARGIN - 58,
      text: section.title,
      size: 34,
      maxWidth: CONTENT_W * 0.62,
    });

    let bodyTop = titleBottom - 16;
    let textX = SAFE_MARGIN;
    let textW = CONTENT_W;

    if (rasterPool.length) {
      const slot = rasterPool[si % rasterPool.length];
      const img = await embedPngIfAny(pdf, Buffer.from(slot.bytes));
      if (img) {
        const boxW = CONTENT_W * 0.36;
        const boxH = 200;
        const ix = PAGE_W - SAFE_MARGIN - boxW;
        const iy = bodyTop - boxH + 40;
        drawImageFitClipped(
          page,
          img,
          { x: ix, y: iy, width: boxW, height: boxH },
          "cover",
        );
        drawWrappedText(page, sanitizeForBrandBook(slot.caption), {
          x: ix,
          y: iy - 6,
          size: 7.5,
          font: ctx.fonts.body,
          color: ctx.ink,
          maxWidth: boxW,
          lineGap: 2,
          opacity: 0.75,
        });
        textW = ix - SAFE_MARGIN - 16;
      }
    }

    const flowStart: FlowResult = {
      page,
      y: bodyTop,
      pageNum,
    };
    const after = renderWrappedFlow(pdf, ctx, flowStart, section.body, {
      narrowX: textX,
      narrowW: textW,
      size: 10.5,
      sectionLabel: footerLabel,
      documentLabel: DOC_LABEL,
      publisherMark,
    });

    drawRunningFooter(after.page, ctx, {
      pageNumber: after.pageNum,
      sectionLabel: footerLabel,
      documentLabel: DOC_LABEL,
      ...(publisherMark ? { publisherMark } : {}),
    });
    pageNum = after.pageNum;
  }

  return pdf.save();
}
