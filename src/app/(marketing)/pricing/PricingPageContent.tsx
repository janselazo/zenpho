import Link from "next/link";
import type { ReactNode } from "react";
import PageHero from "@/components/marketing/sections/PageHero";
import SectionHead from "@/components/marketing/sections/SectionHead";
import TrustedBy from "@/components/marketing/sections/TrustedBy";
import FAQList from "@/components/marketing/sections/FAQList";
import CTABanner from "@/components/marketing/sections/CTABanner";
import { Reveal } from "@/components/marketing/renaissance/Reveal";
import {
  ArchColonnade,
  Astrolabe,
  Cartouche,
  HeraldTrumpet,
  Obelisk,
} from "@/components/marketing/renaissance/RenaissanceArt";

type Tier = {
  name: string;
  eyebrow: string;
  price: string;
  unit: string;
  tag?: string;
  featured?: boolean;
  art: ReactNode;
  features: string[];
  cta: string;
};

const TIERS: Tier[] = [
  {
    name: "Websites",
    eyebrow: "Marketing & ecommerce",
    price: "$1,000",
    unit: "starting",
    art: <ArchColonnade width={120} height={80} accent="#C19D5A" />,
    features: [
      "Up to 5 pages, bespoke design",
      "Headless CMS (Sanity / Payload)",
      "Animations + on-brand interactions",
      "Analytics + SEO baseline",
      "Hosting setup",
      "30-day post-launch support",
    ],
    cta: "Start the website",
  },
  {
    name: "Web Apps",
    eyebrow: "SaaS / MVP",
    price: "$2,000",
    unit: "starting",
    tag: "Most chosen",
    featured: true,
    art: <Astrolabe width={100} height={100} accent="#F4E4B4" />,
    features: [
      "Auth, accounts, payments (Stripe)",
      "Dashboards, admin panel & editor",
      "Up to 4 integrations (CRM, email…)",
      "Onboarding + retention setup",
      "Database + hosting configured",
      "60-day post-launch support",
    ],
    cta: "Begin the build",
  },
  {
    name: "Mobile Apps",
    eyebrow: "iOS + Android",
    price: "$3,000",
    unit: "starting",
    art: <Obelisk width={50} height={120} accent="#C19D5A" />,
    features: [
      "iOS + Android (React Native)",
      "Onboarding, auth, payments (RevenueCat)",
      "Push notifications + deep links",
      "TestFlight + Play Store submission",
      "App store assets + screenshots",
      "60-day post-launch support",
    ],
    cta: "Commission the app",
  },
  {
    name: "Creatives Generation",
    eyebrow: "Ad creatives",
    price: "$100",
    unit: "starting",
    art: <HeraldTrumpet width={120} height={120} accent="#C19D5A" />,
    features: [
      "Any discipline — UGC, motion, AI, founder",
      "Script · storyboard · production",
      "Delivered in 9:16, 1:1 and 4:5",
      "Captions in EN, ES or PT",
      "Royalty-free music & sound design",
      "Media-buyer brief included",
    ],
    cta: "Commission a video",
  },
];

const PRICING_FAQ = [
  {
    q: "Are these prices final?",
    a: "Prices listed are our starting points. The final number depends on scope — number of pages, screens, integrations, custom features. Once we have a brief, we quote a fixed price in writing.",
  },
  {
    q: "Do you offer payment plans?",
    a: "Yes. Standard terms are 50% to start and 50% at launch for project work, or monthly billing for retainers. Enterprise terms (net-30, milestones, POs) on request.",
  },
  {
    q: "What is NOT included?",
    a: "Third-party services (hosting, Stripe fees, RevenueCat, OpenAI usage, etc.) are paid directly by you. The accounts live in your name. We will help you set them up at no extra cost.",
  },
  {
    q: "Can I combine packages?",
    a: "Yes — common combos are Website + Creatives (launch site + first video pack) or Web App + Mobile App (cross-platform MVP). We will quote a discounted bundle on the call.",
  },
  {
    q: "Refunds?",
    a: "If we have not started production yet, full refund — no questions. Once production has started, refund is pro-rated against work delivered.",
  },
  {
    q: "How do I get started?",
    a: "Book a free thirty-minute build call. We will scope, give you a fixed quote in writing within 48 hours, and start the next Monday if it is a fit.",
  },
];

export default function PricingPageContent() {
  return (
    <>
      <PageHero
        eyebrow="Pricing · MMXXVI"
        headline={
          <>
            Launch packages, <em>fixed</em> price.
          </>
        }
        lead="Fixed scope, fixed price, fixed timeline. No studio layers. No 30-page proposals. Pick a package, sign, ship."
        art={
          <Cartouche
            width={420}
            height={300}
            color="rgba(244,240,228,.92)"
            accent="#E6D6A8"
          >
            <div className="pricing-hero-cartouche-copy">
              From
              <br />
              $1,000
              <span>per project</span>
            </div>
          </Cartouche>
        }
        ctaSecondary={{ label: "Book a free build call", href: "/contact" }}
      />
      <TrustedBy />

      <section className="section" id="tiers">
        <div className="shell">
          <SectionHead
            eyebrow="Launch packages"
            title={
              <>
                Fixed scope. <em>Fixed</em> price. No surprises.
              </>
            }
            blurb="Every package below ships in a single sprint. Custom or enterprise scope on request — we'll quote a fixed price after a free thirty-minute build call."
          />

          <Reveal className="pricing-page-grid" stagger>
            {TIERS.map((t, i) => (
              <div
                className={`price-card price-page-card ${t.featured ? "featured" : ""}`}
                key={i}
              >
                {t.tag ? <div className="price-tag">{t.tag}</div> : null}
                <div className="price-page-art">{t.art}</div>
                <div className="price-eyebrow">{t.eyebrow}</div>
                <h3>{t.name}</h3>
                <div className="price-amount-row">
                  <span className="price-amount-fig">{t.price}</span>
                  <span className="price-amount-unit">{t.unit}</span>
                </div>
                <ul className="price-features">
                  {t.features.map((f, j) => (
                    <li className="price-feature" key={j}>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/contact"
                  className="btn-primary"
                  style={{ width: "100%", justifyContent: "center" }}
                >
                  {t.cta} <span className="btn-arrow">↗</span>
                </Link>
              </div>
            ))}
          </Reveal>
          <div className="price-note">
            All packages include hand-off documentation · custom commissions on
            request.
          </div>
        </div>
      </section>

      <FAQList items={PRICING_FAQ} eyebrow="Pricing FAQ" />
      <CTABanner
        title={
          <>
            Not sure which package <em>fits?</em>
          </>
        }
        lead="Book a free thirty-minute call. We'll listen, suggest the right scope, and quote a fixed price in writing within 48 hours."
      />
    </>
  );
}
