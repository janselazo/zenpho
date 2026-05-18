"use client";

import { Loader2, Play } from "lucide-react";

type Props = {
  imageUrl: string | null;
  hookText?: string | null;
  ctaText?: string | null;
  loading?: boolean;
  error?: string | null;
};

export default function CreativeReelPhonePreview({
  imageUrl,
  hookText,
  ctaText,
  loading = false,
  error = null,
}: Props) {
  if (loading) {
    return (
      <p className="mt-3 flex items-center justify-center gap-2 text-[11px] text-text-secondary dark:text-zinc-500">
        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
        Generating creative preview…
      </p>
    );
  }

  if (error) {
    return (
      <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
        {error}
      </p>
    );
  }

  if (!imageUrl) return null;

  return (
    <div className="mt-3 flex flex-col items-center">
      <div
        className="relative w-full max-w-[180px] overflow-hidden rounded-[28px] border-[6px] border-zinc-800 bg-black shadow-lg dark:border-zinc-700"
        style={{ aspectRatio: "9 / 19.5" }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- blob or proxied CDN URL */}
        <img
          src={imageUrl}
          alt="Generated creative reel preview"
          className="h-full w-full object-cover"
        />
        {motionSafePreviewPlay()}
      </div>
      {hookText || ctaText ? (
        <dl className="mt-2 w-full space-y-1 text-left">
          {hookText ? (
            <div>
              <dt className="text-[10px] text-text-secondary dark:text-zinc-500">Hook</dt>
              <dd className="text-[11px] font-medium text-text-primary dark:text-zinc-200">
                {hookText}
              </dd>
            </div>
          ) : null}
          {ctaText ? (
            <div>
              <dt className="text-[10px] text-text-secondary dark:text-zinc-500">CTA</dt>
              <dd className="text-[11px] font-medium text-text-primary dark:text-zinc-200">
                {ctaText}
              </dd>
            </div>
          ) : null}
        </dl>
      ) : null}
    </div>
  );
}

function motionSafePreviewPlay() {
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-zinc-950 shadow-md">
        <Play className="h-5 w-5 fill-current" aria-hidden />
      </span>
    </div>
  );
}
