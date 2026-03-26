"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { unhideAgencyDocHubCard } from "@/app/(crm)/actions/agency-docs";
import type { HiddenHubDocItem } from "@/lib/crm/agency-docs-hub";

type Props = {
  items: HiddenHubDocItem[];
};

export default function AgencyDocsHubHiddenRestore({ items }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (items.length === 0) return null;

  return (
    <div className="mt-12 rounded-2xl border border-border border-dashed bg-surface/40 px-5 py-4 dark:border-zinc-700 dark:bg-zinc-900/40">
      <p className="text-sm font-medium text-text-primary dark:text-zinc-200">
        Removed from hub
      </p>
      <p className="mt-1 text-xs text-text-secondary dark:text-zinc-500">
        These cards were hidden from the grid. Restore to show them again, or open
        the doc from the link.
      </p>
      <ul className="mt-3 flex flex-col gap-2">
        {items.map((item) => (
          <li
            key={item.slug}
            className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/80 bg-white/80 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900/80"
          >
            <span className="font-medium text-text-primary dark:text-zinc-100">
              {item.title}
            </span>
            <span className="flex items-center gap-2">
              <a
                href={`/docs/${item.slug}`}
                className="text-xs font-medium text-accent hover:underline dark:text-blue-400"
              >
                Open
              </a>
              <button
                type="button"
                disabled={pending}
                onClick={() => {
                  startTransition(async () => {
                    const res = await unhideAgencyDocHubCard(item.slug);
                    if ("error" in res && res.error) {
                      window.alert(res.error);
                      return;
                    }
                    router.refresh();
                  });
                }}
                className="rounded-lg bg-accent px-2.5 py-1 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50 dark:bg-blue-600"
              >
                Restore
              </button>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
