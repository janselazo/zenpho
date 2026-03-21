import type { Metadata } from "next";
import AboutHero from "./AboutHero";
import SectionHeading from "@/components/ui/SectionHeading";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

export const metadata: Metadata = {
  title: "About",
  description:
    "Janse Lazo — software engineer with an MBA, nine years building custom products. Miami, FL.",
};

const highlights = [
  "10x10K Cuba — Mikma",
  "Startup Weekend Havana — Sírvete",
  "TapTok — scaled from 0 to 15,000 customers, with teams at Authentic Brands Group, Coral Gables, AT&T, Harvard University, NASA, RP Realty, and more",
  "TapTok — press: Miami Herald, Refresh Miami, El Nuevo Herald, New York Wire",
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
          title="From strong foundations to"
          titleAccent="shipping software"
          description="My path is shaped by engineering at CUJAE, an MBA, and building software businesses in the U.S. — with real experience in product growth and products that scale so teams can run them after launch."
        />
        <Card className="border-border/80 bg-white p-8 shadow-soft sm:p-10">
          <p className="text-base leading-relaxed text-text-secondary">
            I care about the full stack of building: not only code, but how
            software reaches users, earns trust, and grows through clear
            positioning and real distribution. That lens shows up in how I scope
            features, ship web and mobile apps, and partner with founders and
            operators who need outcomes — not experiments stuck in slides.
          </p>
          <p className="mt-6 text-base leading-relaxed text-text-secondary">
            One chapter that cemented that for me was{" "}
            <span className="font-medium text-text-primary">TapTok</span>: we
            grew it from{" "}
            <span className="font-medium text-text-primary">0 to 15,000</span>{" "}
            customers, landing and supporting use cases across{" "}
            <span className="font-medium text-text-primary">
              Authentic Brands Group
            </span>
            ,{" "}
            <span className="font-medium text-text-primary">Coral Gables</span>
            ,{" "}
            <span className="font-medium text-text-primary">AT&amp;T</span>,{" "}
            <span className="font-medium text-text-primary">
              Harvard University
            </span>
            ,{" "}
            <span className="font-medium text-text-primary">NASA</span>, and{" "}
            <span className="font-medium text-text-primary">RP Realty</span>
            — alongside thousands of SMBs. That mix of household names, public
            institutions, and high-volume SMB taught me how to tighten
            onboarding, keep product and growth aligned, and ship when the story
            and the software both have to hold up in the room.
          </p>
        </Card>
      </section>

      <section className="mx-auto max-w-3xl px-6 pb-20 lg:px-8">
        <SectionHeading
          align="left"
          label="Today"
          title="Client work &"
          titleAccent="SoldTools"
          description="I build custom software for startups and growing teams, and ship my own product on the side — a toolkit for car sales professionals."
        />
        <Card className="border-border/80 bg-white p-8 shadow-soft sm:p-10">
          <p className="text-base leading-relaxed text-text-secondary">
            Most of my time goes to client engagements — SaaS platforms,
            ecommerce stores, dashboards, and internal tools for teams that need
            focused execution. I work across the full stack: scoping, design,
            implementation, and handoff.
          </p>
          <p className="mt-6 text-base leading-relaxed text-text-secondary">
            Alongside client work, I build and run{" "}
            <span className="font-medium text-text-primary">SoldTools</span> — a
            live product for car sales teams that handles lead capture,
            scheduling, deal intelligence, and referrals. Building my own product
            keeps me honest about what it takes to ship and maintain software
            long-term.
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
          description="MBA plus marketing and growth-platform certifications I maintain alongside hands-on engineering — useful when products need to connect to campaigns, funnels, and analytics."
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
