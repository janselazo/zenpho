import type { Metadata } from "next";
import AboutHero from "./AboutHero";
import SectionHeading from "@/components/ui/SectionHeading";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

export const metadata: Metadata = {
  title: "About",
  description:
    "Janse Lazo — software engineer with an MBA, product growth experience, Zenpho and custom AI software. Miami, FL.",
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
          titleAccent="product-led growth"
          description="My path is shaped by engineering at CUJAE, an MBA, and building software businesses in the U.S.—with strong experience in product growth, GTM, and products that scale so teams can run them after launch."
        />
        <Card className="border-border/80 bg-white p-8 shadow-soft sm:p-10">
          <p className="text-base leading-relaxed text-text-secondary">
            I care about the full stack of building: not only code and models,
            but how software reaches users, earns trust, and compounds through
            distribution and clear positioning. That lens shows up in how I
            scope AI features, ship web and mobile apps, and partner with
            founders and operators who need outcomes—not experiments stuck in
            slides.
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
            —alongside thousands of SMBs. That mix of household names, public
            institutions, and high-volume SMB taught me how to tighten
            onboarding, keep product and GTM aligned, and ship when the story
            and the software both have to hold up in the room.
          </p>
        </Card>
      </section>

      <section className="mx-auto max-w-3xl px-6 pb-20 lg:px-8">
        <SectionHeading
          align="left"
          label="Today"
          title="Zenpho & client"
          titleAccent="work"
          description="Through Zenpho and direct engagements, I combine high-visibility music and entertainment promotion with custom AI software and agents—guardrails, integrations, and interfaces teams actually use."
        />
        <Card className="border-border/80 bg-white p-8 shadow-soft sm:p-10">
          <p className="text-base leading-relaxed text-text-secondary">
            With Zenpho, I&apos;ve worked with recognized artists including{" "}
            <span className="font-medium text-text-primary">Marc Anthony</span>
            ,{" "}
            <span className="font-medium text-text-primary">Fonseca</span>,{" "}
            <span className="font-medium text-text-primary">Gente de Zona</span>
            , <span className="font-medium text-text-primary">Guaco</span>, and{" "}
            <span className="font-medium text-text-primary">Los Van Van</span>
            —promoting their music launches, concert tours and live shows
            (giras), and video campaigns.
          </p>
          <p className="mt-6 text-base leading-relaxed text-text-secondary">
            Whether it is LLM-powered apps, automation, or mobile and web
            surfaces tied to your data, the goal is the same: ship something
            measurable, maintainable, and aligned with how your business
            already works.
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
          description="A few public touchpoints from entrepreneurship, community, and media—titles as listed on my public profile."
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
          description="MBA plus marketing and growth-platform certifications I maintain alongside hands-on engineering—useful when AI products need to connect to campaigns, funnels, and analytics."
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
