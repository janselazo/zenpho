/**
 * Heuristics for picking a “real” contact email from website scans.
 * We often see template/placeholder strings (you@example.com) in Wix, etc.
 */

const EXAMPLE_DOMAINS = new Set([
  "example.com",
  "example.org",
  "example.net",
  "test.com",
  "localhost",
]);

const PLACEHOLDER_LOCALS = new Set([
  "you",
  "your",
  "yours",
  "name",
  "user",
  "username",
  "email",
  "mail",
  "sample",
  "test",
  "jane",
  "john",
  "doe",
]);

/**
 * Return true for obvious template/placeholder marketing-site emails
 * (not exhaustive).
 */
export function isPlaceholderOrExampleEmail(raw: string): boolean {
  const t = raw.trim().toLowerCase();
  if (!t || !t.includes("@")) return true;
  const at = t.lastIndexOf("@");
  const local = t.slice(0, at);
  const domain = t.slice(at + 1);
  if (EXAMPLE_DOMAINS.has(domain)) return true;
  if (domain === "email.com" && PLACEHOLDER_LOCALS.has(local)) return true;
  if (local === "email" && domain === "email.com") return true;
  if (t === "not@yours" || t.startsWith("not@yours.")) return true;
  return false;
}

/**
 * @param lists  In priority order (first list wins, then first non-placeholder in that list, then next list…).
 */
export function firstUsableContactEmailInOrder(
  ...lists: (readonly string[] | null | undefined)[]
): string | null {
  for (const list of lists) {
    if (!list?.length) continue;
    for (const e of list) {
      const t = e?.trim();
      if (t && !isPlaceholderOrExampleEmail(t)) return t;
    }
  }
  return null;
}
