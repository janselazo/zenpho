"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { SUPABASE_ENV_SETUP_MESSAGE } from "@/lib/supabase/config";

function appRedirectOrigin(): string {
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

export default function ForgotPasswordForm({
  configured,
}: {
  configured: boolean;
}) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    if (!configured) {
      setError(SUPABASE_ENV_SETUP_MESSAGE);
      return;
    }
    setLoading(true);
    try {
      const supabase = createClient();
      const origin = appRedirectOrigin();
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email,
        { redirectTo: `${origin}/login` },
      );
      if (resetError) {
        setError(resetError.message);
        setLoading(false);
        return;
      }
      setMessage("If an account exists, a reset link was sent to your email.");
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="auth-eyebrow">Recovery · MMXXVI</div>
      <h1 className="auth-title">
        Reset your <em>password.</em>
      </h1>
      <p className="auth-lead">
        We&apos;ll email you a link to choose a new password. Most messages
        arrive within a minute — check spam if not.
      </p>

      <form onSubmit={onSubmit} className="auth-form" noValidate>
        {error ? (
          <p className="auth-callout error" role="alert">
            {error}
          </p>
        ) : null}
        {message ? (
          <p className="auth-callout success" role="status">
            {message}
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

        <button
          type="submit"
          disabled={loading}
          className="btn-primary auth-submit"
        >
          {loading ? "Sending…" : "Send reset link"}
          <span className="btn-arrow">↗</span>
        </button>
      </form>

      <p className="auth-foot" style={{ marginTop: 36 }}>
        <Link href="/login">← Back to sign in</Link>
      </p>
    </div>
  );
}
