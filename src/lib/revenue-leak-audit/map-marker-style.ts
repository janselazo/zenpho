/** Google-hosted pinlets (v2), same family as Google Maps category markers. */
const GSTATIC_PINLETS = "https://maps.gstatic.com/mapfiles/place_api/icons/v2";

function hexLuminance(hexRaw: string): number {
  const hex = hexRaw.replace(/^#/, "").trim();
  if (!/^[0-9a-f]{6}$/i.test(hex)) return 0.35;
  const n = parseInt(hex, 16);
  const r = ((n >> 16) & 0xff) / 255;
  const g = ((n >> 8) & 0xff) / 255;
  const b = (n & 0xff) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Places API often returns very dark hex colors. Combined with a failed mask load,
 * the marker reads as a black dot on the map.
 */
function brightenDiskColor(hex: string, minLuminance = 0.22): string {
  if (hexLuminance(hex) >= minLuminance) return hex;
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  const base = m ? parseInt(m[1], 16) : 0x78909c;
  let r = (base >> 16) & 0xff;
  let g = (base >> 8) & 0xff;
  let b = base & 0xff;
  for (let i = 0; i < 10; i++) {
    const lum = hexLuminance(
      `#${[r, g, b].map((x) => x.toString(16).padStart(2, "0")).join("")}`
    );
    if (lum >= minLuminance) break;
    r = Math.min(255, Math.round(r + (255 - r) * 0.35));
    g = Math.min(255, Math.round(g + (255 - g) * 0.35));
    b = Math.min(255, Math.round(b + (255 - b) * 0.35));
  }
  return `#${[r, g, b].map((x) => x.toString(16).padStart(2, "0")).join("")}`;
}

export type CategoryMarkerStyle = {
  backgroundColor: string;
  maskSrc: string;
};

export type MapMarkerPointInput = {
  iconBackgroundColor: string | null;
  iconMaskBaseUri: string | null;
  types: string[];
};

/** Places API returns a base URI; append `.png` when missing (see Google Place icons docs). */
export function maskSrcFromPlaceApiBase(base: string | null | undefined): string | null {
  if (base == null || typeof base !== "string") return null;
  const t = base.trim();
  if (!t) return null;
  if (/\.(png|svg|webp)$/i.test(t)) return t;
  return `${t}.png`;
}

const GENERIC_FALLBACK: CategoryMarkerStyle = {
  backgroundColor: "#78909C",
  maskSrc: `${GSTATIC_PINLETS}/generic_pinlet.png`,
};

const TYPE_RULES: { test: RegExp; style: CategoryMarkerStyle }[] = [
  {
    test: /restaurant|cafe|bar|bakery|meal_takeaway|meal_delivery|food/,
    style: { backgroundColor: "#FF8A65", maskSrc: `${GSTATIC_PINLETS}/restaurant_pinlet.png` },
  },
  {
    test: /dentist|dental|doctor|physician|hospital|health|pharmacy|veterinary|veterinarian/,
    style: { backgroundColor: "#78909C", maskSrc: `${GSTATIC_PINLETS}/pharmacy_pinlet.png` },
  },
  {
    test: /store|shopping_mall|supermarket|clothing_store|convenience_store|furniture_store|hardware_store/,
    style: { backgroundColor: "#4FC3F7", maskSrc: `${GSTATIC_PINLETS}/shopping_pinlet.png` },
  },
  {
    test: /lodging|hotel|motel/,
    style: { backgroundColor: "#EC407A", maskSrc: `${GSTATIC_PINLETS}/hotel_pinlet.png` },
  },
  {
    test: /gas_station|electric_vehicle_charging_station/,
    style: { backgroundColor: "#FF9800", maskSrc: `${GSTATIC_PINLETS}/gas_pinlet.png` },
  },
  {
    test: /school|university|primary_school|secondary_school/,
    style: { backgroundColor: "#42A5F5", maskSrc: `${GSTATIC_PINLETS}/school_pinlet.png` },
  },
  {
    test: /park|zoo|aquarium/,
    style: { backgroundColor: "#66BB6A", maskSrc: `${GSTATIC_PINLETS}/tree_pinlet.png` },
  },
  {
    test: /church|mosque|synagogue|hindu_temple/,
    style: { backgroundColor: "#9575CD", maskSrc: `${GSTATIC_PINLETS}/worship_christian_pinlet.png` },
  },
  {
    test: /gym|spa|beauty_salon|hair_care/,
    style: { backgroundColor: "#AB47BC", maskSrc: `${GSTATIC_PINLETS}/generic_pinlet.png` },
  },
  {
    test: /plumber|electrician|roofing_contractor|general_contractor|locksmith|painter|hvac|home_improvement|home_services/,
    style: { backgroundColor: "#78909C", maskSrc: `${GSTATIC_PINLETS}/generic_pinlet.png` },
  },
];

function primaryPlaceType(types: string[]): string {
  const skip = new Set(["establishment", "point_of_interest", "geocode", "premise"]);
  const hit = types.find((x) => x && !skip.has(x));
  return hit ?? types[0] ?? "";
}

export function resolveCategoryMarkerStyle(input: MapMarkerPointInput): CategoryMarkerStyle {
  const fromApiMask = maskSrcFromPlaceApiBase(input.iconMaskBaseUri);
  if (fromApiMask && input.iconBackgroundColor) {
    return {
      backgroundColor: brightenDiskColor(input.iconBackgroundColor),
      maskSrc: fromApiMask,
    };
  }
  const p = primaryPlaceType(input.types);
  for (const rule of TYPE_RULES) {
    if (rule.test.test(p)) return rule.style;
  }
  return GENERIC_FALLBACK;
}

/** Layout for classic `google.maps.Marker` bitmap + anchor (tip at bottom center of tail). */
export const CLASSIC_MARKER_PIN_LAYOUT = {
  width: 40,
  height: 42,
  anchorX: 20,
  anchorY: 42,
} as const;

function pinDiskGradient(bg: string): string {
  return `linear-gradient(180deg, rgba(255,255,255,0.26) 0%, rgba(255,255,255,0) 52%), ${bg}`;
}

export function buildCategoryMarkerElement(opts: {
  style: CategoryMarkerStyle;
  isSelected: boolean;
  /** Rank / position shown inside the pin head (e.g. `1` … `5`, or `You`). */
  headLabel: string;
}): HTMLElement {
  const diskBg = brightenDiskColor(opts.style.backgroundColor);
  const scale = opts.isSelected ? 1.1 : 1;
  const headPx = Math.round(32 * scale);
  const tailHalf = Math.round(5 * scale);
  const tailH = Math.round(6 * scale);
  const borderW = opts.isSelected ? 3 : 2;
  const root = document.createElement("div");
  root.style.cssText = [
    "display:flex",
    "flex-direction:column",
    "align-items:center",
    "width:max-content",
    "color-scheme:light",
    "forced-color-adjust:none",
    "pointer-events:auto",
    "filter:drop-shadow(0 3px 10px rgba(15,23,42,0.18)) drop-shadow(0 1px 3px rgba(15,23,42,0.12))",
  ].join(";");

  const head = document.createElement("div");
  head.style.cssText = [
    `width:${headPx}px`,
    `height:${headPx}px`,
    "flex-shrink:0",
    "border-radius:50%",
    "box-sizing:border-box",
    `border:${borderW}px solid rgba(255,255,255,0.94)`,
    "display:flex",
    "align-items:center",
    "justify-content:center",
    `background:${pinDiskGradient(diskBg)}`,
    opts.isSelected ? "box-shadow:0 0 0 2px rgba(37,99,235,0.42)" : "",
  ]
    .filter(Boolean)
    .join(";");

  const label = opts.headLabel.trim() || "?";
  const fontPx =
    label.length <= 2 ? Math.round(14 * scale) : label.length <= 3 ? Math.round(12 * scale) : Math.round(10 * scale);

  const text = document.createElement("span");
  text.textContent = label;
  text.style.cssText = [
    `font:800 ${fontPx}px/1 ui-sans-serif,system-ui,-apple-system,sans-serif`,
    "color:#fff",
    "letter-spacing:-0.03em",
    "text-shadow:0 1px 2px rgba(0,0,0,0.32)",
    "font-variant-numeric:tabular-nums",
    "white-space:nowrap",
  ].join(";");
  head.appendChild(text);

  const tail = document.createElement("div");
  tail.setAttribute("aria-hidden", "true");
  tail.style.cssText = [
    "width:0",
    "height:0",
    "margin-top:-2px",
    `border-left:${tailHalf}px solid transparent`,
    `border-right:${tailHalf}px solid transparent`,
    `border-top:${tailH}px solid ${diskBg}`,
    "pointer-events:none",
  ].join(";");

  root.appendChild(head);
  root.appendChild(tail);

  return root;
}

/** Raster marker icon for classic `google.maps.Marker` when no Map ID is configured. */
export async function compositeCategoryMarkerDataUrl(
  style: CategoryMarkerStyle,
  headLabel: string
): Promise<string | null> {
  if (typeof document === "undefined") return null;
  const { width: cw, height: ch } = CLASSIC_MARKER_PIN_LAYOUT;
  const canvas = document.createElement("canvas");
  canvas.width = cw;
  canvas.height = ch;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const fill = brightenDiskColor(style.backgroundColor);
  const cx = 20;
  const cy = 16;
  const r = 15;

  const grd = ctx.createLinearGradient(0, cy - r, 0, cy + r);
  grd.addColorStop(0, "rgba(255,255,255,0.22)");
  grd.addColorStop(0.52, fill);
  grd.addColorStop(1, fill);

  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = grd;
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.94)";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(12, ch);
  ctx.lineTo(28, ch);
  ctx.lineTo(20, cy + r);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.94)";
  ctx.lineWidth = 2;
  ctx.stroke();

  const label = headLabel.trim() || "?";
  try {
    ctx.save();
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const fontSize = label.length <= 2 ? 14 : label.length <= 3 ? 11 : 10;
    ctx.font = `800 ${fontSize}px ui-sans-serif,system-ui,sans-serif`;
    ctx.shadowColor = "rgba(0,0,0,0.32)";
    ctx.shadowBlur = 2;
    ctx.shadowOffsetY = 1;
    ctx.fillText(label, cx, cy);
    ctx.restore();
  } catch {
    return null;
  }

  try {
    return canvas.toDataURL("image/png");
  } catch {
    return null;
  }
}
