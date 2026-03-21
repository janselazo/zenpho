import ForgotPasswordForm from "@/components/auth/ForgotPasswordForm";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm configured={isSupabaseConfigured()} />;
}
