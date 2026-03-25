import nextDynamic from "next/dynamic";

export const dynamic = "force-dynamic";

const AutomationsView = nextDynamic(
  () => import("@/components/crm/AutomationsView"),
  {
    loading: () => (
      <div className="flex min-h-[40vh] items-center justify-center p-8 text-sm text-text-secondary dark:text-zinc-400">
        Loading automations…
      </div>
    ),
  }
);

export default function AutomationsPage() {
  return (
    <div className="p-8">
      <AutomationsView />
    </div>
  );
}
