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

export function buildCategoryMarkerElement(opts: {
  style: CategoryMarkerStyle;
  badgeText: string | null;
  isSelected: boolean;
}): HTMLElement {
  const size = opts.isSelected ? 44 : 38;
  const diskBg = brightenDiskColor(opts.style.backgroundColor);
  const root = document.createElement("div");
  root.style.cssText = `position:relative;width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center;color-scheme:light;forced-color-adjust:none;`;

  const disk = document.createElement("div");
  const inner = size - 6;
  disk.style.cssText = [
    `width:${inner}px`,
    `height:${inner}px`,
    `border-radius:50%`,
    `background:${diskBg}`,
    `display:flex`,
    `align-items:center`,
    `justify-content:center`,
    `box-shadow:0 2px 8px rgba(0,0,0,.35)`,
    `color-scheme:light`,
    `forced-color-adjust:none`,
    opts.isSelected
      ? "border:3px solid #fff;outline:2px solid rgba(0,0,0,.12)"
      : "border:2px solid rgba(255,255,255,.9)",
  ].join(";");

  const img = document.createElement("img");
  img.src = opts.style.maskSrc;
  img.alt = "";
  const glyph = Math.round(inner * 0.52);
  img.width = glyph;
  img.height = glyph;
  img.style.cssText = "object-fit:contain;display:block;filter:brightness(0) invert(1);opacity:0.95;";
  img.draggable = false;
  const fallbackMask = `${GSTATIC_PINLETS}/generic_pinlet.png`;
  img.addEventListener(
    "error",
    () => {
      if (img.src !== fallbackMask) {
        img.src = fallbackMask;
        return;
      }
      const trySvg = opts.style.maskSrc.replace(/\.png$/i, ".svg");
      if (trySvg !== opts.style.maskSrc && !img.dataset.svgTried) {
        img.dataset.svgTried = "1";
        img.src = trySvg;
      }
    },
    { once: false }
  );
  disk.appendChild(img);
  root.appendChild(disk);

  if (opts.badgeText) {
    const badge = document.createElement("div");
    badge.textContent = opts.badgeText;
    badge.style.cssText = [
      "position:absolute",
      "right:-4px",
      "bottom:-2px",
      "min-width:18px",
      "height:18px",
      "padding:0 5px",
      "border-radius:999px",
      "background:#fff",
      "color:#c5221f",
      "font:bold 10px/18px system-ui,sans-serif",
      "box-shadow:0 1px 3px rgba(0,0,0,.35)",
      "text-align:center",
    ].join(";");
    root.appendChild(badge);
  }

  return root;
}

/** Raster marker icon for classic `google.maps.Marker` when no Map ID is configured. */
export async function compositeCategoryMarkerDataUrl(
  style: CategoryMarkerStyle,
  size = 48
): Promise<string | null> {
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 2;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = brightenDiskColor(style.backgroundColor);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.92)";
  ctx.lineWidth = 2;
  ctx.stroke();

  const loadMask = (src: string) =>
    new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("mask load failed"));
      img.src = src;
    });

  let imgEl: HTMLImageElement;
  try {
    imgEl = await loadMask(style.maskSrc);
  } catch {
    try {
      imgEl = await loadMask(`${GSTATIC_PINLETS}/generic_pinlet.png`);
    } catch {
      return null;
    }
  }

  try {
    const gw = size * 0.5;
    ctx.save();
    ctx.filter = "brightness(0) invert(1)";
    ctx.drawImage(imgEl, cx - gw / 2, cy - gw / 2, gw, gw);
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
