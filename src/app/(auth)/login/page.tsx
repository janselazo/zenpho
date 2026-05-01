import { Suspense } from "react";
import type { Metadata } from "next";
import LoginForm from "@/components/auth/LoginForm";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const metadata: Metadata = {
  title: "Sign in — Zenpho",
};

export default function LoginPage() {
  const configured = isSupabaseConfigured();
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center">
          <p className="text-sm text-text-secondary">Loading…</p>
        </div>
      }
    >
      <LoginForm configured={configured} />
    </Suspense>
  );
}
