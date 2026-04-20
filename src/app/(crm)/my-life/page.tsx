import nextDynamic from "next/dynamic";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";

const MyLifeView = nextDynamic(
  () => import("@/components/crm/my-life/MyLifeView"),
  {
    loading: () => (
      <div className="flex min-h-[40vh] items-center justify-center p-8 text-sm text-text-secondary dark:text-zinc-400">
        Loading My Life…
      </div>
    ),
  }
);

export default function MyLifePage() {
  if (!isSupabaseConfigured()) {
    return (
      <div className="p-8">
        <h1 className="heading-display text-2xl font-bold">My Life</h1>
        <p className="mt-2 text-text-secondary">
          Configure Supabase to track the status of your life areas.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 sm:p-8">
      <MyLifeView />
    </div>
  );
}
