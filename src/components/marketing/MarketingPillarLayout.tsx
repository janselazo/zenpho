import Link from "next/link";
import Button from "@/components/ui/Button";

export type MarketingPillarLayoutProps = {
  title: string;
  heroLead: string;
  body: string[];
  bullets: string[];
};

/**
 * Shared marketing detail layout for Product, Solutions, and Industries pages.
 */
export default function MarketingPillarLayout({
  title,
  heroLead,
  body,
  bullets,
}: MarketingPillarLayoutProps) {
  return (
    <>
      <section className="border-b border-border/70 bg-gradient-to-b from-surface/80 to-background px-4 pb-14 pt-28 sm:px-6 lg:px-8 lg:pb-16 lg:pt-32">
        <div className="mx-auto max-w-3xl">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-text-secondary">
            Zenpho
          </p>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-text-primary sm:text-4xl">
            {title}
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-text-secondary">
            {heroLead}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button href="/booking" variant="primary" size="md">
              Book a growth call
            </Button>
            <Button href="/revenue" variant="secondary" size="md">
              Free revenue leak check
            </Button>
          </div>
        </div>
      </section>

      <section className="px-4 py-14 sm:px-6 lg:px-8 lg:py-16">
        <div className="mx-auto max-w-3xl space-y-6 text-base leading-relaxed text-text-secondary">
          {body.map((paragraph, i) => (
            <p key={i}>{paragraph}</p>
          ))}
          <ul className="list-disc space-y-2 pl-5 text-text-primary">
            {bullets.map((b) => (
              <li key={b} className="marker:text-accent">
                <span className="text-text-secondary">{b}</span>
              </li>
            ))}
          </ul>
          <p>
            <Link
              href="/contact"
              className="font-semibold text-accent underline-offset-4 hover:underline"
            >
              Talk to us
            </Link>{" "}
            about your market—we’ll map the right product modules and services.
          </p>
        </div>
      </section>
    </>
  );
}
