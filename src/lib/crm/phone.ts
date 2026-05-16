/**
 * Best-effort normalization of an arbitrary user-typed phone number into E.164
 * (the format Twilio + Meta + most APIs require). Returns `null` for inputs
 * that can't reasonably be coerced.
 *
 * - Already-prefixed (`+1...`) values keep their country code.
 * - Bare 10-digit numbers default to US (+1).
 * - Bare 11-digit numbers starting with `1` are treated as US.
 * - Anything 8+ digits without a `+` is prefixed with `+` (caller's risk).
 */
export function normalizeE164(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("+")) {
    const digits = trimmed.replace(/[^\d]/g, "");
    return digits.length >= 8 ? `+${digits}` : null;
  }
  const digits = trimmed.replace(/[^\d]/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (digits.length >= 8) return `+${digits}`;
  return null;
}
