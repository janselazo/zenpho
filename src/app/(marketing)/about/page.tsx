import type { Metadata } from "next";
import AboutHero from "./AboutHero";
import SectionHeading from "@/components/ui/SectionHeading";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

export const metadata: Metadata = {
  title: "About",
  description:
    "Janse Lazo leads AI Product Studio: Agency builds for web, mobile, websites & ecommerce; Studio ships in-house products. Growth-minded delivery — first version in 2 weeks. Miami, FL.",
};

const highlights = [
  "10x10K Cuba — Mikma",
  "Startup Weekend Havana — Sírvete",
  "Taptok — scaled from 0 to 15,000 customers, with teams at Authentic Brands Group, Coral Gables City, AT&T, Harvard University, RP Realty, and more",
  "Taptok — press: Miami Herald, Refresh Miami, El Nuevo Herald, New York Wire",
] as const;

const credentials = [
  "MBA",
  "HubSpot certifications",
  "Google Ads certifications",
  "Semrush certifications",
] as const;

export default function AboutPage() {
  return (
    <>
      <AboutHero />

      <section className="mx-auto max-w-3xl px-6 pb-20 lg:px-8">
        <SectionHeading
          align="left"
          label="Story"
          title="From engineering roots to"
          titleAccent="products that scale"
          description="I'm a software engineer with an MBA and real product growth experience — years building in the U.S. showed me that great software is never only code. It's how people discover it, trust it, and come back. That thread runs from my own ventures to how we work with clients today."
        />
        <Card className="border-border/80 bg-white p-8 shadow-soft sm:p-10">
          <p className="text-base leading-relaxed text-text-secondary">
            I started AI Product Studio because too many teams get pretty mockups
            and slow cycles instead of momentum. We take the same stance as on
            the homepage:{" "}
            <span className="font-medium text-text-primary">
              most agencies build what you ask for; we build what you need to
              win
            </span>
            — web apps, mobile apps, websites, and ecommerce, with growth and
            retention in the room from day one. You should see a{" "}
            <span className="font-medium text-text-primary">
              first working version in two weeks
            </span>
            , then steady weekly progress — not a big reveal months later.
          </p>
          <p className="mt-6 text-base leading-relaxed text-text-secondary">
            A chapter that proved that for me was{" "}
            <span className="font-medium text-text-primary">Taptok</span>: we
            grew it from{" "}
            <span className="font-medium text-text-primary">0 to 15,000</span>{" "}
            customers —{" "}
            <span className="font-medium text-text-primary">
              Authentic Brands Group
            </span>
            ,{" "}
            <span className="font-medium text-text-primary">
              Coral Gables City
            </span>
            , and thousands of SMBs. Living inside that curve — onboarding,
            support, product, and growth as one system — is what we bring when we
            partner with founders and operators who need software that holds up in
            the real world, not just in a deck.
          </p>
        </Card>
      </section>

      <section className="mx-auto max-w-3xl px-6 pb-20 lg:px-8">
        <SectionHeading
          align="left"
          label="Today"
          title="Agency &"
          titleAccent="Studio"
          titleAccentInline
          description="Client work through the Agency — our own roadmap through the Studio. Same standards for both: ship fast, measure, iterate."
        />
        <Card className="border-border/80 bg-white p-8 shadow-soft sm:p-10">
          <p className="text-base leading-relaxed text-text-secondary">
            Most of our calendar is{" "}
            <span className="font-medium text-text-primary">Agency</span> work:
            SaaS, ecommerce, marketing sites, dashboards, and internal tools for
            teams that need focused execution. We own the full path — scope,
            design, build, and handoff — so you can run what we ship without
            friction.
          </p>
          <p className="mt-6 text-base leading-relaxed text-text-secondary">
            <span className="font-medium text-text-primary">Studio</span> is
            where we build and run{" "}
            <span className="font-medium text-text-primary">SoldTools</span> — a
            live product for car sales teams (leads, scheduling, deal context,
            referrals). Keeping something in production under our own name keeps
            us honest about maintenance, support, and the long tail after launch —
            the same bar we hold for your product.
          </p>
          <div className="mt-8">
            <Button href="/contact" variant="primary" size="md">
              Work together
            </Button>
          </div>
        </Card>
      </section>

      <section className="mx-auto max-w-3xl px-6 pb-20 lg:px-8">
        <SectionHeading
          align="left"
          label="Highlights"
          title="Selected"
          titleAccent="milestones"
          titleAccentInline
          description="A few public touchpoints from entrepreneurship, community, and media."
        />
        <ul className="space-y-4">
          {highlights.map((item) => (
            <li key={item}>
              <Card className="border-border/80 bg-surface px-6 py-4 text-sm font-medium text-text-primary">
                {item}
              </Card>
            </li>
          ))}
        </ul>
      </section>

      <section className="mx-auto max-w-3xl px-6 pb-28 lg:px-8">
        <SectionHeading
          align="left"
          label="Credentials"
          title="Trust"
          titleAccent="& craft"
          titleAccentInline
          description="Software engineer with an MBA and real product growth experience, backed by marketing-platform certifications — so engineering and go-to-market choices serve your product goals, not the tool-of-the-week."
        />
        <div className="flex flex-wrap gap-3">
          {credentials.map((c) => (
            <span
              key={c}
              className="rounded-full border border-border bg-white px-4 py-2 text-xs font-semibold uppercase tracking-wider text-text-secondary"
            >
              {c}
            </span>
          ))}
        </div>
      </section>
    </>
  );
}
