/** Namespace browser storage keys per authenticated user (or guest). */
export function userScopedStorageKey(
  baseKey: string,
  userId?: string | null
): string {
  const id = (userId ?? "").trim();
  if (id) return `${baseKey}:user:${id}`;
  return `${baseKey}:guest`;
}
