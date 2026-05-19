"use client";

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
  label = "Trusted by 50+ leading companies",
}: {
  logos?: string[];
  label?: string;
}) {
  return (
    <section className="trusted-by">
      <div className="shell">
        <Reveal>
          <div className="trusted-by-label">
            <Ornament variant="rule" width={40} height={14} />
            <span>{label}</span>
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
