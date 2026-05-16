import type { LeadgenFieldData } from "./graph";

export type MappedFacebookLead = {
  name: string | null;
  email: string | null;
  phone: string | null;
  company: string | null;
  notes: string;
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
  for (const row of fieldData) {
    const key = normalizeKey(row.name);
    const value = row.values.find((v) => v.trim().length > 0)?.trim() ?? "";
    if (!key || !value) continue;
    if (!map.has(key)) map.set(key, value);
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

  const knownKeys = new Set([
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

  const extras: string[] = [];
  for (const [key, value] of map.entries()) {
    if (knownKeys.has(key)) continue;
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
  };
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
