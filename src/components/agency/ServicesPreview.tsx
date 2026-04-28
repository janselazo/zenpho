"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import Card from "@/components/ui/Card";
import { serviceIconMap } from "@/components/services/service-icons";
import { serviceIconAccentClass } from "@/lib/marketing/service-accent";

const development = {
  subtitle: "Build your AI-powered MVP in 2 weeks.",
  paragraphs: [
    "Our MVP Development service helps founders turn ideas, prototypes, and product concepts into functional technology products.",
    "We combine product strategy, UX/UI design, AI-assisted development, web app development, mobile-first experiences, launch pages, analytics, and deployment into one focused sprint.",
    "This service is ideal if you need a working MVP for users, investors, partners, or market validation.",
  ],
  whatWeCanBuild: [
    "AI SaaS products",
    "Web app MVPs",
    "Mobile-first apps",
    "Progressive web apps",
    "Internal tools",
    "Client portals",
    "Marketplaces",
    "Workflow automation tools",
    "AI assistants",
    "Launch landing pages",
    "Admin dashboards",
  ],
  whatsIncluded: [
    "Product discovery",
    "MVP scope definition",
    "Core user journey",
    "Feature prioritization",
    "UX/UI design",
    "Web app or mobile-first development",
    "AI/API integrations",
    "Authentication",
    "Database setup",
    "Admin dashboard",
    "Launch landing page",
    "Product analytics",
    "QA testing",
    "Deployment",
    "Handover documentation",
  ],
  bestFor: [
    "Founders with a validated idea",
    "Non-technical founders",
    "AI startup founders",
    "SaaS founders",
    "Founders preparing for demo day",
    "Founders who need a working prototype",
    "Operators turning workflows into software",
    "Consultants productizing expertise",
  ],
} as const;

const growth = {
  subtitle: "Launch your MVP and get early users.",
  paragraphs: [
    "Building the MVP is only the first step. The next step is getting it in front of the right people.",
    "Our MVP Growth service helps founders position, launch, track, and improve their product after it goes live.",
    "We help you build the growth foundation needed to attract beta users, collect feedback, measure behavior, and improve the product based on real market signals.",
  ],
  whatsIncluded: [
    "ICP definition",
    "Positioning and messaging",
    "Landing page copy",
    "Landing page design/development",
    "Waitlist or demo booking flow",
    "Product analytics",
    "Feedback system",
    "Cold email/DM outreach strategy",
    "Founder LinkedIn launch content",
    "Product Hunt/community launch support",
    "Beta user acquisition plan",
    "Growth experiment roadmap",
    "Conversion optimization recommendations",
  ],
  bestFor: [
    "Founders launching an MVP",
    "MVPs with no users yet",
    "Startups preparing for Product Hunt",
    "Founders who need beta users",
    "Products with unclear messaging",
    "Startups that need waitlist signups or demo bookings",
    "Founders who need user feedback and growth experiments",
  ],
} as const;

export default function ServicesPreview() {
  return (
    <>
      {/* Service 1 — MVP Development */}
      <section
        id="mvp-development"
        className="mx-auto max-w-3xl px-6 pb-20 pt-12 lg:px-8 lg:pb-24 lg:pt-8"
      >
        <motion.div
          initial={{ opacity: 1, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.08 }}
          transition={{ duration: 0.45 }}
        >
          <div className={`mb-6 flex h-14 w-14 items-center justify-center rounded-full [&_svg]:h-8 [&_svg]:w-8 ${serviceIconAccentClass(0)}`}>
            {serviceIconMap.rocket}
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-text-secondary">
              Service 1
            </p>
            <h2 className="heading-display mt-2 text-3xl font-bold tracking-tight text-text-primary sm:text-4xl">
              MVP Development
            </h2>
            <p className="mt-3 text-lg font-semibold text-accent sm:text-xl">
              {development.subtitle}
            </p>
          </div>
          <Card className="mt-10 border-border/80 bg-white p-8 shadow-soft sm:p-10">
            {development.paragraphs.map((p, idx) => (
              <p
                key={`dev-${idx}`}
                className="mb-0 text-base leading-relaxed text-text-secondary [&+&]:mt-5"
              >
                {p}
              </p>
            ))}
          </Card>

          <div className="mt-12">
            <p className="text-xs font-bold uppercase tracking-widest text-text-primary">
              What We Can Build
            </p>
            <ul className="mt-4 grid gap-2 sm:grid-cols-2">
              {development.whatWeCanBuild.map((line) => (
                <li key={line} className="flex gap-3 text-sm text-text-secondary">
                  <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-accent" aria-hidden />
                  {line}
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-12">
            <p className="text-xs font-bold uppercase tracking-widest text-text-primary">
              What&apos;s Included
            </p>
            <ul className="mt-4 space-y-2">
              {development.whatsIncluded.map((line) => (
                <li key={line} className="flex gap-3 text-sm text-text-secondary">
                  <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-accent-violet" aria-hidden />
                  {line}
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-12">
            <p className="text-xs font-bold uppercase tracking-widest text-text-primary">
              Best For
            </p>
            <ul className="mt-4 space-y-2">
              {development.bestFor.map((line) => (
                <li key={line} className="flex gap-3 text-sm text-text-secondary">
                  <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-accent-warm" aria-hidden />
                  {line}
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-12">
            <Link
              href="/booking"
              className="inline-flex w-full items-center justify-center rounded-full bg-accent px-8 py-3.5 text-sm font-semibold text-white shadow-md shadow-accent/20 transition-colors hover:bg-accent-hover sm:w-auto"
            >
              Book an MVP Strategy Call
            </Link>
          </div>
          <p className="mt-4 text-center sm:text-left">
            <Link
              href="/services/mvp-development"
              className="text-sm font-medium text-accent underline-offset-4 hover:underline"
            >
              More about MVP Development →
            </Link>
          </p>
        </motion.div>
      </section>

      {/* Service 2 — MVP Growth */}
      <section
        id="mvp-growth"
        className="border-t border-border/60 bg-surface/45 py-20 lg:py-24"
      >
        <div className="mx-auto max-w-3xl px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 1, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.08 }}
            transition={{ duration: 0.45 }}
          >
            <div className={`mb-6 flex h-14 w-14 items-center justify-center rounded-full [&_svg]:h-8 [&_svg]:w-8 ${serviceIconAccentClass(1)}`}>
              {serviceIconMap.chart}
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-text-secondary">
                Service 2
              </p>
              <h2 className="heading-display mt-2 text-3xl font-bold tracking-tight text-text-primary sm:text-4xl">
                MVP Growth
              </h2>
              <p className="mt-3 text-lg font-semibold text-accent sm:text-xl">
                {growth.subtitle}
              </p>
            </div>

            <Card className="mt-10 border-border/80 bg-white p-8 shadow-soft sm:p-10">
              {growth.paragraphs.map((p, idx) => (
                <p
                  key={`growth-${idx}`}
                  className="text-base leading-relaxed text-text-secondary [&+&]:mt-5"
                >
                  {p}
                </p>
              ))}
            </Card>

            <div className="mt-12">
              <p className="text-xs font-bold uppercase tracking-widest text-text-primary">
                What&apos;s Included
              </p>
              <ul className="mt-4 space-y-2">
                {growth.whatsIncluded.map((line) => (
                  <li key={line} className="flex gap-3 text-sm text-text-secondary">
                    <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-accent" aria-hidden />
                    {line}
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-12">
              <p className="text-xs font-bold uppercase tracking-widest text-text-primary">
                Best For
              </p>
              <ul className="mt-4 space-y-2">
                {growth.bestFor.map((line) => (
                  <li key={line} className="flex gap-3 text-sm text-text-secondary">
                    <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-accent-violet" aria-hidden />
                    {line}
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-12">
              <Link
                href="/booking"
                className="inline-flex w-full items-center justify-center rounded-full border border-accent bg-white px-8 py-3.5 text-sm font-semibold text-accent shadow-sm transition-colors hover:bg-accent/5 sm:w-auto"
              >
                Plan My MVP Launch
              </Link>
            </div>
            <p className="mt-4 text-center sm:text-left">
              <Link
                href="/services/mvp-growth"
                className="text-sm font-medium text-accent underline-offset-4 hover:underline"
              >
                More about MVP Growth →
              </Link>
            </p>
          </motion.div>
        </div>
      </section>
    </>
  );
}
