"use client";

import type { LucideIcon } from "lucide-react";

export interface IconTabItem {
  id: string;
  label: string;
  icon: LucideIcon;
}

interface IconTabBarProps {
  tabs: IconTabItem[];
  activeTab: string;
  onTabChange: (id: string) => void;
  ariaLabel?: string;
}

export default function IconTabBar({
  tabs,
  activeTab,
  onTabChange,
  ariaLabel = "Section tabs",
}: IconTabBarProps) {
  return (
    <div
      className="flex flex-wrap gap-1 border-b border-border dark:border-zinc-800/80"
      role="tablist"
      aria-label={ariaLabel}
    >
      {tabs.map((tab) => {
        const active = tab.id === activeTab;
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            id={`${tab.id}-tab`}
            type="button"
            role="tab"
            aria-selected={active}
            aria-controls={`${tab.id}-panel`}
            tabIndex={active ? 0 : -1}
            onClick={() => onTabChange(tab.id)}
            className={`relative flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
              active
                ? "text-accent dark:text-blue-400"
                : "text-text-secondary hover:text-text-primary dark:text-zinc-500 dark:hover:text-zinc-200"
            }`}
          >
            <Icon className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
            {tab.label}
            {active && (
              <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-accent dark:bg-blue-400" />
            )}
          </button>
        );
      })}
    </div>
  );
}
