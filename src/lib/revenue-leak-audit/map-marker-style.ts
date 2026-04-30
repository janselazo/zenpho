/** Google-hosted pinlets (v2), same family as Google Maps category markers. */
const GSTATIC_PINLETS = "https://maps.gstatic.com/mapfiles/place_api/icons/v2";

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
    return { backgroundColor: input.iconBackgroundColor, maskSrc: fromApiMask };
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
  const root = document.createElement("div");
  root.style.cssText = `position:relative;width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center;`;

  const disk = document.createElement("div");
  const inner = size - 6;
  disk.style.cssText = [
    `width:${inner}px`,
    `height:${inner}px`,
    `border-radius:50%`,
    `background:${opts.style.backgroundColor}`,
    `display:flex`,
    `align-items:center`,
    `justify-content:center`,
    `box-shadow:0 2px 8px rgba(0,0,0,.35)`,
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
  img.style.objectFit = "contain";
  img.draggable = false;
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
  ctx.fillStyle = style.backgroundColor;
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.92)";
  ctx.lineWidth = 2;
  ctx.stroke();

  try {
    await new Promise<void>((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        try {
          const gw = size * 0.5;
          ctx.drawImage(img, cx - gw / 2, cy - gw / 2, gw, gw);
          resolve();
        } catch {
          reject(new Error("drawImage failed"));
        }
      };
      img.onerror = () => reject(new Error("mask load failed"));
      img.src = style.maskSrc;
    });
  } catch {
    return null;
  }

  try {
    return canvas.toDataURL("image/png");
  } catch {
    return null;
  }
}
