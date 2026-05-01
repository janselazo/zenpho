"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { SUPABASE_ENV_SETUP_MESSAGE } from "@/lib/supabase/config";

export default function RegisterForm({ configured }: { configured: boolean }) {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
      const { error: signError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
        },
      });
      if (signError) {
        setError(signError.message);
        setLoading(false);
        return;
      }
      setMessage(
        "Check your email to confirm your account, then sign in. If email confirmation is disabled in Supabase, you can sign in now."
      );
      setLoading(false);
      router.refresh();
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
        {message ? (
          <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
            {message}
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
          {loading ? "Creating…" : "Register"}
        </button>
      </form>

      <p className="mt-8 text-center text-sm text-text-secondary">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-accent hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
