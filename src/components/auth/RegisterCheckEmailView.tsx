"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { Sunburst } from "@/components/marketing/renaissance/RenaissanceArt";

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
      setResendMessage(
        "We sent another confirmation email. Check spam if it’s still missing.",
      );
    } catch (err) {
      setResendStatus("error");
      setResendMessage(
        err instanceof Error ? err.message : "Could not resend the email.",
      );
    }
  }, [email]);

  return (
    <div className="auth-confirm">
      <div className="auth-confirm-art">
        <Sunburst
          width={120}
          height={120}
          color="var(--navy)"
          accent="#C19D5A"
          className="ra-float-slow"
        />
      </div>

      <div className="auth-eyebrow">Confirmation · MMXXVI</div>
      <h1 className="auth-title">
        Check your <em>inbox.</em>
      </h1>

      <p className="auth-lead">
        We sent a confirmation link to{" "}
        {email ? <strong>{email}</strong> : <strong>your inbox</strong>}. Open
        the email and tap the link to finish creating your atelier — there
        isn&apos;t a separate code.
      </p>

      <div className="auth-confirm-actions">
        <Link href="/login" className="btn-primary auth-submit">
          Back to sign in <span className="btn-arrow">↗</span>
        </Link>

        <button
          type="button"
          disabled={
            resendStatus === "loading" ||
            !email?.trim() ||
            !isSupabaseConfigured()
          }
          onClick={resendConfirmation}
          className="btn-ghost auth-secondary-btn"
        >
          {resendStatus === "loading" ? "Sending…" : "Resend confirmation email"}
        </button>

        {resendMessage ? (
          <p
            className={`auth-callout ${
              resendStatus === "success" ? "success" : "error"
            }`}
            role="status"
            aria-live="polite"
          >
            {resendMessage}
          </p>
        ) : null}
      </div>

      <p className="auth-foot" style={{ marginTop: 28 }}>
        Didn&apos;t receive it? Check spam and promotions, then wait a minute
        before resending.
      </p>
    </div>
  );
}
