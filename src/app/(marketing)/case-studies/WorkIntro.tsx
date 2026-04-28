import SectionHeading from "@/components/ui/SectionHeading";
import Card from "@/components/ui/Card";

export default function WorkIntro() {
  return (
    <section
      id="proof"
      className="mx-auto max-w-3xl px-6 pb-16 pt-8 lg:px-8 lg:pb-20"
    >
      <SectionHeading
        align="left"
        label="Approach"
        title="Proof through"
        titleAccent="building"
      />
      <Card className="border-border/80 bg-white p-8 shadow-soft sm:p-10">
        <p className="text-base leading-relaxed text-text-secondary">
          Zenpho is a new studio, so we are building in public and creating our
          own MVP concepts to demonstrate our product thinking, AI development
          process, and launch approach.
        </p>
        <p className="mt-6 text-base leading-relaxed text-text-secondary">
          Each build is designed around a simple question:
        </p>
        <p className="mt-4 font-semibold text-text-primary">
          What is the smallest useful product that can validate this idea?
        </p>
      </Card>
    </section>
  );
}
