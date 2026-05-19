"use client";

import { Reveal } from "@/components/marketing/renaissance/Reveal";
import {
  Astrolabe,
  CelestialField,
  ClassicalHand,
  CompassRose,
  Shield,
  Sunburst,
  VitruvianMark,
} from "@/components/marketing/renaissance/RenaissanceArt";
import PageHero from "@/components/marketing/sections/PageHero";
import SectionHead from "@/components/marketing/sections/SectionHead";
import CTABanner from "@/components/marketing/sections/CTABanner";
import FAQList from "@/components/marketing/sections/FAQList";
import TrustedBy from "@/components/marketing/sections/TrustedBy";

const INCLUDES = [
  {
    art: <Astrolabe width={130} height={130} accent="#C19D5A" />,
    h: "SaaS MVPs",
    p: "End-to-end first version: login, billing, dashboards, admin and the core workflow your users will pay for.",
  },
  {
    art: <Shield width={120} height={130} accent="#C19D5A" content="ID" />,
    h: "Auth & Accounts",
    p: "Email, social and SSO login. Roles, permissions, teams, password resets and audit logs out of the box.",
  },
  {
    art: <CompassRose width={130} height={130} accent="#C19D5A" />,
    h: "Dashboards",
    p: "Data views, charts, filters, search and CSV export. Built on real APIs — not Figma screenshots.",
  },
  {
    art: <ClassicalHand width={150} height={130} accent="#C19D5A" />,
    h: "Client Portals",
    p: "A private surface for your customers to see status, files, invoices and updates — branded as yours.",
  },
  {
    art: <Sunburst width={130} height={130} accent="#C19D5A" />,
    h: "Integrations",
    p: "Stripe, Twilio, OpenAI, Slack, Resend, Postmark, Supabase, your CRM — connected and observable.",
  },
  {
    art: <VitruvianMark width={130} height={130} accent="#C19D5A" />,
    h: "Internal Tools",
    p: "Admin panels and ops dashboards that replace spreadsheets, Notion docs and the ten-tab CRM lookup.",
  },
];

const STACK = [
  { cat: "Frontend", items: ["Next.js", "React", "TypeScript", "Tailwind"] },
  { cat: "Backend", items: ["Node", "tRPC / REST", "Prisma", "Postgres"] },
  { cat: "Auth", items: ["Clerk", "Auth.js", "Supabase Auth"] },
  { cat: "Payments", items: ["Stripe", "Stripe Billing", "Lemon Squeezy"] },
  { cat: "Hosting", items: ["Vercel", "Railway", "Fly", "AWS"] },
  { cat: "Observability", items: ["Sentry", "PostHog", "Logflare"] },
];

const STEPS = [
  { r: "I", h: "Scope", p: "Two-week MVP scope: the smallest version that proves the product idea." },
  { r: "II", h: "Design", p: "Auth flow, core workflow, dashboard and one admin surface — designed to ship, not to demo." },
  { r: "III", h: "Build", p: "Backend, frontend, auth and payments wired together with real data." },
  { r: "IV", h: "Beta", p: "Soft-launch to ten friendly users. We watch the funnel and fix what breaks." },
  { r: "V", h: "Scale", p: "Plan the next sprint — usually billing tiers, integrations or the second user role." },
];

const FAQ = [
  { q: "Can you really ship an MVP in 2 weeks?", a: "If the scope is focused — yes. We help you pin the smallest version that proves the product idea. Beyond two weeks, we typically run additional two-week sprints to add billing tiers, integrations and the next user role." },
  { q: "Do I keep ownership of the code?", a: "Yes. Code lives in your GitHub from day one. We commit, you own. We can also transfer the repo at any point with no exit fee." },
  { q: "What about hosting and infrastructure?", a: "Default is Vercel (frontend) + Railway or Fly (backend) + Supabase or Neon (Postgres). Costs scale with usage; a typical MVP runs $30–60/mo to host. Enterprise on AWS or GCP on request." },
  { q: "Will users be able to pay?", a: "Yes — Stripe Checkout, subscriptions, metered billing, trials and coupons are part of a standard MVP. We will also wire the customer-portal so users can manage their plans." },
  { q: "Who maintains the app after launch?", a: "We can stay on a fractional-CTO retainer (typically 4–8 hours/week) or hand over to your engineer with a written architecture doc and a 30-day support window." },
  { q: "Do you do AI features?", a: "Yes — chat, search, summarization, structured extraction, agent workflows. We use OpenAI, Anthropic or open-weights depending on cost, latency and privacy needs." },
];

export default function WebAppsPageContent() {
  return (
    <>
      <PageHero
        eyebrow="Service · Web Apps"
        headline={<>Working products. <em>Not Figma</em> files.</>}
        lead="Dashboards, portals and SaaS MVPs — with login, payments, integrations and admin tools, built end-to-end and shipped in two-week sprints."
        art={
          <Astrolabe
            width={420}
            height={420}
            color="rgba(244,240,228,.92)"
            accent="#E6D6A8"
          />
        }
        ctaSecondary={{ label: "Compare packages", href: "/pricing" }}
      />

      <TrustedBy />

      <section className="section" id="includes">
        <div className="shell">
          <SectionHead
            eyebrow="What's included"
            title={<>From login screen <em>to launch.</em></>}
            blurb="A web app is not a Figma file. We build the working product — backend, frontend, auth, payments and admin — so version one is live, not 'in design'."
          />
          <Reveal as="div" className="offer-grid" stagger>
            {INCLUDES.map((o, i) => (
              <div className="offer-card" key={i}>
                <div className="offer-art">{o.art}</div>
                <h3>{o.h}</h3>
                <p>{o.p}</p>
              </div>
            ))}
          </Reveal>
        </div>
      </section>

      <section className="section section-dark" id="stack">
        <CelestialField count={8} color="var(--marble)" accent="#E6D6A8" />
        <div className="shell" style={{ position: "relative", zIndex: 1 }}>
          <SectionHead
            eyebrow="The stack"
            title={<>Modern tools, <em>thoughtfully</em> assembled.</>}
            blurb="No framework loyalty — we pick what fits the product. Below is what we reach for most often."
            light
          />
          <Reveal as="div" className="stack-grid" stagger>
            {STACK.map((s) => (
              <div className="stack-card" key={s.cat}>
                <div className="stack-cat">{s.cat}</div>
                <ul>
                  {s.items.map((x, i) => (
                    <li key={i}>{x}</li>
                  ))}
                </ul>
              </div>
            ))}
          </Reveal>
        </div>
      </section>

      <section className="section" id="process">
        <div className="shell">
          <SectionHead
            eyebrow="Method"
            title={<>Two weeks to a <em>working</em> MVP.</>}
          />
          <Reveal as="div" className="steps-list" stagger>
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

      <FAQList items={FAQ} />

      <CTABanner
        title={<>Have an idea? <em>We&apos;ll ship it</em> in two weeks.</>}
        lead="Tell us about the product you want to build. We'll come back with a focused MVP scope and a fixed price."
      />
    </>
  );
}
