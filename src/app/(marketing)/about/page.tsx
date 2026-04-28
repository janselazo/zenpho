import type { Metadata } from "next";
import AboutHero from "./AboutHero";
import AboutOurStory from "./AboutOurStory";
import AboutWhatWeBelieve from "./AboutWhatWeBelieve";
import AboutWhoWeHelp from "./AboutWhoWeHelp";
import AboutWhatWeDo from "./AboutWhatWeDo";
import AboutFuture from "./AboutFuture";
import AboutCTASection from "./AboutCTASection";
import SectionHeading from "@/components/ui/SectionHeading";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

export const metadata: Metadata = {
  title: {
    absolute: "About Zenpho | AI MVP Development Studio",
  },
  description:
    "Learn about Zenpho, an AI MVP development studio helping startup founders build, launch, and grow technology products faster.",
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

      <AboutOurStory />

      <AboutWhatWeBelieve />

      <AboutWhoWeHelp />

      <AboutWhatWeDo />

      <section className="mx-auto max-w-3xl px-6 pb-20 lg:px-8">
        <SectionHeading
          align="left"
          label="Founder"
          title="Janse Lazo"
          description="Founder and principal of Zenpho. Software engineer with an MBA — shipped products from zero to thousands of customers and still builds alongside the team."
        />
        <Card className="border-border/80 bg-white p-8 shadow-soft sm:p-10">
          <p className="text-base leading-relaxed text-text-secondary">
            I started Zenpho because founders shouldn&apos;t lose months to vague
            roadmaps instead of traction. Expect a{" "}
            <span className="font-medium text-text-primary">
              demo-ready AI MVP in roughly two weeks
            </span>{" "}
            when scope stays ruthless — followed by weekly increments, not a
            single massive reveal months later.
          </p>
          <p className="mt-6 text-base leading-relaxed text-text-secondary">
            My background ties{" "}
            <span className="font-medium text-text-primary">
              engineering to go-to-market
            </span>
            : onboarding, instrumentation, launch, iteration. Founder-facing
            work runs through the Agency; our own roadmap runs through Studio —
            one standard for shipped software.
          </p>
        </Card>
      </section>

      <section className="mx-auto max-w-3xl px-6 pb-20 lg:px-8">
        <SectionHeading
          align="left"
          label="Journey"
          title="From engineering roots to"
          titleAccent="products that scale"
          description="Years building in the U.S. showed me that great software is never only code. It's how people discover it, trust it, and come back. That thread runs from my own ventures to how we work with clients today."
        />
        <Card className="border-border/80 bg-white p-8 shadow-soft sm:p-10">
          <p className="text-base leading-relaxed text-text-secondary">
            We take the same stance as on the homepage:{" "}
            <span className="font-medium text-text-primary">
              founders need AI-assisted MVPs, not generic brochures
            </span>
            — SaaS, PWAs, internal tools, product prototypes — with launch landers
            only when they onboard users, and MVP Growth staged once signals
            show up after release.
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
          label="Zenpho"
          title="Agency &"
          titleAccent="Studio"
          titleAccentInline
          description="Zenpho is how we brand the work: client delivery runs through the Agency; our own products run through the Studio. Same team, same standards — ship fast, measure, iterate."
        />
        <Card className="border-border/80 bg-white p-8 shadow-soft sm:p-10">
          <p className="text-base leading-relaxed text-text-secondary">
            <span className="font-medium text-text-primary">Zenpho Agency</span>{" "}
            is where most of our calendar lives: MVP Development and MVP Growth
            for founders — scope, design, ship, measure. No positioning as a
            generalist web design or local business shop; we stay product-led.
          </p>
          <p className="mt-6 text-base leading-relaxed text-text-secondary">
            <span className="font-medium text-text-primary">Zenpho Studio</span>{" "}
            is where we build and run{" "}
            <span className="font-medium text-text-primary">SoldTools</span> — a
            live SaaS for car sales teams (leads, scheduling, deal context,
            referrals). Owning production software keeps us accountable for
            maintenance, support, and the long tail after launch — the same bar
            we hold for what we ship for founders.
          </p>
          <div className="mt-8">
            <Button href="/contact" variant="primary" size="md">
              Work together
            </Button>
          </div>
        </Card>
      </section>

      <AboutFuture />

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
          description="Engineering plus growth execution — certifications across modern marketing stacks so MVP Development and MVP Growth tie back to behavior, not vendor hype."
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

      <AboutCTASection />
    </>
  );
}
