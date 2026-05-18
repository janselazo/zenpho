"use client";

import { Copy } from "lucide-react";
import {
  META_AD_INTEL_TEMPLATES,
  mergeMetaAdIntelTemplate,
} from "@/lib/crm/meta-ad-intel-outreach-template";

export default function MetaAdIntelOutreachTemplates({
  businessName,
  adCount,
  hookText,
  ctaText,
  videoThumbnailUrl,
}: {
  businessName: string;
  adCount: number;
  hookText: string | null;
  ctaText: string | null;
  videoThumbnailUrl: string | null;
}) {
  async function copyText(text: string) {
    await navigator.clipboard?.writeText(text);
  }

  return (
    <section className="rounded-2xl border border-border bg-white p-5 shadow-sm dark:border-zinc-800/70 dark:bg-zinc-900/60">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
          Outreach
        </p>
        <h2 className="mt-1 text-lg font-semibold text-text-primary dark:text-zinc-100">
          Templates for Video ads
        </h2>
        <p className="mt-1 text-sm text-text-secondary dark:text-zinc-400">
          Standalone EN/ES templates using the new paid media variables.
        </p>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {META_AD_INTEL_TEMPLATES.map((template) => {
          const subject = template.subject
            ? mergeMetaAdIntelTemplate(template.subject, {
                businessName,
                adCount,
                hookText,
                ctaText,
                videoThumbnailUrl,
              })
            : null;
          const body = mergeMetaAdIntelTemplate(template.body, {
            businessName,
            adCount,
            hookText,
            ctaText,
            videoThumbnailUrl,
          });
          const copy = [subject, body].filter(Boolean).join("\n\n");

          return (
            <article
              key={template.id}
              className="rounded-xl border border-border bg-surface/40 p-4 dark:border-zinc-800 dark:bg-zinc-950/40"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-text-primary dark:text-zinc-100">
                    {template.label}
                  </p>
                  <p className="mt-0.5 text-[11px] uppercase tracking-wide text-text-secondary dark:text-zinc-500">
                    {template.locale} / {template.channel}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void copyText(copy)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-white px-2.5 py-1.5 text-xs font-medium text-text-primary hover:bg-surface dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
                >
                  <Copy className="h-3.5 w-3.5" />
                  Copy
                </button>
              </div>
              {subject ? (
                <p className="mt-3 rounded-lg bg-white px-3 py-2 text-xs font-semibold text-text-primary dark:bg-zinc-900 dark:text-zinc-100">
                  {subject}
                </p>
              ) : null}
              <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-text-secondary dark:text-zinc-300">
                {body}
              </p>
            </article>
          );
        })}
      </div>
    </section>
  );
}
