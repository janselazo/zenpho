import type { LeadgenFieldData } from "./graph";

export type StructuredFieldEntry = {
  /** Raw field name as Meta returned it (e.g. "FULL_NAME"). */
  name: string;
  /** Normalized snake_case key (used by `{{lead.answer:key}}`). */
  key: string;
  /** Pretty-printed label for human display (e.g. "Tienes Un Carro..."). */
  label: string;
  /** All raw values Meta returned for this question. */
  values: string[];
};

export type MappedFacebookLead = {
  name: string | null;
  email: string | null;
  phone: string | null;
  company: string | null;
  notes: string;
  /**
   * Full structured snapshot of every Q/A pair. Stored on `lead.facebook_field_data`
   * so notification templates and the lead detail page can access individual
   * answers by key. Includes BOTH known fields (full_name, email, phone, ...)
   * and custom-question fields.
   */
  structured: StructuredFieldEntry[];
};

/**
 * Convert Meta's `field_data` (array of `{name, values[]}`) into CRM lead fields.
 *
 * Lead Ads forms have well-known field names for the standard inputs (full_name,
 * email, phone_number) and arbitrary names for custom questions. We extract the
 * common ones into structured columns and dump everything else into the `notes`
 * column so nothing is lost.
 *
 * Names are case-insensitive; Meta sometimes returns variants like `FULL_NAME`,
 * `full name`, `Full Name`. We normalize to lowercase + collapse whitespace.
 */
export function mapFacebookLeadFields(
  fieldData: LeadgenFieldData[]
): MappedFacebookLead {
  const map = new Map<string, string>();
  const structured: StructuredFieldEntry[] = [];
  for (const row of fieldData) {
    const key = normalizeKey(row.name);
    const cleanedValues = row.values
      .map((v) => v.trim())
      .filter((v) => v.length > 0);
    const firstValue = cleanedValues[0] ?? "";
    if (key && firstValue && !map.has(key)) {
      map.set(key, firstValue);
    }
    if (key) {
      structured.push({
        name: row.name,
        key,
        label: prettyKey(key),
        values: cleanedValues,
      });
    }
  }

  const fullName =
    map.get("full_name") ||
    map.get("name") ||
    [map.get("first_name"), map.get("last_name")].filter(Boolean).join(" ").trim() ||
    null;

  const email = map.get("email") || map.get("user_email") || null;
  const phone =
    map.get("phone_number") ||
    map.get("phone") ||
    map.get("mobile_number") ||
    null;
  const company =
    map.get("company_name") ||
    map.get("company") ||
    map.get("business_name") ||
    null;

  const extras: string[] = [];
  for (const [key, value] of map.entries()) {
    if (KNOWN_KEYS.has(key)) continue;
    extras.push(`${prettyKey(key)}: ${value}`);
  }
  const notes = extras.length
    ? `Captured from Facebook Lead Ads.\n${extras.join("\n")}`
    : "Captured from Facebook Lead Ads.";

  return {
    name: fullName ? truncate(fullName, 200) : null,
    email: email ? truncate(email, 320) : null,
    phone: phone ? truncate(phone, 60) : null,
    company: company ? truncate(company, 200) : null,
    notes,
    structured,
  };
}

/**
 * Look up a single answer in a structured field-data array by its normalized
 * snake_case key. Returns the joined values when the question allows multiple
 * answers (joined with ", "), or `null` if the key is unknown / empty.
 */
export function findFieldDataAnswer(
  fieldData: StructuredFieldEntry[] | null | undefined,
  key: string
): string | null {
  if (!fieldData || fieldData.length === 0) return null;
  const normalized = normalizeKey(key);
  if (!normalized) return null;
  const hit = fieldData.find((entry) => entry.key === normalized);
  if (!hit) return null;
  const joined = hit.values.join(", ").trim();
  return joined.length > 0 ? joined : null;
}

/**
 * Render the full Q/A snapshot as either an HTML `<ul>` (for email bodies)
 * or as plain text (for SMS / plain-text email fallback). Empty / structural-
 * only entries are skipped, and the well-known "header" fields (full_name,
 * email, phone_number, company) are excluded by default since they already
 * have their own template tokens — most users only want this token to render
 * the *custom* questions.
 */
export function renderStructuredAnswers(
  fieldData: StructuredFieldEntry[] | null | undefined,
  format: "html" | "text",
  options: { includeStandard?: boolean } = {}
): string {
  if (!fieldData || fieldData.length === 0) return "";
  const includeStandard = options.includeStandard ?? false;
  const skipKeys = includeStandard ? new Set<string>() : KNOWN_KEYS;

  const rows = fieldData
    .filter((entry) => !skipKeys.has(entry.key))
    .map((entry) => {
      const joined = entry.values.join(", ").trim();
      return joined.length > 0 ? { label: entry.label, value: joined } : null;
    })
    .filter((row): row is { label: string; value: string } => row !== null);

  if (rows.length === 0) return "";

  if (format === "html") {
    return (
      "<ul>" +
      rows
        .map(
          (r) =>
            `<li><strong>${escapeHtml(r.label)}:</strong> ${escapeHtml(r.value)}</li>`
        )
        .join("") +
      "</ul>"
    );
  }
  return rows.map((r) => `${r.label}: ${r.value}`).join("\n");
}

function normalizeKey(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
}

function prettyKey(key: string): string {
  return key
    .split("_")
    .filter(Boolean)
    .map((p) => (p.length > 0 ? p[0].toUpperCase() + p.slice(1) : p))
    .join(" ");
}

function truncate(value: string, max: number): string {
  return value.length > max ? value.slice(0, max) : value;
}

const KNOWN_KEYS = new Set<string>([
  "full_name",
  "name",
  "first_name",
  "last_name",
  "email",
  "user_email",
  "phone_number",
  "phone",
  "mobile_number",
  "company_name",
  "company",
  "business_name",
]);

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
