import type { Metadata } from "next";
import ForgotPasswordForm from "@/components/auth/ForgotPasswordForm";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const metadata: Metadata = {
  title: "Reset password — Zenpho",
};

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm configured={isSupabaseConfigured()} />;
}
