/** Matches `ServicesGrid` badge colors by card index (0-based). */
export function serviceIconAccentClass(i: number): string {
  return i % 3 === 0
    ? "bg-accent text-white shadow-sm"
    : i % 3 === 1
      ? "bg-accent-violet text-white shadow-sm"
      : "bg-accent-warm text-white shadow-sm";
}

export function serviceBulletAccentClass(i: number): string {
  return i % 3 === 0 ? "bg-accent" : i % 3 === 1 ? "bg-accent-violet" : "bg-accent-warm";
}
