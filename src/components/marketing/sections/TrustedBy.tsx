"use client";

import type { ReactNode } from "react";
import { Reveal } from "@/components/marketing/renaissance/Reveal";
import { Ornament } from "@/components/marketing/renaissance/Ornament";

const DEFAULT_LOGOS = [
  "TapTok",
  "Apex Inspection Pro",
  "TQMuch",
  "SoldTools",
  "Bravaz Dental",
  "Truedent Dentistry",
  "Real Cafe",
  "Braojos Insurance",
  "Yaber Dental Partners",
  "Longan's Wedding Venue",
];

export default function TrustedBy({
  logos = DEFAULT_LOGOS,
  label,
}: {
  logos?: string[];
  label?: ReactNode;
}) {
  const labelContent = label ?? (
    <>
      Trusted by 50+{" "}
      <span className="trusted-by-leading-word">leading </span>
      companies
    </>
  );

  return (
    <section className="trusted-by">
      <div className="shell">
        <Reveal>
          <div className="trusted-by-label">
            <Ornament variant="rule" width={40} height={14} />
            <span>{labelContent}</span>
            <Ornament variant="rule" width={40} height={14} />
          </div>
          <div className="trusted-by-marquee">
            <div className="trusted-by-track">
              {[...logos, ...logos].map((l, i) => (
                <span key={i} className="trusted-by-item">
                  <span className="trusted-by-mark" />
                  {l}
                </span>
              ))}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
