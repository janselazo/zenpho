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
        <p className="text-base font-medium leading-relaxed text-text-secondary">
          Zenpho Studio will focus on practical AI products that solve real
          workflow, productivity, and growth problems.
        </p>
        <p className="mt-8 text-[11px] font-bold uppercase tracking-[0.16em] text-text-primary">
          Potential product areas include
        </p>
        <ul className="mt-4 flex flex-col gap-2.5">
          {areas.map((a) => (
            <li
              key={a}
              className="flex gap-3 text-[15px] font-semibold leading-snug text-text-primary sm:text-base"
            >
              <span
                aria-hidden
                className="mt-2.5 inline-block size-1.5 shrink-0 rounded-full bg-accent"
              />
              <span>{a}</span>
            </li>
          ))}
        </ul>
      </Card>
    </section>
  );
}
