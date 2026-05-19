"use client";

import { Reveal } from "@/components/marketing/renaissance/Reveal";
import {
  Astrolabe,
  CelestialField,
  CompassRose,
  HeraldTrumpet,
  LaurelWreath,
  Shield,
  Sunburst,
} from "@/components/marketing/renaissance/RenaissanceArt";
import SectionHead from "@/components/marketing/sections/SectionHead";
import CTABanner from "@/components/marketing/sections/CTABanner";
import FAQList from "@/components/marketing/sections/FAQList";
import TrustedBy from "@/components/marketing/sections/TrustedBy";
import AuditHero from "@/components/marketing/audit/AuditHero";

const ANALYZE = [
  { art: <CompassRose width={130} height={130} accent="#C19D5A" />, h: "Google Business Profile", p: "Listing health, categories, attributes, hours, photos, posts cadence and Q&A coverage." },
  { art: <LaurelWreath width={130} height={130} accent="#C19D5A" content="★" />, h: "Reviews & Reputation", p: "Volume, recency, response rate, sentiment trends and benchmark against local competitors." },
  { art: <Astrolabe width={130} height={130} accent="#C19D5A" />, h: "Website & SEO", p: "PageSpeed, mobile experience, Core Web Vitals, indexing, schema, conversion paths and CTAs." },
  { art: <Sunburst width={130} height={130} accent="#C19D5A" />, h: "Ads & Visibility", p: "Whether you show up for local searches that matter, paid vs organic mix, and competitor ad presence." },
  { art: <Shield width={120} height={130} accent="#C19D5A" content="L" />, h: "Local Map Pack", p: "Where you rank for the queries your customers actually search — and which neighborhoods you miss." },
  { art: <HeraldTrumpet width={130} height={120} accent="#C19D5A" />, h: "Lead Capture & Follow-Up", p: "Phone tracking, form completion, response time, CRM hand-off and how leads convert to revenue." },
];

const STEPS = [
  { r: "I", h: "Search", p: "Type your business name or paste your website. We pull the public Google, Maps and PageSpeed signals instantly — no login, no card." },
  { r: "II", h: "Preview", p: "In under sixty seconds you see a snapshot — overall score, the three biggest leaks we found and an estimate of revenue impact." },
  { r: "III", h: "Deep Dive", p: "Book a free call and we walk through the full report — 30+ checks across profile, reviews, web, ads and follow-up — with a fixed-price fix-it plan." },
];

const FINDINGS = [
  { score: "C+", h: "Profile incomplete", p: "Missing 4 of 11 attributes shoppers filter by. Adds ~12% to map-pack impressions when fixed.", impact: "+$1,800/mo est." },
  { score: "D", h: "Reviews stale", p: "Only 3 new reviews in the last 90 days — competitors averaging 11. Hurts both ranking and trust.", impact: "+$2,400/mo est." },
  { score: "B-", h: "Site too slow", p: "Mobile LCP at 4.8s · core web vitals failing. Bounce rate above 64% on the contact page.", impact: "+$1,100/mo est." },
  { score: "F", h: "Form replies slow", p: "Average response to inbound contact form is 27 hours — 80% of conversions happen in the first 5 minutes.", impact: "+$3,600/mo est." },
];

const FAQ = [
  { q: "Is the audit really free?", a: "Yes — the instant preview is free with no card. You'll see your overall score, the three biggest leaks and an estimated impact. The full 30+ check report and fix-it plan is unlocked on a free thirty-minute build call." },
  { q: "Do I need to give you access to anything?", a: "No — the preview runs entirely on public signals (Google Business Profile, Maps, your live website, PageSpeed). For the deep audit we'll ask to read-only connect Google Search Console, Analytics, your CRM and your ads accounts." },
  { q: "How accurate are the revenue numbers?", a: "Estimates use industry-standard benchmarks (response-time conversion data from HubSpot, review-volume lift data from BrightLocal, etc.) and your traffic / call volume when available. On the call we replace estimates with your actual numbers." },
  { q: "What happens after the audit?", a: "You get a written report and a fixed-price fix-it plan. You can take it to anyone — your in-house team, another agency, or commission us. No obligation, no pressure." },
  { q: "Do you do this for non-local businesses?", a: "Yes — though we tune the checks for the business type. Ecommerce gets a different lens (CRO, abandonment, shipping logic) than a local service business (map pack, reviews, response time). Just enter your URL and we'll match the right checks." },
];

export default function BusinessAuditPageContent() {
  return (
    <>
      <AuditHero />

      <TrustedBy />

      <section className="section section-light" id="analyze">
        <div className="shell">
          <SectionHead
            eyebrow="What we analyze"
            title={<>Six signals. <em>One</em> revenue picture.</>}
            blurb="A complete view of where you show up, what people see, what they say, and what happens after they click — pulled from public signals and your own data when you connect it."
          />
          <Reveal as="div" className="offer-grid" stagger>
            {ANALYZE.map((o, i) => (
              <div className="offer-card" key={i}>
                <div className="offer-art">{o.art}</div>
                <h3>{o.h}</h3>
                <p>{o.p}</p>
              </div>
            ))}
          </Reveal>
        </div>
      </section>

      <section className="section" id="how">
        <div className="shell">
          <SectionHead
            eyebrow="How it works"
            title={<>Search. <em>Preview.</em> Plan the fix.</>}
            blurb="Three steps to a clearer picture of where your business is losing money — and what to do about it."
          />
          <Reveal
            as="div"
            className="steps-list"
            style={{ gridTemplateColumns: "repeat(3, 1fr)" }}
            stagger
          >
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

      <section className="section section-dark" id="findings">
        <CelestialField count={8} color="var(--marble)" accent="#E6D6A8" />
        <div className="shell" style={{ position: "relative", zIndex: 1 }}>
          <SectionHead
            eyebrow="What you'll see"
            title={<>A sample <em>revenue leak</em> report.</>}
            blurb="Anonymized snapshot from a recent audit — a regional service business with a $1.2M ARR. The findings below totaled an estimated $8,900/mo in recoverable revenue."
            light
          />
          <Reveal as="div" className="findings-grid" stagger>
            {FINDINGS.map((f, i) => (
              <div className="finding-card" key={i}>
                <div className="finding-grade">{f.score}</div>
                <div className="finding-body">
                  <h4>{f.h}</h4>
                  <p>{f.p}</p>
                </div>
                <div className="finding-impact">{f.impact}</div>
              </div>
            ))}
          </Reveal>
          <Reveal as="div" className="findings-total">
            <span className="findings-total-label">Total est. monthly leak</span>
            <span className="findings-total-fig">
              $8,900 <span>/ month</span>
            </span>
          </Reveal>
        </div>
      </section>

      <FAQList items={FAQ} eyebrow="Audit FAQ" />

      <CTABanner
        title={<>Ready to see <em>where the money</em> is going?</>}
        lead="Run the free instant preview — under sixty seconds, no card, no spam. Then book the call if you want the full report and a fix-it plan."
      />
    </>
  );
}
