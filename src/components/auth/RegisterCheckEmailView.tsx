"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowRight, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

function authEmailRedirectTo(): string | undefined {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "");
  const origin =
    fromEnv ||
    (typeof window !== "undefined"
      ? window.location.hostname === "zenpho.com" ||
        window.location.hostname === "www.zenpho.com"
        ? "https://app.zenpho.com"
        : window.location.origin
      : "");
  return origin ? `${origin}/` : undefined;
}

export default function RegisterCheckEmailView() {
  const searchParams = useSearchParams();
  const raw = searchParams.get("email");
  const email =
    raw && raw.trim()
      ? (() => {
          try {
            return decodeURIComponent(raw.trim());
          } catch {
            return raw.trim();
          }
        })()
      : null;

  const [resendStatus, setResendStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [resendMessage, setResendMessage] = useState<string | null>(null);

  const resendConfirmation = useCallback(async () => {
    if (!email?.trim()) return;
    if (!isSupabaseConfigured()) {
      setResendStatus("error");
      setResendMessage("Supabase isn’t configured in this environment.");
      return;
    }
    setResendStatus("loading");
    setResendMessage(null);
    try {
      const supabase = createClient();
      const redirectTo = authEmailRedirectTo();
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: email.trim(),
        ...(redirectTo ? { options: { emailRedirectTo: redirectTo } } : {}),
      });
      if (error) {
        setResendStatus("error");
        setResendMessage(error.message);
        return;
      }
      setResendStatus("success");
      setResendMessage("We sent another confirmation email. Check spam if it’s still missing.");
    } catch (err) {
      setResendStatus("error");
      setResendMessage(
        err instanceof Error ? err.message : "Could not resend the email."
      );
    }
  }, [email]);

  return (
    <div className="w-full text-center">
      <div className="mx-auto flex justify-center">
        <div className="relative">
          <div
            className="absolute inset-0 scale-150 rounded-full bg-emerald-400/30 blur-xl"
            aria-hidden
          />
          <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-emerald-600 shadow-lg shadow-emerald-600/35">
            <Check className="h-8 w-8 stroke-[3] text-white" aria-hidden />
          </div>
        </div>
      </div>

      <h1 className="heading-display mt-8 text-2xl font-bold text-text-primary sm:text-3xl">
        Check your email
      </h1>

      <p className="mt-4 text-sm leading-relaxed text-text-secondary">
        We sent a confirmation link to{" "}
        {email ? (
          <span className="font-semibold text-text-primary">{email}</span>
        ) : (
          <span className="font-semibold text-text-primary">your inbox</span>
        )}
        .
      </p>
      <p className="mt-2 text-sm text-text-secondary">
        Open the email and tap the confirmation <strong className="font-semibold text-text-primary">link</strong>
        —there isn&apos;t a separate login code. After confirming, use your email and password on{" "}
        <strong className="font-semibold text-text-primary">Sign in</strong>.
      </p>

      <Link
        href="/login"
        className="mt-10 flex w-full items-center justify-center gap-2 rounded-xl bg-accent py-3.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-accent-hover"
      >
        Back to Sign In
        <ArrowRight className="h-5 w-4 shrink-0" aria-hidden />
      </Link>

      <p className="mt-8 text-xs text-text-secondary">
        Didn&apos;t receive it? Check spam and promotions. Still nothing—wait a minute and try resend.
      </p>

      <button
        type="button"
        disabled={
          resendStatus === "loading" || !email?.trim() || !isSupabaseConfigured()
        }
        onClick={resendConfirmation}
        className="mt-4 w-full rounded-xl border border-border bg-white py-3 text-sm font-medium text-text-primary transition-colors hover:border-zinc-300 hover:bg-surface disabled:cursor-not-allowed disabled:opacity-50"
      >
        {resendStatus === "loading" ? "Sending…" : "Resend confirmation email"}
      </button>

      {resendMessage ? (
        <p
          className={`mt-3 text-xs ${
            resendStatus === "success"
              ? "font-medium text-emerald-700"
              : "text-red-700"
          }`}
          role="status"
          aria-live="polite"
        >
          {resendMessage}
        </p>
      ) : null}
    </div>
  );
}
