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
 * Bumped to 300s so the Brand Kit + Sales Funnel PDF action (7 brand images +
 * 6 ad images sequentially with 13s gaps + 2 LLM round-trips) can complete.
 * @see https://vercel.com/docs/functions/runtimes#max-duration
 */
export const maxDuration = 300;

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
    try {
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
        const rawName = profile?.full_name;
        const rawAvatar = profile?.avatar_url;
        topBarUser = {
          email: user.email ?? null,
          fullName:
            typeof rawName === "string"
              ? rawName
              : rawName == null
                ? null
                : String(rawName),
          avatarUrl:
            typeof rawAvatar === "string"
              ? rawAvatar
              : rawAvatar == null
                ? null
                : String(rawAvatar),
        };
      }
    } catch (e) {
      // Never let a Supabase / cookie hiccup crash the CRM layout — would surface
      // as a masked "Server Components render" digest error to clients (e.g. on
      // Vercel) and break unrelated pages like Settings after an avatar upload.
      console.error("CrmLayout: profile load failed", e);
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
