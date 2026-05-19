"use client";

import Link from "next/link";
import { Reveal } from "@/components/marketing/renaissance/Reveal";
import {
  CelestialField,
  Sunburst,
} from "@/components/marketing/renaissance/RenaissanceArt";
import { BOOKING_PRIMARY_BUTTON_LABEL } from "@/lib/marketing/booking-cta";

export default function BlogArticleCTA() {
  return (
    <aside className="cta-banner cta-banner-inline blog-article-cta">
      <CelestialField count={6} color="var(--marble)" accent="#E6D6A8" />
      <div className="cta-banner-frame" />
      <div className="cta-banner-inner">
        <Reveal className="cta-banner-content">
          <div className="cta-banner-art">
            <Sunburst
              width={120}
              height={120}
              color="rgba(244,240,228,.8)"
              accent="#F4E4B4"
              className="ra-float-slow"
            />
          </div>
          <h2>
            Ready to plan your <em>MVP?</em>
          </h2>
          <p>
            Book a working session—we&apos;ll align scope for web apps, ecommerce, mobile, or
            integrated experiences.
          </p>
          <div className="hero-cta-row" style={{ justifyContent: "center" }}>
            <Link href="/booking" className="btn-primary">
              {BOOKING_PRIMARY_BUTTON_LABEL} <span className="btn-arrow">↗</span>
            </Link>
            <Link href="/services" className="btn-ghost">
              Explore services
            </Link>
          </div>
        </Reveal>
      </div>
    </aside>
  );
}
