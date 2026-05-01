import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import Button from "@/components/ui/Button";
import { marketingIndustryPages } from "@/lib/marketing-industries-pages";

export const metadata: Metadata = {
  title: "Industries | Zenpho",
  description:
    "Growth playbooks for home services, health & wellness, professional services, and automotive—qualified leads, bookings, reviews, and revenue clarity.",
};

export default function IndustriesHubMarketingPage() {
  return (
    <>
      <section className="border-b border-border/70 bg-gradient-to-b from-surface/80 to-background px-4 pb-14 pt-28 sm:px-6 lg:px-8 lg:pb-16 lg:pt-32">
        <div className="mx-auto max-w-3xl text-center lg:max-w-4xl">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-text-secondary">
            Industries
          </p>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-text-primary sm:text-4xl">
            Built for local service businesses
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg leading-relaxed text-text-secondary">
            We help owners generate qualified leads, book more jobs, collect Google reviews, grow referrals, and see which marketing drives revenue—in the verticals where reputation and speed matter most.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
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
        <div className="mx-auto grid max-w-5xl gap-6 sm:grid-cols-2">
          {marketingIndustryPages.map((ind) => {
            const Icon = ind.icon;
            return (
              <Link
                key={ind.slug}
                href={`/industries/${ind.slug}`}
                className="group flex gap-4 rounded-2xl border border-border/80 bg-white p-6 shadow-soft transition-all hover:border-accent/25 hover:shadow-soft-lg"
              >
                <div
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${ind.iconClassName}`}
                >
                  <Icon className="h-6 w-6" aria-hidden />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg font-bold text-text-primary group-hover:text-accent">
                    {ind.title}
                  </h2>
                  <p className="mt-1 text-sm leading-relaxed text-text-secondary">
                    {ind.description}
                  </p>
                  <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-accent">
                    Explore
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </>
  );
}
