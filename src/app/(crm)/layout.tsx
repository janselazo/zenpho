import AppSidebar from "@/components/app/AppSidebar";
import CrmTopBar from "@/components/app/CrmTopBar";
import SupabaseSetupBanner from "@/components/app/SupabaseSetupBanner";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

/** Avoid static prerender: server pages call Supabase; build env may omit public keys. */
export const dynamic = "force-dynamic";

/**
 * Prospect preview (and other CRM server actions) call external LLMs; default Vercel/server
 * timeouts are often too short and surface as opaque “digest” errors in production.
 * @see https://vercel.com/docs/functions/runtimes#max-duration
 */
export const maxDuration = 120;

export const metadata = {
  title: "AI Product Studio",
  robots: { index: false, follow: false },
};

export default async function CrmLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const configured = isSupabaseConfigured();

  let topBarUser: {
    email: string | null;
    fullName: string | null;
    avatarUrl: string | null;
  } | null = null;

  if (configured) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, avatar_url")
        .eq("id", user.id)
        .maybeSingle();
      topBarUser = {
        email: user.email ?? null,
        fullName: profile?.full_name ?? null,
        avatarUrl: profile?.avatar_url ?? null,
      };
    }
  }

  return (
    <div className="crm-dark-bg flex min-h-screen bg-surface">
      <AppSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <CrmTopBar initialUser={topBarUser} />
        {!configured ? <SupabaseSetupBanner /> : null}
        <div className="flex-1 overflow-auto dark:bg-transparent">{children}</div>
      </div>
    </div>
  );
}
