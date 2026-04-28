import SectionHeading from "@/components/ui/SectionHeading";
import Card from "@/components/ui/Card";

export default function CurrentFocus() {
  return (
    <section className="mx-auto max-w-3xl px-6 pb-12 lg:px-8">
      <SectionHeading
        align="left"
        label="Today"
        title="Our current focus:"
        titleAccent="founder MVPs."
      />
      <Card className="border-border/80 bg-white p-8 shadow-soft sm:p-10">
        <p className="text-base leading-relaxed text-text-secondary">
          Right now, our focus is helping founders build and launch AI-powered
          MVPs.
        </p>
        <p className="mt-6 text-base font-semibold text-text-primary">
          This is the foundation of Zenpho Studio.
        </p>
        <p className="mt-6 text-base leading-relaxed text-text-secondary">
          Every product we build, every founder we work with, and every launch we
          support helps us sharpen our process and move closer to our studio
          vision.
        </p>
      </Card>
    </section>
  );
}
