"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import Button from "@/components/ui/Button";

const BOOKING_HREF = "/booking";

type ServiceGroup = { title: string; items: string[] };

type ServiceConfig = {
  id: string;
  tag: string;
  title: string;
  subtitle: string;
  description: string[];
  /** Omitted for single-grid services (e.g. growth). */
  whatWeOffer?: ServiceGroup[];
  included: ServiceGroup[];
  bestFor: string[];
  primaryHref: string;
  primaryLabel: string;
  learnHref: string;
  learnLabel: string;
};

const MVP_DEVELOPMENT_SERVICE: ServiceConfig = {
  id: "mvp-development",
  tag: "Service 1",
  title: "MVP Development",
  subtitle:
    "Ship a focused software MVP in ~2 weeks—strategy through handoff.",
  description: [
    "We bundle discovery, UX, engineering, integrations, landing, analytics, QA, deployment, and documentation into disciplined sprint cycles—you leave with a working product stakeholders can demo, not a slide deck.",
    "Scope stays tight around one prioritized user workflow first: faster validation, clearer next steps after launch.",
  ],
  whatWeOffer: [
    {
      title: "Products & surfaces",
      items: [
        "AI & SaaS products",
        "Web MVPs & PWAs",
        "Mobile-first experiences",
        "Internal tools",
        "Client portals & marketplaces",
      ],
    },
    {
      title: "Intelligence & ops",
      items: [
        "AI assistants",
        "Workflow automation",
        "Admin dashboards",
        "API integrations",
      ],
    },
    {
      title: "Go-to-market",
      items: ["Launch & onboarding flows", "Analytics-ready builds"],
    },
  ],
  included: [
    {
      title: "Discover & scope",
      items: [
        "Discovery workshop",
        "MVP scope & prioritization",
        "Core journey mapping",
      ],
    },
    {
      title: "Design & build",
      items: [
        "UX/UI for core workflows",
        "Web or mobile-first development",
        "AI/API integrations",
        "Authentication",
        "Database setup",
        "Admin dashboard",
      ],
    },
    {
      title: "Launch & handoff",
      items: [
        "Launch landing page",
        "Product analytics",
        "QA & deployment",
        "Documentation",
      ],
    },
  ],
  bestFor: [
    "Validated ideas that need disciplined execution—not endless research",
    "Non-technical founders who want transparency and predictable demos",
    "SaaS, AI-first, or internal tooling teams prepping for pilots",
    "Operators productizing workflows or consultants packaging expertise",
  ],
  primaryHref: BOOKING_HREF,
  primaryLabel: "Book a Call",
  learnHref: "/services/mvp-development",
  learnLabel: "More about MVP Development",
};

const MVP_GROWTH_SERVICE: ServiceConfig = {
  id: "mvp-growth",
  tag: "Service 2",
  title: "MVP Growth",
  subtitle:
    "Position, ship, measure, and iterate after your product goes live.",
  description: [
    "Shipping the MVP clears the runway; growth work gets it into the hands of the right buyers and testers.",
    "We wire together positioning, acquisition plays, experimentation, and lightweight analytics so founders learn quickly from signals—not guesses.",
  ],
  included: [
    {
      title: "Positioning & funnel",
      items: [
        "ICP & messaging alignment",
        "Landing narrative, copy & build",
        "Waitlists & demo booking flows",
        "Analytics instrumentation & lightweight feedback loops",
      ],
    },
    {
      title: "Acquisition & launches",
      items: [
        "Cold outbound & DM playbook",
        "Founder LinkedIn cadence kits",
        "Product Hunt / community launch support",
        "Beta acquisition roadmap",
      ],
    },
    {
      title: "Learn & iterate",
      items: [
        "Growth experiment backlog",
        "Conversion & funnel recommendations",
      ],
    },
  ],
  bestFor: [
    "Teams with a shipped MVP staring at blank acquisition metrics",
    "Founders prepping Product Hunt, waitlists, or first paid funnel",
    "Products where positioning and landing don’t reflect the roadmap",
    "Operators who need repeatable beta feedback loops—not one-off bursts",
  ],
  primaryHref: BOOKING_HREF,
  primaryLabel: "Book a Call",
  learnHref: "/services/mvp-growth",
  learnLabel: "More about MVP Growth",
};

function ServiceGroupCards({
  groups,
  sectionLabel,
}: {
  groups: ServiceGroup[];
  sectionLabel: string;
}) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wider text-muted">
        {sectionLabel}
      </p>
      <div className="mt-3 grid grid-cols-1 gap-3">
        {groups.map((group) => (
          <article
            key={group.title}
            className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm"
          >
            <h4 className="text-sm font-semibold text-text-primary">
              {group.title}
            </h4>
            <ul className="mt-3 space-y-2 text-sm text-text-secondary">
              {group.items.map((item) => (
                <li key={item} className="flex gap-2">
                  <span
                    aria-hidden="true"
                    className="mt-1 inline-block size-2 shrink-0 rounded-full bg-accent/90"
                  />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </div>
  );
}

function BestForBlock({ items }: { items: string[] }) {
  const mid = Math.ceil(items.length / 2);
  return (
    <div className="rounded-2xl border border-dashed border-border/70 bg-accent/10 p-5">
      <p className="text-xs font-bold uppercase tracking-wider text-text-primary">
        Best for
      </p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <ul className="space-y-3 text-sm text-text-secondary">
          {items.slice(0, mid).map((bullet) => (
            <li key={bullet} className="flex gap-3">
              <Check
                aria-hidden
                className="mt-0.5 size-4 shrink-0 text-accent"
                strokeWidth={2.25}
              />
              <span>{bullet}</span>
            </li>
          ))}
        </ul>
        <ul className="space-y-3 text-sm text-text-secondary">
          {items.slice(mid).map((bullet) => (
            <li key={bullet} className="flex gap-3">
              <Check
                aria-hidden
                className="mt-0.5 size-4 shrink-0 text-accent"
                strokeWidth={2.25}
              />
              <span>{bullet}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function ServiceHero({
  tag,
  title,
  subtitle,
  description,
}: {
  tag: string;
  title: string;
  subtitle: string;
  description: string[];
}) {
  return (
    <>
      <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-muted">
        {tag}
      </p>
      <h3 className="mb-3 text-3xl font-bold leading-none tracking-wide text-text-primary sm:text-4xl lg:text-[40px]">
        {title}
      </h3>
      <h4 className="mb-5 text-lg font-semibold tracking-tight text-accent sm:text-xl">
        {subtitle}
      </h4>

      <div className="rounded-2xl bg-card px-8 py-7 shadow-soft sm:px-9">
        {description.map((paragraph) => (
          <div key={paragraph} className="mb-5 last:mb-0">
            <p className="text-base font-medium leading-relaxed tracking-normal text-text-secondary sm:text-[17px] sm:leading-relaxed">
              {paragraph}
            </p>
          </div>
        ))}
      </div>
    </>
  );
}

export default function ServicesPreview() {
  return (
    <>
      <motion.div
        initial={{ opacity: 1, scale: 0.98 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="mx-auto max-w-6xl px-6 py-8 sm:px-8 md:py-12"
      >
        <section
          id={MVP_DEVELOPMENT_SERVICE.id}
          className="mb-14 scroll-mt-24 md:mb-16"
        >
          <div className="mx-auto max-w-3xl text-center lg:max-w-none lg:text-left">
            <ServiceHero
              tag={MVP_DEVELOPMENT_SERVICE.tag}
              title={MVP_DEVELOPMENT_SERVICE.title}
              subtitle={MVP_DEVELOPMENT_SERVICE.subtitle}
              description={MVP_DEVELOPMENT_SERVICE.description}
            />
          </div>

          <div className="mx-auto mt-8 max-w-6xl space-y-8">
            {MVP_DEVELOPMENT_SERVICE.whatWeOffer && (
              <ServiceGroupCards
                groups={MVP_DEVELOPMENT_SERVICE.whatWeOffer}
                sectionLabel="What we can build"
              />
            )}
            <ServiceGroupCards
              groups={MVP_DEVELOPMENT_SERVICE.included}
              sectionLabel="What’s included"
            />
            <BestForBlock items={MVP_DEVELOPMENT_SERVICE.bestFor} />
          </div>

          <div className="mx-auto mt-8 flex max-w-3xl flex-col items-center gap-3 text-center lg:max-w-none lg:items-start lg:text-left">
            <Button
              href={MVP_DEVELOPMENT_SERVICE.primaryHref}
              variant="primary"
              size="lg"
            >
              {MVP_DEVELOPMENT_SERVICE.primaryLabel}
            </Button>
            <Link
              href={MVP_DEVELOPMENT_SERVICE.learnHref}
              className="inline-flex items-center gap-1 text-sm font-semibold text-accent transition hover:text-accent-hover"
            >
              {MVP_DEVELOPMENT_SERVICE.learnLabel}
              <span aria-hidden>→</span>
            </Link>
          </div>
        </section>

        <section
          id={MVP_GROWTH_SERVICE.id}
          className="scroll-mt-24 border-t border-border/60 pb-10 pt-10 md:pt-14"
        >
          <div className="mx-auto max-w-3xl text-center lg:max-w-none lg:text-left">
            <ServiceHero
              tag={MVP_GROWTH_SERVICE.tag}
              title={MVP_GROWTH_SERVICE.title}
              subtitle={MVP_GROWTH_SERVICE.subtitle}
              description={MVP_GROWTH_SERVICE.description}
            />
          </div>

          <div className="mx-auto mt-8 max-w-6xl space-y-8">
            <ServiceGroupCards
              groups={MVP_GROWTH_SERVICE.included}
              sectionLabel="What’s included"
            />
            <BestForBlock items={MVP_GROWTH_SERVICE.bestFor} />
          </div>

          <div className="mx-auto mt-8 flex max-w-3xl flex-col items-center gap-3 text-center lg:max-w-none lg:items-start lg:text-left">
            <Button
              href={MVP_GROWTH_SERVICE.primaryHref}
              variant="primary"
              size="lg"
            >
              {MVP_GROWTH_SERVICE.primaryLabel}
            </Button>
            <Link
              href={MVP_GROWTH_SERVICE.learnHref}
              className="inline-flex items-center gap-1 text-sm font-semibold text-accent transition hover:text-accent-hover"
            >
              {MVP_GROWTH_SERVICE.learnLabel}
              <span aria-hidden>→</span>
            </Link>
          </div>
        </section>
      </motion.div>
    </>
  );
}
