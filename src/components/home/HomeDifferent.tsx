"use client";

import { Reveal } from "@/components/marketing/renaissance/Reveal";
import { Ornament } from "@/components/marketing/renaissance/Ornament";
import SectionHead from "@/components/marketing/sections/SectionHead";
import {
  CelestialField,
  ClassicalHand,
} from "@/components/marketing/renaissance/RenaissanceArt";

export default function HomeDifferent() {
  return (
    <section className="section section-dark" id="different">
      <CelestialField count={10} color="var(--marble)" accent="#E6D6A8" />
      <div className="shell" style={{ position: "relative", zIndex: 1 }}>
        <div className="different-grid">
          <div>
            <SectionHead
              eyebrow="What makes us different"
              title={
                <>
                  Not just developers. <em>A product launch</em> partner.
                </>
              }
              light
            />
            <Reveal className="different-prose">
              <p>
                Most developers wait for a full scope before they start
                building. Most agencies focus only on visuals, branding or
                individual pages.
              </p>
              <p>
                We help you go deeper — clarifying the idea, defining the right
                first version, designing the user experience, building the
                product and preparing it for launch.
              </p>
              <p>
                Our goal is simple: help you move from idea to a working
                website, web app, mobile app or MVP without wasting time on
                features you do not need yet.
              </p>
              <Ornament
                variant="fleuron"
                width={80}
                height={24}
                color="var(--marble)"
              />
              <p className="diff-italic">
                <em>We help you understand:</em>
              </p>
              <ul className="diff-list">
                <li>What should be built first</li>
                <li>Which features can wait until later</li>
                <li>How users should move through the product</li>
                <li>What pages, screens or flows are needed for launch</li>
                <li>
                  Which integrations, payments, dashboards or admin tools are
                  required
                </li>
                <li>
                  How to launch quickly and improve after real user feedback
                </li>
              </ul>
            </Reveal>
          </div>
          <Reveal className="different-art ra-draw">
            <ClassicalHand
              width={420}
              height={420}
              color="rgba(244,240,228,.85)"
              accent="#E6D6A8"
            />
          </Reveal>
        </div>
      </div>
    </section>
  );
}
