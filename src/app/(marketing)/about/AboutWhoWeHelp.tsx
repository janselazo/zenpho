import SectionHeading from "@/components/ui/SectionHeading";
import Card from "@/components/ui/Card";

const audience = [
  "Non-technical founders",
  "AI startup founders",
  "SaaS founders",
  "Startup teams",
  "Domain experts building software",
  "Operators productizing workflows",
  "Consultants turning expertise into tools",
  "Founders preparing for demos, launches, or fundraising",
] as const;

export default function AboutWhoWeHelp() {
  return (
    <section className="mx-auto max-w-3xl px-6 py-20 lg:px-8 lg:py-24">
      <SectionHeading
        align="left"
        title="Built for startup founders"
        titleAccent="and product builders"
        description={
          <p className="!text-[15px] !leading-relaxed text-text-secondary sm:!text-base">
            Zenpho works with founders who want to turn ideas into technology
            products.
          </p>
        }
      />

      <p className="-mt-4 mb-5 text-xs font-semibold uppercase tracking-widest text-text-secondary">
        We are a strong fit for:
      </p>

      <Card className="border-border/80 bg-white p-8 shadow-soft sm:p-10">
        <ul className="space-y-3">
          {audience.map((line) => (
            <li
              key={line}
              className="flex gap-3 text-[15px] leading-relaxed text-text-secondary sm:text-base"
            >
              <span
                className="mt-2 h-1 w-1 shrink-0 rounded-full bg-accent"
                aria-hidden
              />
              {line}
            </li>
          ))}
        </ul>
      </Card>
    </section>
  );
}
