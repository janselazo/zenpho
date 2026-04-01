"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { services } from "@/lib/data";
import SectionHeading from "@/components/ui/SectionHeading";
import Card from "@/components/ui/Card";
import { serviceIconMap } from "@/components/services/service-icons";
import {
  serviceBulletAccentClass,
  serviceIconAccentClass,
} from "@/lib/marketing/service-accent";

export default function ServicesGrid() {
  return (
    <section className="mx-auto max-w-7xl px-6 py-32 lg:px-8">
      <SectionHeading
        label="Capabilities"
        title="Development"
        titleAccent="Services"
        titleAccentInline
        description={
          <p>
            Whether you&apos;re starting from scratch or scaling an existing
            product, we handle the full development process from strategy to
            launch. No long timelines, no unnecessary complexity — just a reliable
            team that turns your idea into a fully functional software product.
          </p>
        }
      />

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {services.map((service, i) => (
          <motion.div
            key={service.slug}
            initial={{ opacity: 1, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.5, delay: i * 0.1 }}
          >
            <Link
              href={`/services/${service.slug}`}
              className="group block h-full rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
            >
              <Card className="flex h-full flex-col transition-[box-shadow,transform] group-hover:-translate-y-0.5 group-hover:shadow-md">
                <div
                  className={`mb-4 flex h-11 w-11 items-center justify-center rounded-full ${serviceIconAccentClass(i)}`}
                >
                  {serviceIconMap[service.icon] ?? serviceIconMap.code}
                </div>
                <h3 className="text-lg font-semibold text-text-primary group-hover:text-accent">
                  {service.title}
                </h3>
                <p className="mt-2 text-sm text-text-secondary">
                  {service.description}
                </p>
                <ul className="mt-4 flex-1 space-y-2">
                  {service.details.map((detail) => (
                    <li
                      key={detail}
                      className="flex items-start gap-2 text-xs text-text-secondary"
                    >
                      <span
                        className={`mt-1 h-1 w-1 flex-shrink-0 rounded-full ${serviceBulletAccentClass(i)}`}
                      />
                      {detail}
                    </li>
                  ))}
                </ul>
                <p className="mt-5 text-xs font-semibold text-accent">
                  View details →
                </p>
              </Card>
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
