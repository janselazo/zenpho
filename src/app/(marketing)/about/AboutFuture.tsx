import SectionHeading from "@/components/ui/SectionHeading";
import Card from "@/components/ui/Card";

export default function AboutFuture() {
  return (
    <section className="mx-auto max-w-3xl px-6 py-20 lg:py-24">
      <SectionHeading
        align="left"
        title="From agency to AI"
        titleAccent="Product Studio."
      />
      <Card className="border-border/80 bg-white p-8 shadow-soft sm:p-10">
        <p className="text-base leading-relaxed text-text-secondary">
          Zenpho is building toward a larger vision: becoming an AI Product
          Studio.
        </p>
        <p className="mt-6 text-base leading-relaxed text-text-secondary">
          That means we help founders build products while also creating our own
          AI-powered software.
        </p>
        <p className="mt-6 text-base leading-relaxed text-text-secondary">
          Client work gives us a front-row seat to real problems founders and
          businesses face. Over time, we use those insights to create internal
          tools, AI products, and software platforms of our own.
        </p>
        <p className="mt-6 text-base font-medium leading-relaxed text-text-primary">
          Our goal is to become a studio that builds products with founders, for
          founders, and eventually from our own ideas.
        </p>
      </Card>
    </section>
  );
}
