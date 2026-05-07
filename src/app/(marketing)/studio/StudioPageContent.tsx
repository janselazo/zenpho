import Link from "next/link";
import { Car, Check, ClipboardCheck, Palette } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";

type StudioProduct = {
  name: string;
  tagline: string;
  description: string;
  bestFor: string;
  features: string[];
  ctaLabel: string;
  ctaHref: string;
  external?: boolean;
  icon: LucideIcon;
  iconWrapClass: string;
};

const PRODUCTS: StudioProduct[] = [
  {
    name: "Soldtools",
    tagline: "Sell more cars. Work smarter.",
    description:
      "Everything dealerships and sales teams need to generate leads, set appointments, close deals, and grow their referral network — in one powerful platform.",
    bestFor: "Auto dealerships, sales teams, and automotive businesses.",
    features: [
      "Lead generation",
      "Appointment setting",
      "Deal tracking",
      "Referral network growth",
      "Sales pipeline management",
    ],
    ctaLabel: "View Product",
    ctaHref: "https://app.soldtools.com",
    external: true,
    icon: Car,
    iconWrapClass: "bg-accent/15 text-accent",
  },
  {
    name: "Business Audit",
    tagline: "Find the gaps before they cost you growth.",
    description:
      "A simple audit tool that helps businesses identify weaknesses in their website, branding, customer journey, online presence, and conversion flow.",
    bestFor:
      "Business owners who want a clear picture of what needs to improve before investing in marketing, design, or development.",
    features: [
      "Website review",
      "Brand clarity check",
      "Conversion audit",
      "Online presence scoring",
      "Actionable recommendations",
    ],
    ctaLabel: "Run an Audit",
    ctaHref: "/tools/business-audit",
    icon: ClipboardCheck,
    iconWrapClass: "bg-sky-500/15 text-sky-700 dark:text-sky-400",
  },
  {
    name: "Branding Kit",
    tagline: "Launch with a brand that looks ready from day one.",
    description:
      "A brand starter system that helps founders and businesses create the essentials they need to launch professionally — including brand direction, colors, typography, messaging, and visual assets.",
    bestFor: "Startups, new businesses, creators, and founders preparing to launch a website, app, or product.",
    features: [
      "Brand identity direction",
      "Logo and visual guidelines",
      "Color and typography system",
      "Messaging foundation",
      "Launch-ready brand assets",
    ],
    ctaLabel: "Explore Branding Kit",
    ctaHref: "/branding",
    icon: Palette,
    iconWrapClass: "bg-violet-500/15 text-violet-700 dark:text-violet-400",
  },
];

export default function StudioPageContent() {
  return (
    <div className="bg-background">
      <section className="border-b border-border/50 bg-gradient-to-b from-surface/35 to-background py-16 sm:py-20 lg:py-24">
        <div className="mx-auto max-w-3xl px-6 text-center lg:px-8">
          <div className="mb-5 flex justify-center">
            <span className="inline-flex rounded-full border border-accent/25 bg-white/90 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.2em] text-accent shadow-sm dark:bg-zinc-900/80">
              Zenpho Studio
            </span>
          </div>
          <h1 className="heading-display text-balance text-3xl font-bold tracking-tight text-text-primary sm:text-4xl lg:text-[2.5rem] lg:leading-[1.08]">
            We Don&apos;t Just Build for Clients. We Build Products Too.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-pretty text-lg leading-relaxed text-text-secondary sm:text-xl">
            Our studio develops practical digital products, tools, and platforms that solve real business problems — from sales
            systems to business audits and brand launch kits.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16 sm:py-20 lg:px-8 lg:py-24">
        <ul className="grid list-none gap-8 lg:grid-cols-3 lg:gap-8">
          {PRODUCTS.map((p) => {
            const Icon = p.icon;
            return (
              <li key={p.name}>
                <Card className="flex h-full flex-col p-6 sm:p-8">
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-2xl ${p.iconWrapClass}`}
                    aria-hidden
                  >
                    <Icon className="h-6 w-6" strokeWidth={2} />
                  </div>
                  <h2 className="mt-5 text-xl font-bold text-text-primary sm:text-2xl">{p.name}</h2>
                  <p className="mt-2 text-sm font-semibold text-accent sm:text-base">{p.tagline}</p>
                  <p className="mt-4 flex-1 text-sm leading-relaxed text-text-secondary sm:text-[0.9375rem]">
                    {p.description}
                  </p>
                  <p className="mt-5 text-xs font-bold uppercase tracking-wide text-text-secondary">Best for</p>
                  <p className="mt-1.5 text-sm leading-relaxed text-text-primary">{p.bestFor}</p>
                  <p className="mt-5 text-xs font-bold uppercase tracking-wide text-text-secondary">Features</p>
                  <ul className="mt-2 space-y-2">
                    {p.features.map((f) => (
                      <li key={f} className="flex gap-2 text-sm text-text-secondary">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" strokeWidth={2.5} aria-hidden />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-8">
                    {p.external ? (
                      <Button
                        href={p.ctaHref}
                        variant="primary"
                        size="lg"
                        className="w-full justify-center"
                        rel="noopener noreferrer"
                        target="_blank"
                      >
                        {p.ctaLabel}
                      </Button>
                    ) : (
                      <Button href={p.ctaHref} variant="primary" size="lg" className="w-full justify-center">
                        {p.ctaLabel}
                      </Button>
                    )}
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="border-t border-border/50 bg-surface/25 py-16 sm:py-20 lg:py-24 dark:bg-zinc-950/40">
        <div className="mx-auto max-w-3xl px-6 text-center lg:px-8">
          <div className="rounded-[2rem] border border-border/80 bg-white p-8 shadow-soft ring-1 ring-black/[0.04] sm:p-10 lg:p-12 dark:border-zinc-700/80 dark:bg-zinc-900/50 dark:ring-white/[0.04]">
            <h2 className="heading-display text-2xl font-bold tracking-tight text-text-primary sm:text-3xl">
              Have an idea for a product like these?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-text-secondary sm:text-lg">
              Zenpho can help you design, build, and launch your own website, web app, mobile app, or MVP.
            </p>
            <div className="mt-8 flex justify-center">
              <Button href="/booking" variant="primary" size="lg" className="min-w-[12rem] justify-center">
                Build My Product
              </Button>
            </div>
            <p className="mt-6 text-sm text-text-secondary">
              Prefer to browse packages first?{" "}
              <Link href="/pricing" className="font-medium text-accent underline-offset-4 hover:underline">
                View pricing
              </Link>
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
