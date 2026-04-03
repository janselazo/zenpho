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
      "MVP development from Zenpho: a shippable first version in weeks — tight scope, core flows end to end, deploy and analytics, starting at $2,500.",
    intro: [
      "Most MVPs fail before code ships because the scope tries to be a full product. We start from the outcome: what must be true after launch for this to be a win? That becomes a single vertical slice — the smallest build that still lets real users do something meaningful.",
      "You get working software on a predictable rhythm: a first slice quickly, then weekly demos until the agreed MVP is live. We document what’s in, what’s out, and what comes next so you’re not guessing when it’s time to raise, sell, or hire.",
    ],
    sections: [
      {
        title: "Scope that can ship",
        paragraphs: [
          "Together we define one primary user, one critical journey, and the minimum data and permissions that journey needs. Everything else goes on a visible backlog — not in the first milestone.",
        ],
        bullets: [
          "Problem framing, success metrics, and explicit out-of-scope list",
          "Wire-level clarity before build so surprises show up early, not in week six",
          "Tradeoffs named up front: speed vs. polish, build vs. buy for third parties",
        ],
      },
      {
        title: "Build & quality bar",
        bullets: [
          "Web-first or scoped mobile — chosen for how your users actually onboard",
          "Auth, roles, and data models only as deep as this slice requires",
          "Sensible error states, empty states, and deploy you can point stakeholders at",
        ],
      },
      {
        title: "Launch & learn",
        bullets: [
          "Staging and production deploy with a short go-live checklist",
          "Basic analytics or event hooks so you can see where people drop off",
          "Handoff notes and extension points for the next phase — no black box",
        ],
      },
      {
        title: "How we deliver",
        paragraphs: [
          "Same engagement model as our larger builds: visible progress every week, async updates in Slack, and room for a small number of scope adjustments when we learn something important — without turning the MVP into a rewrite.",
        ],
        bullets: [
          "Fixed-scope MVP pricing starts at $2,500; exact quote after a short discovery call",
          "Post-launch support window included; follow-on sprints when you’re ready",
        ],
      },
    ],
    idealFor: [
      "Founders who need something real in users’ hands before the next funding or sales push",
      "Teams replacing spreadsheets or manual workflows with a first productized version",
      "Builders who want speed without pretending a prototype is production-ready",
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
      "Teams shipping a new SaaS MVP or replacing a spreadsheet workflow",
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
  "ai-in-your-product": {
    metaDescription:
      "Practical AI in your product: in-app assistants, semantic search, recommendations, and workflow help — grounded in your data, with guardrails and evaluation hooks, not slide-deck demos.",
    intro: [
      "AI features only matter if people adopt them and you can trust the output. We focus on copilots, search, and assistive flows that sit inside real tasks — with retrieval over your content, clear citations or boundaries, and human-in-the-loop when the surface is customer-facing.",
      "We bias toward measurable loops: logging prompts and outcomes (within your privacy model), offline evaluation where possible, and feature flags so you can roll out gradually.",
    ],
    sections: [
      {
        title: "Assistants & chat in context",
        bullets: [
          "In-product chat wired to your APIs and knowledge, not a generic wrapper",
          "Tool use and structured steps when the task needs actions, not just text",
          "Streaming UX, cancellation, and error recovery that feel native to your app",
        ],
      },
      {
        title: "Search & discovery",
        bullets: [
          "Semantic search over docs, catalog, or support content with tunable ranking",
          "Hybrid retrieval (keyword + vector) when precision matters",
          "Admin controls for what is indexed and how stale content is refreshed",
        ],
      },
      {
        title: "Recommendations & signals",
        bullets: [
          "Lightweight personalization and ranking with explicit cold-start behavior",
          "Hooks to log impressions and clicks so you can improve with real usage",
        ],
      },
      {
        title: "Safety, compliance, and operations",
        paragraphs: [
          "Customer-facing AI gets red-team thinking: prompt injection surfaces, PII handling, rate limits, and audit-friendly logging as agreed. We scope what “grounded” means for your domain and build to that bar.",
        ],
        bullets: [
          "Human review queues when outputs affect money, legal, or reputation",
          "Cost and latency budgets so features stay viable at your scale",
        ],
      },
    ],
    idealFor: [
      "Teams with proprietary content or workflows that generic ChatGPT can’t access",
      "Products where search or support load is a real cost center",
      "Founders who want AI as a product feature, not a one-off integration",
    ],
  },
  "automation-integrations": {
    metaDescription:
      "Automation and integrations from Zenpho: OAuth, SSO, webhooks, event pipelines, payments and partner APIs — plus guarded multi-step workflows so ops, sales, and support escape copy-paste.",
    intro: [
      "The best integrations disappear: data shows up in the right system, exceptions get surfaced, and humans only touch the edges that need judgment. We connect CRMs, billing, data stores, and custom APIs with idempotency, retries, and monitoring so a flaky partner doesn’t become your on-call nightmare.",
      "When you need agents or multi-step automation, we still design for approvals, audit trails, and guardrails — automation should reduce risk, not hide it.",
    ],
    sections: [
      {
        title: "Identity & connectivity",
        bullets: [
          "OAuth 2.0 / OIDC and SSO patterns for SaaS and internal tools",
          "Webhook receivers with signature verification and replay protection",
          "Event buses, queues, or scheduled jobs — chosen for your volume and failure modes",
        ],
      },
      {
        title: "Business systems",
        bullets: [
          "CRM and marketing tooling: sync rules, conflict resolution, and backfill strategies",
          "Payments and billing: Stripe and similar with explicit state machines for subscriptions and invoices",
          "Data warehouses or lakes: incremental syncs and schema evolution as scoped",
        ],
      },
      {
        title: "Workflows & agents",
        bullets: [
          "Multi-step flows with human approval gates where money or customers are involved",
          "Clear escalation when automation isn’t confident — no silent wrong answers",
          "Observability per integration: success rates, latency, and dead-letter handling",
        ],
      },
      {
        title: "Internal tools",
        paragraphs: [
          "Sometimes the highest ROI is a focused internal app: reconcile exceptions, trigger replays, or give support a single pane. We build those with the same production discipline as customer-facing software.",
        ],
      },
    ],
    idealFor: [
      "Ops and revenue teams drowning in spreadsheet bridges between SaaS tools",
      "Products that must exchange data with partner or customer systems",
      "Companies ready to replace brittle Zapier chains with owned pipelines",
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
