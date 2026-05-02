import type { AuditFinding, AuditGrade, AuditSeverity, RevenueLeakAudit } from "./types";

export type AuditShareImageResult = {
  svg: string;
  width: number;
  height: number;
  filename: string;
};

const WIDTH = 1200;
const HEIGHT = 1200;
const MARGIN_X = 32;
const CARD_W = WIDTH - MARGIN_X * 2;
const PAGE_BG = "#eceef2";
const CARD_BG = "#ffffff";
const CARD_STROKE = "#e2e4e8";
const INK = "#111827";
const MUTED = "#6b7280";
const ACCENT = "#2563eb";
const FOOTER_LINE = "#d1d5db";
const INNER_PAD = 24;

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

/** Paths in 24×24 box; grouped with nested &lt;svg&gt; so viewBox clips reliably. */
const CHANNEL_ICONS: Record<string, string> = {
  website: `<path fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>`,
  email: `<path fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" d="M4 6h16v12H4V6zm0 0l8 6 8-6"/>`,
  phone: `<path fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" d="M8 4h4l2 6-3 2a12 12 0 0 0 6 6l2-3 6 2v4c0 1.1-.9 2-2 2-.5 0-9.73-4.73-13-8-3.27-3.27-8-12.5-8-13 0-1.1.9-2 2-2"/>`,
  facebook: `<path fill="currentColor" d="M14 13.5h2.5L17 11h-3V9.25c0-.66.41-1.25 1.39-1.25H17V6h-2.4c-2 0-2.61 1.22-2.61 3.06V11H10v2.5h2V18h3v-4.5z"/>`,
  instagram: `<rect x="4" y="4" width="16" height="16" rx="4" fill="none" stroke="currentColor" stroke-width="1.75"/><circle cx="12" cy="12" r="3.25" fill="none" stroke="currentColor" stroke-width="1.75"/><circle cx="17.5" cy="6.5" r="1.2" fill="currentColor"/>`,
  tiktok: `<path fill="currentColor" d="M16.65 10.07a5.6 5.6 0 0 1-3.3-1.07V15a5 5 0 11-5.35-8.93v3.15a3 3 0 106.65 1z"/>`,
  youtube: `<rect x="4" y="7" width="16" height="10" rx="2" fill="none" stroke="currentColor" stroke-width="1.75"/><path fill="currentColor" d="M10 9.25v5.5L15.75 12 10 9.25z"/>`,
  linkedin: `<path fill="currentColor" d="M8 17V11H6v6h2zm-1-7.2c.66 0 1.08-.46 1.08-1.05C7.06 8.21 6.63 8 6 8s-1 .21-1.05 1 0 .95 1.05.95zm9.6 7.2v-3.4c0-1.74-.93-2.54-2.17-2.54-1 .02-1.46.73-1.72 1.24V11h-2v6h2v-3c0-.8.54-1.5 1.5-1.5.88 0 1.07.73 1.07 1.65V17h2z"/>`,
  whatsapp: `<path fill="currentColor" d="M12 4c-4.42 0-8 3.58-8 8 0 1.52.43 3 1.24 4.23L5 21l5-1.62A7.93 7.93 0 0 0 12 20c4.42 0 8-3.58 8-8s-3.58-8-8-8zm4.52 11.06c-.2.54-1.02 1-1.4 1.06-.37.06-.84.07-1.36.08-.39 0-.9-.06-1.38-.62-.52-.61-2.06-2-2.25-2.21-.18-.21-.61-.64-.61-1.22s.2-1 .42-1.24c.09-.09.21-.33.06-.61-.21-.62-.71-2.06-.71-2.54 0-.5.06-.71.54-1 .21-.09.73-.62 2.54-.62 1 0 1.71.06 2.01.51.53.93.53 3.54 1.71 5.71.23.54.71 2.54.41 3.58z"/>`,
};

type ChannelStripItem = { key: string; label: string; iconSvg: string };

function collectChannelStripItems(audit: RevenueLeakAudit): ChannelStripItem[] {
  const b = audit.business;
  const w = audit.websiteAudit;
  const sl = w.socialLinks;
  const cl = w.contactLinks;
  const items: ChannelStripItem[] = [];

  if (b.website?.trim())
    items.push({ key: "website", label: "Website", iconSvg: CHANNEL_ICONS.website });
  if (cl.email?.trim()) items.push({ key: "email", label: "Email", iconSvg: CHANNEL_ICONS.email });
  const phoneLine = cl.phone?.trim() || b.phone?.trim();
  if (phoneLine) items.push({ key: "phone", label: "Phone", iconSvg: CHANNEL_ICONS.phone });
  if (sl.facebook?.trim())
    items.push({ key: "facebook", label: "To", iconSvg: CHANNEL_ICONS.facebook });
  if (sl.instagram?.trim())
    items.push({ key: "instagram", label: "To", iconSvg: CHANNEL_ICONS.instagram });
  if (sl.tiktok?.trim()) items.push({ key: "tiktok", label: "TikTok", iconSvg: CHANNEL_ICONS.tiktok });
  if (sl.youtube?.trim())
    items.push({ key: "youtube", label: "YouTube", iconSvg: CHANNEL_ICONS.youtube });
  if (sl.linkedin?.trim())
    items.push({ key: "linkedin", label: "LinkedIn", iconSvg: CHANNEL_ICONS.linkedin });
  if (sl.whatsapp?.trim())
    items.push({ key: "whatsapp", label: "To", iconSvg: CHANNEL_ICONS.whatsapp });

  return items;
}

function renderChannelStrip(cx: number, cy: number, items: ChannelStripItem[]): string {
  if (items.length === 0) {
    return `<text x="${cx}" y="${cy + 12}" font-size="12" fill="${MUTED}" font-family="system-ui, -apple-system, Segoe UI, sans-serif">Channel links not detected from website crawl</text>`;
  }
  const slot = 54;
  return items
    .map((item, i) => {
      const gx = cx + i * slot;
      const inner = item.iconSvg.replace(/currentColor/g, "#374151");
      return `<g transform="translate(${gx},${cy})">
  <rect x="0" y="0" width="46" height="46" rx="10" fill="#f9fafb" stroke="${CARD_STROKE}" stroke-width="1"/>
  <svg x="11" y="11" width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">${inner}</svg>
  <text x="23" y="58" text-anchor="middle" font-size="9" fill="${MUTED}" font-family="system-ui, -apple-system, Segoe UI, sans-serif">${esc(item.label)}</text>
</g>`;
    })
    .join("\n");
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
  const w = Math.min(340, Math.max(72, approximateTextWidth(label.length + 2, fontSize) + 26));
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
 * 1200×~1200 SVG share image: GBP + brand + revenue snapshot (converted to PNG client-side).
 */
export function renderAuditShareImage(audit: RevenueLeakAudit): AuditShareImageResult {
  const b = audit.business;
  const m = audit.moneySummary;
  const bio = audit.brandIdentity;
  const wa = audit.websiteAudit;
  const score = audit.scores.overall;
  const grade = audit.scores.grade;

  const photoN = b.photoCount ?? b.photos?.length ?? 0;
  const ratingLbl =
    b.rating != null ? `${b.rating.toFixed(1)} rating` : "No rating";
  const reviewsLbl = `${b.reviewCount ?? 0} reviews`;
  const photosLbl = `${photoN} photos`;
  const siteLbl = b.website?.trim() ? "Website linked" : "No website on listing";

  const card1Top = MARGIN_X;
  const innerLeft = MARGIN_X + INNER_PAD;
  const rightTextEdge = WIDTH - MARGIN_X - INNER_PAD;
  /** Keep score gauge in the header band; pills/phone sit below so nothing stacks on the donut. */
  const donutCx = WIDTH - MARGIN_X - INNER_PAD - 66;
  const donutCy = card1Top + INNER_PAD + 58;
  const donutOuterR = 52 + 10;
  const addressBaseline = card1Top + INNER_PAD + 108;
  const pillsY = Math.max(addressBaseline + 24, donutCy + donutOuterR + 12);
  const pillRowH = 32;

  let px = innerLeft;
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

  const categoryLine =
    [b.category?.trim() || "Business", (b.businessStatus || "Operational").replace(/_/g, " ")].join(
      " · ",
    );
  const address = clamp(b.address, 76);
  const phoneDisplay = clamp(b.phone || wa.contactLinks.phone, 28);

  const channelItems = collectChannelStripItems(audit);
  const pillsBottom = pillsY + pillRowH;
  const phoneLineY = pillsBottom + 18;
  const channelLabelY = phoneLineY + (phoneDisplay.trim() || b.googleMapsUri ? 24 : 10);
  const channelStripTop = channelLabelY + 14;
  const channelStripSvg = renderChannelStrip(innerLeft, channelStripTop, channelItems);
  const stripBottom = channelStripTop + (channelItems.length === 0 ? 24 : 64);
  const card1H = stripBottom + INNER_PAD - card1Top;

  const card2Top = card1Top + card1H + 14;
  const card2H = INNER_PAD + 220 + INNER_PAD;

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
  const card3H = Math.max(card3BodyH, 320);
  const footerY = card3Top + card3H + 22;

  const slug = businessSlug(b.name);
  const filename = `${slug}-revenue-leak-audit-summary.png`;

  const paletteDots = bio.palette.slice(0, 5).map((hex, i) => {
    const dx = MARGIN_X + INNER_PAD + 12 + i * 36;
    return `<circle cx="${dx}" cy="${card2Top + INNER_PAD + 118}" r="13" fill="${esc(hex)}"/>`;
  });

  const primaryDot = bio.primaryColor
    ? `<circle cx="${MARGIN_X + INNER_PAD + 28}" cy="${card2Top + INNER_PAD + 162}" r="10" fill="${esc(bio.primaryColor)}"/><text x="${MARGIN_X + INNER_PAD + 48}" y="${card2Top + INNER_PAD + 166}" font-size="13" fill="${INK}" font-family="system-ui, -apple-system, Segoe UI, sans-serif">Primary</text>`
    : "";
  const accentDot = bio.accentColor
    ? `<circle cx="${MARGIN_X + INNER_PAD + 148}" cy="${card2Top + INNER_PAD + 162}" r="10" fill="${esc(bio.accentColor)}"/><text x="${MARGIN_X + INNER_PAD + 168}" y="${card2Top + INNER_PAD + 166}" font-size="13" fill="${INK}" font-family="system-ui, -apple-system, Segoe UI, sans-serif">Accent</text>`
    : "";

  const typoY0 = card2Top + INNER_PAD + 184;
  const typoLines = bio.typographyNotes.slice(0, 3).map((line, i) => {
      return `<text x="${MARGIN_X + INNER_PAD}" y="${typoY0 + i * 20}" font-size="13" fill="${MUTED}" font-family="system-ui, -apple-system, Segoe UI, sans-serif">• ${esc(clamp(line, 72))}</text>`;
    });

  const brandSubtitle = clamp(bio.brandPresenceSummary || "Signals from your homepage.", 92);

  const effectiveHeight = Math.max(HEIGHT, footerY + 72);

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${effectiveHeight}" viewBox="0 0 ${WIDTH} ${effectiveHeight}">
  <rect width="${WIDTH}" height="${effectiveHeight}" fill="${PAGE_BG}"/>
  <rect x="${MARGIN_X}" y="${card1Top}" width="${CARD_W}" height="${card1H}" rx="22" fill="${CARD_BG}" stroke="${CARD_STROKE}" stroke-width="1"/>
  <text x="${MARGIN_X + INNER_PAD}" y="${card1Top + INNER_PAD + 22}" font-size="12" fill="${ACCENT}" font-weight="700" letter-spacing="0.14em" font-family="system-ui, -apple-system, Segoe UI, sans-serif">GOOGLE BUSINESS PROFILE</text>
  <text x="${MARGIN_X + INNER_PAD}" y="${card1Top + INNER_PAD + 62}" font-size="26" font-weight="800" fill="${INK}" font-family="system-ui, -apple-system, Segoe UI, sans-serif">${esc(clamp(b.name, 48))}</text>
  <text x="${MARGIN_X + INNER_PAD}" y="${card1Top + INNER_PAD + 88}" font-size="14" fill="${MUTED}" font-family="system-ui, -apple-system, Segoe UI, sans-serif">${esc(categoryLine)}</text>
  <text x="${innerLeft}" y="${card1Top + INNER_PAD + 108}" font-size="13" fill="${MUTED}" font-family="system-ui, -apple-system, Segoe UI, sans-serif">${esc(address)}</text>
  ${renderDonut(donutCx, donutCy, score, grade)}
  ${pills.join("\n  ")}
  ${phoneDisplay ?
    `<text x="${innerLeft}" y="${phoneLineY}" font-size="14" font-weight="600" fill="${INK}" font-family="system-ui, -apple-system, Segoe UI, sans-serif">${esc(phoneDisplay)}</text>`
  : ""}
  ${b.googleMapsUri ?
    `<text x="${rightTextEdge}" y="${phoneLineY}" text-anchor="end" font-size="13" fill="${ACCENT}" font-weight="600" font-family="system-ui, -apple-system, Segoe UI, sans-serif">Open in Google Maps</text>`
  : ""}
  <text x="${innerLeft}" y="${channelLabelY}" font-size="11" fill="${MUTED}" font-weight="700" letter-spacing="0.1em" font-family="system-ui, -apple-system, Segoe UI, sans-serif">CONTACT CHANNELS</text>
  ${channelStripSvg}

  <rect x="${MARGIN_X}" y="${card2Top}" width="${CARD_W}" height="${card2H}" rx="22" fill="${CARD_BG}" stroke="${CARD_STROKE}" stroke-width="1"/>
  <text x="${MARGIN_X + INNER_PAD}" y="${card2Top + INNER_PAD + 22}" font-size="12" fill="${ACCENT}" font-weight="700" letter-spacing="0.14em" font-family="system-ui, -apple-system, Segoe UI, sans-serif">BRAND SUMMARY</text>
  <text x="${MARGIN_X + INNER_PAD}" y="${card2Top + INNER_PAD + 56}" font-size="22" font-weight="800" fill="${INK}" font-family="system-ui, -apple-system, Segoe UI, sans-serif">Brand palette</text>
  <text x="${MARGIN_X + INNER_PAD}" y="${card2Top + INNER_PAD + 82}" font-size="13" fill="${MUTED}" font-family="system-ui, -apple-system, Segoe UI, sans-serif">${esc(brandSubtitle)}</text>
  ${paletteDots.join("\n  ")}
  ${primaryDot}
  ${accentDot}
  ${typoLines.join("\n  ")}

  <rect x="${MARGIN_X}" y="${card3Top}" width="${CARD_W}" height="${card3H}" rx="22" fill="${CARD_BG}" stroke="${CARD_STROKE}" stroke-width="1"/>
  <text x="${MARGIN_X + INNER_PAD}" y="${card3Top + INNER_PAD + 22}" font-size="12" fill="${ACCENT}" font-weight="700" letter-spacing="0.14em" font-family="system-ui, -apple-system, Segoe UI, sans-serif">REVENUE LEAK SNAPSHOT</text>
  <text x="${MARGIN_X + INNER_PAD}" y="${card3Top + INNER_PAD + 68}" font-size="22" font-weight="700" fill="${INK}" font-family="system-ui, -apple-system, Segoe UI, sans-serif">
    <tspan>${esc(String(m.totalIssues))} issues are costing you </tspan><tspan fill="${ACCENT}">${esc(money(m.estimatedMonthlyCost))}</tspan><tspan> average / month</tspan>
  </text>
  ${findingLines.join("\n  ")}

  <line x1="${MARGIN_X}" y1="${footerY}" x2="${WIDTH - MARGIN_X}" y2="${footerY}" stroke="${FOOTER_LINE}" stroke-width="1"/>
  <text x="${MARGIN_X}" y="${footerY + 36}" font-size="15" fill="${MUTED}" font-family="system-ui, -apple-system, Segoe UI, sans-serif">Zenpho · Revenue Leak Audit (share summary) · Full PDF includes all issues &amp; suggested fixes</text>
</svg>`;

  return { svg, width: WIDTH, height: effectiveHeight, filename };
}
