"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Reveal } from "@/components/marketing/renaissance/Reveal";
import {
  CelestialField,
  Sunburst,
} from "@/components/marketing/renaissance/RenaissanceArt";

export default function CTABanner({
  title,
  lead,
  primaryHref = "/contact",
  primaryLabel = "Book a free build call",
  secondaryHref = "/pricing",
  secondaryLabel = "Compare launch packages",
}: {
  title: ReactNode;
  lead?: ReactNode;
  primaryHref?: string;
  primaryLabel?: string;
  secondaryHref?: string;
  secondaryLabel?: string;
}) {
  return (
    <section className="cta-banner">
      <CelestialField count={8} color="var(--marble)" accent="#E6D6A8" />
      <div className="cta-banner-frame" />
      <div className="shell cta-banner-inner">
        <Reveal className="cta-banner-content">
          <div className="cta-banner-art">
            <Sunburst
              width={180}
              height={180}
              color="rgba(244,240,228,.8)"
              accent="#F4E4B4"
              className="ra-float-slow"
            />
          </div>
          <h2>{title}</h2>
          {lead ? <p>{lead}</p> : null}
          <div className="hero-cta-row" style={{ justifyContent: "center" }}>
            <Link href={primaryHref} className="btn-primary">
              {primaryLabel} <span className="btn-arrow">↗</span>
            </Link>
            <Link href={secondaryHref} className="btn-ghost">
              {secondaryLabel}
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
