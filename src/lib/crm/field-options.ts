import {
  LEAD_CONTACT_CATEGORY_OPTIONS,
  LEAD_PROJECT_TYPE_OPTIONS,
  PLAN_LABELS,
  PLAN_STAGE_ORDER,
  type PlanStage,
} from "@/lib/crm/mock-data";

/** Default seed for lead sources (merged with DB; users can edit in Settings). */
export const LEAD_SOURCE_DEFAULT_OPTIONS = [
  "Website",
  "Referral",
  "LinkedIn",
  "Upwork",
  "Cold Email",
  "Cold DM",
  "Networking",
  "Prospects",
  "Facebook Ads",
  "Google Ads",
  "Social Media",
  "Partnerships",
  "Revenue Leak Audit",
] as const;

/** Display label for lead source picklist (legacy all-lowercase values get title case). */
export function formatLeadSourceOptionLabel(value: string): string {
  const t = value.trim();
  if (!t) return "";
  if (/[A-Z]/.test(t) && t !== t.toUpperCase()) return t;
  const lower = t.toLowerCase();
  if (lower === "linkedin") return "LinkedIn";
  if (lower === "cold dm") return "Cold DM";
  return t
    .split(/[\s_-]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

export const MAX_FIELD_OPTION_LIST_ITEMS = 50;
export const MAX_FIELD_OPTION_STRING_LEN = 80;

/** Max plan columns (built-in five + custom). */
export const MAX_PRODUCT_PLAN_STAGES = 15;

/** Slug for custom plan stages (and keys in `productPlanLabels`). */
export const PLAN_STAGE_SLUG_PATTERN = /^[a-z][a-z0-9_]{0,31}$/;

function defaultLabelForPlanSlug(slug: string): string {
  const s = String(slug ?? "").trim();
  if (!s) return "Stage";
  if ((PLAN_STAGE_ORDER as readonly string[]).includes(s)) {
    const L = PLAN_LABELS[s as PlanStage];
    if (typeof L === "string" && L.length > 0) return L;
  }
  return s
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Ensures plain JSON shape for RSC / Flight serialization (no odd prototypes). */
function cloneMergedForFlight(m: MergedCrmFieldOptions): MergedCrmFieldOptions {
  return JSON.parse(JSON.stringify(m)) as MergedCrmFieldOptions;
}

/** Raw JSON from `crm_settings.crm_field_options`. */
export type CrmFieldOptionsRaw = {
  leadProjectTypes?: unknown;
  leadSources?: unknown;
  leadContactCategories?: unknown;
  productPlanLabels?: unknown;
  productPlanStageOrder?: unknown;
};

/** Normalized options merged with app defaults (safe for forms + validation). */
export type MergedCrmFieldOptions = {
  leadProjectTypes: string[];
  leadSources: string[];
  leadContactCategories: string[];
  /** Ordered `plan_stage` slugs: built-ins first, then custom stages from Settings. */
  productPlanStageOrder: string[];
  productPlanLabels: Record<string, string>;
};

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** Supabase may return jsonb as object; some setups store a JSON string. */
function coerceCrmFieldOptionsRow(raw: unknown): CrmFieldOptionsRaw {
  if (raw == null) return {};
  if (typeof raw === "string") {
    const t = raw.trim();
    if (!t) return {};
    try {
      const parsed: unknown = JSON.parse(t);
      return isPlainObject(parsed) ? (parsed as CrmFieldOptionsRaw) : {};
    } catch {
      return {};
    }
  }
  if (isPlainObject(raw)) return raw as CrmFieldOptionsRaw;
  return {};
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

function parsePicklistFromDbRaw(raw: unknown): string[] {
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
  return out;
}

/** Order-independent signature for comparing saved picklists to legacy defaults. */
function picklistSignature(arr: readonly string[]): string {
  return [...arr]
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
    .sort()
    .join("\0");
}

/**
 * Older CRM defaults used Retail/SaaS personas. Map those stored picklists to the
 * current canonical list so UI matches product defaults without manual Settings edits.
 */
const LEGACY_LEAD_CONTACT_CATEGORY_PICKLIST_SIGS = new Set([
  picklistSignature([
    "Retail / DTC Founder",
    "Tech Founder",
    "SaaS Founder",
  ]),
]);

const LEGACY_LEAD_SOURCE_PICKLIST_SIGS = new Set([
  picklistSignature([
    "website",
    "referral",
    "linkedin",
    "cold outreach",
    "conference",
    "facebook",
    "instagram",
    "Prospects",
  ]),
]);

function shouldUseCanonicalLeadContactCategories(arr: string[]): boolean {
  return LEGACY_LEAD_CONTACT_CATEGORY_PICKLIST_SIGS.has(picklistSignature(arr));
}

function mergeLeadSourcesFromDb(rawSources: unknown): string[] {
  const fromDb = parsePicklistFromDbRaw(rawSources);
  if (
    fromDb.length > 0 &&
    LEGACY_LEAD_SOURCE_PICKLIST_SIGS.has(picklistSignature(fromDb))
  ) {
    return [...LEAD_SOURCE_DEFAULT_OPTIONS];
  }
  if (fromDb.length > 0) return fromDb;
  return [...LEAD_SOURCE_DEFAULT_OPTIONS];
}

function parseProductPlanLabelsRaw(raw: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (!isPlainObject(raw)) return out;
  for (const [k, v] of Object.entries(raw)) {
    const key = k.trim().toLowerCase();
    if (!key || !PLAN_STAGE_SLUG_PATTERN.test(key)) continue;
    if (typeof v !== "string") continue;
    const t = v.trim().slice(0, MAX_FIELD_OPTION_STRING_LEN);
    if (t) out[key] = t;
  }
  return out;
}

function normalizeProductPlanStageOrderFromDb(
  raw: unknown,
  labelKeys: Iterable<string>
): string[] {
  const built = [...PLAN_STAGE_ORDER];
  const builtSet = new Set<string>(built);
  if (Array.isArray(raw) && raw.length > 0) {
    const out: string[] = [];
    const seen = new Set<string>();
    for (const item of raw) {
      if (typeof item !== "string") continue;
      const s = item.trim().toLowerCase();
      if (!s || seen.has(s) || !PLAN_STAGE_SLUG_PATTERN.test(s)) continue;
      seen.add(s);
      out.push(s);
    }
    const hasAllBuilt = built.every((b) => seen.has(b));
    if (hasAllBuilt && out.length >= built.length) return out;
  }
  const partialLabels = new Set(labelKeys);
  const fromLabels = [...partialLabels].filter((k) => !builtSet.has(k)).sort();
  return [...built, ...fromLabels];
}

function finalizeProductPlanLabelsForOrder(
  order: string[],
  partial: Record<string, string>
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const slug of order) {
    const raw = partial[slug];
    const v =
      typeof raw === "string"
        ? raw.trim().slice(0, MAX_FIELD_OPTION_STRING_LEN)
        : "";
    out[slug] = v.length > 0 ? v : defaultLabelForPlanSlug(slug);
  }
  return out;
}

export function mergeFieldOptionsFromDb(
  raw: CrmFieldOptionsRaw | null | undefined | unknown
): MergedCrmFieldOptions {
  try {
    const r =
      raw === null || raw === undefined
        ? {}
        : coerceCrmFieldOptionsRow(raw);
    const planPartial = parseProductPlanLabelsRaw(r.productPlanLabels);
    const labelKeys = new Set(Object.keys(planPartial));
    let productPlanStageOrder = normalizeProductPlanStageOrderFromDb(
      r.productPlanStageOrder,
      labelKeys
    );
    for (const k of Object.keys(planPartial)) {
      if (!productPlanStageOrder.includes(k)) productPlanStageOrder.push(k);
    }
    if (productPlanStageOrder.length === 0) {
      productPlanStageOrder = [...PLAN_STAGE_ORDER];
    }
    const productPlanLabels = finalizeProductPlanLabelsForOrder(
      productPlanStageOrder,
      planPartial
    );
    return cloneMergedForFlight({
      leadProjectTypes: normalizeStringList(
        r.leadProjectTypes,
        LEAD_PROJECT_TYPE_OPTIONS
      ),
      leadSources: mergeLeadSourcesFromDb(r.leadSources),
      leadContactCategories: (() => {
        const fromDb = normalizeStringList(r.leadContactCategories, []);
        if (shouldUseCanonicalLeadContactCategories(fromDb)) {
          return [...LEAD_CONTACT_CATEGORY_OPTIONS];
        }
        return normalizeStringList(
          r.leadContactCategories,
          LEAD_CONTACT_CATEGORY_OPTIONS
        );
      })(),
      productPlanStageOrder,
      productPlanLabels,
    });
  } catch {
    const fallbackOrder = [...PLAN_STAGE_ORDER];
    return cloneMergedForFlight({
      leadProjectTypes: normalizeStringList(
        undefined,
        LEAD_PROJECT_TYPE_OPTIONS
      ),
      leadSources: normalizeStringList(undefined, LEAD_SOURCE_DEFAULT_OPTIONS),
      leadContactCategories: normalizeStringList(
        undefined,
        LEAD_CONTACT_CATEGORY_OPTIONS
      ),
      productPlanStageOrder: fallbackOrder,
      productPlanLabels: finalizeProductPlanLabelsForOrder(fallbackOrder, {}),
    });
  }
}

/** Client-safe defaults when no DB row (e.g. demos). */
export const DEFAULT_MERGED_CRM_FIELD_OPTIONS = mergeFieldOptionsFromDb(null);

export type CrmFieldOptionsSaveInput = {
  leadProjectTypes: string[];
  leadSources: string[];
  leadContactCategories: string[];
  /** Full ordered list of `plan_stage` slugs; must include every built-in stage exactly once. */
  productPlanStageOrder: string[];
  productPlanLabels: Record<string, string>;
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

  const orderRaw = input.productPlanStageOrder;
  if (!Array.isArray(orderRaw)) {
    return { error: "Invalid product plan stage order." };
  }
  const productPlanStageOrder: string[] = [];
  const seenSlugs = new Set<string>();
  for (const item of orderRaw) {
    if (typeof item !== "string") {
      return { error: "Invalid product plan stage order." };
    }
    const s = item.trim().toLowerCase();
    if (!s || seenSlugs.has(s)) {
      return { error: "Each plan stage must have a unique slug." };
    }
    if (!PLAN_STAGE_SLUG_PATTERN.test(s)) {
      return {
        error:
          "Plan stage slugs must start with a letter and use only lowercase letters, numbers, and underscores.",
      };
    }
    seenSlugs.add(s);
    productPlanStageOrder.push(s);
  }
  for (const b of PLAN_STAGE_ORDER) {
    if (!seenSlugs.has(b)) {
      return { error: "Keep all default plan stages (backlog through release) in the list." };
    }
  }
  if (productPlanStageOrder.length > MAX_PRODUCT_PLAN_STAGES) {
    return {
      error: `You can have at most ${MAX_PRODUCT_PLAN_STAGES} plan stages.`,
    };
  }

  const partial = input.productPlanLabels;
  const productPlanLabels: Record<string, string> = {};
  if (!partial || !isPlainObject(partial)) {
    return { error: "Invalid product plan labels." };
  }
  const partialRec = partial as Record<string, unknown>;
  for (const slug of productPlanStageOrder) {
    const v = partialRec[slug];
    if (typeof v !== "string") {
      productPlanLabels[slug] = defaultLabelForPlanSlug(slug);
      continue;
    }
    const t = v.trim().slice(0, MAX_FIELD_OPTION_STRING_LEN);
    const fallback = defaultLabelForPlanSlug(slug);
    productPlanLabels[slug] = t.length > 0 ? t : fallback;
  }

  return {
    leadProjectTypes,
    leadSources,
    leadContactCategories,
    productPlanStageOrder,
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

export function productPlanStageSet(opts: MergedCrmFieldOptions): Set<string> {
  const order = opts.productPlanStageOrder;
  if (!Array.isArray(order) || order.length === 0) {
    return new Set(PLAN_STAGE_ORDER as readonly string[]);
  }
  return new Set(order);
}
