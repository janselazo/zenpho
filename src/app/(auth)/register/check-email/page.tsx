import { Suspense } from "react";
import type { Metadata } from "next";
import RegisterCheckEmailView from "@/components/auth/RegisterCheckEmailView";

export const metadata: Metadata = {
  title: "Check your email — Zenpho",
};

export default function RegisterCheckEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center">
          <p className="auth-eyebrow">Loading…</p>
        </div>
      }
    >
      <RegisterCheckEmailView />
    </Suspense>
  );
}
