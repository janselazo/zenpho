import type { Metadata } from "next";
import AboutHero from "./AboutHero";
import AboutOurStory from "./AboutOurStory";
import AboutWhatWeBelieve from "./AboutWhatWeBelieve";
import AboutWhoWeHelp from "./AboutWhoWeHelp";
import AboutWhatWeDo from "./AboutWhatWeDo";
import AboutCTASection from "./AboutCTASection";
import SectionHeading from "@/components/ui/SectionHeading";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

export const metadata: Metadata = {
  title: {
    absolute: "About Zenpho · MVP product studio",
  },
  description:
    "Who we are, how we work, and how Zenpho helps founders and businesses turn ideas into launch-ready digital products.",
};

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
          description="Founder and principal of Zenpho—software engineer with an MBA. Background shipping products from zero to thousands of customers and building systems that hold up in the real world."
        />
        <Card className="border-border/80 bg-white p-8 shadow-soft sm:p-10">
          <p className="text-base leading-relaxed text-text-secondary">
            I started Zenpho because most local operators do not need another vague marketing report—they need a{" "}
            <span className="font-medium text-text-primary">clear picture of opportunities, leaks, and ROI</span>.
            When calls, forms, and referrals are not tied to follow-up and reporting, money gets left on the table.
          </p>
          <p className="mt-6 text-base leading-relaxed text-text-secondary">
            My work ties{" "}
            <span className="font-medium text-text-primary">engineering to go-to-market discipline</span>
            : instrumentation, onboarding, campaigns, and iteration. What we ship for clients is held to the same standard
            as what we run in production ourselves.
          </p>
        </Card>
      </section>

      <section className="mx-auto max-w-3xl px-6 pb-20 lg:px-8">
        <SectionHeading
          align="left"
          label="Journey"
          title="From software craft to"
          titleAccent="shipping products"
          description="Years of building and releasing software reinforced a simple rhythm: clarify the problem, design the smallest coherent experience, build with observable quality, ship, learn, and tighten the loop."
        />
        <Card className="border-border/80 bg-white p-8 shadow-soft sm:p-10">
          <p className="text-base leading-relaxed text-text-secondary">
            We bring full-stack discipline to MVPs—{" "}
            <span className="font-medium text-text-primary">
              pragmatic UX, implementation you can operate, instrumentation you can trust, and a launch plan your team will
              actually follow
            </span>
            —whether that is a marketing site, a customer-facing website with accounts and dashboards, a mobile companion, or internal tooling that needs
            to ship.
          </p>
          <p className="mt-6 text-base leading-relaxed text-text-secondary">
            A chapter that shaped that discipline was{" "}
            <span className="font-medium text-text-primary">Taptok</span>: growing from{" "}
            <span className="font-medium text-text-primary">0 to 15,000</span> customers with teams at{" "}
            <span className="font-medium text-text-primary">Authentic Brands Group</span>,{" "}
            <span className="font-medium text-text-primary">Coral Gables City</span>, and thousands of SMBs. Living
            inside support, product, and growth as one system is what we carry into every Zenpho engagement.
          </p>
        </Card>
      </section>

      <section className="mx-auto max-w-3xl px-6 pb-28 lg:px-8">
        <SectionHeading
          align="left"
          label="Zenpho"
          title="Product studio roots,"
          titleAccent="builder mindset"
          titleAccentInline
          description="We are an MVP development agency—Design, Build, and Launch engagements plus focused tools like Revenue Leak Audits when they help—backed by engineers who still ship production software."
        />
        <Card className="border-border/80 bg-white p-8 shadow-soft sm:p-10">
          <p className="text-base leading-relaxed text-text-secondary">
            Most of our calendar is{" "}
            <span className="font-medium text-text-primary">client product work</span>: discovery, UX and UI direction,
            implementation sprints, integrations, go-live support, and iteration plans for founders who need speed without
            sacrificing maintainability. We stay product-led—clear scope, milestone demos, and outcomes you can measure.
          </p>
          <p className="mt-6 text-base leading-relaxed text-text-secondary">
            We also operate{" "}
            <span className="font-medium text-text-primary">SoldTools</span>, a live SaaS for car sales teams—leads,
            scheduling, deal context, and referrals. Owning production software keeps us honest about maintenance,
            support, and what happens after launch—the same bar we hold for client engagements.
          </p>
          <div className="mt-8">
            <Button href="/contact" variant="primary" size="md">
              Work together
            </Button>
          </div>
        </Card>
      </section>

      <AboutCTASection />
    </>
  );
}
