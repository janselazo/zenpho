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
  "mvp-development": {
    metaDescription:
      "MVP Development by Zenpho — AI-powered MVPs for founders: web apps, SaaS, PWAs, internal tools, landing pages for launch. Starting at $3,000.",
    intro: [
      "Zenpho is an AI MVP development studio — not a generic web shop. We partner with startup founders to compress time-to-demo: most engagements target a working first version in about two weeks when scope stays ruthless.",
      "You get product engineering, pragmatic AI where it supports the core loop, modern web stacks (and mobile-first PWAs or selective native slices when the roadmap calls for it). Marketing websites only show up here as launch landing pages, onboarding shells, or signup flows that support the MVP — not unrelated brochure builds.",
    ],
    sections: [
      {
        title: "What we build",
        bullets: [
          "AI-assisted SaaS, internal tools, dashboards, and product prototypes",
          "Marketplaces and transactional flows when the MVP needs them — still product-led, still scoped",
          "Launch surfaces: pricing, onboarding, docs-light — whatever activates your first cohort",
          "PWAs and mobile-first web by default; native iOS/Android MVPs when distribution or UX demands it",
        ],
      },
      {
        title: "How discovery works",
        paragraphs: [
          "One focused strategy call locks the minimum lovable core, success metrics, and explicit out-of-scope items. We’d rather ship a narrow wedge that founders can sell than a wide mock that slips the timeline.",
        ],
        bullets: [
          "Core user loop, riskiest assumptions, and demo or investor narrative",
          "Data + integration boundaries so AI features stay maintainable",
          "Launch checklist: environments, analytics hooks, error tracking",
        ],
      },
      {
        title: "Delivery & handoff",
        bullets: [
          "Weekly demos, Slack async, staging before production",
          "CI-friendly repos, ADRs when tradeoffs matter, runbooks for deploy",
          "Post-launch support window; MVP Growth when you’re ready to optimize traction",
        ],
      },
    ],
    idealFor: [
      "Founders validating a new software idea with a credible v1",
      "Teams replacing spreadsheets or duct-tape tools with a real product surface",
      "Operators who need speed without forfeiting architectural clarity",
    ],
  },
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
