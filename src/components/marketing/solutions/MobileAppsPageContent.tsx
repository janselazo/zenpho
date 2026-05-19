"use client";

import { Reveal } from "@/components/marketing/renaissance/Reveal";
import {
  Astrolabe,
  CelestialField,
  ClassicalHand,
  CompassRose,
  Obelisk,
  Shield,
  Sunburst,
} from "@/components/marketing/renaissance/RenaissanceArt";
import PageHero from "@/components/marketing/sections/PageHero";
import SectionHead from "@/components/marketing/sections/SectionHead";
import CTABanner from "@/components/marketing/sections/CTABanner";
import FAQList from "@/components/marketing/sections/FAQList";
import TrustedBy from "@/components/marketing/sections/TrustedBy";

const INCLUDES = [
  {
    art: <Obelisk width={70} height={130} accent="#C19D5A" />,
    h: "iOS & Android MVPs",
    p: "One React Native codebase, two native apps. Shipped to TestFlight and Play Store with all the store assets.",
  },
  {
    art: <Shield width={120} height={130} accent="#C19D5A" content="ID" />,
    h: "Onboarding & Auth",
    p: "Sign-up, sign-in, password reset, social login and a first-run experience tuned for retention.",
  },
  {
    art: <CompassRose width={130} height={130} accent="#C19D5A" />,
    h: "Core Workflows",
    p: "The one or two screens that ARE your product, designed and built to feel native — not webview.",
  },
  {
    art: <Sunburst width={130} height={130} accent="#C19D5A" />,
    h: "Push & Notifications",
    p: "FCM / APNs, deep links, in-app messaging and the retention loops your growth team needs.",
  },
  {
    art: <ClassicalHand width={150} height={130} accent="#C19D5A" />,
    h: "Payments & IAP",
    p: "Stripe for subscriptions, RevenueCat for App Store / Play Store In-App Purchases. We handle the receipts.",
  },
  {
    art: <Astrolabe width={130} height={130} accent="#C19D5A" />,
    h: "Analytics & OTA",
    p: "PostHog or Mixpanel for product analytics. EAS / CodePush for over-the-air JS updates without a store review.",
  },
];

const STACK = [
  { cat: "Framework", items: ["React Native", "Expo", "TypeScript"] },
  { cat: "Backend", items: ["Node / tRPC", "Supabase", "Postgres"] },
  { cat: "Auth", items: ["Clerk", "Supabase Auth", "Apple / Google"] },
  { cat: "Payments", items: ["RevenueCat", "Stripe", "StoreKit"] },
  { cat: "Push", items: ["Expo Push", "FCM", "OneSignal"] },
  { cat: "Distribution", items: ["EAS Build", "TestFlight", "Play Console"] },
];

const STEPS = [
  { r: "I", h: "Scope", p: "Pin the one or two screens that ARE the product. Everything else is v2." },
  { r: "II", h: "Design", p: "Native iOS / Android patterns, not generic mobile-web. Onboarding to retention loop." },
  { r: "III", h: "Build", p: "React Native + Expo on a real device, every day. Backend wired to a real DB." },
  { r: "IV", h: "TestFlight", p: "Internal beta to 20 friendly users. We watch the funnel and the crash reports." },
  { r: "V", h: "Store launch", p: "App Store and Play Store review prep, screenshots, descriptions and the first push campaign." },
];

const FAQ = [
  { q: "iOS only, Android only, or both?", a: "Both, by default — one React Native codebase, two native apps. We can ship iOS only first if you want to validate before paying the Play Console fee." },
  { q: "Do I need an Apple Developer account?", a: "Yes — Apple ($99/yr) and Google Play ($25 one-time) accounts have to be in your name. We will help you set them up if needed and guide the review process." },
  { q: "How long to launch?", a: "Four weeks is typical for a focused MVP — week one design, weeks two and three build, week four TestFlight and store submission. Apple review usually runs 24-48 hours." },
  { q: "Push notifications and deep links?", a: "Yes. We set up FCM / APNs, deep links and the basic retention messages (welcome, day-3 re-engagement, etc.) as part of every build." },
  { q: "What about in-app purchases?", a: "RevenueCat handles the IAP receipt verification and entitlements. Stripe handles web subscriptions. We will configure both with a 'paywall' screen that meets store guidelines." },
  { q: "Will the app feel native?", a: "Yes. We use native navigation (React Navigation native stack), native gestures and platform-specific patterns. No webview wrappers." },
];

export default function MobileAppsPageContent() {
  return (
    <>
      <PageHero
        eyebrow="Service · Mobile Apps"
        headline={<>An app on <em>both stores.</em> In one sprint.</>}
        lead="iOS and Android MVPs — onboarding, accounts, payments and the core workflow — shipped to TestFlight and Play Store in four weeks."
        art={
          <div style={{ display: "flex", gap: 24, alignItems: "center" }}>
            <Obelisk
              width={80}
              height={260}
              color="rgba(244,240,228,.85)"
              accent="#E6D6A8"
              className="ra-float-slow"
            />
            <Obelisk
              width={100}
              height={320}
              color="rgba(244,240,228,.92)"
              accent="#E6D6A8"
            />
            <Obelisk
              width={80}
              height={260}
              color="rgba(244,240,228,.85)"
              accent="#E6D6A8"
              className="ra-float"
            />
          </div>
        }
        ctaSecondary={{ label: "Compare packages", href: "/pricing" }}
      />

      <TrustedBy />

      <section className="section" id="includes">
        <div className="shell">
          <SectionHead
            eyebrow="What's included"
            title={<>A mobile MVP, <em>shipped</em> to both stores.</>}
            blurb="One sprint to the App Store and Play Store — with the onboarding, payments and analytics already wired in."
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
            title={<>One codebase. <em>Two</em> stores.</>}
            blurb="React Native + Expo means a single codebase, both apps, and OTA updates without waiting on a store review."
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
            title={<>From sketch <em>to App Store</em> in four weeks.</>}
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
        title={<>Have an app idea? <em>Let&apos;s ship it</em>.</>}
        lead="Tell us about the mobile experience you want to launch. We'll come back with a focused four-week scope and a fixed price."
      />
    </>
  );
}
