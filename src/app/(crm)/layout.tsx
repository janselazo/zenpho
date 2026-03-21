import AppSidebar from "@/components/app/AppSidebar";
import SupabaseSetupBanner from "@/components/app/SupabaseSetupBanner";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const metadata = {
  title: "CRM",
  robots: { index: false, follow: false },
};

export default function CrmLayout({ children }: { children: React.ReactNode }) {
  const configured = isSupabaseConfigured();

  return (
    <div className="flex min-h-screen bg-surface">
      <AppSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        {!configured ? <SupabaseSetupBanner /> : null}
        <div className="flex-1 overflow-auto">{children}</div>
      </div>
    </div>
  );
}
