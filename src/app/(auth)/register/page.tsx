import RegisterForm from "@/components/auth/RegisterForm";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export default function RegisterPage() {
  return <RegisterForm configured={isSupabaseConfigured()} />;
}
