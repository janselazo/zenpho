import SectionHeading from "@/components/ui/SectionHeading";
import Card from "@/components/ui/Card";

export default function WhyMatters() {
  return (
    <section className="mx-auto max-w-3xl px-6 pb-16 lg:px-8">
      <SectionHeading
        align="left"
        label="Partnership"
        title="We do not just want to build for clients."
        titleAccent="We want to build like founders."
        titleAccentInline
      />
      <Card className="border-border/80 bg-white p-8 shadow-soft sm:p-10">
        <p className="text-base leading-relaxed text-text-secondary">
          The best product teams understand the pressure of launching,
          learning, iterating, and selling.
        </p>
        <p className="mt-6 text-base leading-relaxed text-text-secondary">
          By building our own products, Zenpho becomes a better partner for
          founders. We understand not only how to develop software, but also how
          to think about users, markets, positioning, and growth.
        </p>
      </Card>
    </section>
  );
}
