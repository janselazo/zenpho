import nextDynamic from "next/dynamic";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";

const TimeTrackingView = nextDynamic(
  () => import("@/components/crm/TimeTrackingView"),
  {
    loading: () => (
      <div className="flex min-h-[40vh] items-center justify-center p-8 text-sm text-text-secondary dark:text-zinc-400">
        Loading time tracking…
      </div>
    ),
  }
);

export default function TimeTrackingPage() {
  if (!isSupabaseConfigured()) {
    return (
      <div className="p-8">
        <h1 className="heading-display text-2xl font-bold">Time Tracking</h1>
        <p className="mt-2 text-text-secondary">
          Configure Supabase to track time on tasks and projects.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 sm:p-8">
      <TimeTrackingView />
    </div>
  );
}
