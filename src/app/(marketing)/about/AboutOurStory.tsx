import SectionHeading from "@/components/ui/SectionHeading";
import Card from "@/components/ui/Card";

export default function AboutOurStory() {
  return (
    <section className="mx-auto max-w-3xl px-6 pb-20 lg:px-8">
      <SectionHeading
        align="left"
        label="Our story"
        title="Zenpho was built for founders"
        titleAccent="who move fast."
      />
      <Card className="border-border/80 bg-white p-8 shadow-soft sm:p-10">
        <p className="text-base leading-relaxed text-text-secondary">
          Zenpho was created with one clear belief: founders should not need to spend
          months and tens of thousands of dollars before they can test an idea
          with real users.
        </p>
        <p className="mt-6 text-base leading-relaxed text-text-secondary">
          The way technology products are built is changing. AI-assisted development,
          modern frameworks, and lean product strategy make it possible to move from
          idea to MVP faster than ever before.
        </p>
        <p className="mt-6 font-medium text-text-primary">But speed alone is not enough.</p>
        <p className="mt-6 text-base leading-relaxed text-text-secondary">
          A successful MVP still needs the right scope, the right user journey,
          the right product experience, and a clear launch plan.
        </p>
        <p className="mt-6 text-base leading-relaxed text-text-secondary">
          That is why Zenpho combines development with product thinking and growth
          support. We help founders build products that are not just functional,
          but ready to be launched, tested, and improved.
        </p>
      </Card>
    </section>
  );
}
