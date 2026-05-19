"use client";

import Link from "next/link";
import { Reveal } from "@/components/marketing/renaissance/Reveal";
import SectionHead from "@/components/marketing/sections/SectionHead";
import { Putti } from "@/components/marketing/renaissance/RenaissanceArt";

const ITEMS = [
  {
    q: "We came in with a rough product idea and left with a working MVP our team could actually use. Zenpho helped us simplify the scope, design the core flows, and launch much faster than we expected.",
    a: "Michael Torres",
    r: "Founder · Operations Platform",
    i: "MT",
  },
  {
    q: "Zenpho turned our website and app concept into a clean, functional product. They helped us prioritize what mattered for version one and avoided wasting time on features we didn't need yet.",
    a: "Andrea Guzmán",
    r: "Founder · Ecommerce Startup",
    i: "AG",
  },
  {
    q: "We needed more than a designer. We needed a partner who could understand the business, map the user experience, and build the product. Zenpho handled everything from strategy to launch.",
    a: "David Chen",
    r: "CEO · SaaS MVP",
    i: "DC",
  },
  {
    q: "The process was clear from day one. We knew what was being built, what could wait, and what needed to happen before launch. The final product gave us exactly what we needed to start testing with users.",
    a: "Samantha Lee",
    r: "Founder · Mobile App MVP",
    i: "SL",
  },
  {
    q: "Zenpho helped us rebuild our digital experience into something professional, fast, and easy for customers to use. The combination of strategy, design and development made the whole process simple.",
    a: "Chris Morgan",
    r: "Owner · Digital Service Brand",
    i: "CM",
  },
];

function TestCard({ t }: { t: (typeof ITEMS)[number] }) {
  return (
    <div className="test-card">
      <span className="test-quote-mark">“</span>
      <p className="test-quote">{t.q}</p>
      <div className="test-author">
        <div className="test-avatar">{t.i}</div>
        <div className="test-author-info">
          <span className="test-author-name">{t.a}</span>
          <span className="test-author-role">{t.r}</span>
        </div>
      </div>
    </div>
  );
}

export default function HomeTestimonials() {
  return (
    <section className="section" id="testimonials">
      <div className="shell">
        <SectionHead
          eyebrow="Client feedback"
          title={
            <>
              Founders trust Zenpho <em>to build & launch</em> fast.
            </>
          }
          blurb="Real feedback from founders and businesses we've helped move from idea to launch-ready digital products."
        />
        <Reveal className="test-grid testimonials-row" stagger>
          {ITEMS.slice(0, 3).map((t, i) => (
            <TestCard t={t} key={i} />
          ))}
        </Reveal>
        <Reveal
          className="test-grid testimonials-row"
          stagger
          style={{ marginTop: 0 }}
        >
          {ITEMS.slice(3).map((t, i) => (
            <TestCard t={t} key={i} />
          ))}
          <div className="test-card test-card-cta">
            <Putti
              width={84}
              height={84}
              color="var(--fg)"
              accent="#C19D5A"
              className="ra-float"
            />
            <h4>Become the next patron.</h4>
            <Link href="/contact" className="btn-primary">
              Book a call <span className="btn-arrow">↗</span>
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
