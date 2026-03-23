import { Suspense } from "react";
import type { Metadata } from "next";
import LoginForm from "@/components/auth/LoginForm";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const metadata: Metadata = {
  title: "Sign in — Agency workspace",
};

export default function LoginPage() {
  const configured = isSupabaseConfigured();
  return (
    <Suspense fallback={<p className="text-sm text-text-secondary">Loading…</p>}>
      <LoginForm configured={configured} />
    </Suspense>
  );
}
