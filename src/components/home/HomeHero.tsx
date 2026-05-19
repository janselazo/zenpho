"use client";

import Link from "next/link";
import { Reveal, WordReveal } from "@/components/marketing/renaissance/Reveal";
import HomeLoopingVideo from "./HomeLoopingVideo";

export default function HomeHero() {
  return (
    <section className="hero home-hero hero-video">
      <div className="hero-fresco">
        <HomeLoopingVideo src="/marketing/banner.mp4" fadeMs={700} />
      </div>
      <div className="hero-vignette" />
      <div className="hero-marks" />
      <div className="hero-marks-foot" />

      <div className="hero-content hero-content-center">
        <div className="shell">
          <div className="hero-eyebrow centered">
            MVP Development Agency · MMXXVI
          </div>
          <h1 className="hero-headline centered">
            <WordReveal>
              We design <em>& build</em> software companies
            </WordReveal>
          </h1>
          <p className="hero-lead centered">
            <WordReveal delay={500}>
              We help founders and businesses turn ideas into launch-ready
              websites, web apps, mobile apps and MVPs — in as little as{" "}
              <strong>two weeks</strong>.
            </WordReveal>
          </p>
          <Reveal className="hero-cta-row centered">
            <Link href="/contact" className="btn-primary">
              Book a free build call <span className="btn-arrow">↗</span>
            </Link>
            <Link href="/tools/business-audit" className="btn-ghost">
              Find revenue leaks
            </Link>
          </Reveal>
        </div>
      </div>

      <div className="hero-scroll">
        <div className="hero-scroll-dot">↓</div>
        <span>Scroll</span>
        <div className="hero-scroll-line" />
      </div>
    </section>
  );
}
