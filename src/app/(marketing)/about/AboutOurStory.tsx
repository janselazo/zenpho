import SectionHeading from "@/components/ui/SectionHeading";
import Card from "@/components/ui/Card";

export default function AboutOurStory() {
  return (
    <section className="mx-auto max-w-3xl px-6 pb-20 lg:px-8">
      <SectionHeading
        align="left"
        label="Our story"
        title="Zenpho was built for teams"
        titleAccent="shipping under pressure"
      />
      <Card className="border-border/80 bg-white p-8 shadow-soft sm:p-10">
        <p className="text-base leading-relaxed text-text-secondary">
          Most product ideas fail slowly—scope creeps, UX stays fuzzy, engineering restarts, or launch day arrives without
          a plan to learn from users. We founded Zenpho to compress that risk: move from concept to something shippable with
          disciplined scope, visible progress, and tooling you can operate.
        </p>
        <p className="mt-6 text-base leading-relaxed text-text-secondary">
          Our work sits at the intersection of studio craft and operator reality: a{" "}
          <span className="font-medium text-text-primary">Design → Build → Launch</span> cadence you can read—what is
          scoped, what shipped this week, what is waiting on feedback, and what should wait for v2.
        </p>
        <p className="mt-6 font-medium text-text-primary">Speed without clarity is just expensive motion.</p>
        <p className="mt-6 text-base leading-relaxed text-text-secondary">
          We apply the same loops we use shipping our own SaaS: prioritize the riskiest assumptions, instrument the
          product, demo on staging often, and tighten after real traffic—not slide decks.
        </p>
        <p className="mt-6 text-base leading-relaxed text-text-secondary">
          Alongside custom builds, we keep tools like Revenue Leak Audits for teams that need fast marketing clarity
          before or after a launch.
        </p>
      </Card>
    </section>
  );
}
