import Link from "next/link";
import { Car, Check, ClipboardCheck, Linkedin, Palette } from "lucide-react";
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
      "A sales platform for auto teams to generate leads, set appointments, track deals, and grow referrals in one place.",
    bestFor: "Auto dealerships, sales teams, and automotive businesses.",
    features: [
      "Lead generation",
      "Appointment setting",
      "Deal tracking",
      "Referral growth",
      "Sales pipeline tools",
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
      "A simple audit tool that reviews your website, brand, customer journey, and conversion flow.",
    bestFor: "Business owners who want clear, actionable improvement opportunities.",
    features: [
      "Website review",
      "Brand clarity check",
      "Conversion audit",
      "Online presence score",
      "Action plan",
    ],
    ctaLabel: "Run an Audit",
    ctaHref: "/tools/business-audit",
    icon: ClipboardCheck,
    iconWrapClass: "bg-sky-500/15 text-sky-700 dark:text-sky-400",
  },
  {
    name: "Branding Kit",
    tagline: "Launch with a brand that looks ready.",
    description:
      "A brand starter kit with the visual and messaging essentials needed to launch professionally.",
    bestFor: "Startups, creators, founders, and new businesses preparing to launch.",
    features: [
      "Brand direction",
      "Logo guidelines",
      "Color system",
      "Typography system",
      "Messaging foundation",
    ],
    ctaLabel: "Explore Branding Kit",
    ctaHref: "/branding",
    icon: Palette,
    iconWrapClass: "bg-violet-500/15 text-violet-700 dark:text-violet-400",
  },
];

const WHY_BULLETS = [
  "We test ideas in the real world",
  "We design for actual users",
  "We build with launch in mind",
  "We improve based on feedback",
  "We bring product thinking into client work",
];

export default function StudioPageContent() {
  return (
    <div className="bg-background">
      <section className="border-b border-border/50 bg-gradient-to-b from-surface/35 to-background pt-28 pb-10 sm:pt-32 sm:pb-12 lg:pt-36 lg:pb-16">
        <div className="mx-auto max-w-3xl px-6 text-center lg:px-8">
          <div className="mb-5 flex justify-center">
            <span className="inline-flex rounded-full border border-accent/25 bg-white/90 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.22em] text-accent shadow-sm dark:bg-zinc-900/80">
              Zenpho Studio
            </span>
          </div>
          <h1 className="heading-display text-balance text-3xl font-bold tracking-tight text-text-primary sm:text-4xl lg:text-[2.5rem] lg:leading-[1.08]">
            Products Built by Zenpho
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-pretty text-lg leading-relaxed text-text-secondary sm:text-xl">
            We build our own digital products too — practical tools for sales, business audits, branding, and faster
            launches.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button href="#studio-products" variant="primary" size="lg" className="min-w-[12rem] justify-center">
              Explore Products
            </Button>
            <Button href="/booking" variant="secondary" size="lg" className="min-w-[12rem] justify-center">
              Build My Product
            </Button>
          </div>
        </div>
      </section>

      <section
        className="border-b border-border/50 px-6 py-12 sm:py-14 lg:px-8 lg:py-16"
        aria-labelledby="studio-founder-heading"
      >
        <div className="mx-auto max-w-3xl rounded-3xl border border-border/70 bg-white/90 p-6 shadow-soft ring-1 ring-black/[0.04] sm:p-8 dark:border-zinc-700/80 dark:bg-zinc-900/40 dark:ring-white/[0.04]">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent">Founder</p>
          <h2 id="studio-founder-heading" className="mt-3 heading-display text-2xl font-bold tracking-tight text-text-primary">
            Janse Lazo
          </h2>
          <p className="mt-2 text-sm font-semibold text-text-secondary">
            Founder &amp; CEO, Zenpho
          </p>
          <p className="mt-5 text-base leading-relaxed text-text-secondary">
            Janse Lazo is the Founder and CEO of Zenpho, a Miami-area MVP development agency and product studio that helps
            teams design, build, and launch web apps, mobile MVPs, and digital products. With a background in Computer
            Science and years of experience bridging engineering, product, and growth, Janse brings a practical,
            go-to-market-driven approach to every client engagement.
          </p>
          <p className="mt-4 text-base leading-relaxed text-text-secondary">
            As a co-founder of Taptok, he gained firsthand experience building and scaling products, which now informs
            Zenpho&apos;s work with startups, founders, and growing teams. Through Zenpho and Zenpho Studio, Janse helps turn
            ideas into launch-ready products with a focus on speed, clarity, and real-world execution.
          </p>
          <p className="mt-8">
            <a
              href="https://www.linkedin.com/in/janselazo/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm font-semibold text-accent transition-colors hover:text-accent/85"
              aria-label="Janse Lazo on LinkedIn (opens in a new tab)"
            >
              <Linkedin className="h-5 w-5 shrink-0" strokeWidth={2} aria-hidden />
              Connect on LinkedIn
              <span className="text-text-secondary">&nbsp;→</span>
            </a>
          </p>
        </div>
      </section>

      <section
        id="studio-products"
        className="mx-auto max-w-6xl scroll-mt-28 px-6 pt-8 pb-16 sm:pt-10 sm:pb-20 lg:px-8 lg:pt-12 lg:pb-24"
        aria-labelledby="studio-products-heading"
      >
        <div className="mx-auto max-w-3xl text-center">
          <h2
            id="studio-products-heading"
            className="heading-display text-balance text-2xl font-bold tracking-tight text-text-primary sm:text-3xl"
          >
            Tools we&apos;ve built to solve real business problems.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-pretty text-base leading-relaxed text-text-secondary sm:text-lg">
            Zenpho Studio is where we develop our own platforms, tools, and launch systems.
          </p>
        </div>

        <ul className="mt-14 grid list-none gap-8 lg:grid-cols-3 lg:gap-8">
          {PRODUCTS.map((p) => {
            const Icon = p.icon;
            return (
              <li key={p.name}>
                <Card className="flex h-full flex-col p-6 shadow-soft sm:p-8">
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-2xl ${p.iconWrapClass}`}
                    aria-hidden
                  >
                    <Icon className="h-6 w-6" strokeWidth={2} />
                  </div>
                  <h3 className="mt-5 text-xl font-bold text-text-primary sm:text-2xl">{p.name}</h3>
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

      <section className="border-t border-border/50 bg-surface/30 px-6 py-16 sm:py-20 lg:px-8 lg:py-24">
        <div className="mx-auto max-w-3xl">
          <h2 className="heading-display text-center text-2xl font-bold tracking-tight text-text-primary sm:text-3xl">
            We build products because we understand product launches.
          </h2>
          <p className="mx-auto mt-5 text-center text-base leading-relaxed text-text-secondary sm:text-lg">
            Building our own tools keeps us close to real users, real workflows, and real launch problems. That experience
            helps us build better websites, web apps, mobile apps, and MVPs for our clients.
          </p>
          <ul className="mt-10 space-y-3">
            {WHY_BULLETS.map((line) => (
              <li key={line} className="flex gap-3 text-sm leading-relaxed text-text-primary sm:text-base">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" aria-hidden />
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="border-t border-border/50 bg-gradient-to-b from-background to-surface/40 py-16 sm:py-20 lg:py-24">
        <div className="mx-auto max-w-3xl px-6 text-center lg:px-8">
          <div className="rounded-[2rem] border border-border/80 bg-white p-8 shadow-soft ring-1 ring-black/[0.04] sm:p-10 lg:p-12 dark:border-zinc-700/80 dark:bg-zinc-900/50 dark:ring-white/[0.04]">
            <h2 className="heading-display text-2xl font-bold tracking-tight text-text-primary sm:text-3xl">
              Have an idea for a product like these?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-text-secondary sm:text-lg">
              Zenpho can help you design, build, and launch your website, web app, mobile app, or MVP.
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
