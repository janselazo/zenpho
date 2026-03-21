import Link from "next/link";
import { redirect } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Client portal",
  robots: { index: false, follow: false },
};

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!isSupabaseConfigured()) {
    return (
      <div className="min-h-screen bg-surface px-4 py-10">
        <p className="text-sm text-text-secondary">
          Configure Supabase to use the client portal.
        </p>
        <Link href="/" className="mt-4 inline-block text-accent hover:underline">
          ← Home
        </Link>
      </div>
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/portal");

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .maybeSingle();

  if (error || !profile || profile.role !== "client") {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-surface">
      <header className="border-b border-border bg-white px-4 py-4">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
              Client portal
            </p>
            <p className="font-medium text-text-primary">
              {profile.full_name || user.email}
            </p>
          </div>
          <Link
            href="/"
            className="text-sm text-accent hover:underline"
          >
            Marketing site
          </Link>
        </div>
      </header>
      <div className="mx-auto max-w-3xl px-4 py-8">{children}</div>
    </div>
  );
}
