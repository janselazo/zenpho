import Button from "@/components/ui/Button";
import { BOOKING_PRIMARY_BUTTON_LABEL } from "@/lib/marketing/booking-cta";

const HEADING_ID = "pricing-launch-package-cta";

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
          Not sure which launch package fits?
        </h2>
        <p className="mx-auto mt-5 max-w-2xl text-pretty text-base leading-relaxed text-text-secondary sm:text-lg">
          Whether you need a marketing or ecommerce site, a website where users sign in (dashboards, accounts), or a mobile
          MVP—we&apos;ll match you to the right bundle and timeline. Focused scopes are built to ship in about two weeks.
        </p>
        <div className="mt-8 flex justify-center">
          <Button href="/booking" variant="primary" size="lg">
            {BOOKING_PRIMARY_BUTTON_LABEL}
          </Button>
        </div>
      </div>
    </section>
  );
}
