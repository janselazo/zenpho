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
  "websites-development": {
    metaDescription:
      "Websites development from Zenpho: marketing sites and landing pages with clear IA, fast performance, accessible UI, forms and analytics — starting at $2,500.",
    intro: [
      "Your website is the one place you control the full story: who you help, why you’re credible, and what you want visitors to do next. We scope around that — not a kitchen-sink sitemap — so what ships is easy to understand, fast to load, and straightforward for your team to update.",
      "Whether it’s a focused launch page, a multi-section marketing site, or a refresh of something that’s outgrown its template, we build with the same production habits as our apps: staging previews, a short go-live checklist, and handoff notes so you’re not locked to us for every copy tweak.",
    ],
    sections: [
      {
        title: "Discovery & structure",
        paragraphs: [
          "We align on audience, primary conversion goal, and the proof that goal needs (social proof, product shots, team, pricing, FAQs). That drives information architecture and page flow before we touch visual polish.",
        ],
        bullets: [
          "Goals, success metrics, and explicit out-of-scope for v1",
          "Sitemap and key sections — no mystery pages that exist “because competitors have them”",
          "Content gaps called out early so launch isn’t blocked by missing assets",
        ],
      },
      {
        title: "Design & build",
        bullets: [
          "Responsive layouts and typography tuned for readability on real devices",
          "Performance and accessibility: semantic HTML, contrast, focus states, and image discipline",
          "Brand-consistent UI without a generic template look — scoped to your assets and tone",
        ],
      },
      {
        title: "Launch & measurement",
        bullets: [
          "Contact and lead capture wired to your stack (form endpoints, CRM hooks, or email) as scoped",
          "Analytics and conversion events named so you can see what works after go-live",
          "SEO-friendly structure: titles, descriptions, Open Graph basics, and clean URLs where it matters",
        ],
      },
      {
        title: "How we deliver",
        paragraphs: [
          "Same rhythm as our other engagements: visible progress, async updates in Slack, and a small number of scoped revisions so we land something you’re proud to send traffic to.",
        ],
        bullets: [
          "Fixed-scope website pricing starts at $2,500; exact quote after a short discovery call",
          "Post-launch support window included; follow-on work when you add pages, locales, or deeper integrations",
        ],
      },
    ],
    idealFor: [
      "Companies launching or repositioning and needing a credible site before campaigns or outbound",
      "Founders who outgrew a DIY builder but don’t need a full product app yet",
      "Teams that want speed without sacrificing performance, accessibility, or handoff clarity",
    ],
  },
  "web-applications": {
    metaDescription:
      "Custom web applications from Zenpho: Next.js and React, auth and roles, APIs, observability, and CI-friendly delivery — built so your team can extend the codebase after launch.",
    intro: [
      "Web apps are where complexity shows up: permissions, data models, edge cases, and the gap between “demo” and production. We ship SaaS surfaces, internal tools, and dashboards with the same patterns we’d use on our own products — typed boundaries, predictable deploys, and logging you can read when something breaks at 9 p.m.",
      "You should not need a forensic archaeologist to change a screen six months later. We document assumptions, keep boundaries clean, and leave hooks for tests and CI so your next hire or agency can move fast.",
    ],
    sections: [
      {
        title: "Product engineering",
        bullets: [
          "Next.js / React App Router, server components where they help, client islands where they must",
          "Authentication, organizations, and role-based access as scoped",
          "REST or typed APIs, background jobs, and webhooks when the product needs them",
        ],
      },
      {
        title: "Quality in production",
        bullets: [
          "Error handling, empty states, and loading UX that match real latency",
          "Observability: structured logs, error reporting, and basic tracing hooks",
          "Performance: database access patterns, caching boundaries, and bundle discipline",
        ],
      },
      {
        title: "Delivery & handoff",
        bullets: [
          "Preview deployments and environments that mirror production enough to trust",
          "CI checks (lint, typecheck, tests as agreed) so main stays shippable",
          "Runbooks for deploy, rollback, and common operational tasks",
        ],
      },
      {
        title: "Integrations",
        paragraphs: [
          "Most serious apps don’t live alone. We wire billing, email, analytics, and third-party APIs with explicit failure modes and retries where appropriate.",
        ],
      },
    ],
    idealFor: [
      "Teams shipping a new SaaS or replacing a spreadsheet workflow",
      "Companies modernizing an internal admin or ops console",
      "Founders who want velocity without trading away maintainability",
    ],
  },
  "mobile-apps": {
    metaDescription:
      "iOS and Android apps from Zenpho: React Native or native when required, push notifications, store submission support, offline-first patterns, and metrics aligned with your web product.",
    intro: [
      "Mobile is a commitment: store policies, permissions, push, background behavior, and the expectation that everything works on a shaky connection. We build when the product truly belongs in a pocket — field tools, consumer apps, and companion experiences that extend what you already do on the web.",
      "When the job doesn’t stop at the signal bar, we design for offline-first or degraded modes so users can still complete critical tasks and sync when they’re back online.",
    ],
    sections: [
      {
        title: "Platforms & stack",
        bullets: [
          "React Native for most cross-platform delivery; native Swift/Kotlin slices when constraints demand it",
          "Shared design language with your web product where both exist",
          "Deep links, universal links, and app config for staging vs production",
        ],
      },
      {
        title: "Store readiness",
        bullets: [
          "App Store and Play Console setup, signing, and release tracks as scoped",
          "Privacy manifests, permission copy, and review notes prepared pragmatically",
          "Crash reporting and release health so post-launch isn’t a blind spot",
        ],
      },
      {
        title: "Lifecycle after v1",
        bullets: [
          "Push notifications and in-app messaging patterns when your roadmap needs them",
          "OTA-friendly workflows for JS bundles where applicable; store updates when not",
          "Iteration cadence aligned with analytics and support feedback",
        ],
      },
      {
        title: "Reliability & UX",
        paragraphs: [
          "We treat mobile-specific states as first-class: permissions denied, background refresh limits, keyboard overlap, and one-handed use on common screens.",
        ],
      },
    ],
    idealFor: [
      "Products where frequency or context favors a native shell over mobile web",
      "Teams that need Apple and Google presence for trust or distribution",
      "Workflows used on the go (field service, sales, logistics, events)",
    ],
  },
  "ai-automations": {
    metaDescription:
      "AI automations from Zenpho: one high-ROI workflow per engagement — CRM and email hooks, webhooks, LLM-assisted steps with guardrails, and observability. Starting at $3,000.",
    intro: [
      "We combine deterministic integrations with AI only where it earns its place: the boring plumbing stays boring (OAuth, webhooks, queues, retries), and models handle judgment-heavy slices with explicit boundaries, approvals, and logging.",
      "Each engagement scopes one workflow end to end — discovery, build, and handoff — so you get something shippable and maintainable, not a shelf of half-wired experiments.",
    ],
    sections: [
      {
        title: "Workflows & integrations",
        bullets: [
          "CRM, email, spreadsheets, and SaaS APIs wired with idempotency and failure handling you can see",
          "Webhook receivers, scheduled jobs, and event pipelines sized to your volume",
          "Human approval gates where money, customers, or compliance are on the line",
        ],
      },
      {
        title: "AI where it helps",
        bullets: [
          "Classification, summarization, routing, or draft generation scoped to your data and policies",
          "Retrieval and tool use when the task needs context — not a generic chat shell",
          "Cost, latency, and evaluation hooks so you can tune or roll back without drama",
        ],
      },
      {
        title: "Safety & operations",
        paragraphs: [
          "Customer-facing or revenue-touching automation gets the same bar as product AI: PII handling, rate limits, escalation when confidence is low, and audit-friendly logs as agreed.",
        ],
        bullets: [
          "Dead-letter and replay paths so flaky partners don’t become silent failures",
          "Runbooks and handoff so your team can pause, extend, or change providers",
        ],
      },
      {
        title: "How we deliver",
        bullets: [
          "Fixed-scope AI Automations pricing starts at $3,000; exact quote after a short discovery call",
          "One primary workflow per engagement — expand with follow-on slices when the first loop is stable",
        ],
      },
    ],
    idealFor: [
      "Ops and revenue teams bridging SaaS tools with too much copy-paste",
      "Products that need in-app assistive flows or semantic search over proprietary content",
      "Companies ready to own integrations instead of brittle no-code chains alone",
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
