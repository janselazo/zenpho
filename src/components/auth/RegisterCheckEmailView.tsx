"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowRight, Check } from "lucide-react";

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
        Click the link to activate your account.
      </p>

      <Link
        href="/login"
        className="mt-10 flex w-full items-center justify-center gap-2 rounded-xl bg-accent py-3.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-accent-hover"
      >
        Back to Sign In
        <ArrowRight className="h-5 w-4 shrink-0" aria-hidden />
      </Link>

      <p className="mt-8 text-xs text-text-secondary">
        Didn&apos;t receive the email? Check your spam folder.
      </p>
    </div>
  );
}
