"use client";

import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import IconTabBar from "@/components/crm/prospecting/IconTabBar";

export interface ProspectingShellTab {
  id: string;
  label: string;
  icon: LucideIcon;
  body: React.ReactNode;
}

export default function ProspectingTabbedShell({
  title,
  description,
  tabs,
  ariaLabel,
}: {
  title: string;
  description: string;
  tabs: ProspectingShellTab[];
  ariaLabel?: string;
}) {
  const [active, setActive] = useState(tabs[0]?.id ?? "");

  return (
    <div>
      <h1 className="heading-display text-2xl font-bold text-text-primary dark:text-zinc-100">
        {title}
      </h1>
      <p className="mt-1 max-w-2xl text-sm text-text-secondary dark:text-zinc-400">
        {description}
      </p>
      <div className="mt-6">
        <IconTabBar
          tabs={tabs.map(({ id, label, icon }) => ({ id, label, icon }))}
          activeTab={active}
          onTabChange={setActive}
          ariaLabel={ariaLabel ?? title}
        />
      </div>
      {tabs.map((t) => (
        <div
          key={t.id}
          id={`${t.id}-panel`}
          role="tabpanel"
          aria-labelledby={`${t.id}-tab`}
          className={active !== t.id ? "hidden" : "mt-6"}
        >
          {t.body}
        </div>
      ))}
    </div>
  );
}
