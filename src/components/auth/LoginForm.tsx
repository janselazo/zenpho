"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { SUPABASE_ENV_SETUP_MESSAGE } from "@/lib/supabase/config";
import Button from "@/components/ui/Button";

export default function LoginForm({ configured }: { configured: boolean }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
      const { error: signError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (signError) {
        setError(signError.message);
        setLoading(false);
        return;
      }
      router.push(next);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed");
      setLoading(false);
    }
  }

  const inputClass =
    "w-full rounded-xl border border-border bg-white px-4 py-3 text-sm text-text-primary placeholder:text-text-secondary/45 outline-none transition-shadow focus:border-accent focus:ring-2 focus:ring-accent/20";

  return (
    <div className="w-full">
      <h1 className="heading-display text-2xl font-bold text-text-primary sm:text-3xl">Welcome back</h1>
      <p className="mt-2 text-sm leading-relaxed text-text-secondary">
        Sign in to your Zenpho account with your work email and password.
      </p>

      <form onSubmit={onSubmit} className="mt-8 space-y-5">
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
            htmlFor="email"
            className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-text-secondary"
          >
            Email address
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <div className="mb-1.5 flex items-center justify-between gap-3">
            <label
              htmlFor="password"
              className="text-xs font-semibold uppercase tracking-wide text-text-secondary"
            >
              Password
            </label>
            <Link href="/forgot-password" className="text-xs font-medium text-accent hover:underline">
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              required
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`${inputClass} pr-12`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-text-secondary transition-colors hover:bg-surface hover:text-text-primary"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
            </button>
          </div>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent py-3.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-accent-hover disabled:opacity-60"
        >
          {loading ? (
            "Signing in…"
          ) : (
            <>
              Sign in
              <ArrowRight className="h-4 w-4" aria-hidden />
            </>
          )}
        </button>
      </form>

      <div className="relative my-10">
        <div className="absolute inset-0 flex items-center" aria-hidden>
          <span className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs font-semibold uppercase tracking-[0.14em]">
          <span className="bg-white px-4 text-text-secondary">New to Zenpho?</span>
        </div>
      </div>

      <Button href="/register" variant="secondary" size="lg" className="w-full justify-center">
        Create a free account
      </Button>

      <p className="mt-8 text-center text-xs leading-relaxed text-text-secondary">
        By signing in, you agree to our{" "}
        <Link href="/terms" className="font-medium text-accent hover:underline">
          Terms of Service
        </Link>{" "}
        and{" "}
        <Link href="/privacy" className="font-medium text-accent hover:underline">
          Privacy Policy
        </Link>
        .
      </p>
    </div>
  );
}
