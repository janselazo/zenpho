"use client";

import Link from "next/link";
import type { ComponentProps } from "react";
import { track } from "@/lib/analytics/track";

type TrackedLinkProps = ComponentProps<typeof Link> & {
  eventName?: string;
  eventPayload?: Record<string, string | number | boolean | null | undefined>;
};

export default function TrackedLink({
  eventName = "cta_click",
  eventPayload,
  onClick,
  ...props
}: TrackedLinkProps) {
  return (
    <Link
      {...props}
      onClick={(event) => {
        track(eventName, eventPayload);
        onClick?.(event);
      }}
    />
  );
}
