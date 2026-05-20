"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { SUPABASE_ENV_SETUP_MESSAGE } from "@/lib/supabase/config";

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

  return (
    <div>
      <div className="auth-eyebrow">Zenpho CRM · MMXXVI</div>
      <h1 className="auth-title">
        Back to your <em>workspace.</em>
      </h1>
      <p className="auth-lead">
        Sign in to manage prospects, clients, projects, budgets, and reports in
        one place.
      </p>

      <form onSubmit={onSubmit} className="auth-form" noValidate>
        {error ? (
          <p className="auth-callout error" role="alert">
            {error}
          </p>
        ) : null}

        <div className="auth-field">
          <label htmlFor="email" className="auth-field-label">
            <span>Email address</span>
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
            className="auth-input"
          />
        </div>

        <div className="auth-field">
          <label htmlFor="password" className="auth-field-label">
            <span>Password</span>
            <Link href="/forgot-password" className="auth-field-label-link">
              Forgot?
            </Link>
          </label>
          <div className="auth-input-wrap">
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              required
              placeholder="Your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="auth-eye-btn"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" aria-hidden />
              ) : (
                <Eye className="h-4 w-4" aria-hidden />
              )}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn-primary auth-submit"
        >
          {loading ? "Signing in…" : "Sign in"}
          <span className="btn-arrow">↗</span>
        </button>
      </form>

      <div className="auth-divider" aria-hidden>
        <span>New to Zenpho CRM</span>
      </div>

      <Link href="/register" className="btn-ghost auth-secondary-btn">
        Create your workspace
      </Link>

      <p className="auth-foot">
        By signing in, you agree to our{" "}
        <Link href="/terms">Terms of Service</Link> and{" "}
        <Link href="/privacy">Privacy Policy</Link>.
      </p>
    </div>
  );
}
