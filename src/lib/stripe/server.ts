import Stripe from "stripe";

let cached: Stripe | null = null;

/**
 * Lazy singleton Stripe client. Reads STRIPE_SECRET_KEY at call time so
 * builds without the env var still succeed.
 */
export function getStripe(): Stripe {
  if (cached) return cached;
  const secret = process.env.STRIPE_SECRET_KEY?.trim();
  if (!secret) {
    throw new Error(
      "STRIPE_SECRET_KEY is not set. Add it to .env.local (and Vercel) to enable Store checkout.",
    );
  }
  cached = new Stripe(secret, {
    apiVersion: "2026-04-22.dahlia",
    typescript: true,
    appInfo: { name: "Zenpho Store", url: "https://zenpho.com" },
  });
  return cached;
}

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY?.trim());
}
