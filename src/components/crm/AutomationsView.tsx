"use client";

import Link from "next/link";
import { Workflow } from "lucide-react";

type AutomationFlow = {
  id: string;
  title: string;
  category: string;
  trigger: string;
  action: string;
  available: boolean;
};

const FLOWS: AutomationFlow[] = [
  {
    id: "new-lead-sms",
    title: "New lead SMS alert",
    category: "Leads",
    trigger: "When a new prospect is created",
    action: "Send SMS to specified phone numbers",
    available: true,
  },
  {
    id: "deal-won-notify",
    title: "Deal won — team notify",
    category: "Deals",
    trigger: "When a deal moves to Won",
    action: "Notify your team (email or Slack)",
    available: false,
  },
  {
    id: "appointment-reminder",
    title: "Appointment reminder",
    category: "Appointments",
    trigger: "When an appointment is booked",
    action: "Send reminder SMS to the prospect",
    available: false,
  },
];

function categoryPillClass(category: string) {
  const c = category.toLowerCase();
  if (c === "leads")
    return "bg-sky-100 text-sky-800 dark:bg-sky-950/50 dark:text-sky-200";
  if (c === "deals")
    return "bg-violet-100 text-violet-800 dark:bg-violet-950/50 dark:text-violet-200";
  if (c === "appointments")
    return "bg-amber-100 text-amber-950 dark:bg-amber-950/40 dark:text-amber-200";
  return "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300";
}

export default function AutomationsView() {
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="heading-display text-2xl font-bold text-text-primary dark:text-zinc-100">
        Automations
      </h1>
      <p className="mt-2 text-sm text-text-secondary dark:text-zinc-400">
        When something happens in your CRM, run actions automatically—SMS,
        email, internal alerts, and more.
      </p>

      <div className="mt-6 rounded-2xl border border-border bg-white/90 px-4 py-3 text-sm text-text-secondary shadow-sm dark:border-zinc-800 dark:bg-zinc-950/80 dark:text-zinc-400">
        <span className="font-semibold text-text-primary dark:text-zinc-200">
          How it will work:{" "}
        </span>
        Connect messaging providers under{" "}
        <Link
          href="/settings?tab=integrations"
          className="font-medium text-accent underline-offset-2 hover:underline"
        >
          Settings → Integrations
        </Link>
        . Then enable and configure each flow here (execution is rolling out
        next).
      </div>

      <h2 className="mt-10 text-xs font-semibold uppercase tracking-widest text-text-secondary/80 dark:text-zinc-500">
        Flows
      </h2>
      <ul className="mt-4 space-y-3" role="list">
        {FLOWS.map((flow) => (
          <li
            key={flow.id}
            className="flex gap-4 rounded-2xl border border-border bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/80"
          >
            <div
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-800/90"
              aria-hidden
            >
              <Workflow className="h-5 w-5 text-zinc-500 dark:text-zinc-400" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 gap-y-1">
                <h3 className="text-sm font-semibold text-text-primary dark:text-zinc-100">
                  {flow.title}
                </h3>
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${categoryPillClass(flow.category)}`}
                >
                  {flow.category}
                </span>
              </div>
              <p className="mt-1 text-sm text-text-secondary dark:text-zinc-400">
                <span className="font-medium text-text-primary/90 dark:text-zinc-300">
                  Trigger:
                </span>{" "}
                {flow.trigger}
              </p>
              <p className="mt-0.5 text-sm text-text-secondary dark:text-zinc-400">
                <span className="font-medium text-text-primary/90 dark:text-zinc-300">
                  Action:
                </span>{" "}
                {flow.action}
              </p>
            </div>
            <div className="flex shrink-0 items-start pt-0.5">
              {flow.available ? (
                <button
                  type="button"
                  onClick={() =>
                    alert(
                      "Automation builder is coming soon. You’ll set recipients and message templates here."
                    )
                  }
                  className="rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-sm font-medium text-text-primary shadow-sm transition-colors hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
                >
                  Configure
                </button>
              ) : (
                <button
                  type="button"
                  disabled
                  className="cursor-not-allowed rounded-xl border border-transparent bg-transparent px-3.5 py-2 text-sm font-medium text-text-secondary/45 dark:text-zinc-500"
                >
                  Coming Soon
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
