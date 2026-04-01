import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { serviceIconMap } from "@/components/services/service-icons";
import { services } from "@/lib/data";
import {
  getServicePagePayload,
  serviceDetailSlugs,
} from "@/lib/marketing/service-detail-content";
import {
  serviceBulletAccentClass,
  serviceIconAccentClass,
} from "@/lib/marketing/service-accent";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return serviceDetailSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const payload = getServicePagePayload(slug);
  if (!payload) {
    return { title: "Service" };
  }
  return {
    title: payload.service.title,
    description: payload.body.metaDescription,
  };
}

export default async function ServiceDetailPage({ params }: Props) {
  const { slug } = await params;
  const payload = getServicePagePayload(slug);
  if (!payload) notFound();

  const { service, gridIndex, body } = payload;
  const icon = serviceIconMap[service.icon] ?? serviceIconMap.code;
  const others = services.filter((s) => s.slug !== service.slug);

  return (
    <>
      <section className="hero-sky relative overflow-hidden pt-28 pb-16 sm:pb-20">
        <div className="relative z-10 mx-auto max-w-3xl px-6 lg:px-8">
          <nav
            className="mb-10 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-text-secondary"
            aria-label="Breadcrumb"
          >
            <Link href="/" className="hover:text-accent">
              Home
            </Link>
            <span aria-hidden className="text-border">
              /
            </span>
            <Link href="/services" className="hover:text-accent">
              Services
            </Link>
            <span aria-hidden className="text-border">
              /
            </span>
            <span className="font-medium text-text-primary">{service.title}</span>
          </nav>

          <div
            className={`mb-6 inline-flex h-14 w-14 items-center justify-center rounded-full [&_svg]:h-7 [&_svg]:w-7 ${serviceIconAccentClass(gridIndex)}`}
          >
            {icon}
          </div>
          <h1 className="heading-display text-3xl font-bold tracking-tight text-text-primary text-balance sm:text-4xl lg:text-5xl">
            {service.title}
          </h1>
          <p className="mt-5 text-base leading-relaxed text-text-secondary sm:text-lg">
            {service.description}
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button href="/booking" variant="primary" size="lg">
              Book a call
            </Button>
            <Button href="/pricing" variant="dark" size="lg" showLiveDot>
              View pricing
            </Button>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-6 pb-12 lg:px-8">
        <div className="space-y-5 text-base leading-relaxed text-text-secondary">
          {body.intro.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-3xl space-y-8 px-6 pb-16 lg:px-8">
        {body.sections.map((section) => (
          <Card
            key={section.title}
            className="border-border/80 bg-white p-8 shadow-soft sm:p-10"
          >
            <h2 className="text-lg font-semibold text-text-primary sm:text-xl">
              {section.title}
            </h2>
            {section.paragraphs?.map((p, i) => (
              <p key={i} className="mt-4 text-base leading-relaxed text-text-secondary">
                {p}
              </p>
            ))}
            {section.bullets && section.bullets.length > 0 ? (
              <ul className="mt-4 space-y-3">
                {section.bullets.map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-3 text-sm leading-relaxed text-text-secondary"
                  >
                    <span
                      className={`mt-2 h-1.5 w-1.5 shrink-0 rounded-full ${serviceBulletAccentClass(gridIndex)}`}
                      aria-hidden
                    />
                    {item}
                  </li>
                ))}
              </ul>
            ) : null}
          </Card>
        ))}

        {body.idealFor && body.idealFor.length > 0 ? (
          <Card className="border-border/80 bg-surface/80 p-8 shadow-soft sm:p-10">
            <h2 className="text-lg font-semibold text-text-primary sm:text-xl">
              A strong fit when…
            </h2>
            <ul className="mt-4 space-y-3">
              {body.idealFor.map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-3 text-sm leading-relaxed text-text-secondary"
                >
                  <span
                    className={`mt-2 h-1.5 w-1.5 shrink-0 rounded-full ${serviceBulletAccentClass(gridIndex)}`}
                    aria-hidden
                  />
                  {item}
                </li>
              ))}
            </ul>
          </Card>
        ) : null}
      </section>

      <section className="mx-auto max-w-3xl px-6 pb-24 lg:px-8">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-text-secondary">
          Other services
        </h2>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {others.map((s) => (
            <li key={s.slug}>
              <Link
                href={`/services/${s.slug}`}
                className="block rounded-xl border border-border bg-white px-4 py-3 text-sm font-medium text-text-primary shadow-soft transition hover:border-accent/30 hover:text-accent"
              >
                {s.title}
                <span className="ml-1 text-text-secondary">→</span>
              </Link>
            </li>
          ))}
        </ul>
        <p className="mt-8 text-center text-sm text-text-secondary">
          <Link href="/services" className="font-medium text-accent hover:underline">
            ← All services
          </Link>
        </p>
      </section>
    </>
  );
}
