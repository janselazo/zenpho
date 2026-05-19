"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CircleCheck, Eye, EyeOff } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { SUPABASE_ENV_SETUP_MESSAGE } from "@/lib/supabase/config";

const SIGNUP_BENEFITS = [
  "No credit card",
  "14-day trial",
  "Cancel anytime",
] as const;

/** Prefer the app origin so confirmation links land on app.zenpho.com. */
function emailRedirectOrigin(): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "");
  if (fromEnv) return fromEnv;
  if (typeof window !== "undefined") {
    const { hostname, origin } = window.location;
    if (hostname === "zenpho.com" || hostname === "www.zenpho.com") {
      return "https://app.zenpho.com";
    }
    return origin;
  }
  return "";
}

export default function RegisterForm({ configured }: { configured: boolean }) {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
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
    <div>
      <div className="auth-eyebrow">Register · MMXXVI</div>
      <h1 className="auth-title">
        Open an <em>account.</em>
      </h1>
      <p className="auth-lead">
        Begin a free trial and commission your first work — websites,
        applications, and campaigns from a single atelier.
      </p>

      <form onSubmit={onSubmit} className="auth-form" noValidate>
        {error ? (
          <p className="auth-callout error" role="alert">
            {error}
          </p>
        ) : null}

        <div className="auth-field">
          <label htmlFor="fullName" className="auth-field-label">
            <span>Full name</span>
          </label>
          <input
            id="fullName"
            name="fullName"
            type="text"
            autoComplete="name"
            required
            placeholder="Your name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="auth-input"
          />
        </div>

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
          </label>
          <div className="auth-input-wrap">
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              required
              minLength={8}
              placeholder="At least 8 characters"
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
          {loading ? "Creating…" : "Create account"}
          <span className="btn-arrow">↗</span>
        </button>

        <div className="auth-trial-row" aria-label="Trial benefits">
          {SIGNUP_BENEFITS.map((label) => (
            <span key={label}>
              <CircleCheck className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
              {label}
            </span>
          ))}
        </div>
      </form>

      <div className="auth-divider" aria-hidden>
        <span>Already with us</span>
      </div>

      <Link href="/login" className="btn-ghost auth-secondary-btn">
        Sign in to your account
      </Link>

      <p className="auth-foot">
        By creating an account, you agree to our{" "}
        <Link href="/terms">Terms of Service</Link> and{" "}
        <Link href="/privacy">Privacy Policy</Link>.
      </p>
    </div>
  );
}
