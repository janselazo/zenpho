/** Preset labels shared by new project / task composers. */
export const CRM_LABEL_PRESETS = [
  "Bug",
  "Feature",
  "Improvement",
  "Docs",
  "Chore",
] as const;

export type CrmLabelPreset = (typeof CRM_LABEL_PRESETS)[number];

const PRESET_PILL: Record<
  CrmLabelPreset,
  { idle: string; active: string }
> = {
  Bug: {
    idle:
      "bg-red-100/95 text-red-800 dark:bg-red-950/55 dark:text-red-300",
    active:
      "bg-red-200 text-red-950 ring-1 ring-inset ring-red-400/70 dark:bg-red-900/60 dark:text-red-100 dark:ring-red-500/45",
  },
  Feature: {
    idle:
      "bg-emerald-100/95 text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300",
    active:
      "bg-emerald-200 text-emerald-950 ring-1 ring-inset ring-emerald-400/70 dark:bg-emerald-900/60 dark:text-emerald-100 dark:ring-emerald-500/45",
  },
  Improvement: {
    idle:
      "bg-violet-100/95 text-violet-900 dark:bg-violet-950/50 dark:text-violet-300",
    active:
      "bg-violet-200 text-violet-950 ring-1 ring-inset ring-violet-400/70 dark:bg-violet-900/60 dark:text-violet-100 dark:ring-violet-500/45",
  },
  Docs: {
    idle:
      "bg-sky-100/95 text-sky-900 dark:bg-sky-950/50 dark:text-sky-300",
    active:
      "bg-sky-200 text-sky-950 ring-1 ring-inset ring-sky-400/70 dark:bg-sky-900/60 dark:text-sky-100 dark:ring-sky-500/45",
  },
  Chore: {
    idle:
      "bg-amber-100/95 text-amber-950 dark:bg-amber-950/45 dark:text-amber-200",
    active:
      "bg-amber-200 text-amber-950 ring-1 ring-inset ring-amber-400/70 dark:bg-amber-900/55 dark:text-amber-100 dark:ring-amber-500/45",
  },
};

const CUSTOM_IDLE =
  "bg-zinc-200/85 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300";
const CUSTOM_ACTIVE =
  "bg-zinc-300 text-zinc-950 ring-1 ring-inset ring-zinc-400/60 dark:bg-zinc-700 dark:text-zinc-100 dark:ring-zinc-500/40";

/** Toggleable chip in “Add labels…” menus. */
export function crmLabelPickerChipClass(tag: string, selected: boolean): string {
  const preset = PRESET_PILL[tag as CrmLabelPreset];
  if (preset) return selected ? preset.active : preset.idle;
  return selected ? CUSTOM_ACTIVE : CUSTOM_IDLE;
}

/** Compact chip in task rows (always “idle” tint). */
export function crmLabelDisplayChipClass(tag: string): string {
  const preset = PRESET_PILL[tag as CrmLabelPreset];
  if (preset) return preset.idle;
  return CUSTOM_IDLE;
}
