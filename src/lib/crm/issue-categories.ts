export const ISSUE_CATEGORY_OPTIONS = [
  { value: "feature_request", label: "Feature Request" },
  { value: "bug_report", label: "Bug Report" },
  { value: "customer_request", label: "Customer Request" },
] as const;

export type IssueCategoryValue = (typeof ISSUE_CATEGORY_OPTIONS)[number]["value"];

export function issueCategoryLabel(value: string): string {
  const row = ISSUE_CATEGORY_OPTIONS.find((o) => o.value === value);
  return row?.label ?? value.replace(/_/g, " ");
}
