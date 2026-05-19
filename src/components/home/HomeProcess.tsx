"use client";

import { Reveal } from "@/components/marketing/renaissance/Reveal";
import SectionHead from "@/components/marketing/sections/SectionHead";

const STEPS = [
  {
    r: "I",
    h: "Clarify the Idea",
    p: "We start by understanding your business, users, goals, timeline, and what you want to build — whether it is a website, web app, mobile app or MVP.",
  },
  {
    r: "II",
    h: "Define the First Version",
    p: "We prioritize the most important features, pages, screens and user flows so your product can launch fast without being overbuilt.",
  },
  {
    r: "III",
    h: "Design the Experience",
    p: "We map the user journey and design clean, modern interfaces that make your product easy to understand, easy to use, and ready for development.",
  },
  {
    r: "IV",
    h: "Build the Product",
    p: "We develop the agreed scope, connect the required tools, set up core functionality, and build the website, web app, mobile app or MVP.",
  },
  {
    r: "V",
    h: "Launch, Test, Improve",
    p: "We test the product, fix issues, deploy it, and help you understand what to improve next based on real users, feedback and business goals.",
  },
];

export default function HomeProcess() {
  return (
    <section className="section" id="process">
      <div className="shell">
        <SectionHead
          eyebrow="How it works"
          title={
            <>
              From idea to <em>launch-ready</em> product.
            </>
          }
          blurb="A method honed across two hundred commissions — fast enough for ecommerce, deliberate enough for a brand book."
        />
        <Reveal className="steps-list" stagger>
          {STEPS.map((s) => (
            <div className="step-block" key={s.r}>
              <div className="step-roman">{s.r}</div>
              <h4>{s.h}</h4>
              <p>{s.p}</p>
            </div>
          ))}
        </Reveal>
      </div>
    </section>
  );
}
