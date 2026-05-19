"use client";

import { Reveal } from "@/components/marketing/renaissance/Reveal";
import { Ornament } from "@/components/marketing/renaissance/Ornament";
import {
  ArchColonnade,
  Astrolabe,
  CompassRose,
  LaurelWreath,
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
    art: <ArchColonnade width={170} height={110} accent="#C19D5A" />,
    h: "Marketing Websites",
    p: "Multi-page business sites engineered to explain your offer, build trust and guide visitors to take action.",
  },
  {
    art: <CompassRose width={130} height={130} accent="#C19D5A" />,
    h: "Ecommerce Stores",
    p: "Shopify, Stripe and headless commerce builds with product pages, cart, checkout and admin tools that scale.",
  },
  {
    art: <Sunburst width={130} height={130} accent="#C19D5A" />,
    h: "Landing Pages",
    p: "Conversion-optimized pages for paid traffic, launches and campaigns — fast load, sharp copy, clean CTAs.",
  },
  {
    art: <LaurelWreath width={130} height={130} accent="#C19D5A" content="✓" />,
    h: "Local Business Sites",
    p: "Geo-targeted sites with booking, reviews and local SEO for dental, restaurants, services and clinics.",
  },
  {
    art: <VitruvianMark width={130} height={130} accent="#C19D5A" />,
    h: "Brand Refresh",
    p: "Visual identity, typography and a new design system applied across every page and template.",
  },
  {
    art: <Astrolabe width={130} height={130} accent="#C19D5A" />,
    h: "CMS & Editor",
    p: "A content backend your team can actually use — built on Sanity, Payload or whatever fits the workflow.",
  },
];

const STEPS = [
  { r: "I", h: "Discovery", p: "Audience, offer, goals and competitive landscape. We pin the must-haves vs the can-waits." },
  { r: "II", h: "Architecture", p: "Sitemap, page flows and the conversion path. No page exists without a job." },
  { r: "III", h: "Design", p: "Visual identity applied to every screen, with copy ready for production." },
  { r: "IV", h: "Build", p: "Hand-coded or in your stack of choice. Fast, accessible and easy to update." },
  { r: "V", h: "Launch", p: "DNS, analytics, monitoring and a 30-day post-launch window for adjustments." },
];

const STATS = [
  { n: <>2<sup>wk</sup></>, l: "Marketing site", d: "From brief to live in two weeks." },
  { n: <>21<sup>d</sup></>, l: "Ecommerce build", d: "Stripe, products and admin included." },
  { n: <>3<sup>×</sup></>, l: "Avg conversion lift", d: "Versus the site we replaced." },
  { n: <>0<sup>?</sup></>, l: "Theme templates", d: "Every site shipped is bespoke." },
];

const FAQ = [
  { q: "What do you build the site in?", a: "By default — Next.js with a headless CMS (Sanity / Payload) for marketing sites, and Shopify or a custom Stripe-based stack for ecommerce. We will match your existing stack if you have one." },
  { q: "How fast can a marketing site go live?", a: "Standard launch window is two weeks for a single-offer business site, three weeks for a multi-page marketing site, and three to five weeks for a custom ecommerce build with admin tooling." },
  { q: "Do you do copy too?", a: "Yes. Every project includes a positioning and copy pass — we will not ship lorem ipsum or boilerplate copy. Founders typically join one writing call mid-build." },
  { q: "Will I be able to edit pages after launch?", a: "Yes. We ship a content editor your team can use — fields, components and image management mapped to the actual pages, not a generic builder." },
  { q: "Do you handle hosting & domain?", a: "We deploy on Vercel or Netlify by default and we will set up DNS, SSL and email forwarding. You own the accounts; we just configure them." },
  { q: "Can you redesign an existing site?", a: "Yes — we run a fixed-fee audit first, then propose a redesign scope. We can migrate content, redirects and SEO from the previous site." },
];

export default function CustomWebsitesPageContent() {
  return (
    <>
      <PageHero
        eyebrow="Service · Custom Websites"
        headline={<>Sites that <em>explain</em>, build trust & convert.</>}
        lead="Websites and stores engineered to do one job exceptionally well — turn visitors into customers — without the bloat of a template builder."
        art={
          <ArchColonnade
            width={500}
            height={340}
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
            title={<>Every kind of site, <em>built</em> to convert.</>}
            blurb="From a marketing site for a single landing offer to a full ecommerce build with admin tooling — every project ships with strategy, design, build and launch."
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

      <section className="section section-light" id="process">
        <div className="shell">
          <SectionHead
            eyebrow="Method"
            title={<>From sitemap <em>to launch</em> in twenty-one days.</>}
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

      <section className="stats-grid">
        {STATS.map((s, i) => (
          <Reveal as="div" className="stat" key={i}>
            <div className="stat-num">{s.n}</div>
            <Ornament className="stat-orn" variant="rule" width={44} height={14} />
            <div className="stat-label">{s.l}</div>
            <div className="stat-desc">{s.d}</div>
          </Reveal>
        ))}
      </section>

      <FAQList items={FAQ} />

      <CTABanner
        title={<>Ready to ship a site <em>worth visiting?</em></>}
        lead="Tell us about the site you want to launch — marketing, ecommerce or local business — and we'll map the fastest path."
      />
    </>
  );
}
