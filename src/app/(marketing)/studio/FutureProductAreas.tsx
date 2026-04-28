import SectionHeading from "@/components/ui/SectionHeading";
import Card from "@/components/ui/Card";

const areas = [
  "AI tools for founders",
  "MVP scoping assistants",
  "Launch page generators",
  "Beta user outreach tools",
  "Product roadmap tools",
  "AI agents for businesses",
  "Automation dashboards",
  "Growth marketing tools",
  "SaaS operations tools",
  "Vertical AI products",
] as const;

export default function FutureProductAreas() {
  return (
    <section className="mx-auto max-w-3xl px-6 pb-20 lg:px-8">
      <SectionHeading
        align="left"
        label="Roadmap"
        title="What we want to"
        titleAccent="build."
      />
      <Card className="border-border/80 bg-white p-8 shadow-soft sm:p-10">
        <p className="text-base leading-relaxed text-text-secondary">
          Zenpho Studio will focus on practical AI products that solve real
          workflow, productivity, and growth problems.
        </p>
        <p className="mt-6 text-sm font-semibold uppercase tracking-widest text-text-secondary">
          Potential product areas include
        </p>
        <ul className="mt-4 list-inside list-disc space-y-2 text-base text-text-primary/90">
          {areas.map((a) => (
            <li key={a}>{a}</li>
          ))}
        </ul>
      </Card>
    </section>
  );
}
