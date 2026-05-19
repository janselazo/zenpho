"use client";

import type { ReactNode } from "react";
import { Reveal } from "@/components/marketing/renaissance/Reveal";
import { Ornament } from "@/components/marketing/renaissance/Ornament";

export default function SectionHead({
  eyebrow,
  title,
  blurb,
  light = false,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  blurb?: ReactNode;
  light?: boolean;
}) {
  return (
    <Reveal className="section-head">
      {eyebrow ? <div className="eyebrow">{eyebrow}</div> : null}
      <Ornament
        variant="fleuron"
        width={80}
        height={24}
        color={light ? "var(--marble)" : "currentColor"}
      />
      <h2>{title}</h2>
      {blurb ? <p className="blurb">{blurb}</p> : null}
    </Reveal>
  );
}
