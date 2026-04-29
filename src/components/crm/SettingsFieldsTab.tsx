"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, ListTree, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { saveCrmFieldOptions } from "@/app/(crm)/actions/crm";
import {
  MAX_PRODUCT_PLAN_STAGES,
  PLAN_STAGE_SLUG_PATTERN,
  formatLeadSourceOptionLabel,
  type MergedCrmFieldOptions,
} from "@/lib/crm/field-options";
import { PLAN_STAGE_ORDER } from "@/lib/crm/mock-data";
import type { CrmPipelineSettings } from "@/lib/crm/fetch-pipeline-settings";
import PipelineSettingsModal from "@/components/crm/PipelineSettingsModal";

const inputClass =
  "w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-text-primary shadow-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/15 dark:border-zinc-700 dark:bg-zinc-900";

const sectionTitle =
  "text-sm font-bold text-text-primary dark:text-zinc-100";

const BUILTIN_PLAN_SLUGS = new Set<string>(PLAN_STAGE_ORDER as readonly string[]);

function newRowId(): string {
  return crypto.randomUUID();
}

function SortableStringRow({
  id,
  value,
  index,
  label,
  onChange,
  onRemove,
}: {
  id: string;
  value: string;
  index: number;
  label: string;
  onChange: (v: string) => void;
  onRemove: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.88 : undefined,
    zIndex: isDragging ? 1 : undefined,
  };

  return (
    <li ref={setNodeRef} style={style} className="flex items-stretch gap-2">
      <button
        type="button"
        className="inline-flex w-9 shrink-0 cursor-grab touch-manipulation items-center justify-center rounded-xl border border-border bg-surface/50 text-text-secondary hover:bg-surface active:cursor-grabbing dark:border-zinc-700 dark:bg-zinc-800/80 dark:hover:bg-zinc-800"
        aria-label={`Reorder ${label} option ${index + 1}`}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" aria-hidden />
      </button>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={inputClass}
        placeholder="Option label"
        aria-label={`${label} option ${index + 1}`}
      />
      <button
        type="button"
        onClick={onRemove}
        className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border text-text-secondary hover:bg-surface dark:border-zinc-700 dark:hover:bg-zinc-800"
        aria-label={`Remove ${label} option ${index + 1}`}
      >
        <Trash2 className="h-4 w-4" aria-hidden />
      </button>
    </li>
  );
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
  const rowIdsRef = useRef<string[] | null>(null);
  const [dndReady, setDndReady] = useState(false);

  useEffect(() => {
    if (rowIdsRef.current === null) {
      rowIdsRef.current = items.map(() => newRowId());
    } else {
      while (rowIdsRef.current.length < items.length) {
        rowIdsRef.current.push(newRowId());
      }
      if (rowIdsRef.current.length > items.length) {
        rowIdsRef.current = rowIdsRef.current.slice(0, items.length);
      }
    }
    setDndReady(true);
  }, [items.length]);

  const rowIds = rowIdsRef.current ?? [];
  const showSortable = dndReady && rowIds.length === items.length;

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

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
    if (rowIdsRef.current) {
      rowIdsRef.current = rowIdsRef.current.filter((_, j) => j !== i);
    }
    onChange(items.filter((_, j) => j !== i));
  }

  function handleDragEnd(event: DragEndEvent) {
    if (!rowIdsRef.current) return;
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = rowIdsRef.current.indexOf(String(active.id));
    const newIndex = rowIdsRef.current.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    rowIdsRef.current = arrayMove(rowIdsRef.current, oldIndex, newIndex);
    onChange(arrayMove(items, oldIndex, newIndex));
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
        <p className="mt-1 text-xs text-text-secondary dark:text-zinc-500">
          Drag the grip to change dropdown order. Save to apply everywhere.
        </p>
      </div>

      {showSortable ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={rowIds} strategy={verticalListSortingStrategy}>
            <ul className="space-y-2">
              {items.map((v, i) => (
                <SortableStringRow
                  key={rowIds[i]}
                  id={rowIds[i]}
                  index={i}
                  label={label}
                  value={v}
                  onChange={(next) => update(i, next)}
                  onRemove={() => remove(i)}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      ) : (
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
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border text-text-secondary hover:bg-surface dark:border-zinc-700 dark:hover:bg-zinc-800"
                aria-label={`Remove ${label} option ${i + 1}`}
              >
                <Trash2 className="h-4 w-4" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}

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
  const [productPlanStageOrder, setProductPlanStageOrder] = useState(() => [
    ...(Array.isArray(initialFieldOptions.productPlanStageOrder) &&
    initialFieldOptions.productPlanStageOrder.length > 0
      ? initialFieldOptions.productPlanStageOrder
      : [...PLAN_STAGE_ORDER]),
  ]);
  const [productPlanLabels, setProductPlanLabels] = useState(() => ({
    ...initialFieldOptions.productPlanLabels,
  }));

  const [leadModalOpen, setLeadModalOpen] = useState(false);
  const [dealModalOpen, setDealModalOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savePending, setSavePending] = useState(false);

  useEffect(() => {
    setLeadProjectTypes([...initialFieldOptions.leadProjectTypes]);
    setLeadSources([...initialFieldOptions.leadSources]);
    setLeadContactCategories([...initialFieldOptions.leadContactCategories]);
    setProductPlanStageOrder([
      ...(Array.isArray(initialFieldOptions.productPlanStageOrder) &&
      initialFieldOptions.productPlanStageOrder.length > 0
        ? initialFieldOptions.productPlanStageOrder
        : [...PLAN_STAGE_ORDER]),
    ]);
    setProductPlanLabels({ ...initialFieldOptions.productPlanLabels });
  }, [initialFieldOptions]);

  function suggestExtraPlanSlug(): string {
    for (let i = 1; i < 999; i++) {
      const s = `stage_${i}`;
      if (!productPlanStageOrder.includes(s)) return s;
    }
    return `stage_${Date.now()}`;
  }

  function addCustomPlanStage() {
    if (productPlanStageOrder.length >= MAX_PRODUCT_PLAN_STAGES) return;
    const slug = suggestExtraPlanSlug();
    setProductPlanStageOrder((o) => [...o, slug]);
    setProductPlanLabels((prev) => ({ ...prev, [slug]: "New stage" }));
  }

  function removeCustomPlanStage(slug: string) {
    if (BUILTIN_PLAN_SLUGS.has(slug)) return;
    if (
      !confirm(
        "Remove this plan column? Products using this stage will fall back to another column in the board until you change their stage."
      )
    ) {
      return;
    }
    setProductPlanStageOrder((o) => o.filter((s) => s !== slug));
    setProductPlanLabels((prev) => {
      const next = { ...prev };
      delete next[slug];
      return next;
    });
  }

  async function save() {
    setMessage(null);
    setError(null);
    setSavePending(true);
    try {
      const res = await saveCrmFieldOptions({
        leadProjectTypes,
        leadSources,
        leadContactCategories,
        productPlanStageOrder,
        productPlanLabels,
      });
      if (res && typeof res === "object" && "error" in res && res.error) {
        setError(res.error);
        return;
      }
      setMessage("Saved field options.");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not save field options. Check your connection and try again."
      );
    } finally {
      setSavePending(false);
    }
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
          disabled={savePending}
          onClick={() => void save()}
          className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-60"
        >
          {savePending ? (
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
          description={`Shown in lead dropdowns. Legacy all-lowercase values are formatted automatically (e.g. ${formatLeadSourceOptionLabel("cold email")}).`}
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
          Default columns keep fixed slugs (backlog, planning, …). Rename how
          they appear on the board. Add extra columns with an auto slug
          (letters, numbers, underscores); only the label is shown in the UI.
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
        <ul className="mt-6 space-y-3">
          {productPlanStageOrder
            .filter((slug) => !BUILTIN_PLAN_SLUGS.has(slug))
            .map((slug) => (
              <li
                key={slug}
                className="flex flex-col gap-2 rounded-xl border border-border p-3 dark:border-zinc-700 sm:flex-row sm:items-end"
              >
                <div className="min-w-0 flex-1">
                  <p className="mb-1 text-xs font-medium uppercase tracking-wide text-text-secondary dark:text-zinc-500">
                    Slug
                  </p>
                  <p className="font-mono text-sm text-text-primary dark:text-zinc-200">
                    {slug}
                    {!PLAN_STAGE_SLUG_PATTERN.test(slug) ? (
                      <span className="ml-2 text-xs font-sans text-amber-600 dark:text-amber-400">
                        (invalid — remove and add again)
                      </span>
                    ) : null}
                  </p>
                </div>
                <div className="min-w-0 flex-[2]">
                  <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-text-secondary dark:text-zinc-500">
                    Label
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
                    aria-label={`Label for plan stage ${slug}`}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeCustomPlanStage(slug)}
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border text-text-secondary hover:bg-surface dark:border-zinc-700 dark:hover:bg-zinc-800"
                  aria-label={`Remove plan stage ${slug}`}
                >
                  <Trash2 className="h-4 w-4" aria-hidden />
                </button>
              </li>
            ))}
        </ul>
        <button
          type="button"
          onClick={addCustomPlanStage}
          disabled={productPlanStageOrder.length >= MAX_PRODUCT_PLAN_STAGES}
          className="mt-4 inline-flex items-center gap-2 rounded-xl border border-dashed border-border px-4 py-2 text-sm font-medium text-accent hover:bg-surface disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-600"
        >
          <Plus className="h-4 w-4" aria-hidden />
          Add plan column
        </button>
        {productPlanStageOrder.length >= MAX_PRODUCT_PLAN_STAGES ? (
          <p className="mt-2 text-xs text-text-secondary dark:text-zinc-500">
            Maximum {MAX_PRODUCT_PLAN_STAGES} plan columns.
          </p>
        ) : null}
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
