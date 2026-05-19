"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Reveal, WordReveal } from "@/components/marketing/renaissance/Reveal";
import { CelestialField } from "@/components/marketing/renaissance/RenaissanceArt";

export default function PageHero({
  eyebrow,
  headline,
  lead,
  ctaPrimary = "Book a call",
  ctaHref = "/contact",
  ctaSecondary,
  art,
}: {
  eyebrow?: ReactNode;
  headline: ReactNode;
  lead?: ReactNode;
  ctaPrimary?: string;
  ctaHref?: string;
  ctaSecondary?: { label: string; href: string };
  art?: ReactNode;
}) {
  return (
    <section className="page-hero">
      <CelestialField count={6} color="var(--marble)" accent="#E6D6A8" />
      <div className="page-hero-grid shell">
        <Reveal className="page-hero-text">
          {eyebrow ? <div className="hero-eyebrow">{eyebrow}</div> : null}
          <h1 className="page-hero-headline">
            <WordReveal>{headline}</WordReveal>
          </h1>
          {lead ? <p className="page-hero-lead">{lead}</p> : null}
          <div className="hero-cta-row">
            <Link href={ctaHref} className="btn-primary">
              {ctaPrimary} <span className="btn-arrow">↗</span>
            </Link>
            {ctaSecondary ? (
              <Link href={ctaSecondary.href} className="btn-ghost">
                {ctaSecondary.label}
              </Link>
            ) : null}
          </div>
        </Reveal>
        {art ? (
          <Reveal className="page-hero-art ra-draw">{art}</Reveal>
        ) : null}
      </div>
    </section>
  );
}
