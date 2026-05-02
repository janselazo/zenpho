import type {
  AuditFinding,
  AuditGrade,
  AuditSeverity,
  GoogleLocalRankItem,
  RevenueLeakAudit,
} from "./types";

export type AuditShareImageResult = {
  svg: string;
  width: number;
  height: number;
  filename: string;
};

export type AuditShareImageOptions = {
  /**
   * Data URL (`data:image/png;base64,...` etc.) for the business logo — embed in SVG so
   * rasterizing to PNG avoids cross-origin `<image>` taint inside the SVG.
   */
  logoDataUrl?: string | null;
};

const WIDTH = 1200;
const HEIGHT_BASE = 1200;
const MARGIN_X = 32;
const CARD_W = WIDTH - MARGIN_X * 2;
const PAGE_BG = "#eceef2";
const CARD_BG = "#ffffff";
const CARD_STROKE = "#e2e4e8";
const INK = "#111827";
const MUTED = "#6b7280";
const ACCENT = "#2563eb";
const ACCENT_SOFT = "#eff6ff";
const FOOTER_LINE = "#d1d5db";
const INNER_PAD = 24;
const LOGO_BOX = 52;
const LOGO_GAP = 16;

/** Pill presets: bg, fg */
const PILL_RATING = { bg: "#fef3c7", fg: "#92400e" };
const PILL_REVIEWS = { bg: "#dbeafe", fg: "#1e40af" };
const PILL_PHOTOS = { bg: "#ede9fe", fg: "#5b21b6" };
const PILL_WEBSITE = { bg: "#d1fae5", fg: "#065f46" };

const SEVERITY_ORDER: Record<AuditSeverity, number> = {
  Critical: 0,
  High: 1,
  Medium: 2,
  Low: 3,
};

/**
 * Fetch a raster image in the browser and return a data URL for embedding in SVG.
 * Returns null if CORS blocks the request or the URL is unusable.
 */
export async function tryFetchImageAsDataUrl(
  url: string | null | undefined,
): Promise<string | null> {
  const trimmed = typeof url === "string" ? url.trim() : "";
  if (!trimmed || !/^https?:\/\//i.test(trimmed)) return null;
  try {
    const res = await fetch(trimmed, { mode: "cors", credentials: "omit", cache: "force-cache" });
    if (!res.ok) return null;
    const blob = await res.blob();
    if (!blob || blob.size === 0) return null;
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () =>
        resolve(typeof reader.result === "string" ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function esc(value: string | null | undefined): string {
  return (value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function clamp(value: string | null | undefined, max = 90): string {
  const t = (value ?? "").trim().replace(/\s+/g, " ");
  if (t.length <= max) return t;
  return `${t.slice(0, Math.max(0, max - 3)).trim()}...`;
}

function money(value: number): string {
  return `$${Math.round(value).toLocaleString("en-US")}`;
}

function businessSlug(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60) || "business"
  );
}

function donutStrokeForGrade(grade: AuditGrade): string {
  switch (grade) {
    case "Excellent":
      return "#16a34a";
    case "Good":
      return "#22c55e";
    case "Average":
      return "#ca8a04";
    case "Poor":
    default:
      return "#dc2626";
  }
}

/** Wider than real width avoids pill rects clipping label text (fonts vary by renderer). */
function approximateTextWidth(chars: number, px = 13): number {
  return Math.round(chars * px * 0.62 + 10);
}

function pill(
  x: number,
  y: number,
  label: string,
  preset: { bg: string; fg: string },
  fontSize = 13,
): { svg: string; width: number } {
  const w = Math.min(
    340,
    Math.max(72, approximateTextWidth(label.length + 2, fontSize) + 26),
  );
  const h = 30;
  const svg = `<g>
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${h / 2}" fill="${preset.bg}"/>
    <text x="${x + w / 2}" y="${y + h / 2 + fontSize / 3}" text-anchor="middle" font-size="${fontSize}" font-weight="600" fill="${preset.fg}" font-family="system-ui, -apple-system, Segoe UI, sans-serif">${esc(label)}</text>
  </g>`;
  return { svg, width: w };
}

function pickTopFindings(findings: AuditFinding[], limit: number): AuditFinding[] {
  return [...findings]
    .sort((a, b) => {
      const s = SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
      if (s !== 0) return s;
      return b.priorityScore - a.priorityScore;
    })
    .slice(0, limit);
}

function renderDonut(cx: number, cy: number, score: number, grade: AuditGrade): string {
  const r = 52;
  const stroke = 10;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, score / 100));
  const dash = pct * c;
  const gap = c - dash;
  const arcColor = donutStrokeForGrade(grade);

  return `<g transform="translate(${cx},${cy})">
  <circle cx="0" cy="0" r="${r}" fill="none" stroke="#eceef2" stroke-width="${stroke}"/>
  <circle cx="0" cy="0" r="${r}" fill="none" stroke="${arcColor}" stroke-width="${stroke}" stroke-linecap="round"
    stroke-dasharray="${dash.toFixed(2)} ${gap.toFixed(2)}" transform="rotate(-90)"/>
  <text x="0" y="5" text-anchor="middle" font-size="28" font-weight="800" fill="${INK}" font-family="system-ui, -apple-system, Segoe UI, sans-serif">${score}</text>
  <text x="0" y="26" text-anchor="middle" font-size="12" font-weight="600" fill="${MUTED}" font-family="system-ui, -apple-system, Segoe UI, sans-serif">${esc(grade)}</text>
</g>`;
}

/**
 * `#n` prefix plus business name wrapped at word boundaries for two-line SVG rows with stats on the right.
 */
function wrapRankListingTitle(prefix: string, body: string, maxLine1Chars: number, maxLine2Chars: number): {
  line1: string;
  line2: string | null;
} {
  const name = clamp(body.trim(), 120);
  const full = `${prefix}${name}`;
  if (full.length <= maxLine1Chars) return { line1: full, line2: null };

  const words = name.split(/\s+/).filter(Boolean);
  const line1Words: string[] = [];
  let i = 0;
  for (; i < words.length; i++) {
    const trial = `${prefix}${[...line1Words, words[i]].join(" ")}`;
    if (trial.length <= maxLine1Chars || line1Words.length === 0) line1Words.push(words[i]);
    else break;
  }
  const line1 = `${prefix}${line1Words.join(" ")}`;
  if (i >= words.length) return { line1, line2: null };

  const rest = words.slice(i).join(" ");
  return {
    line1,
    line2: clamp(rest, maxLine2Chars),
  };
}

const RANK_LINE1_CHARS = 48;
const RANK_LINE2_CHARS = 56;

function rankRowSvg(
  innerLeftPad: number,
  cardTop: number,
  yFromCardTop: number,
  rowW: number,
  item: GoogleLocalRankItem,
): { svg: string; rowH: number } {
  const stats = `${item.rating ?? "N/A"} stars · ${item.reviewCount ?? 0} reviews`;
  const prefix = `#${item.position} `;
  const rawName = (item.name ?? "").trim();
  const { line1, line2 } = wrapRankListingTitle(prefix, rawName, RANK_LINE1_CHARS, RANK_LINE2_CHARS);

  const rowH = line2 ? 70 : 54;
  const rx = innerLeftPad;
  const ry = cardTop + yFromCardTop;
  const accentStroke = item.isSelectedBusiness ? ACCENT : CARD_STROKE;
  const fill = item.isSelectedBusiness ? ACCENT_SOFT : CARD_BG;
  const statsBaseline = ry + rowH / 2 + 5;

  const nameBlock =
    line2 ?
      `<text x="${rx + 14}" y="${ry + 26}" font-size="14" font-weight="700" fill="${INK}" font-family="system-ui, -apple-system, Segoe UI, sans-serif">${esc(line1)}</text>
  <text x="${rx + 14}" y="${ry + 48}" font-size="14" font-weight="700" fill="${INK}" font-family="system-ui, -apple-system, Segoe UI, sans-serif">${esc(line2)}</text>`
    : `<text x="${rx + 14}" y="${statsBaseline}" font-size="15" font-weight="700" fill="${INK}" font-family="system-ui, -apple-system, Segoe UI, sans-serif">${esc(line1)}</text>`;

  const svg = `<rect x="${rx}" y="${ry}" width="${rowW}" height="${rowH}" rx="14" fill="${fill}" stroke="${accentStroke}" stroke-width="1.25"/>
  ${nameBlock}
  <text x="${rx + rowW - 14}" y="${statsBaseline}" text-anchor="end" font-size="13" font-weight="600" fill="${MUTED}" font-family="system-ui, -apple-system, Segoe UI, sans-serif">${esc(stats)}</text>`;

  return { svg, rowH };
}

function renderRankingSection(
  cardTop: number,
  audit: RevenueLeakAudit,
): { svgParts: string; cardH: number } {
  const snap = audit.rankingSnapshot;
  const selectedInTopFive = snap.topFive.some((i) => i.isSelectedBusiness);
  const rankPos =
    snap.topFive.find((i) => i.isSelectedBusiness)?.position ??
    snap.selectedBusinessRankItem?.position ??
    null;

  const innerPadX = MARGIN_X + INNER_PAD;
  const rowW = CARD_W - INNER_PAD * 2;
  const rightEdge = WIDTH - MARGIN_X - INNER_PAD;

  let y = INNER_PAD + 76;
  const headerParts: string[] = [
    `<text x="${innerPadX}" y="${cardTop + INNER_PAD + 22}" font-size="11" fill="${ACCENT}" font-weight="700" letter-spacing="0.12em" font-family="system-ui, -apple-system, Segoe UI, sans-serif">WHO'S BEATING YOU ON GOOGLE</text>`,
    `<text x="${innerPadX}" y="${cardTop + INNER_PAD + 52}" font-size="22" font-weight="800" fill="${INK}" font-family="system-ui, -apple-system, Segoe UI, sans-serif">Local ranking snapshot</text>`,
    `<text x="${innerPadX}" y="${cardTop + INNER_PAD + 80}" font-size="13" fill="${MUTED}" font-family="system-ui, -apple-system, Segoe UI, sans-serif">Query: ${esc(clamp(snap.query, 72))}</text>`,
  ];

  if (rankPos != null) {
    const full = `Your Google Business ranks #${rankPos}.`;
    headerParts.push(
      `<text x="${rightEdge}" y="${cardTop + INNER_PAD + 22}" text-anchor="end" font-size="12" fill="${INK}" font-weight="600" font-family="system-ui, -apple-system, Segoe UI, sans-serif">${esc(full)}</text>`,
    );
  }

  const rowPieces: string[] = [];
  for (const item of snap.topFive) {
    const { svg, rowH } = rankRowSvg(innerPadX, cardTop, y, rowW, item);
    rowPieces.push(svg);
    y += rowH + 12;
  }

  if (!selectedInTopFive && snap.selectedBusinessRankItem) {
    rowPieces.push(
      `<text x="${innerPadX + rowW / 2}" y="${cardTop + y + 8}" text-anchor="middle" font-size="13" font-weight="700" fill="${MUTED}" font-family="system-ui, -apple-system, Segoe UI, sans-serif">…</text>`,
    );
    y += 24;
    const { svg: extraSvg, rowH: rh } = rankRowSvg(
      innerPadX,
      cardTop,
      y,
      rowW,
      snap.selectedBusinessRankItem,
    );
    rowPieces.push(extraSvg);
    y += rh + 12;
  }

  if (!snap.selectedBusinessRankItem) {
    rowPieces.push(`<rect x="${innerPadX}" y="${cardTop + y}" width="${rowW}" height="48" rx="14" fill="#fffbeb" stroke="#fcd34d" stroke-width="1"/>
  <text x="${innerPadX + rowW / 2}" y="${cardTop + y + 30}" text-anchor="middle" font-size="13" font-weight="600" fill="#92400e" font-family="system-ui, -apple-system, Segoe UI, sans-serif">Not found in the first ${snap.totalResultsChecked} results checked.</text>`);
    y += 60;
  }

  const cardH = y + INNER_PAD;
  const svgParts = `<rect x="${MARGIN_X}" y="${cardTop}" width="${CARD_W}" height="${cardH}" rx="22" fill="${CARD_BG}" stroke="${CARD_STROKE}" stroke-width="1"/>
  ${headerParts.join("\n  ")}
  ${rowPieces.join("\n  ")}`;

  return { svgParts, cardH };
}

function renderCtaCard(ctaTop: number): { svg: string; cardH: number } {
  const inner = MARGIN_X + INNER_PAD;
  const pillW = 196;
  const pillH = 46;
  const pillX = MARGIN_X + CARD_W - INNER_PAD - pillW;
  const pillY = ctaTop + INNER_PAD + 36;
  const cardH = INNER_PAD + 112 + INNER_PAD;

  const svg = `<rect x="${MARGIN_X}" y="${ctaTop}" width="${CARD_W}" height="${cardH}" rx="22" fill="${CARD_BG}" stroke="${CARD_STROKE}" stroke-width="1"/>
  <text x="${inner}" y="${ctaTop + INNER_PAD + 22}" font-size="11" fill="${ACCENT}" font-weight="700" letter-spacing="0.12em" font-family="system-ui, -apple-system, Segoe UI, sans-serif">NEXT STEP</text>
  <text x="${inner}" y="${ctaTop + INNER_PAD + 56}" font-size="22" font-weight="800" fill="${INK}" font-family="system-ui, -apple-system, Segoe UI, sans-serif">Ready to recover lost revenue?</text>
  <text x="${inner}" y="${ctaTop + INNER_PAD + 84}" font-size="14" fill="${MUTED}" font-family="system-ui, -apple-system, Segoe UI, sans-serif">${esc(clamp(
    "We'll review your audit results with you, highlight the biggest opportunities, and recommend where to start.",
    88,
  ))}</text>
  <rect x="${pillX}" y="${pillY}" width="${pillW}" height="${pillH}" rx="${pillH / 2}" fill="${ACCENT}"/>
  <text x="${pillX + pillW / 2}" y="${pillY + pillH / 2 + 6}" text-anchor="middle" font-size="14" font-weight="700" fill="#ffffff" font-family="system-ui, -apple-system, Segoe UI, sans-serif">Start fixing leaks</text>`;

  return { svg, cardH };
}

/**
 * Tall SVG share image: GBP (+ optional logo), brand, revenue snapshot, local ranking,
 * next-step CTA (converted to PNG client-side).
 */
export function renderAuditShareImage(
  audit: RevenueLeakAudit,
  options?: AuditShareImageOptions,
): AuditShareImageResult {
  const b = audit.business;
  const m = audit.moneySummary;
  const bio = audit.brandIdentity;
  const wa = audit.websiteAudit;
  const score = audit.scores.overall;
  const grade = audit.scores.grade;
  const logoDataUrl = options?.logoDataUrl?.trim();

  const photoN = b.photoCount ?? b.photos?.length ?? 0;
  const ratingLbl = b.rating != null ? `${b.rating.toFixed(1)} rating` : "No rating";
  const reviewsLbl = `${b.reviewCount ?? 0} reviews`;
  const photosLbl = `${photoN} photos`;
  const siteLbl = b.website?.trim() ? "Website linked" : "No website on listing";

  const card1Top = MARGIN_X;
  const innerLeftBase = MARGIN_X + INNER_PAD;
  const textShift = logoDataUrl ? LOGO_BOX + LOGO_GAP : 0;
  const innerLeftText = innerLeftBase + textShift;
  const rightTextEdge = WIDTH - MARGIN_X - INNER_PAD;
  /** Keep score gauge in the header band; pills/phone sit below so nothing stacks on the donut. */
  const donutCx = WIDTH - MARGIN_X - INNER_PAD - 66;
  const donutCy = card1Top + INNER_PAD + 58;
  const donutOuterR = 52 + 10;
  /** Vertical position for logo aligns with GBP title block when present. */
  const logoTop = card1Top + INNER_PAD + 18;

  let clipDef = "";
  let logoGfx = "";
  if (logoDataUrl) {
    const clipId = "rlaShareLogoClip";
    clipDef = `<defs><clipPath id="${clipId}"><rect x="${innerLeftBase}" y="${logoTop}" width="${LOGO_BOX}" height="${LOGO_BOX}" rx="12"/></clipPath></defs>`;
    const safeHref = logoDataUrl.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
    logoGfx = `<rect x="${innerLeftBase}" y="${logoTop}" width="${LOGO_BOX}" height="${LOGO_BOX}" rx="12" fill="#f9fafb" stroke="${CARD_STROKE}" stroke-width="1"/>
  <image x="${innerLeftBase}" y="${logoTop}" width="${LOGO_BOX}" height="${LOGO_BOX}" href="${safeHref}" preserveAspectRatio="xMidYMid meet" clip-path="url(#${clipId})"/>`;
  }

  const addressBaseline = card1Top + INNER_PAD + 108;
  const pillsY = Math.max(addressBaseline + 24, donutCy + donutOuterR + 12);
  const pillRowH = 32;

  let px = innerLeftText;
  const pills: string[] = [];
  for (const { label, preset } of [
    { label: ratingLbl, preset: PILL_RATING },
    { label: reviewsLbl, preset: PILL_REVIEWS },
    { label: photosLbl, preset: PILL_PHOTOS },
    { label: siteLbl, preset: PILL_WEBSITE },
  ] as const) {
    const { svg: ps, width: pw } = pill(px, pillsY, label, preset);
    pills.push(ps);
    px += pw + 10;
  }

  const categoryLine = [
    b.category?.trim() || "Business",
    (b.businessStatus || "Operational").replace(/_/g, " "),
  ].join(" · ");
  const address = clamp(b.address, logoDataUrl ? 60 : 76);
  const phoneDisplay = clamp(b.phone || wa.contactLinks.phone, 28);

  const pillsBottom = pillsY + pillRowH;
  const phoneLineY = pillsBottom + 18;
  const contentBottom = Math.max(
    phoneDisplay.trim() || b.googleMapsUri ? phoneLineY + 22 : pillsBottom + 10,
    donutCy + donutOuterR + INNER_PAD / 2,
  );
  const card1H = contentBottom + INNER_PAD - card1Top;

  const card2Top = card1Top + card1H + 14;
  const paletteContentW = CARD_W - INNER_PAD * 2;
  const swatchY = card2Top + INNER_PAD + 112;
  const palette = bio.palette.slice(0, 5);
  const nDots = palette.length;
  /** Evenly spaced swatch centers across the inner content width */
  let paletteDotsSvg = "";
  if (nDots > 0) {
    const usable = paletteContentW - 26;
    const step = nDots <= 1 ? 0 : usable / (nDots - 1 || 1);
    for (let i = 0; i < nDots; i++) {
      const cx = innerLeftBase + 13 + i * step;
      const hex = palette[i];
      paletteDotsSvg += `<circle cx="${cx}" cy="${swatchY}" r="13" fill="${esc(hex)}"/>`;
    }
  }

  const rolesY = swatchY + 40;
  const halfW = Math.floor(paletteContentW / 2);
  let primaryAccentRow = "";
  if (bio.primaryColor) {
    primaryAccentRow += `<g transform="translate(0,0)">
      <circle cx="${innerLeftBase + 10}" cy="${rolesY}" r="10" fill="${esc(bio.primaryColor)}"/>
      <text x="${innerLeftBase + 26}" y="${rolesY + 5}" font-size="13" font-weight="600" fill="${INK}" font-family="system-ui, -apple-system, Segoe UI, sans-serif">Primary</text>
    </g>`;
  }
  if (bio.accentColor) {
    const ax = bio.primaryColor ? innerLeftBase + halfW : innerLeftBase;
    primaryAccentRow += `<g>
      <circle cx="${ax + 10}" cy="${rolesY}" r="10" fill="${esc(bio.accentColor)}"/>
      <text x="${ax + 26}" y="${rolesY + 5}" font-size="13" font-weight="600" fill="${INK}" font-family="system-ui, -apple-system, Segoe UI, sans-serif">Accent</text>
    </g>`;
  }

  const typoTitleY = rolesY + 36;
  const typoLineStart = typoTitleY + 22;
  const typoLines =
    bio.typographyNotes.slice(0, 4).map((line, i) => {
      return `<text x="${innerLeftBase}" y="${typoLineStart + i * 20}" font-size="13" fill="${MUTED}" font-family="system-ui, -apple-system, Segoe UI, sans-serif">${esc(`• ${clamp(line, 90)}`)}</text>`;
    }) ?? [];

  const brandSubtitle = clamp(
    bio.brandPresenceSummary || "Signals from your homepage.",
    92,
  );

  /** Brand card grows with typography lines — height from card top through last bullet (+ padding). */
  const typographyBottom =
    typoLines.length > 0 ? typoLineStart + typoLines.length * 20 + 8 : typoTitleY + 16;
  const card2H = typographyBottom - card2Top + INNER_PAD;

  const card3Top = card2Top + card2H + 14;

  const findings = pickTopFindings(audit.findings, 4);
  const findingStartY = card3Top + INNER_PAD + 112;
  const findingLines = findings.map((f, i) => {
    const lx = MARGIN_X + INNER_PAD + 12 + i * 16;
    const ly = findingStartY + i * 40;
    const fill = i === findings.length - 1 ? MUTED : INK;
    const txt = clamp(`${f.severity}: ${f.title}`, 64);
    return `<text x="${lx}" y="${ly}" font-size="17" font-weight="600" fill="${fill}" font-family="system-ui, -apple-system, Segoe UI, sans-serif">${esc(txt)}</text>`;
  });

  const card3BodyH = INNER_PAD + 96 + findings.length * 40 + INNER_PAD + 8;
  const card3H = Math.max(card3BodyH, 280);

  const card4Top = card3Top + card3H + 14;
  const { svgParts: rankingGfx, cardH: card4H } = renderRankingSection(card4Top, audit);

  const card5Top = card4Top + card4H + 14;
  const { svg: ctaGfx, cardH: card5H } = renderCtaCard(card5Top);

  const footerY = card5Top + card5H + 22;

  const slug = businessSlug(b.name);
  const filename = `${slug}-revenue-leak-audit-summary.png`;

  const effectiveHeight = Math.max(HEIGHT_BASE, footerY + 72);

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${effectiveHeight}" viewBox="0 0 ${WIDTH} ${effectiveHeight}">
  ${clipDef}
  <rect width="${WIDTH}" height="${effectiveHeight}" fill="${PAGE_BG}"/>
  <rect x="${MARGIN_X}" y="${card1Top}" width="${CARD_W}" height="${card1H}" rx="22" fill="${CARD_BG}" stroke="${CARD_STROKE}" stroke-width="1"/>
  ${logoGfx}
  <text x="${innerLeftText}" y="${card1Top + INNER_PAD + 22}" font-size="12" fill="${ACCENT}" font-weight="700" letter-spacing="0.14em" font-family="system-ui, -apple-system, Segoe UI, sans-serif">GOOGLE BUSINESS PROFILE</text>
  <text x="${innerLeftText}" y="${card1Top + INNER_PAD + 62}" font-size="26" font-weight="800" fill="${INK}" font-family="system-ui, -apple-system, Segoe UI, sans-serif">${esc(clamp(b.name, 48))}</text>
  <text x="${innerLeftText}" y="${card1Top + INNER_PAD + 88}" font-size="14" fill="${MUTED}" font-family="system-ui, -apple-system, Segoe UI, sans-serif">${esc(categoryLine)}</text>
  <text x="${innerLeftText}" y="${card1Top + INNER_PAD + 108}" font-size="13" fill="${MUTED}" font-family="system-ui, -apple-system, Segoe UI, sans-serif">${esc(address)}</text>
  ${renderDonut(donutCx, donutCy, score, grade)}
  ${pills.join("\n  ")}
  ${phoneDisplay ?
    `<text x="${innerLeftText}" y="${phoneLineY}" font-size="14" font-weight="600" fill="${INK}" font-family="system-ui, -apple-system, Segoe UI, sans-serif">${esc(phoneDisplay)}</text>`
  : ""}
  ${b.googleMapsUri ?
    `<text x="${rightTextEdge}" y="${phoneLineY}" text-anchor="end" font-size="13" fill="${ACCENT}" font-weight="600" font-family="system-ui, -apple-system, Segoe UI, sans-serif">Open in Google Maps</text>`
  : ""}

  <rect x="${MARGIN_X}" y="${card2Top}" width="${CARD_W}" height="${card2H}" rx="22" fill="${CARD_BG}" stroke="${CARD_STROKE}" stroke-width="1"/>
  <text x="${innerLeftBase}" y="${card2Top + INNER_PAD + 22}" font-size="12" fill="${ACCENT}" font-weight="700" letter-spacing="0.14em" font-family="system-ui, -apple-system, Segoe UI, sans-serif">BRAND SUMMARY</text>
  <text x="${innerLeftBase}" y="${card2Top + INNER_PAD + 56}" font-size="22" font-weight="800" fill="${INK}" font-family="system-ui, -apple-system, Segoe UI, sans-serif">Brand palette</text>
  <text x="${innerLeftBase}" y="${card2Top + INNER_PAD + 82}" font-size="13" fill="${MUTED}" font-family="system-ui, -apple-system, Segoe UI, sans-serif">${esc(brandSubtitle)}</text>
  ${paletteDotsSvg}
  ${primaryAccentRow}
  <text x="${innerLeftBase}" y="${typoTitleY}" font-size="11" fill="${MUTED}" font-weight="700" letter-spacing="0.1em" font-family="system-ui, -apple-system, Segoe UI, sans-serif">TYPOGRAPHY</text>
  ${typoLines.join("\n  ")}

  <rect x="${MARGIN_X}" y="${card3Top}" width="${CARD_W}" height="${card3H}" rx="22" fill="${CARD_BG}" stroke="${CARD_STROKE}" stroke-width="1"/>
  <text x="${innerLeftBase}" y="${card3Top + INNER_PAD + 22}" font-size="12" fill="${ACCENT}" font-weight="700" letter-spacing="0.14em" font-family="system-ui, -apple-system, Segoe UI, sans-serif">REVENUE LEAK SNAPSHOT</text>
  <text x="${innerLeftBase}" y="${card3Top + INNER_PAD + 68}" font-size="22" font-weight="700" fill="${INK}" font-family="system-ui, -apple-system, Segoe UI, sans-serif">
    <tspan>${esc(String(m.totalIssues))} issues are costing you </tspan><tspan fill="${ACCENT}">${esc(money(m.estimatedMonthlyCost))}</tspan><tspan> average / month</tspan>
  </text>
  ${findingLines.join("\n  ")}

  ${rankingGfx}
  ${ctaGfx}

  <line x1="${MARGIN_X}" y1="${footerY}" x2="${WIDTH - MARGIN_X}" y2="${footerY}" stroke="${FOOTER_LINE}" stroke-width="1"/>
  <text x="${MARGIN_X}" y="${footerY + 36}" font-size="15" fill="${MUTED}" font-family="system-ui, -apple-system, Segoe UI, sans-serif">Zenpho · Revenue Leak Audit (share summary) · Full PDF includes all issues &amp; suggested fixes</text>
</svg>`;

  return { svg, width: WIDTH, height: effectiveHeight, filename };
}
