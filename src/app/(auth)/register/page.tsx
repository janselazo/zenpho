import type { Metadata } from "next";
import RegisterForm from "@/components/auth/RegisterForm";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const metadata: Metadata = {
  title: "Create account — Zenpho",
};

export default function RegisterPage() {
  return <RegisterForm configured={isSupabaseConfigured()} />;
}
