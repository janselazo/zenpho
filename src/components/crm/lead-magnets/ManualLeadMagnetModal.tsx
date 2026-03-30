"use client";

import { useMemo, useState } from "react";
import {
  DEFAULT_NICHE_ID,
  INDUSTRIES,
  getNichesForIndustry,
  nicheAllowedForIndustry,
  type IndustryId,
  type LeadMagnetFormat,
  type NicheId,
} from "@/lib/crm/lead-magnet-industries";
import { addManualSavedLeadMagnet } from "@/app/(crm)/actions/saved-lead-magnets";

const FORMAT_OPTIONS: LeadMagnetFormat[] = [
  "Calculator",
  "Template",
  "Assessment",
  "Toolkit",
  "Other",
];

type Props = {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
};

export default function ManualLeadMagnetModal({
  open,
  onClose,
  onSaved,
}: Props) {
  const [industryId, setIndustryId] = useState<IndustryId>(
    INDUSTRIES[0]?.id ?? "tech"
  );
  const [nicheId, setNicheId] = useState<NicheId>(DEFAULT_NICHE_ID);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [format, setFormat] = useState<LeadMagnetFormat>("Template");
  const [angle, setAngle] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const niches = useMemo(
    () => getNichesForIndustry(industryId),
    [industryId]
  );

  if (!open) return null;

  const onIndustryPick = (id: IndustryId) => {
    setIndustryId(id);
    setNicheId((n) => (nicheAllowedForIndustry(n, id) ? n : DEFAULT_NICHE_ID));
  };

  const submit = async () => {
    setErr(null);
    setSaving(true);
    try {
      const res = await addManualSavedLeadMagnet({
        industryId,
        nicheId,
        title,
        description,
        format,
        angle: angle.trim() || undefined,
      });
      if (!res.ok) {
        setErr(res.error);
        setSaving(false);
        return;
      }
      setTitle("");
      setDescription("");
      setAngle("");
      setFormat("Template");
      onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 dark:bg-black/60"
      role="dialog"
      aria-modal="true"
      aria-labelledby="manual-lm-title"
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
    >
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-border bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-zinc-900"
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          id="manual-lm-title"
          className="text-lg font-semibold text-text-primary dark:text-zinc-100"
        >
          Add lead magnet idea
        </h2>
        <p className="mt-1 text-sm text-text-secondary dark:text-zinc-400">
          Saves to your <strong>Saved</strong> tab for later review.
        </p>

        <div className="mt-4 space-y-3">
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wider text-text-secondary dark:text-zinc-500">
              Title
            </span>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 w-full rounded-xl border border-border bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
              placeholder="e.g. MVP cost calculator"
              maxLength={500}
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wider text-text-secondary dark:text-zinc-500">
              Description
            </span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="mt-1 w-full resize-y rounded-xl border border-border bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
              placeholder="What it does and who it’s for…"
              maxLength={8000}
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wider text-text-secondary dark:text-zinc-500">
              Format
            </span>
            <select
              value={format}
              onChange={(e) =>
                setFormat(e.target.value as LeadMagnetFormat)
              }
              className="mt-1 w-full rounded-xl border border-border bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
            >
              {FORMAT_OPTIONS.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wider text-text-secondary dark:text-zinc-500">
              Angle (optional)
            </span>
            <input
              type="text"
              value={angle}
              onChange={(e) => setAngle(e.target.value)}
              className="mt-1 w-full rounded-xl border border-border bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
              maxLength={2000}
            />
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block sm:col-span-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-text-secondary dark:text-zinc-500">
                Industry
              </span>
              <select
                value={industryId}
                onChange={(e) =>
                  onIndustryPick(e.target.value as IndustryId)
                }
                className="mt-1 w-full rounded-xl border border-border bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
              >
                {INDUSTRIES.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block sm:col-span-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-text-secondary dark:text-zinc-500">
                Niche
              </span>
              <select
                value={nicheId}
                onChange={(e) => setNicheId(e.target.value as NicheId)}
                className="mt-1 w-full rounded-xl border border-border bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
              >
                {niches.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        {err ? (
          <p className="mt-3 text-sm text-red-600 dark:text-red-400" role="alert">
            {err}
          </p>
        ) : null}

        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-text-secondary hover:bg-surface dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => void submit()}
            className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 dark:bg-blue-600"
          >
            {saving ? "Saving…" : "Save idea"}
          </button>
        </div>
      </div>
    </div>
  );
}
