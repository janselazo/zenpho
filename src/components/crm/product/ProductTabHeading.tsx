"use client";

import type { ReactNode } from "react";

export default function ProductTabHeading({
  title,
  description,
  primaryAction,
}: {
  title: string;
  description: string;
  primaryAction?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h2 className="text-lg font-semibold text-text-primary dark:text-zinc-100">
          {title}
        </h2>
        <p className="mt-1 max-w-3xl text-sm text-text-secondary dark:text-zinc-500">
          {description}
        </p>
      </div>
      {primaryAction ? (
        <div className="shrink-0 sm:pt-0.5">{primaryAction}</div>
      ) : null}
    </div>
  );
}
