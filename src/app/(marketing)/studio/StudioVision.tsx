import SectionHeading from "@/components/ui/SectionHeading";
import Card from "@/components/ui/Card";

export default function StudioVision() {
  return (
    <section className="mx-auto max-w-3xl px-6 pb-14 pt-2 lg:px-8 lg:pb-16">
      <SectionHeading
        className="mb-8 sm:mb-9"
        align="left"
        label="Vision"
        title="A studio for AI-powered"
        titleAccent="products"
      />
      <Card className="border-border/80 bg-white p-8 shadow-soft sm:p-10">
        <p className="text-base font-semibold text-text-primary">
          Zenpho Studio is our long-term vision.
        </p>
        <p className="mt-5 text-base leading-relaxed text-text-secondary">
          Today, we help founders build and launch MVPs.
        </p>
        <p className="mt-4 text-base leading-relaxed text-text-secondary">
          Tomorrow, we will also build and launch our own AI-powered software
          products.
        </p>
        <p className="mt-6 text-base leading-relaxed text-text-secondary">
          The goal is to create a studio model where services, products, and
          internal tools strengthen each other.
        </p>
      </Card>
    </section>
  );
}
