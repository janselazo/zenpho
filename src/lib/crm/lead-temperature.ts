export type LeadTemperature = "cold" | "warm" | "hot";

export const LEAD_TEMPERATURE_ORDER: readonly LeadTemperature[] = [
  "cold",
  "warm",
  "hot",
];

/** Display-only: cold extreme, cozy warm, hot. */
export const LEAD_TEMPERATURE_EMOJI: Record<LeadTemperature, string> = {
  cold: "🥶",
  warm: "🧸",
  hot: "🔥",
};

export function parseLeadTemperature(
  raw: string | null | undefined
): LeadTemperature | null {
  if (raw == null || String(raw).trim() === "") return null;
  const v = String(raw).trim().toLowerCase();
  if (v === "cold" || v === "warm" || v === "hot") return v;
  return null;
}
