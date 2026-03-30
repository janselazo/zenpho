import {
  CHILD_DELIVERY_STATUSES,
  CHILD_DELIVERY_STATUS_LABELS,
  type ChildDeliveryStatus,
} from "@/lib/crm/product-project-metadata";

const METADATA_KEY = "childDeliveryStatusUi" as const;

export type ChildDeliveryStatusUiEntry = {
  label?: string;
  color?: string;
};

/** Overrides stored on the parent product `metadata.childDeliveryStatusUi`. */
export type ChildDeliveryStatusUiConfig = Partial<
  Record<ChildDeliveryStatus, ChildDeliveryStatusUiEntry>
>;

/** Default badge colors (hex) for each delivery column. */
export const DEFAULT_CHILD_DELIVERY_STATUS_COLORS: Record<
  ChildDeliveryStatus,
  string
> = {
  backlog: "#52525b",
  planned: "#f59e0b",
  in_progress: "#7c3aed",
  completed: "#059669",
  canceled: "#71717a",
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** Normalize to `#rrggbb` or null if invalid. */
export function normalizeHexColor(input: string | null | undefined): string | null {
  if (input == null) return null;
  const s = input.trim();
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(s);
  if (!m) return null;
  let h = m[1].toLowerCase();
  if (h.length === 3) {
    h = h
      .split("")
      .map((c) => c + c)
      .join("");
  }
  return `#${h}`;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const n = normalizeHexColor(hex);
  if (!n) return null;
  const x = parseInt(n.slice(1), 16);
  return { r: (x >> 16) & 255, g: (x >> 8) & 255, b: x & 255 };
}

function relativeLuminance(r: number, g: number, b: number): number {
  const lin = (c: number) => {
    c /= 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  const R = lin(r);
  const G = lin(g);
  const B = lin(b);
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

export function contrastTextForBg(hex: string): "#ffffff" | "#171717" {
  const rgb = hexToRgb(hex);
  if (!rgb) return "#ffffff";
  const L = relativeLuminance(rgb.r, rgb.g, rgb.b);
  return L > 0.45 ? "#171717" : "#ffffff";
}

export function parseChildDeliveryStatusUi(
  metadata: unknown
): ChildDeliveryStatusUiConfig {
  if (!isRecord(metadata)) return {};
  const raw = metadata[METADATA_KEY];
  if (!isRecord(raw)) return {};
  const out: ChildDeliveryStatusUiConfig = {};
  for (const id of CHILD_DELIVERY_STATUSES) {
    const e = raw[id];
    if (!isRecord(e)) continue;
    const label =
      typeof e.label === "string" && e.label.trim() ? e.label.trim() : undefined;
    const color = normalizeHexColor(
      typeof e.color === "string" ? e.color : null
    );
    if (label || color) {
      out[id] = {
        ...(label ? { label } : {}),
        ...(color ? { color } : {}),
      };
    }
  }
  return out;
}

export function defaultChildDeliveryLabel(id: ChildDeliveryStatus): string {
  return CHILD_DELIVERY_STATUS_LABELS[id];
}

export function resolveChildDeliveryPresentation(
  id: ChildDeliveryStatus,
  ui: ChildDeliveryStatusUiConfig
): {
  label: string;
  labelUpper: string;
  color: string;
  foreground: string;
} {
  const defLabel = defaultChildDeliveryLabel(id);
  const defColor = DEFAULT_CHILD_DELIVERY_STATUS_COLORS[id];
  const o = ui[id];
  const label = (o?.label?.trim() || defLabel).trim() || defLabel;
  const color = normalizeHexColor(o?.color ?? null) || defColor;
  const foreground = contrastTextForBg(color);
  return {
    label,
    labelUpper: label.toUpperCase(),
    color,
    foreground,
  };
}

/** Persist only fields that differ from defaults. */
export function serializeChildDeliveryStatusUi(
  ui: ChildDeliveryStatusUiConfig
): Record<string, unknown> | undefined {
  const serial: Record<string, unknown> = {};
  for (const id of CHILD_DELIVERY_STATUSES) {
    const e = ui[id];
    if (!e) continue;
    const defLabel = defaultChildDeliveryLabel(id);
    const defColor = DEFAULT_CHILD_DELIVERY_STATUS_COLORS[id];
    const entry: Record<string, unknown> = {};
    const nl = e.label?.trim();
    const nc = normalizeHexColor(e.color ?? null);
    if (nl && nl !== defLabel) entry.label = nl;
    if (nc && nc !== defColor) entry.color = nc;
    if (Object.keys(entry).length) serial[id] = entry;
  }
  return Object.keys(serial).length ? serial : undefined;
}

export function applyChildDeliveryStatusUiToMetadata(
  metadata: Record<string, unknown>,
  ui: ChildDeliveryStatusUiConfig
): Record<string, unknown> {
  const out = { ...metadata };
  const serial = serializeChildDeliveryStatusUi(ui);
  if (serial) out[METADATA_KEY] = serial;
  else delete out[METADATA_KEY];
  return out;
}
