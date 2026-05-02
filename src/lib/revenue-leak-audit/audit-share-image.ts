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
const HEIGHT_BASE = 1100;
const MARGIN_X = 40;
const CARD_W = WIDTH - MARGIN_X * 2;
/** Clean dashboard aesthetic (reference: growth cards + progress UI) */
const PAGE_BG = "#f1f5f9";
const SURFACE = "#ffffff";
const BORDER = "#e2e8f0";
const INK = "#0f172a";
const INK_MUTED = "#64748b";
const ACCENT = "#2563eb";
const ACCENT_SOFT = "#eff6ff";
const ACCENT_MUTED = "#3b82f6";
const SUCCESS = "#059669";
const LEAK = "#dc2626";
const FOOTER_LINE = "#e2e8f0";
const INNER_PAD = 28;
const RADIUS = 22;
const RADIUS_SM = 14;
const RADIUS_TILE = 16;
const GAP = 16;
const FONT =
  "Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Helvetica Neue, sans-serif";
const LOGO_BOX = 56;
const LOGO_GAP = 18;

const SEVERITY_ORDER: Record<AuditSeverity, number> = {
  Critical: 0,
  High: 1,
  Medium: 2,
  Low: 3,
};

/** Metric tile icons (viewBox 20×20 unless noted). Dollar is text for readability. */
const ICONS = {
  star: `<path fill="currentColor" d="M10 1.5l2.6 5.3 5.8.9-4.2 4.1 1 5.8L10 14.9 4.8 17.6l1-5.8L1.6 7.7l5.8-.9L10 1.5z"/>`,
  chat: `<path fill="none" stroke="currentColor" stroke-width="1.45" stroke-linecap="round" d="M4 5h12v8H9l-3 3v-3H4V5z"/>`,
  dollar: `<text x="10" y="13" text-anchor="middle" fill="currentColor" font-family="system-ui, -apple-system, sans-serif" font-size="13" font-weight="800">$</text>`,
  alert: `<path fill="none" stroke="currentColor" stroke-width="1.45" d="M10 4l6 10H4L10 4zM10 9v3M10 14h.01"/>`,
  image: `<rect x="3" y="5" width="14" height="10" rx="2" fill="none" stroke="currentColor" stroke-width="1.45"/><circle cx="7" cy="9" r="1.1" fill="currentColor"/><path fill="none" stroke="currentColor" stroke-width="1.45" d="M3 13l4-4 3 3 3-3 4 4"/>`,
  pin: `<path fill="none" stroke="currentColor" stroke-width="1.45" d="M10 3a4 4 0 0 1 4 4c0 3-4 8-4 8S6 10 6 7a4 4 0 0 1 4-4z"/><circle cx="10" cy="7" r="1.1" fill="currentColor"/>`,
} as const;

const TILE_ICON_VIEW = 20;
const TILE_ICON_PX = 14;
const TILE_CIRCLE_R = 13;
const TILE_H = 84;
const TILE_VALUE_SIZE = 21;
const TILE_LABEL_SIZE = 10;

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

function normalizeCssHexToken(hex: string): string {
  return hex.trim().replace(/^#/, "").toLowerCase();
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
      return SUCCESS;
    case "Good":
      return "#22c55e";
    case "Average":
      return "#ca8a04";
    case "Poor":
    default:
      return LEAK;
  }
}

function renderDonutCompact(cx: number, cy: number, score: number, grade: AuditGrade): string {
  const r = 42;
  const stroke = 8;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, score / 100));
  const dash = pct * c;
  const gap = c - dash;
  const arcColor = donutStrokeForGrade(grade);
  const track = "#e2e8f0";

  return `<g transform="translate(${cx},${cy})">
  <circle cx="0" cy="0" r="${r}" fill="none" stroke="${track}" stroke-width="${stroke}"/>
  <circle cx="0" cy="0" r="${r}" fill="none" stroke="${arcColor}" stroke-width="${stroke}" stroke-linecap="round"
    stroke-dasharray="${dash.toFixed(2)} ${gap.toFixed(2)}" transform="rotate(-90)"/>
  <text x="0" y="4" text-anchor="middle" font-size="22" font-weight="800" fill="${INK}" font-family="${FONT}">${score}</text>
  <text x="0" y="22" text-anchor="middle" font-size="10" font-weight="600" fill="${INK_MUTED}" font-family="${FONT}">${esc(grade)}</text>
</g>`;
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

function metricTile(
  x: number,
  y: number,
  w: number,
  h: number,
  iconBg: string,
  iconFg: string,
  iconInner: string,
  value: string,
  label: string,
  valueColor = INK,
): string {
  const iconSvg = iconInner.replace(/currentColor/g, iconFg);
  const iconCx = x + 15 + TILE_ICON_PX / 2;
  const iconCy = y + 14 + TILE_ICON_PX / 2;
  return `<g>
  <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${RADIUS_TILE}" fill="${SURFACE}" stroke="${BORDER}" stroke-width="1"/>
  <circle cx="${iconCx}" cy="${iconCy}" r="${TILE_CIRCLE_R}" fill="${iconBg}"/>
  <g transform="translate(${x + 15},${y + 14})">
  <svg width="${TILE_ICON_PX}" height="${TILE_ICON_PX}" viewBox="0 0 ${TILE_ICON_VIEW} ${TILE_ICON_VIEW}">${iconSvg}</svg>
  </g>
  <text x="${x + 18}" y="${y + h - 20}" font-size="${TILE_VALUE_SIZE}" font-weight="800" fill="${valueColor}" font-family="${FONT}">${esc(value)}</text>
  <text x="${x + 18}" y="${y + h - 5}" font-size="${TILE_LABEL_SIZE}" font-weight="600" fill="${INK_MUTED}" font-family="${FONT}" letter-spacing="0.02em">${esc(label)}</text>
</g>`;
}

/** Red warning triangle + “!” for issue list rows. */
function problemIconMark(ix: number, iy: number): string {
  return `<g transform="translate(${ix},${iy})">
  <path d="M6 1.2L10.8 9.4H1.2L6 1.2z" fill="#ef4444" stroke="#b91c1c" stroke-width="0.35"/>
  <text x="6" y="7.5" text-anchor="middle" font-size="6" font-weight="900" fill="#ffffff" font-family="Arial, Helvetica, sans-serif">!</text>
</g>`;
}

function renderTopIssuesCard(
  cardTop: number,
  innerPadX: number,
  totalIssues: number,
  avgMonthlyLeakMid: number,
  findingsAll: AuditFinding[],
): { svgParts: string; cardH: number } {
  const five = pickTopFindings(findingsAll, 5);
  const issuePhrase =
    totalIssues > 5 ? "5+ issues" : `${totalIssues} issue${totalIssues === 1 ? "" : "s"}`;
  const est = money(avgMonthlyLeakMid);

  let y = INNER_PAD + 20;
  const pieces: string[] = [];

  pieces.push(
    `<text x="${innerPadX}" y="${cardTop + y}" font-size="10" fill="${ACCENT}" font-weight="700" letter-spacing="0.16em" font-family="${FONT}">TOP ISSUES</text>`,
  );
  y += 26;
  pieces.push(
    `<text x="${innerPadX}" y="${cardTop + y}" font-size="20" font-weight="800" fill="${INK}" font-family="${FONT}">Revenue leaks we found</text>`,
  );
  y += 30;
  pieces.push(
    `<text x="${innerPadX}" y="${cardTop + y}" font-size="14" font-weight="600" fill="${INK_MUTED}" font-family="${FONT}">${esc(issuePhrase)} are costing you <tspan fill="${ACCENT}" font-weight="800">${esc(est)}</tspan> average / month</text>`,
  );
  y += 34;

  if (five.length === 0) {
    pieces.push(
      `<text x="${innerPadX}" y="${cardTop + y}" font-size="13" fill="${INK_MUTED}" font-family="${FONT}">No issues were ranked for this snapshot.</text>`,
    );
    y += 24;
  } else {
    for (let i = 0; i < five.length; i++) {
    const f = five[i];
    const title = clamp(f.title, 76);
    const fs = Math.max(11.5, 14.8 - i * 0.65);
    const fill = i === 0 ? INK : i === 1 ? "#1e293b" : i === 2 ? "#334155" : "#64748b";
    const indent = i * 8;
    const iconX = innerPadX + indent;
    const textX = innerPadX + indent + 20;
    const rowY = cardTop + y;
    pieces.push(problemIconMark(iconX, rowY - 11));
    pieces.push(
      `<text x="${textX}" y="${rowY}" font-size="${fs.toFixed(1)}" font-weight="700" fill="${fill}" font-family="${FONT}">${esc(title)}</text>`,
    );
    y += 26;
    }
  }

  const cardH = y + INNER_PAD;
  const svgParts = `<rect x="${MARGIN_X}" y="${cardTop}" width="${CARD_W}" height="${cardH}" rx="${RADIUS}" fill="${SURFACE}" stroke="${BORDER}" stroke-width="1" filter="url(#rlaCardLift)"/>
  ${pieces.join("\n  ")}`;

  return { svgParts, cardH };
}

/**
 * `#n` prefix plus business name wrapped at word boundaries for two-line SVG rows.
 */
function wrapRankListingTitle(
  prefix: string,
  body: string,
  maxLine1Chars: number,
  maxLine2Chars: number,
): { line1: string; line2: string | null } {
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

const RANK_LINE1_CHARS = 52;
const RANK_LINE2_CHARS = 56;

function rankRowSvg(
  innerLeftPad: number,
  cardTop: number,
  yFromCardTop: number,
  rowW: number,
  item: GoogleLocalRankItem,
): { svg: string; rowH: number } {
  const stats = `${item.rating ?? "—"}★  ·  ${item.reviewCount ?? 0} reviews`;
  const prefix = `#${item.position} `;
  const rawName = (item.name ?? "").trim();
  const { line1, line2 } = wrapRankListingTitle(prefix, rawName, RANK_LINE1_CHARS, RANK_LINE2_CHARS);

  const rowH = line2 ? 64 : 50;
  const rx = innerLeftPad;
  const ry = cardTop + yFromCardTop;
  const accentStroke = item.isSelectedBusiness ? ACCENT : BORDER;
  const fill = item.isSelectedBusiness ? ACCENT_SOFT : "#fafbfc";
  const statsBaseline = ry + rowH / 2 + 5;

  const nameBlock =
    line2 ?
      `<text x="${rx + 14}" y="${ry + 24}" font-size="13" font-weight="700" fill="${INK}" font-family="${FONT}">${esc(line1)}</text>
  <text x="${rx + 14}" y="${ry + 44}" font-size="13" font-weight="700" fill="${INK}" font-family="${FONT}">${esc(line2)}</text>`
    : `<text x="${rx + 14}" y="${statsBaseline}" font-size="14" font-weight="700" fill="${INK}" font-family="${FONT}">${esc(line1)}</text>`;

  return {
    svg: `<rect x="${rx}" y="${ry}" width="${rowW}" height="${rowH}" rx="${RADIUS_SM}" fill="${fill}" stroke="${accentStroke}" stroke-width="${item.isSelectedBusiness ? 1.5 : 1}"/>
  ${nameBlock}
  <text x="${rx + rowW - 14}" y="${statsBaseline}" text-anchor="end" font-size="12" font-weight="600" fill="${INK_MUTED}" font-family="${FONT}">${esc(stats)}</text>`,
    rowH,
  };
}

function pickFirstTypographyFace(notes: readonly string[]): string {
  for (const raw of notes) {
    const t = raw.replace(/^[\s•*-]+/u, "").trim().split(/[,:;\n]/)[0]?.trim();
    if (t) return clamp(t, 64);
  }
  return "";
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

  const headerParts: string[] = [
    `<text x="${innerPadX}" y="${cardTop + INNER_PAD + 24}" font-size="10" fill="${ACCENT}" font-weight="700" letter-spacing="0.16em" font-family="${FONT}">MARKET POSITION</text>`,
    `<text x="${innerPadX}" y="${cardTop + INNER_PAD + 50}" font-size="20" font-weight="800" fill="${INK}" font-family="${FONT}">Who's ahead on Google</text>`,
  ];

  if (rankPos != null) {
    headerParts.push(
      `<text x="${rightEdge}" y="${cardTop + INNER_PAD + 50}" text-anchor="end" font-size="13" font-weight="600" fill="${INK_MUTED}" font-family="${FONT}">You are <tspan fill="${ACCENT}" font-weight="800">#${rankPos}</tspan> in this sample</text>`,
    );
  }

  const rowPieces: string[] = [];
  let y = INNER_PAD + 78;
  for (const item of snap.topFive) {
    const { svg, rowH } = rankRowSvg(innerPadX, cardTop, y, rowW, item);
    rowPieces.push(svg);
    y += rowH + 10;
  }

  if (!selectedInTopFive && snap.selectedBusinessRankItem) {
    rowPieces.push(
      `<text x="${innerPadX + rowW / 2}" y="${cardTop + y + 6}" text-anchor="middle" font-size="12" font-weight="700" fill="${INK_MUTED}" font-family="${FONT}">…</text>`,
    );
    y += 20;
    const { svg: extraSvg, rowH: rh } = rankRowSvg(
      innerPadX,
      cardTop,
      y,
      rowW,
      snap.selectedBusinessRankItem,
    );
    rowPieces.push(extraSvg);
    y += rh + 10;
  }

  if (!snap.selectedBusinessRankItem) {
    rowPieces.push(`<rect x="${innerPadX}" y="${cardTop + y}" width="${rowW}" height="44" rx="${RADIUS_SM}" fill="#fffbeb" stroke="#fde68a" stroke-width="1"/>
  <text x="${innerPadX + rowW / 2}" y="${cardTop + y + 28}" text-anchor="middle" font-size="12" font-weight="600" fill="#b45309" font-family="${FONT}">Not found in the first ${snap.totalResultsChecked} results checked.</text>`);
    y += 54;
  }

  const cardH = y + INNER_PAD;
  const svgParts = `<rect x="${MARGIN_X}" y="${cardTop}" width="${CARD_W}" height="${cardH}" rx="${RADIUS}" fill="${SURFACE}" stroke="${BORDER}" stroke-width="1" filter="url(#rlaCardLift)"/>
  ${headerParts.join("\n  ")}
  ${rowPieces.join("\n  ")}`;

  return { svgParts, cardH };
}

/**
 * Dashboard-style share image: hero + metric grid + insights + brand + market list + CTA.
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
  const ratingStr = b.rating != null ? b.rating.toFixed(1) : "—";
  const rankPos =
    audit.rankingSnapshot.topFive.find((i) => i.isSelectedBusiness)?.position ??
    audit.rankingSnapshot.selectedBusinessRankItem?.position ??
    null;
  const rankStr = rankPos != null ? `#${rankPos}` : "—";

  const topFinding = pickTopFindings(audit.findings, 1)[0];
  const topLeakLabel = topFinding ? clamp(topFinding.title, 52) : "Run a full audit for priorities";

  const paletteFallback = [...bio.palette].filter(Boolean) as string[];
  const mainHexRaw: string | null = bio.primaryColor ?? paletteFallback[0] ?? null;
  let secondaryHexRaw: string | null =
    bio.accentColor ?? paletteFallback[1] ?? null;
  if (
    secondaryHexRaw &&
    mainHexRaw &&
    normalizeCssHexToken(secondaryHexRaw) === normalizeCssHexToken(mainHexRaw)
  ) {
    secondaryHexRaw =
      paletteFallback.find((c) => normalizeCssHexToken(c) !== normalizeCssHexToken(mainHexRaw)) ??
      null;
  }
  let mainUse: string | null = mainHexRaw;
  let secondaryUse: string | null = secondaryHexRaw;
  if (!mainUse && secondaryUse) {
    mainUse = secondaryUse;
    secondaryUse = null;
  }
  const primaryTypoFace = pickFirstTypographyFace(bio.typographyNotes);

  const card1Top = MARGIN_X;
  const innerLeft = MARGIN_X + INNER_PAD;
  const panelTop = card1Top + INNER_PAD;
  const contentW = CARD_W - INNER_PAD * 2;
  const textShift = logoDataUrl ? LOGO_BOX + LOGO_GAP : 0;
  const titleX = innerLeft + textShift;
  /** Extra air under the card’s top padding before eyebrow + business name */
  const headerHeroTopPad = 14;
  const eyebrowToNameGap = 32;
  const logoTop = panelTop + headerHeroTopPad + 4;

  let logoGfx = "";
  if (logoDataUrl) {
    const clipId = "rlaShareLogoClip";
    const safeHref = logoDataUrl.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
    logoGfx = `<rect x="${innerLeft}" y="${logoTop}" width="${LOGO_BOX}" height="${LOGO_BOX}" rx="14" fill="#f8fafc" stroke="${BORDER}" stroke-width="1"/>
  <image x="${innerLeft}" y="${logoTop}" width="${LOGO_BOX}" height="${LOGO_BOX}" href="${safeHref}" preserveAspectRatio="xMidYMid meet" clip-path="url(#${clipId})"/>`;
  }

  const svgDefsFull = `<defs>
  <filter id="rlaCardLift" x="-8%" y="-8%" width="116%" height="116%" color-interpolation-filters="sRGB">
    <feDropShadow dx="0" dy="10" stdDeviation="14" flood-color="#0f172a" flood-opacity="0.06"/>
  </filter>
  ${logoDataUrl ?
    `<clipPath id="rlaShareLogoClip"><rect x="${innerLeft}" y="${logoTop}" width="${LOGO_BOX}" height="${LOGO_BOX}" rx="14"/></clipPath>`
  : ""}
</defs>`;

  const categoryLine = [
    b.category?.trim() || "Business",
    (b.businessStatus || "Operational").replace(/_/g, " "),
  ].join(" · ");
  const address = clamp(b.address, 72);
  const phoneRaw = (b.phone ?? wa.contactLinks.phone ?? "").trim();
  const phoneDisplay = clamp(phoneRaw || undefined, 32);

  /** Hero + grid + insight + brand inside first panel */
  const eyebrowY = panelTop + headerHeroTopPad + 14;
  const nameY = eyebrowY + eyebrowToNameGap;
  const metaY = nameY + 36;
  const addrY = metaY + 18;
  const phoneY = phoneDisplay ? addrY + 18 : addrY;

  const donutCx = MARGIN_X + CARD_W - INNER_PAD - 52;
  const donutCy = panelTop + 74;

  const gridTop = Math.max(
    (phoneDisplay ? phoneY + 28 : addrY + 26),
    donutCy + 50,
  );
  const cols = 3;
  const tileGap = GAP;
  const tileW = (contentW - (cols - 1) * tileGap) / cols;
  const tileH = TILE_H;
  const row2Y = gridTop + tileH + tileGap;

  const tiles: string[] = [];
  tiles.push(
    metricTile(
      innerLeft,
      gridTop,
      tileW,
      tileH,
      "#fff7ed",
      "#ea580c",
      ICONS.star,
      ratingStr,
      "Google rating",
    ),
  );
  tiles.push(
    metricTile(
      innerLeft + tileW + tileGap,
      gridTop,
      tileW,
      tileH,
      ACCENT_SOFT,
      ACCENT_MUTED,
      ICONS.chat,
      String(b.reviewCount ?? 0),
      "Reviews",
    ),
  );
  tiles.push(
    metricTile(
      innerLeft + (tileW + tileGap) * 2,
      gridTop,
      tileW,
      tileH,
      "#fef2f2",
      LEAK,
      ICONS.dollar,
      money(m.estimatedMonthlyCost),
      "Est. monthly leak",
      LEAK,
    ),
  );
  tiles.push(
    metricTile(
      innerLeft,
      row2Y,
      tileW,
      tileH,
      "#faf5ff",
      "#9333ea",
      ICONS.alert,
      String(m.totalIssues),
      "Open issues",
    ),
  );
  tiles.push(
    metricTile(
      innerLeft + tileW + tileGap,
      row2Y,
      tileW,
      tileH,
      "#f5f3ff",
      "#6366f1",
      ICONS.image,
      String(photoN),
      "Profile photos",
    ),
  );
  tiles.push(
    metricTile(
      innerLeft + (tileW + tileGap) * 2,
      row2Y,
      tileW,
      tileH,
      "#ecfeff",
      "#0891b2",
      ICONS.pin,
      rankStr,
      "Google Business Rank",
      ACCENT,
    ),
  );

  const insightsTop = row2Y + tileH + 22;
  const insightsH = 76;
  const insightsMid = innerLeft + contentW / 2;
  const insightsBar = `<rect x="${innerLeft}" y="${insightsTop}" width="${contentW}" height="${insightsH}" rx="${RADIUS_SM}" fill="${ACCENT_SOFT}" stroke="${BORDER}" stroke-width="1"/>
  <text x="${innerLeft + 20}" y="${insightsTop + 22}" font-size="9" font-weight="700" fill="${ACCENT}" letter-spacing="0.12em" font-family="${FONT}">PRIORITY FIX</text>
  <text x="${innerLeft + 20}" y="${insightsTop + 48}" font-size="14" font-weight="700" fill="${INK}" font-family="${FONT}">${esc(topLeakLabel)}</text>
  <line x1="${insightsMid}" y1="${insightsTop + 16}" x2="${insightsMid}" y2="${insightsTop + insightsH - 16}" stroke="${BORDER}" stroke-width="1"/>
  <text x="${insightsMid + 16}" y="${insightsTop + 22}" font-size="9" font-weight="700" fill="${ACCENT}" letter-spacing="0.12em" font-family="${FONT}">PROFILE</text>
  <text x="${insightsMid + 16}" y="${insightsTop + 44}" font-size="12" font-weight="600" fill="${INK_MUTED}" font-family="${FONT}">${esc(clamp(categoryLine, 48))}</text>
  <text x="${insightsMid + 16}" y="${insightsTop + 62}" font-size="12" font-weight="500" fill="${INK_MUTED}" font-family="${FONT}">${esc(clamp(address, 56))}</text>`;

  const brandTop = insightsTop + insightsH + 20;
  let brandChips = `<text x="${innerLeft}" y="${brandTop}" font-size="9" font-weight="700" fill="${INK_MUTED}" letter-spacing="0.12em" font-family="${FONT}">BRAND FROM SITE</text>`;
  const chipY = brandTop + 18;
  if (mainUse) {
    brandChips += `<circle cx="${innerLeft + 10}" cy="${chipY + 6}" r="8" fill="${esc(mainUse)}"/>
  <text x="${innerLeft + 26}" y="${chipY + 10}" font-size="12" font-weight="600" fill="${INK}" font-family="${FONT}">Main</text>`;
  }
  if (secondaryUse) {
    const bx = mainUse ? innerLeft + 92 : innerLeft;
    brandChips += `<circle cx="${bx + 10}" cy="${chipY + 6}" r="8" fill="${esc(secondaryUse)}"/>
  <text x="${bx + 26}" y="${chipY + 10}" font-size="12" font-weight="600" fill="${INK}" font-family="${FONT}">Secondary</text>`;
  }
  const typeX = innerLeft + Math.floor(contentW * 0.58);
  brandChips += `
  <text x="${typeX}" y="${brandTop}" font-size="9" font-weight="700" fill="${INK_MUTED}" letter-spacing="0.12em" font-family="${FONT}">TYPOGRAPHY</text>
  <text x="${typeX}" y="${chipY + 10}" font-size="12" font-weight="600" fill="${INK}" font-family="${FONT}">${esc(primaryTypoFace || "—")}</text>`;

  const card1H = chipY + 28 + INNER_PAD - card1Top;

  const issuesTop = card1Top + card1H + GAP;
  const { svgParts: issuesGfx, cardH: issuesH } = renderTopIssuesCard(
    issuesTop,
    innerLeft,
    m.totalIssues,
    m.estimatedMonthlyCost,
    audit.findings,
  );

  const rankingTop = issuesTop + issuesH + GAP;
  const { svgParts: rankingGfx, cardH: rankingH } = renderRankingSection(rankingTop, audit);

  const card3Top = rankingTop + rankingH + GAP;
  const ctaPad = INNER_PAD;
  const ctaCardH = ctaPad + 128 + ctaPad;
  const ctaInnerW = CARD_W - ctaPad * 2;
  const btnH = 52;
  const btnY = card3Top + ctaPad + 72;

  const ctaGfx = `<rect x="${MARGIN_X}" y="${card3Top}" width="${CARD_W}" height="${ctaCardH}" rx="${RADIUS}" fill="${SURFACE}" stroke="${BORDER}" stroke-width="1" filter="url(#rlaCardLift)"/>
  <text x="${MARGIN_X + CARD_W / 2}" y="${card3Top + ctaPad + 28}" text-anchor="middle" font-size="10" font-weight="700" fill="${ACCENT}" letter-spacing="0.16em" font-family="${FONT}">NEXT STEP</text>
  <text x="${MARGIN_X + CARD_W / 2}" y="${card3Top + ctaPad + 58}" text-anchor="middle" font-size="22" font-weight="800" fill="${INK}" font-family="${FONT}">Ready to recover lost revenue?</text>
  <text x="${MARGIN_X + CARD_W / 2}" y="${card3Top + ctaPad + 82}" text-anchor="middle" font-size="13" fill="${INK_MUTED}" font-family="${FONT}">${esc(
    clamp("We'll review your audit together and show you where to start for the fastest ROI.", 76),
  )}</text>
  <rect x="${MARGIN_X + ctaPad}" y="${btnY}" width="${ctaInnerW}" height="${btnH}" rx="${btnH / 2}" fill="${ACCENT}"/>
  <text x="${MARGIN_X + CARD_W / 2}" y="${btnY + btnH / 2 + 5}" text-anchor="middle" font-size="15" font-weight="700" fill="#ffffff" font-family="${FONT}">Start fixing leaks</text>`;

  const footerY = card3Top + ctaCardH + 20;

  const slug = businessSlug(b.name);
  const filename = `${slug}-revenue-leak-audit-summary.png`;

  const effectiveHeight = Math.max(HEIGHT_BASE, footerY + 56);

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${effectiveHeight}" viewBox="0 0 ${WIDTH} ${effectiveHeight}">
  ${svgDefsFull}
  <rect width="${WIDTH}" height="${effectiveHeight}" fill="${PAGE_BG}"/>
  <rect x="${MARGIN_X}" y="${card1Top}" width="${CARD_W}" height="${card1H}" rx="${RADIUS}" fill="${SURFACE}" stroke="${BORDER}" stroke-width="1" filter="url(#rlaCardLift)"/>
  ${logoGfx}
  <text x="${titleX}" y="${eyebrowY}" font-size="10" fill="${ACCENT}" font-weight="700" letter-spacing="0.16em" font-family="${FONT}">REVENUE LEAK AUDIT</text>
  <text x="${titleX}" y="${nameY}" font-size="30" font-weight="800" fill="${INK}" font-family="${FONT}">${esc(clamp(b.name, 44))}</text>
  <text x="${titleX}" y="${metaY}" font-size="13" fill="${INK_MUTED}" font-family="${FONT}">${esc(clamp(categoryLine, 72))}</text>
  <text x="${titleX}" y="${addrY}" font-size="12" font-weight="500" fill="${INK_MUTED}" font-family="${FONT}">${esc(address)}</text>
  ${phoneDisplay ?
    `<text x="${titleX}" y="${phoneY}" font-size="13" font-weight="600" fill="${INK}" font-family="${FONT}">${esc(phoneDisplay)}</text>`
  : ""}
  ${renderDonutCompact(donutCx, donutCy, score, grade)}
  ${tiles.join("\n  ")}
  ${insightsBar}
  ${brandChips}

  ${issuesGfx}
  ${rankingGfx}
  ${ctaGfx}

  <line x1="${MARGIN_X}" y1="${footerY}" x2="${WIDTH - MARGIN_X}" y2="${footerY}" stroke="${FOOTER_LINE}" stroke-width="1"/>
  <text x="${MARGIN_X}" y="${footerY + 28}" font-size="13" fill="${INK_MUTED}" font-family="${FONT}">Zenpho · Revenue Leak Audit summary · Full report includes issues &amp; fixes</text>
</svg>`;

  return { svg, width: WIDTH, height: effectiveHeight, filename };
}
