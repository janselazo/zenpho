"use client";

import dynamic from "next/dynamic";
import { isSupabaseConfigured } from "@/lib/supabase/config";

const CrmCalendar = dynamic(() => import("@/components/app/CrmCalendar"), {
  ssr: false,
  loading: () => (
    <p className="text-sm text-text-secondary">Loading calendar…</p>
  ),
});

export default function CalendarPage() {
  const configured = isSupabaseConfigured();

  return (
    <div className="p-8">
      <h1 className="heading-display text-2xl font-bold text-text-primary">
        Calendar
      </h1>
      <p className="mt-1 text-sm text-text-secondary">
        Appointments from Supabase
      </p>
      <div className="mt-8">
        <CrmCalendar configured={configured} />
      </div>
    </div>
  );
}
