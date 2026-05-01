import Button from "@/components/ui/Button";

const HEADING_ID = "pricing-audit-cta";

export default function PricingAuditCtaSection() {
  return (
    <section
      className="border-t border-border/50 bg-background py-16 sm:py-20 lg:py-24"
      aria-labelledby={HEADING_ID}
    >
      <div className="mx-auto max-w-4xl px-6 text-center lg:px-8">
        <h2
          id={HEADING_ID}
          className="heading-display text-balance text-2xl font-bold tracking-tight text-text-primary sm:text-3xl lg:text-4xl"
        >
          Not Sure Which Plan Fits?
        </h2>
        <p className="mx-auto mt-5 max-w-2xl text-pretty text-base leading-relaxed text-text-secondary sm:text-lg">
          Start by running your Revenue Leak Audit to see where your business is losing opportunities and what should be
          fixed first.
        </p>
        <div className="mt-8 flex justify-center">
          <Button href="/revenue" variant="primary" size="lg">
            Run Revenue Leak Audit
          </Button>
        </div>
      </div>
    </section>
  );
}
