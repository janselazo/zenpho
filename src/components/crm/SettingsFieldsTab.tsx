"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ListTree, Loader2, Pencil } from "lucide-react";
import { saveCrmFieldOptions } from "@/app/(crm)/actions/crm";
import type { MergedCrmFieldOptions } from "@/lib/crm/field-options";
import { PLAN_STAGE_ORDER, type PlanStage } from "@/lib/crm/mock-data";
import type { CrmPipelineSettings } from "@/lib/crm/fetch-pipeline-settings";
import PipelineSettingsModal from "@/components/crm/PipelineSettingsModal";

const inputClass =
  "w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-text-primary shadow-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/15 dark:border-zinc-700 dark:bg-zinc-900";

const sectionTitle =
  "text-sm font-bold text-text-primary dark:text-zinc-100";

function formatSourceOptionLabel(value: string) {
  return value
    .split(/[\s_-]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

function StringListEditor({
  label,
  description,
  items,
  onChange,
}: {
  label: string;
  description?: string;
  items: string[];
  onChange: (next: string[]) => void;
}) {
  function add() {
    onChange([...items, ""]);
  }
  function update(i: number, v: string) {
    const next = [...items];
    next[i] = v;
    onChange(next);
  }
  function remove(i: number) {
    if (
      !confirm(
        "Remove this option? Existing leads or projects keep their stored values until you edit them."
      )
    ) {
      return;
    }
    onChange(items.filter((_, j) => j !== i));
  }

  return (
    <div className="space-y-3">
      <div>
        <p className={sectionTitle}>{label}</p>
        {description ? (
          <p className="mt-1 text-xs text-text-secondary dark:text-zinc-500">
            {description}
          </p>
        ) : null}
      </div>
      <ul className="space-y-2">
        {items.map((v, i) => (
          <li key={i} className="flex gap-2">
            <input
              value={v}
              onChange={(e) => update(i, e.target.value)}
              className={inputClass}
              placeholder="Option label"
              aria-label={`${label} option ${i + 1}`}
            />
            <button
              type="button"
              onClick={() => remove(i)}
              className="shrink-0 rounded-xl border border-border px-3 py-2 text-xs font-medium text-text-secondary hover:bg-surface dark:border-zinc-700 dark:hover:bg-zinc-800"
            >
              Remove
            </button>
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={add}
        className="rounded-xl border border-dashed border-border px-4 py-2 text-sm font-medium text-accent hover:bg-surface dark:border-zinc-600"
      >
        Add option
      </button>
    </div>
  );
}

export default function SettingsFieldsTab({
  initialFieldOptions,
  pipeline,
  leadStageCounts,
  dealStageCounts,
}: {
  initialFieldOptions: MergedCrmFieldOptions;
  pipeline: CrmPipelineSettings;
  dealStageCounts: Record<string, number>;
  leadStageCounts: Record<string, number>;
}) {
  const router = useRouter();
  const [leadProjectTypes, setLeadProjectTypes] = useState(
    () => [...initialFieldOptions.leadProjectTypes]
  );
  const [leadSources, setLeadSources] = useState(() => [
    ...initialFieldOptions.leadSources,
  ]);
  const [leadContactCategories, setLeadContactCategories] = useState(() => [
    ...initialFieldOptions.leadContactCategories,
  ]);
  const [productPlanLabels, setProductPlanLabels] = useState<
    Record<PlanStage, string>
  >(() => ({ ...initialFieldOptions.productPlanLabels }));

  const [leadModalOpen, setLeadModalOpen] = useState(false);
  const [dealModalOpen, setDealModalOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setLeadProjectTypes([...initialFieldOptions.leadProjectTypes]);
    setLeadSources([...initialFieldOptions.leadSources]);
    setLeadContactCategories([...initialFieldOptions.leadContactCategories]);
    setProductPlanLabels({ ...initialFieldOptions.productPlanLabels });
  }, [initialFieldOptions]);

  function save() {
    setMessage(null);
    setError(null);
    startTransition(async () => {
      const res = await saveCrmFieldOptions({
        leadProjectTypes,
        leadSources,
        leadContactCategories,
        productPlanLabels,
      });
      if ("error" in res && res.error) {
        setError(res.error);
        return;
      }
      setMessage("Saved field options.");
      router.refresh();
    });
  }

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ListTree className="h-5 w-5 text-accent" aria-hidden />
          <h2 className="text-lg font-semibold text-text-primary dark:text-zinc-100">
            CRM field options
          </h2>
        </div>
        <button
          type="button"
          disabled={pending}
          onClick={() => save()}
          className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-60"
        >
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : null}
          Save fields
        </button>
      </div>

      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-100">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-100">
          {message}
        </p>
      ) : null}

      <div className="rounded-2xl border border-border bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/40">
        <p className={sectionTitle}>Pipelines</p>
        <p className="mt-1 text-xs text-text-secondary dark:text-zinc-500">
          Stage columns are stored separately from picklists. Use the same
          editor as on the Leads page.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setLeadModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-white px-4 py-2 text-sm font-medium text-text-primary hover:bg-surface dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800"
          >
            <Pencil className="h-4 w-4 opacity-70" aria-hidden />
            Edit lead pipeline
          </button>
          <button
            type="button"
            onClick={() => setDealModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-white px-4 py-2 text-sm font-medium text-text-primary hover:bg-surface dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800"
          >
            <Pencil className="h-4 w-4 opacity-70" aria-hidden />
            Edit deal pipeline
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/40">
        <StringListEditor
          label="Project type"
          description="Used on leads and products (single shared list)."
          items={leadProjectTypes}
          onChange={setLeadProjectTypes}
        />
      </div>

      <div className="rounded-2xl border border-border bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/40">
        <StringListEditor
          label="Lead sources"
          description={`Shown in dropdowns. Display labels are title-cased (e.g. ${formatSourceOptionLabel("cold outreach")}).`}
          items={leadSources}
          onChange={setLeadSources}
        />
      </div>

      <div className="rounded-2xl border border-border bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/40">
        <StringListEditor
          label="Contact categories"
          items={leadContactCategories}
          onChange={setLeadContactCategories}
        />
      </div>

      <div className="rounded-2xl border border-border bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/40">
        <p className={sectionTitle}>Product plan labels</p>
        <p className="mt-1 text-xs text-text-secondary dark:text-zinc-500">
          Column slugs stay fixed (backlog, planning, …). Only the visible
          names change on boards and detail.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {PLAN_STAGE_ORDER.map((slug) => (
            <div key={slug}>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-text-secondary dark:text-zinc-500">
                {slug}
              </label>
              <input
                value={productPlanLabels[slug] ?? ""}
                onChange={(e) =>
                  setProductPlanLabels((prev) => ({
                    ...prev,
                    [slug]: e.target.value,
                  }))
                }
                className={inputClass}
              />
            </div>
          ))}
        </div>
      </div>

      <PipelineSettingsModal
        open={leadModalOpen}
        onClose={() => setLeadModalOpen(false)}
        kind="lead"
        columns={pipeline.lead}
        stageCounts={leadStageCounts}
        onSaved={() => {
          setLeadModalOpen(false);
          setMessage("Lead pipeline updated.");
          router.refresh();
        }}
      />
      <PipelineSettingsModal
        open={dealModalOpen}
        onClose={() => setDealModalOpen(false)}
        kind="deal"
        columns={pipeline.deal}
        stageCounts={dealStageCounts}
        onSaved={() => {
          setDealModalOpen(false);
          setMessage("Deal pipeline updated.");
          router.refresh();
        }}
      />
    </div>
  );
}
