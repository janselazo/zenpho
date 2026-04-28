import SectionHeading from "@/components/ui/SectionHeading";
import Card from "@/components/ui/Card";

const steps = [
  {
    title: "Build with founders",
    body: "We work with tech startups and ecommerce brands to build MVPs, launch products, and solve real product challenges.",
  },
  {
    title: "Identify repeated problems",
    body: "Through client work with startups and brands, we identify patterns, bottlenecks, and product opportunities.",
  },
  {
    title: "Build internal tools",
    body: "We create tools to help us scope, build, launch, and grow products faster.",
  },
  {
    title: "Productize what works",
    body: "When an internal tool solves a repeated problem, we turn it into software.",
  },
  {
    title: "Launch our own AI products",
    body: "Over time, Zenpho will create and operate its own portfolio of AI-powered products.",
  },
] as const;

export default function StudioModelSection() {
  return (
    <section id="studio-model" className="mx-auto max-w-7xl scroll-mt-28 px-6 pb-20 lg:px-8">
      <SectionHeading
        label="Model"
        title="How the studio model"
        titleAccent="works"
        description="A loop that keeps client work, internal tools, and owned products in sync."
      />
      <ol className="mx-auto grid max-w-3xl gap-5">
        {steps.map((step, i) => (
          <li key={step.title}>
            <Card className="flex gap-5 border-border/80 bg-white p-6 shadow-soft sm:p-8">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent/10 text-sm font-bold text-accent">
                {i + 1}
              </span>
              <div>
                <h3 className="text-lg font-bold text-text-primary">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-text-secondary">
                  {step.body}
                </p>
              </div>
            </Card>
          </li>
        ))}
      </ol>
    </section>
  );
}
