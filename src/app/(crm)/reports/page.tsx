import nextDynamic from "next/dynamic";

export const dynamic = "force-dynamic";

const ReportsView = nextDynamic(() => import("@/components/crm/ReportsView"), {
  loading: () => (
    <div className="flex min-h-[40vh] items-center justify-center p-8 text-sm text-text-secondary dark:text-zinc-400">
      Loading reports…
    </div>
  ),
});

export default function ReportsPage() {
  return (
    <div className="p-8">
      <ReportsView />
    </div>
  );
}
