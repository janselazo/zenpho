"use client";

import { Reveal } from "@/components/marketing/renaissance/Reveal";
import { Ornament } from "@/components/marketing/renaissance/Ornament";
import SectionHead from "@/components/marketing/sections/SectionHead";

const PROBLEMS = [
  "No clear MVP scope",
  "Website or app idea stuck in planning",
  "Too many features for version one",
  "Poor user experience and weak design",
  "Expensive quotes with unclear deliverables",
  "No product roadmap or launch plan",
  "Slow development and missed deadlines",
  "No working prototype to test with users",
  "No user login, payments, or dashboard setup",
  "Disconnected tools and missing integrations",
  "No analytics or feedback tracking after launch",
  "No post-launch support for improvements",
];

export default function HomeProblem() {
  return (
    <section className="section section-light" id="problem">
      <div className="shell">
        <SectionHead
          eyebrow="The problem"
          title={
            <>
              Where great ideas get <em>stuck</em> before launch.
            </>
          }
          blurb="Many founders have strong ideas. Without a clear scope, product strategy and focused development, projects get delayed, overbuilt or never launched at all."
        />

        <Reveal className="problems-grid" stagger>
          {PROBLEMS.map((p, i) => (
            <div className="problem-item" key={i}>
              <span className="x">✕</span>
              <span>{p}</span>
            </div>
          ))}
        </Reveal>

        <Reveal
          style={{
            marginTop: 64,
            maxWidth: 640,
            marginInline: "auto",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
          }}
        >
          <Ornament variant="fleuron" width={80} height={24} />
          <p
            style={{
              fontFamily: "var(--serif)",
              fontStyle: "italic",
              fontSize: 22,
              lineHeight: 1.4,
              color: "var(--fg-soft)",
              marginTop: 16,
            }}
          >
            Our job is simple — we help you turn the idea into a launch-ready
            website, web app, mobile app or MVP, with clear strategy and
            support after launch.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
