/** Google-hosted pinlets (v2), same family as Google Maps category markers. */
const GSTATIC_PINLETS = "https://maps.gstatic.com/mapfiles/place_api/icons/v2";

/**
 * Light-blue base map for the revenue leak competitor map (`google.maps.Map` `styles`).
 */
export const competitorMapLightBlueStyles = [
  { featureType: "landscape", stylers: [{ color: "#e6f2fa" }] },
  { featureType: "landscape.man_made", stylers: [{ color: "#dceef7" }] },
  { featureType: "poi", stylers: [{ color: "#ddeef8" }] },
  { featureType: "poi.park", stylers: [{ color: "#d4e9df" }] },
  { featureType: "road", elementType: "geometry.fill", stylers: [{ color: "#f7fbff" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#cfe2f0" }] },
  { featureType: "water", stylers: [{ color: "#b9dff3" }] },
  { featureType: "administrative", elementType: "geometry.stroke", stylers: [{ color: "#bcd8eb" }] },
] as const;

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

/** Teardrop pin in viewBox units (dome + taper); tip at bottom center. */
const PIN_PATH_D = "M 24 54 L 8 22 A 16 16 0 0 1 40 22 Z";

/** Layout for classic `google.maps.Marker` bitmap + anchor (tip at bottom center). */
export const CLASSIC_MARKER_PIN_LAYOUT = {
  width: 48,
  height: 56,
  anchorX: 24,
  anchorY: 54,
} as const;

function pinPath2d(): Path2D {
  return new Path2D(PIN_PATH_D);
}

export function buildCategoryMarkerElement(opts: {
  style: CategoryMarkerStyle;
  isSelected: boolean;
  /** Rank / position shown inside the pin head (e.g. `1` … `5`, or `You`). */
  headLabel: string;
}): HTMLElement {
  const diskBg = brightenDiskColor(opts.style.backgroundColor);
  const scale = opts.isSelected ? 1.12 : 1;
  const w = Math.round(CLASSIC_MARKER_PIN_LAYOUT.width * scale);
  const h = Math.round(CLASSIC_MARKER_PIN_LAYOUT.height * scale);
  const root = document.createElement("div");
  root.style.cssText = [
    "position:relative",
    `width:${w}px`,
    `height:${h}px`,
    "color-scheme:light",
    "forced-color-adjust:none",
    "filter:drop-shadow(0 2px 4px rgba(0,0,0,.28)) drop-shadow(0 1px 1px rgba(0,0,0,.18))",
  ].join(";");

  const svgNs = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNs, "svg");
  svg.setAttribute("viewBox", "0 0 48 56");
  svg.setAttribute("width", String(w));
  svg.setAttribute("height", String(h));
  svg.setAttribute("aria-hidden", "true");
  svg.style.cssText = "display:block;overflow:visible";

  const path = document.createElementNS(svgNs, "path");
  path.setAttribute("d", PIN_PATH_D);
  path.setAttribute("fill", diskBg);
  path.setAttribute("stroke", opts.isSelected ? "#ffffff" : "rgba(255,255,255,0.94)");
  path.setAttribute("stroke-width", opts.isSelected ? "2.25" : "1.65");
  path.setAttribute("stroke-linejoin", "round");
  svg.appendChild(path);
  root.appendChild(svg);

  const label = opts.headLabel.trim() || "?";
  const fontPx =
    label.length <= 2 ? Math.round(17 * scale) : label.length <= 3 ? Math.round(14 * scale) : Math.round(12 * scale);

  const glyphWrap = document.createElement("div");
  glyphWrap.style.cssText = [
    "position:absolute",
    "left:50%",
    "top:18%",
    "transform:translateX(-50%)",
    "min-width:22px",
    "padding:0 4px",
    "display:flex",
    "align-items:center",
    "justify-content:center",
    "pointer-events:none",
  ].join(";");

  const text = document.createElement("div");
  text.textContent = label;
  text.style.cssText = [
    `font:800 ${fontPx}px/1 system-ui,-apple-system,sans-serif`,
    "color:#fff",
    "text-align:center",
    "letter-spacing:-0.02em",
    "text-shadow:0 1px 2px rgba(0,0,0,.45),0 0 1px rgba(0,0,0,.35)",
    "white-space:nowrap",
  ].join(";");
  glyphWrap.appendChild(text);
  root.appendChild(glyphWrap);

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
  const pin = pinPath2d();
  ctx.fillStyle = fill;
  ctx.fill(pin);
  ctx.strokeStyle = "rgba(255,255,255,0.94)";
  ctx.lineWidth = 1.65;
  ctx.lineJoin = "round";
  ctx.stroke(pin);

  const label = headLabel.trim() || "?";
  const cx = 24;
  const cy = 16;
  const gr = 10;
  try {
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, gr, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const fontSize = label.length <= 2 ? 16 : label.length <= 3 ? 13 : 11;
    ctx.font = `800 ${fontSize}px system-ui,-apple-system,sans-serif`;
    ctx.shadowColor = "rgba(0,0,0,0.35)";
    ctx.shadowBlur = 2;
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
