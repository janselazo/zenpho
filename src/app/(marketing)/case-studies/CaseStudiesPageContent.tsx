"use client";

import type { ReactNode } from "react";
import { Reveal } from "@/components/marketing/renaissance/Reveal";
import {
  CelestialField,
  CompassRose,
  LaurelWreath,
  Obelisk,
  Sunburst,
} from "@/components/marketing/renaissance/RenaissanceArt";
import PageHero from "@/components/marketing/sections/PageHero";
import SectionHead from "@/components/marketing/sections/SectionHead";
import CTABanner from "@/components/marketing/sections/CTABanner";
import TrustedBy from "@/components/marketing/sections/TrustedBy";

const INDEX = [
  { id: "taptok", n: "I", client: "Taptok", cat: "All-in-One Networking Platform" },
  { id: "apex", n: "II", client: "Apex Inspection Pro", cat: "Home Inspection · Mobile App" },
  { id: "tqmuch", n: "III", client: "TQMuch", cat: "Food Ecommerce Store" },
];

function CaseStudy({
  id,
  eyebrow,
  num,
  client,
  tagline,
  year,
  role,
  stack,
  summary,
  art,
  dark = false,
  problems,
  solutions,
  outcomes,
  quote,
  quoteAuthor,
  quoteRole,
}: {
  id: string;
  eyebrow: string;
  num: string;
  client: string;
  tagline: string;
  year: string;
  role: string;
  stack: string;
  summary: ReactNode;
  art: ReactNode;
  dark?: boolean;
  problems: string[];
  solutions: string[];
  outcomes: string[];
  quote?: string;
  quoteAuthor?: string;
  quoteRole?: string;
}) {
  return (
    <section className={`section case-study ${dark ? "section-dark" : ""}`} id={id}>
      {dark ? <CelestialField count={6} color="var(--marble)" accent="#E6D6A8" /> : null}
      <div className="shell" style={{ position: "relative", zIndex: 1 }}>
        <Reveal as="div" className="case-head">
          <div className="case-eyebrow">
            <span>{eyebrow}</span>
            <span className="case-num">№ {num}</span>
          </div>
          <h2 className="case-title">
            {client}
            <span> · </span>
            <em>{tagline}</em>
          </h2>
          <div className="case-meta">
            <div className="case-meta-row">
              <span className="label">Year</span>
              <span>{year}</span>
            </div>
            <div className="case-meta-row">
              <span className="label">Role</span>
              <span>{role}</span>
            </div>
            <div className="case-meta-row">
              <span className="label">Stack</span>
              <span>{stack}</span>
            </div>
          </div>
        </Reveal>

        <div className="case-feature">
          <Reveal as="div" className="case-summary">
            <p>{summary}</p>
          </Reveal>
          <Reveal as="div" className="case-art ra-draw">
            {art}
          </Reveal>
        </div>

        <Reveal as="div" className="case-grid" stagger>
          <div className="case-col">
            <div className="case-col-head">
              <span className="case-roman">I</span>
              <h4>The problem</h4>
            </div>
            <ul>
              {problems.map((p, i) => (
                <li key={i}>{p}</li>
              ))}
            </ul>
          </div>
          <div className="case-col">
            <div className="case-col-head">
              <span className="case-roman">II</span>
              <h4>What we built</h4>
            </div>
            <ul>
              {solutions.map((p, i) => (
                <li key={i}>{p}</li>
              ))}
            </ul>
          </div>
          <div className="case-col">
            <div className="case-col-head">
              <span className="case-roman">III</span>
              <h4>Outcome</h4>
            </div>
            <ul>
              {outcomes.map((p, i) => (
                <li key={i}>{p}</li>
              ))}
            </ul>
          </div>
        </Reveal>

        {quote ? (
          <Reveal as="figure" className="case-quote">
            <span className="case-quote-mark">“</span>
            <blockquote>{quote}</blockquote>
            <figcaption>
              <span className="case-quote-author">{quoteAuthor}</span>
              <span className="case-quote-role">{quoteRole}</span>
            </figcaption>
          </Reveal>
        ) : null}
      </div>
    </section>
  );
}

export default function CaseStudiesPageContent() {
  return (
    <>
      <PageHero
        eyebrow="Case Studies · MMXXVI"
        headline={<>Real products. <em>Real</em> patrons.</>}
        lead="Three engagements — a networking platform that scaled to fifteen thousand customers, a field-ops mobile app for home inspectors, and a direct-to-consumer food store shipping nationwide. Each shipped with the same Design · Build · Launch cadence."
        art={
          <LaurelWreath
            width={420}
            height={420}
            color="rgba(244,240,228,.92)"
            accent="#E6D6A8"
            content="III"
          />
        }
        ctaSecondary={{ label: "Compare packages", href: "/pricing" }}
      />

      <TrustedBy />

      <section className="section section-light" id="index">
        <div className="shell">
          <SectionHead
            eyebrow="Selected work · MMXX–MMXXVI"
            title={<>Three patrons. <em>Three</em> outcomes.</>}
            blurb="A networking platform that scaled to 15,000 customers. A field-ops mobile app for home inspectors. A direct-to-consumer food store that ships nationwide."
          />
          <Reveal as="div" className="studies-index" stagger>
            {INDEX.map((s) => (
              <a className="studies-index-card" key={s.id} href={`#${s.id}`}>
                <div className="studies-index-roman">№ {s.n}</div>
                <div className="studies-index-body">
                  <h3>{s.client}</h3>
                  <p>{s.cat}</p>
                </div>
                <span className="studies-index-arr">↓</span>
              </a>
            ))}
          </Reveal>
        </div>
      </section>

      <CaseStudy
        id="taptok"
        eyebrow="Case Study · SaaS Platform"
        num="I"
        client="Taptok"
        tagline="All-in-One Networking Platform"
        year="MMXX — MMXXIV"
        role="Product · Design · Engineering · Growth"
        stack="Next.js · Node · Postgres · Stripe · Twilio · AWS"
        summary="Taptok turns physical contact moments into a digital network — a smart-card and QR layer that captures leads, schedules follow-ups and ties referrals back to the sales rep who made them. We took the product from a single-feature prototype to a multi-tenant SaaS used by Authentic Brands Group, the City of Coral Gables and thousands of independent SMBs."
        art={
          <CompassRose
            width={360}
            height={360}
            color="rgba(10,21,48,.92)"
            accent="#B8985E"
            className="ra-float-slow"
          />
        }
        problems={[
          "Existing digital-business-card tools captured a name and disappeared — no follow-up, no analytics, no team view.",
          "Sales reps and event organizers had no way to see which connections actually converted into meetings or revenue.",
          "Operators at multi-location brands needed an org-wide rollout — branded cards, team analytics, role-based access.",
          "Mobile-first usage but everything important happened on the back-end — leads, CRM sync, billing, admin.",
        ]}
        solutions={[
          "Full SaaS rebuild: multi-tenant accounts, team workspaces, role-based permissions, billing tiers.",
          "Smart-card + QR + NFC capture flow with instant contact-saving and one-tap follow-up scheduling.",
          "Built-in analytics dashboard: connections per rep, follow-up rate, conversion-to-meeting, revenue tied back.",
          "Integrations with HubSpot, Salesforce, Mailchimp and Stripe — leads flowed where the team already worked.",
          "Enterprise rollout tooling: branded card templates, bulk provisioning, admin SSO, audit logs.",
        ]}
        outcomes={[
          "Scaled from 0 to 15,000 customers across consumer, enterprise and government segments.",
          "Authentic Brands Group rolled out across five portfolio brands.",
          "City of Coral Gables deployed across municipal teams.",
          "$1.3M+ annualized revenue at the chapter we operated, with sub-5% monthly churn at the SMB tier.",
        ]}
        quote="Living inside support, product and growth as one system on Taptok is what we carry into every Zenpho engagement."
        quoteAuthor="Janse Lazo"
        quoteRole="Founder · Zenpho"
      />

      <CaseStudy
        id="apex"
        eyebrow="Case Study · Mobile App"
        num="II"
        client="Apex Inspection Pro"
        tagline="Home Inspection · Field Mobile App"
        year="MMXXIII"
        role="UX · Mobile Engineering · Cloud Sync · Launch"
        stack="React Native · Expo · Supabase · PDF gen · Stripe"
        summary="Apex Inspection Pro replaces the clipboard for residential home inspectors. We designed and built a mobile app that captures every room, every defect and every photo on-site — then generates a fully branded, client-ready PDF report before the inspector leaves the driveway."
        dark
        art={<Obelisk width={140} height={360} color="rgba(244,240,228,.92)" accent="#E6D6A8" />}
        problems={[
          "Inspectors were carrying clipboards, a DSLR, a laptop and three apps — and re-typing reports for hours every night.",
          "Photos lived on the camera roll with no link to the room or defect they documented.",
          "Reports were inconsistent, took 4–6 hours to assemble, and clients waited 24–48 hours after the inspection.",
          "No offline support — but inspectors frequently work in basements, attics and rural areas without signal.",
        ]}
        solutions={[
          "Native iOS + Android app (one React Native codebase) with a structured room-by-room inspection flow.",
          "Photo capture tied to defect — every image is auto-tagged with room, category, severity and timestamp.",
          "Offline-first sync — inspectors work without signal; data syncs to Supabase when connectivity returns.",
          "One-tap branded PDF generation with client logo, photos, severity scores and a summary cover page.",
          "Stripe-powered subscription billing with a 14-day trial; admin panel for the inspection company to onboard inspectors.",
        ]}
        outcomes={[
          "Time-to-report dropped from 4–6 hours to under 15 minutes — reports delivered before the inspector leaves the driveway.",
          "Inspector throughput up ~40% with no quality loss — same-day delivery became a competitive advantage.",
          "Shipped to TestFlight and Play Store in 28 days from signed brief.",
          "Used daily across multi-state inspection franchises, with offline mode rated the top-loved feature.",
        ]}
        quote="The first inspection I did with Apex, I delivered the report before I'd left the driveway. That used to take me until midnight."
        quoteAuthor="Lead Inspector"
        quoteRole="Apex Inspection Pro"
      />

      <CaseStudy
        id="tqmuch"
        eyebrow="Case Study · Ecommerce"
        num="III"
        client="TQMuch"
        tagline="Food Ecommerce Store"
        year="MMXXIV — MMXXV"
        role="Brand · Ecommerce · Logistics · Launch"
        stack="Next.js · Shopify · Stripe · Klaviyo · ShipStation"
        summary="TQMuch is a direct-to-consumer food brand selling artisan pantry staples nationwide. We rebuilt the storefront from a generic template into a bespoke ecommerce experience — branded, fast, with subscriptions, cold-chain shipping logic, and a content layer for recipes and provenance."
        art={
          <Sunburst
            width={360}
            height={360}
            color="rgba(10,21,48,.92)"
            accent="#B8985E"
          />
        }
        problems={[
          "Original site was a generic Shopify theme — slow, off-brand, with a cart abandonment rate above 78%.",
          "Subscriptions, gift bundles and one-time orders all needed different shipping rules — the template could not handle it.",
          "Cold-chain shipping required logic the standard checkout did not support (cutoffs by region, ice-pack add-ons, delivery windows).",
          "No content layer — the story of where each ingredient came from lived in social posts, not the product page.",
        ]}
        solutions={[
          "Bespoke storefront on Next.js connected to Shopify for catalog + orders, with full design-system control.",
          "Custom checkout flow handling subscriptions, gift bundles and one-time orders with per-SKU shipping rules.",
          "Cold-chain logic: region-aware shipping cutoffs, ice-pack add-ons applied automatically, delivery-window picker.",
          "Klaviyo email automations: welcome, abandonment recovery, subscription renewal, re-engagement.",
          "Editorial content layer — recipes, provenance stories and producer interviews, all tied back to SKUs.",
        ]}
        outcomes={[
          "Cart abandonment dropped from 78% to 41% in the first sixty days post-launch.",
          "Average order value up 62% — driven by gift bundles and recipe-tied cross-sells.",
          "Subscription tier launched at 18% of revenue by month three.",
          "Site speed: <2s on mobile (vs >6s on the previous template).",
        ]}
        quote="Zenpho didn't just rebuild our store — they rebuilt how customers experience the brand. Subscriptions paid back the project in eleven weeks."
        quoteAuthor="Founder"
        quoteRole="TQMuch"
      />

      <CTABanner
        title={<>Want your product <em>in this list?</em></>}
        lead="Tell us what you are launching. We will come back with a fixed scope, a fixed quote and a Monday start date — within 48 hours."
      />
    </>
  );
}
