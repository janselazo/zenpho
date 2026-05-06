"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CircleCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { SUPABASE_ENV_SETUP_MESSAGE } from "@/lib/supabase/config";

const SIGNUP_BENEFITS = [
  "No credit card",
  "14-day trial",
  "Cancel anytime",
] as const;

/** Prefer NEXT_PUBLIC_SITE_URL in production so confirmation links match zenpho.com even when another domain is misconfigured in Supabase. */
function emailRedirectOrigin(): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "");
  if (fromEnv) return fromEnv;
  if (typeof window !== "undefined") return window.location.origin;
  return "";
}

export default function RegisterForm({ configured }: { configured: boolean }) {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!configured) {
      setError(SUPABASE_ENV_SETUP_MESSAGE);
      return;
    }
    setLoading(true);
    try {
      const supabase = createClient();
      const origin = emailRedirectOrigin();
      const { data, error: signError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
          ...(origin ? { emailRedirectTo: `${origin}/` } : {}),
        },
      });
      if (signError) {
        setError(signError.message);
        setLoading(false);
        return;
      }
      setLoading(false);
      if (data.session) {
        router.push("/dashboard");
        router.refresh();
        return;
      }
      router.push(`/register/check-email?email=${encodeURIComponent(email)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
      setLoading(false);
    }
  }

  return (
    <div className="w-full">
      <h1 className="heading-display text-2xl font-bold text-text-primary sm:text-3xl">
        Create account
      </h1>
      <p className="mt-1 text-sm text-text-secondary">
        For production, prefer invite-only signups.
      </p>

      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        {error ? (
          <p
            className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
            role="alert"
          >
            {error}
          </p>
        ) : null}
        <div>
          <label
            htmlFor="fullName"
            className="mb-1 block text-xs font-medium uppercase tracking-wide text-text-secondary"
          >
            Full name
          </label>
          <input
            id="fullName"
            name="fullName"
            type="text"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full rounded-xl border border-border bg-white px-4 py-3 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
          />
        </div>
        <div>
          <label
            htmlFor="email"
            className="mb-1 block text-xs font-medium uppercase tracking-wide text-text-secondary"
          >
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border border-border bg-white px-4 py-3 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
          />
        </div>
        <div>
          <label
            htmlFor="password"
            className="mb-1 block text-xs font-medium uppercase tracking-wide text-text-secondary"
          >
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl border border-border bg-white px-4 py-3 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-accent py-3 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-60"
        >
          {loading ? "Creating…" : "Create Account"}
        </button>
        <div
          className="flex flex-wrap items-center justify-evenly gap-x-4 gap-y-2 pt-2 text-sm text-text-secondary"
          aria-label="Trial benefits"
        >
          {SIGNUP_BENEFITS.map((label) => (
            <div key={label} className="flex items-center gap-2">
              <CircleCheck
                className="h-5 w-5 shrink-0 text-emerald-600"
                strokeWidth={2}
                aria-hidden
              />
              <span>{label}</span>
            </div>
          ))}
        </div>
      </form>

      <p className="mt-8 text-center text-sm text-text-secondary">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-accent hover:underline">
          Sign in
        </Link>
      </p>
      <p className="mt-4 text-center text-xs leading-relaxed text-text-secondary">
        By creating an account, you agree to our{" "}
        <Link href="/terms" className="font-medium text-accent hover:underline">
          Terms of Service
        </Link>{" "}
        and{" "}
        <Link href="/privacy" className="font-medium text-accent hover:underline">
          Privacy Policy
        </Link>
        .
      </p>

      <blockquote className="mt-10 w-full max-w-xl rounded-2xl border border-border bg-white p-5 text-left shadow-sm">
        <p className="text-sm italic leading-relaxed text-text-primary">
          &ldquo;Zenpho put web leads, phone calls, and referrals in{" "}
          <span className="font-semibold not-italic text-emerald-600">
            one workspace
          </span>
          . We respond faster and finally see which marketing brings real booked jobs—not
          just clicks.&rdquo;
        </p>
        <footer className="mt-5 flex items-center gap-3 border-t border-border pt-4">
          <span
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-base font-bold text-white"
            aria-hidden
          >
            M
          </span>
          <div className="min-w-0 text-left">
            <p className="truncate font-semibold text-text-primary">Marcus V.</p>
            <p className="truncate text-xs text-text-secondary">
              Owner, Lakeside Property Care
            </p>
          </div>
        </footer>
      </blockquote>
    </div>
  );
}
