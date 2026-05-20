import type { Service } from "@/lib/data";
import { services } from "@/lib/data";

export type ServiceDetailSection = {
  title: string;
  paragraphs?: string[];
  bullets?: string[];
};

export type ServiceDetailBody = {
  metaDescription: string;
  /** Extra copy below the card summary from `services`. */
  intro: string[];
  sections: ServiceDetailSection[];
  /** Short list for “this is a fit when…” */
  idealFor?: string[];
};

const bySlug: Record<string, ServiceDetailBody> = {
  "mvp-growth": {
    metaDescription:
      "MVP Growth by Zenpho — acquisition, onboarding, experimentation, and measurement after your MVP is live. Starting at $2,500.",
    intro: [
      "Growth isn’t a separate playbook from product. After MVP Development ships, MVP Growth tightens acquisition, onboarding, lifecycle, experiments, and instrumentation so decisions trace to observed behavior.",
      "We’re not repositioning Zenpho as a full-service ads agency — we orchestrate traction systems that reinforce what you learned in build: channels, funnel copy tied to onboarding, cohort reviews, and test cadence.",
    ],
    sections: [
      {
        title: "What lands here",
        bullets: [
          "Experiment design: hypotheses, guards, kill criteria — sized to runway",
          "Funnel instrumentation and dashboards founders can interpret",
          "Lifecycle messaging experiments across email, product, and paid pilots when relevant",
          "Landing and activation assets aligned to the existing MVP narrative",
        ],
      },
      {
        title: "How we collaborate",
        paragraphs: [
          "We integrate with what's already deployed — analytics, attribution, CRM, support — rather than rewriting your stack.",
        ],
        bullets: [
          "North-star behaviors and weekly readouts instead of vanity metrics alone",
          "Growth backlog synced with engineering capacity",
          "Clear handoffs when experiments need product changes vs. channel tweaks",
        ],
      },
      {
        title: "When to start",
        bullets: [
          "You already have usable software in production with real sessions",
          "You need repeatable learning loops, not one-off campaigns",
          "You're ready to commit to iteration velocity alongside roadmap work",
        ],
      },
    ],
    idealFor: [
      "Post-launch founders who need disciplined traction mechanics",
      "Teams with product-market-fit signals still buried in spreadsheets",
      "Operators balancing burn with experimentation throughput",
    ],
  },
};

export type ServicePagePayload = {
  service: Service;
  gridIndex: number;
  body: ServiceDetailBody;
};

export function getServicePagePayload(slug: string): ServicePagePayload | null {
  const idx = services.findIndex((s) => s.slug === slug);
  if (idx < 0) return null;
  const body = bySlug[slug];
  if (!body) return null;
  return { service: services[idx]!, gridIndex: idx, body };
}

export function serviceDetailSlugs(): string[] {
  return services.map((s) => s.slug);
}
