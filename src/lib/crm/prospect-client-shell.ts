/** Marks CRM `client` rows created only to hold a product before the lead reaches Won. */
export const PROSPECT_CLIENT_SHELL_MARKER = "[zenpho:prospect_shell]";

/** Stored on root `project.metadata` when the product was created from a lead. */
export const PROJECT_SOURCE_LEAD_ID_KEY = "sourceLeadId" as const;

export function prospectShellLine(): string {
  return `${PROSPECT_CLIENT_SHELL_MARKER} Account holds CRM product before lead is marked Won.`;
}

export function notesIncludeProspectShellMarker(notes: string | null | undefined): boolean {
  return Boolean(notes?.includes(PROSPECT_CLIENT_SHELL_MARKER));
}

export function stripProspectShellMarkerAndAppend(
  notes: string | null | undefined,
  appendLine: string
): string {
  const shell = prospectShellLine();
  const cleaned = String(notes ?? "")
    .split("\n")
    .filter((line) => !line.includes(PROSPECT_CLIENT_SHELL_MARKER) && line.trim() !== shell)
    .join("\n")
    .trim();
  if (!cleaned) return appendLine;
  return `${cleaned}\n${appendLine}`;
}

/** Root product `project.metadata.sourceLeadId` when created from lead flow. */
export function readProjectSourceLeadId(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null;
  }
  const v = (metadata as Record<string, unknown>)[PROJECT_SOURCE_LEAD_ID_KEY];
  return typeof v === "string" && v.trim().length > 0 ? v.trim() : null;
}

