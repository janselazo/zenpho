import {
  LEAD_CONTACT_CATEGORY_OPTIONS,
  LEAD_PROJECT_TYPE_OPTIONS,
  PLAN_LABELS,
  PLAN_STAGE_ORDER,
  type PlanStage,
} from "@/lib/crm/mock-data";

/** Default seed for lead sources (merged with DB; users can edit in Settings). */
export const LEAD_SOURCE_DEFAULT_OPTIONS = [
  "website",
  "referral",
  "linkedin",
  "cold outreach",
  "conference",
  "facebook",
  "instagram",
  "Prospecting — Prospects",
] as const;

export const MAX_FIELD_OPTION_LIST_ITEMS = 50;
export const MAX_FIELD_OPTION_STRING_LEN = 80;

/** Raw JSON from `crm_settings.crm_field_options`. */
export type CrmFieldOptionsRaw = {
  leadProjectTypes?: unknown;
  leadSources?: unknown;
  leadContactCategories?: unknown;
  productPlanLabels?: unknown;
};

/** Normalized options merged with app defaults (safe for forms + validation). */
export type MergedCrmFieldOptions = {
  leadProjectTypes: string[];
  leadSources: string[];
  leadContactCategories: string[];
  productPlanLabels: Record<PlanStage, string>;
};

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function normalizeStringList(
  raw: unknown,
  fallback: readonly string[]
): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  const arr = Array.isArray(raw) ? raw : [];
  for (const item of arr) {
    if (typeof item !== "string") continue;
    const t = item.trim().slice(0, MAX_FIELD_OPTION_STRING_LEN);
    if (!t || seen.has(t)) continue;
    seen.add(t);
    out.push(t);
    if (out.length >= MAX_FIELD_OPTION_LIST_ITEMS) break;
  }
  if (out.length > 0) return out;
  return [...fallback];
}

function normalizeProductPlanLabels(raw: unknown): Partial<Record<PlanStage, string>> {
  if (!isPlainObject(raw)) return {};
  const out: Partial<Record<PlanStage, string>> = {};
  for (const slug of PLAN_STAGE_ORDER) {
    const v = raw[slug];
    if (typeof v !== "string") continue;
    const t = v.trim().slice(0, MAX_FIELD_OPTION_STRING_LEN);
    if (t) out[slug] = t;
  }
  return out;
}

export function mergeProductPlanLabels(
  partial: Partial<Record<PlanStage, string>> | null | undefined
): Record<PlanStage, string> {
  const base = { ...PLAN_LABELS };
  if (!partial) return base;
  for (const slug of PLAN_STAGE_ORDER) {
    const v = partial[slug]?.trim();
    if (v) base[slug] = v.slice(0, MAX_FIELD_OPTION_STRING_LEN);
  }
  return base;
}

export function mergeFieldOptionsFromDb(
  raw: CrmFieldOptionsRaw | null | undefined
): MergedCrmFieldOptions {
  const r = raw && isPlainObject(raw as object) ? (raw as CrmFieldOptionsRaw) : {};
  const planPartial = normalizeProductPlanLabels(r.productPlanLabels);
  return {
    leadProjectTypes: normalizeStringList(
      r.leadProjectTypes,
      LEAD_PROJECT_TYPE_OPTIONS
    ),
    leadSources: normalizeStringList(r.leadSources, LEAD_SOURCE_DEFAULT_OPTIONS),
    leadContactCategories: normalizeStringList(
      r.leadContactCategories,
      LEAD_CONTACT_CATEGORY_OPTIONS
    ),
    productPlanLabels: mergeProductPlanLabels(planPartial),
  };
}

/** Client-safe defaults when no DB row (e.g. demos). */
export const DEFAULT_MERGED_CRM_FIELD_OPTIONS = mergeFieldOptionsFromDb(null);

export type CrmFieldOptionsSaveInput = {
  leadProjectTypes: string[];
  leadSources: string[];
  leadContactCategories: string[];
  productPlanLabels: Partial<Record<PlanStage, string>>;
};

function sanitizeListForSave(arr: unknown): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  if (!Array.isArray(arr)) return out;
  for (const item of arr) {
    if (typeof item !== "string") continue;
    const t = item.trim().slice(0, MAX_FIELD_OPTION_STRING_LEN);
    if (!t || seen.has(t)) continue;
    seen.add(t);
    out.push(t);
    if (out.length >= MAX_FIELD_OPTION_LIST_ITEMS) break;
  }
  return out;
}

/** Returns JSON to persist on `crm_field_options` or `{ error: string }`. */
export function validateFieldOptionsForSave(
  input: CrmFieldOptionsSaveInput
): CrmFieldOptionsRaw | { error: string } {
  const leadProjectTypes = sanitizeListForSave(input.leadProjectTypes);
  const leadSources = sanitizeListForSave(input.leadSources);
  const leadContactCategories = sanitizeListForSave(input.leadContactCategories);

  if (leadProjectTypes.length === 0) {
    return { error: "Add at least one project type." };
  }
  if (leadSources.length === 0) {
    return { error: "Add at least one lead source option." };
  }
  if (leadContactCategories.length === 0) {
    return { error: "Add at least one contact category." };
  }

  const productPlanLabels: Partial<Record<PlanStage, string>> = {};
  const partial = input.productPlanLabels;
  if (partial && isPlainObject(partial as object)) {
    for (const slug of PLAN_STAGE_ORDER) {
      const v = (partial as Record<string, unknown>)[slug];
      if (typeof v !== "string") continue;
      const t = v.trim().slice(0, MAX_FIELD_OPTION_STRING_LEN);
      if (t) productPlanLabels[slug] = t;
    }
  }

  return {
    leadProjectTypes,
    leadSources,
    leadContactCategories,
    productPlanLabels,
  };
}

export function projectTypeSet(opts: MergedCrmFieldOptions): Set<string> {
  return new Set(opts.leadProjectTypes);
}

export function contactCategorySet(opts: MergedCrmFieldOptions): Set<string> {
  return new Set(opts.leadContactCategories);
}

export function leadSourceSet(opts: MergedCrmFieldOptions): Set<string> {
  return new Set(opts.leadSources);
}
