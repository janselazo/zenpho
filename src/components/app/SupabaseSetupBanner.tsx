export default function SupabaseSetupBanner() {
  return (
    <div className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
      <strong className="font-semibold">Supabase not configured.</strong> Add{" "}
      <code className="rounded bg-amber-100/80 px-1 font-mono text-xs">
        NEXT_PUBLIC_SUPABASE_URL
      </code>{" "}
      and{" "}
      <code className="rounded bg-amber-100/80 px-1 font-mono text-xs">
        NEXT_PUBLIC_SUPABASE_ANON_KEY
      </code>{" "}
      to <code className="font-mono text-xs">.env.local</code>, run the SQL in{" "}
      <code className="font-mono text-xs">supabase/migrations</code>, then restart
      the dev server.
    </div>
  );
}
