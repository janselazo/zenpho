"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Trash2 } from "lucide-react";
import {
  INDUSTRIES,
  getIndustry,
  getNiche,
  getNichesForIndustry,
  type IndustryId,
  type NicheId,
} from "@/lib/crm/lead-magnet-industries";
import type { SavedLeadMagnetRow } from "@/app/(crm)/actions/saved-lead-magnets";
import {
  deleteSavedLeadMagnet,
  listSavedLeadMagnets,
} from "@/app/(crm)/actions/saved-lead-magnets";
import { formatBadgeClass } from "@/components/crm/lead-magnets/lead-magnet-card-styles";
import ManualLeadMagnetModal from "@/components/crm/lead-magnets/ManualLeadMagnetModal";

type FilterIndustry = "all" | IndustryId;
type FilterNiche = "all" | NicheId;

type Props = {
  refreshKey: number;
  active: boolean;
};

export default function LeadMagnetsSavedPanel({
  refreshKey,
  active,
}: Props) {
  const [items, setItems] = useState<SavedLeadMagnetRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [listErr, setListErr] = useState<string | null>(null);
  const [filterIndustry, setFilterIndustry] =
    useState<FilterIndustry>("all");
  const [filterNiche, setFilterNiche] = useState<FilterNiche>("all");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [manualOpen, setManualOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setListErr(null);
    const res = await listSavedLeadMagnets();
    if (!res.ok) {
      setListErr(res.error);
      setItems([]);
    } else {
      setItems(res.items);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (active) void load();
  }, [active, refreshKey, load]);

  useEffect(() => {
    if (filterIndustry === "all") {
      setFilterNiche("all");
    }
  }, [filterIndustry]);

  const nicheFilterOptions = useMemo(() => {
    if (filterIndustry === "all") return [];
    return getNichesForIndustry(filterIndustry);
  }, [filterIndustry]);

  const filtered = useMemo(() => {
    return items.filter((row) => {
      if (filterIndustry !== "all" && row.industry_id !== filterIndustry)
        return false;
      if (filterNiche !== "all" && row.niche_id !== filterNiche) return false;
      return true;
    });
  }, [items, filterIndustry, filterNiche]);

  const remove = async (id: string) => {
    setDeletingId(id);
    const res = await deleteSavedLeadMagnet(id);
    setDeletingId(null);
    if (!res.ok) {
      setListErr(res.error);
      return;
    }
    setItems((prev) => prev.filter((r) => r.id !== id));
  };

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
        <label className="block min-w-[200px]">
          <span className="text-xs font-semibold uppercase tracking-wider text-text-secondary dark:text-zinc-500">
            Filter by industry
          </span>
          <select
            value={filterIndustry}
            onChange={(e) => {
              const v = e.target.value;
              setFilterIndustry(v === "all" ? "all" : (v as IndustryId));
            }}
            className="mt-1 w-full rounded-xl border border-border bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
          >
            <option value="all">All industries</option>
            {INDUSTRIES.map((i) => (
              <option key={i.id} value={i.id}>
                {i.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block min-w-[200px]">
          <span className="text-xs font-semibold uppercase tracking-wider text-text-secondary dark:text-zinc-500">
            Filter by niche
          </span>
          <select
            value={filterNiche}
            onChange={(e) => {
              const v = e.target.value;
              setFilterNiche(v === "all" ? "all" : (v as NicheId));
            }}
            disabled={filterIndustry === "all"}
            className="mt-1 w-full rounded-xl border border-border bg-white px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-950"
          >
            <option value="all">All niches</option>
            {nicheFilterOptions.map((n) => (
              <option key={n.id} value={n.id}>
                {n.label}
              </option>
            ))}
          </select>
        </label>
        </div>
        <button
          type="button"
          onClick={() => setManualOpen(true)}
          className="shrink-0 rounded-xl border border-border bg-white px-4 py-2.5 text-sm font-medium text-text-secondary transition-colors hover:bg-surface hover:text-text-primary dark:border-zinc-700 dark:bg-zinc-900/40 dark:text-zinc-400 dark:hover:bg-zinc-800/80 dark:hover:text-zinc-200"
        >
          Add Idea 💡
        </button>
      </div>
      {filterIndustry === "all" ? (
        <p className="mt-2 text-xs text-text-secondary dark:text-zinc-500">
          Select an industry to filter by niche.
        </p>
      ) : null}

      {listErr ? (
        <div
          className="mt-4 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-950 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200"
          role="alert"
        >
          {listErr}
        </div>
      ) : null}

      <div className="mt-8">
        {loading ? (
          <p className="text-sm text-text-secondary dark:text-zinc-500">
            Loading saved ideas…
          </p>
        ) : null}
        {!loading && filtered.length === 0 ? (
          <p className="text-sm text-text-secondary dark:text-zinc-500">
            No saved lead magnets match these filters. Use{" "}
            <strong>Discover</strong> to generate ideas and bookmark them, or tap{" "}
            <strong>Add Idea 💡</strong> above.
          </p>
        ) : null}
        {!loading && filtered.length > 0 ? (
          <ul className="grid list-none gap-4 p-0 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((row) => {
              const ind = getIndustry(row.industry_id as IndustryId);
              const nic = getNiche(row.niche_id as NicheId);
              const indLabel = ind?.label ?? row.industry_id;
              const nicLabel = nic?.label ?? row.niche_id;
              return (
                <li
                  key={row.id}
                  className="relative flex flex-col rounded-2xl border border-border bg-white p-5 shadow-sm dark:border-zinc-800/80 dark:bg-zinc-900/40"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                      <span
                        className={`rounded-lg px-2 py-0.5 text-xs font-semibold ${formatBadgeClass(row.format)}`}
                      >
                        {row.format}
                      </span>
                      <span className="text-xs text-text-secondary dark:text-zinc-500">
                        {row.source === "manual" ? "Manual" : "Generated"}
                      </span>
                    </div>
                    <button
                      type="button"
                      disabled={deletingId === row.id}
                      onClick={() => void remove(row.id)}
                      className="rounded-lg border border-border p-1.5 text-text-secondary transition-colors hover:border-red-500/40 hover:bg-red-500/5 hover:text-red-600 disabled:opacity-50 dark:border-zinc-700 dark:hover:text-red-400"
                      aria-label="Remove saved idea"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden />
                    </button>
                  </div>
                  <p className="mt-2 text-xs text-text-secondary dark:text-zinc-500">
                    <span className="font-medium text-text-primary dark:text-zinc-400">
                      {indLabel}
                    </span>
                    {" · "}
                    {nicLabel}
                  </p>
                  <h2 className="mt-2 text-base font-semibold text-text-primary dark:text-zinc-100">
                    {row.title}
                  </h2>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-text-secondary dark:text-zinc-400">
                    {row.description}
                  </p>
                  {row.angle ? (
                    <p className="mt-3 border-t border-border pt-3 text-xs text-text-secondary/90 dark:border-zinc-800 dark:text-zinc-500">
                      <span className="font-medium text-text-primary dark:text-zinc-400">
                        Angle:{" "}
                      </span>
                      {row.angle}
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>

      <ManualLeadMagnetModal
        open={manualOpen}
        onClose={() => setManualOpen(false)}
        onSaved={() => {
          void load();
        }}
      />
    </div>
  );
}
