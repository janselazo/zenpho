const formatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
});

export function formatStoreMoney(cents: number): string {
  return formatter.format(Math.round(cents) / 100);
}
