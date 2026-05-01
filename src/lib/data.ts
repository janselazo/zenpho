export interface Service {
  /** URL segment for `/services/[slug]` */
  slug: string;
  title: string;
  /** Optional line under the title (e.g. services grid + detail hero). */
  subtitle?: string;
  description: string;
  details: string[];
  icon: string;
}

export interface ProcessStep {
  number: string;
  title: string;
  description: string;
}

export interface Venture {
  name: string;
  tagline: string;
  description: string;
  status: "live" | "beta" | "building" | "research";
  category: string;
  metrics?: string;
  /** Optional primary link (e.g. live product URL) */
  ctaLabel?: string;
  ctaHref?: string;
  ctaExternal?: boolean;
}

export type ProjectCategory =
  | "mobile-app"
  | "web-app"
  | "website"
  | "ecommerce";

export interface FeaturedProject {
  /** Company or brand name (shown above the project title). */
  client?: string;
  title: string;
  description: string;
  tags: string[];
  type: "agency" | "studio";
  /** Portfolio column / top-right type pill (same as Work page). */
  category: ProjectCategory;
  status?: "live" | "beta" | "building" | "research";
  result?: string;
}

export interface PortfolioProject {
  title: string;
  description: string;
  tags: string[];
  type: "studio" | "agency";
  category: ProjectCategory;
  status?: "live" | "beta" | "building" | "research";
  result?: string;
  metrics?: string;
  /** Client / brand name for agency (client) builds */
  client?: string;
}

export interface MethodologyPillar {
  number: string;
  title: string;
  description: string;
  principles: string[];
}

/** Grouped “what’s included” blocks — easier to scan than one long bullet list. */
export type PricingIncludedGroup = { title: string; items: string[] };

/** Single offering on the pricing page (one starting price + highlights). */
export interface DevelopmentPricingOffering {
  id: string;
  title: string;
  /** Bold line inside the card — e.g. “Ship a focused software MVP in ~2 weeks.” */
  cardHeadline?: string;
  /** One-line positioning under headline */
  subtitle: string;
  /** Formatted dollar amount, e.g. "$3,000" */
  priceAmount: string;
  /** e.g. "$3,000 – $30,000+" */
  typicalRange?: string;
  /** @deprecated Unused in UI — kept for older references */
  priceSuffix?: string;
  /** Middle / highlighted tier in the grid */
  featured?: boolean;
  /** Grouped deliverables — preferred when set */
  includedGroups?: PricingIncludedGroup[];
  /** Flat “included” fallback when no groups — prefer includedGroups */
  features?: string[];
  ctaLabel?: string;
}

/** Two core offerings — pricing grid on /pricing. */
export const developmentPricingOfferings: DevelopmentPricingOffering[] = [
  {
    id: "mvp-development",
    title: "MVP Development",
    cardHeadline: "Ship a focused software MVP in ~2 weeks.",
    subtitle:
      "Strategy, UX, build, integrations, launch surfaces, QA, deployment, and docs—scoped so stakeholders get a credible v1.",
    priceAmount: "$3,000",
    typicalRange: "$3,000 – $30,000+",
    featured: true,
    includedGroups: [
      {
        title: "Discover & scope",
        items: [
          "Product strategy & MVP scope",
          "Core user journey mapping",
          "Feature prioritization",
        ],
      },
      {
        title: "Design & build",
        items: [
          "UX/UI for core workflows",
          "Web or mobile-first development",
          "AI/API integrations",
          "Authentication & database",
          "Admin dashboard",
        ],
      },
      {
        title: "Launch & handoff",
        items: [
          "Launch landing page",
          "Product analytics setup",
          "QA testing & deployment",
          "Documentation & handoff",
        ],
      },
    ],
    ctaLabel: "Book a Call",
  },
  {
    id: "mvp-growth",
    title: "MVP Growth",
    cardHeadline: "Grow after launch with positioning, funnel, and experiments.",
    subtitle:
      "For teams with a live product who need sharper messaging, distribution, and instrumentation—not random hacks.",
    priceAmount: "$2,500",
    typicalRange: "$2,500 – $25,000+",
    includedGroups: [
      {
        title: "Positioning & funnel",
        items: [
          "ICP & positioning synthesis",
          "Landing messaging & visuals",
          "Waitlist or demo booking flows",
          "Product analytics instrumentation",
        ],
      },
      {
        title: "Acquisition & community",
        items: [
          "Launch playbook & timelines",
          "Beta user outreach loops",
          "Cold outbound & DM strategy",
          "Founder LinkedIn/content kits",
          "Community & Product Hunt support",
        ],
      },
      {
        title: "Learn & iterate",
        items: [
          "Structured feedback rhythm",
          "Growth experiment backlog",
          "Conversion funnel recommendations",
        ],
      },
    ],
    ctaLabel: "Book a Call",
  },
];

/** Services grid on /services — MVP Development ↔ MVP Growth. */
export const services: Service[] = [
  {
    slug: "mvp-development",
    title: "MVP Development",
    subtitle: "Build your AI-powered MVP in 2 weeks",
    description:
      "For founders who need a functional product built fast. We help you turn your idea, prototype, or product concept into a working MVP with strategy, UX/UI, development, AI integrations, analytics, and deployment.",
    details: [
      "MVP strategy and scope",
      "UX/UI design",
      "Web app or mobile-first development",
      "AI/API integrations, auth, database, admin",
      "Launch landing page, analytics, deployment and handover",
    ],
    icon: "rocket",
  },
  {
    slug: "mvp-growth",
    title: "MVP Growth",
    subtitle: "Launch your MVP and get early users",
    description:
      "For founders who already have an MVP and need help turning it into traction. We help with positioning, landing pages, beta user acquisition, launch campaigns, analytics, and growth experiments.",
    details: [
      "Positioning and messaging",
      "Landing page optimization and launch strategy",
      "Beta user acquisition and outreach",
      "Product analytics and growth experiment roadmap",
    ],
    icon: "chart",
  },
];

/** 5-step process shown on /services. */
export const servicesPageProcessSteps: ProcessStep[] = [
  {
    number: "01",
    title: "Strategy",
    description:
      "We clarify the product idea, audience, use case, success metrics, and MVP scope.",
  },
  {
    number: "02",
    title: "Design",
    description:
      "We map the user journey and design the core product experience.",
  },
  {
    number: "03",
    title: "Build",
    description:
      "We develop the MVP using modern web, AI, and automation tools.",
  },
  {
    number: "04",
    title: "Launch",
    description:
      "We deploy the product and create the launch foundation.",
  },
  {
    number: "05",
    title: "Grow",
    description:
      "We help you attract users, collect feedback, and plan the next iteration.",
  },
];

export const processSteps: ProcessStep[] = [
  {
    number: "01",
    title: "Discovery",
    description:
      "We compress scope to the smallest MVP that proves value — founders, constraint, timeline, and what “done” looks like in two weeks when that’s the target.",
  },
  {
    number: "02",
    title: "Design",
    description:
      "Flows, UX, and system shape for an AI-assisted product prototype or investor-ready demo — before we commit the full implementation path.",
  },
  {
    number: "03",
    title: "Build",
    description:
      "We ship the web or mobile-first experience, integrations, AI surfaces, and staging-to-production pipelines with weekly visibility.",
  },
  {
    number: "04",
    title: "Launch",
    description:
      "Go-live support, instrumentation, launch landing pages aligned to onboarding, then optional MVP Growth once you’re in market.",
  },
];

export const ventures: Venture[] = [
  {
    name: "SoldTools",
    tagline: "The toolkit car sales teams run on.",
    description:
      "Live Studio product — web SaaS for the showroom floor: leads from 10+ sources, scheduling, deal context, referrals, and the ops glue teams actually use. Built with the same full-stack and growth lens we apply to client SaaS; we run it, support it, and improve it on our own roadmap.",
    status: "live",
    category: "Automotive / SaaS",
    metrics: "Production — app.soldtools.com",
    ctaLabel: "Open SoldTools",
    ctaHref: "https://app.soldtools.com/login",
    ctaExternal: true,
  },
];

export const portfolioProjects: PortfolioProject[] = [
  {
    client: "Taptok",
    title: "Digital Business Card & Networking App",
    description:
      "Built a full-stack SaaS platform with NFC tap-to-share, QR networking, AI-powered lead scoring, and team management — turning every interaction into a measurable business opportunity.",
    tags: [],
    type: "agency",
    category: "mobile-app",
    result: "Web App",
  },
  {
    client: "Apex Inspection Pro",
    title: "SaaS Platform for Home Inspectors",
    description:
      "Built a production-ready web app that lets inspectors capture property details, auto-fill report templates, and close jobs in one guided flow — eliminating incomplete reports for good.",
    tags: [],
    type: "agency",
    category: "web-app",
    result: "Web App",
  },
  {
    client: "TQMuch",
    title: "Nationwide Food Delivery Store",
    description:
      "Built a mobile-first ordering experience with catalog, fulfillment, and ops automation — a product-heavy MVP focused on repeatable delivery, not a generic storefront playbook.",
    tags: [],
    type: "agency",
    category: "web-app",
    result: "Mobile-first web app",
  },
  {
    client: "SoldTools",
    title: "Sales Intelligence Platform for Car Dealers",
    description:
      "A live in-house SaaS tool with lead capture, appointment scheduling, deal intelligence, and a referral engine — built and shipped at app.soldtools.com.",
    tags: [],
    type: "studio",
    category: "web-app",
    status: "live",
    result: "Web App",
  },
];

export const featuredProjects: FeaturedProject[] = [
  {
    client: "Taptok",
    title: "Digital Business Card & Networking App",
    description:
      "Built a full-stack SaaS platform with NFC tap-to-share, QR networking, AI-powered lead scoring, and team management — turning every interaction into a measurable business opportunity.",
    tags: [],
    type: "agency",
    category: "mobile-app",
    result: "Web App",
  },
  {
    client: "Apex Inspection Pro",
    title: "SaaS Platform for Home Inspectors",
    description:
      "Built a production-ready web app that lets inspectors capture property details, auto-fill report templates, and close jobs in one guided flow — eliminating incomplete reports for good.",
    tags: [],
    type: "agency",
    category: "web-app",
    result: "Web App",
  },
  {
    client: "TQMuch",
    title: "Nationwide Food Delivery Store",
    description:
      "Built a mobile-first ordering experience with catalog, fulfillment, and ops automation — a product-heavy MVP focused on repeatable delivery, not a generic storefront playbook.",
    tags: [],
    type: "agency",
    category: "web-app",
    result: "Mobile-first web app",
  },
  {
    client: "SoldTools",
    title: "Sales Intelligence Platform for Car Dealers",
    description:
      "A live in-house SaaS tool with lead capture, appointment scheduling, deal intelligence, and a referral engine — built and shipped at app.soldtools.com.",
    tags: [],
    type: "studio",
    category: "web-app",
    status: "live",
    result: "Web App",
  },
];

export const methodologyPillars: MethodologyPillar[] = [
  {
    number: "01",
    title: "Growth-First Architecture",
    description:
      "Every system I design is built to evolve. I don't over-engineer for hypothetical scale, but I architect with clear extension points so growth never requires a rewrite.",
    principles: [
      "Modular, composable system design",
      "Database schemas that accommodate future features",
      "API contracts designed for backward compatibility",
      "Infrastructure-as-code from day one",
    ],
  },
  {
    number: "02",
    title: "Data-Driven Decisions",
    description:
      "I embed analytics, monitoring, and feedback loops from the first sprint. Every feature ships with the instrumentation needed to measure its impact and inform the next iteration.",
    principles: [
      "Event tracking and user analytics built in",
      "A/B testing infrastructure from launch",
      "Performance monitoring and alerting",
      "Feedback loops that feed the product roadmap",
    ],
  },
  {
    number: "03",
    title: "Lean Velocity",
    description:
      "Speed matters, but not at the cost of quality. I ship the smallest meaningful increment, validate it with real users, and compound improvements over time.",
    principles: [
      "2-week sprint cycles with weekly demos",
      "Continuous integration and deployment",
      "Feature flags for safe, incremental rollouts",
      "Automated testing at every layer",
    ],
  },
  {
    number: "04",
    title: "Team Empowerment",
    description:
      "I don't just build and leave. My engagements include knowledge transfer, documentation, and architecture decisions that your team can own and extend.",
    principles: [
      "Pair programming and code reviews",
      "Comprehensive technical documentation",
      "Architecture decision records (ADRs)",
      "Runbooks for operations and incident response",
    ],
  },
];

export interface ServicePackage {
  title: string;
  description: string;
  timeline: string;
  icon: "brain" | "rocket" | "zap";
  deliverables: string[];
}

/** Phases for ServicePackages section (services / how it runs). */
export const servicePackages: ServicePackage[] = [
  {
    title: "Discovery & scope",
    icon: "brain",
    timeline: "1–2 weeks",
    description:
      "Founder workshop: users, constraints, riskiest assumptions, and the smallest demo-ready slice before code ships.",
    deliverables: [
      "Problem and user framing workshop",
      "Scope document and milestone outline",
      "Technical approach and stack fit",
      "Success metrics and rollout plan",
    ],
  },
  {
    title: "Build & integrate",
    icon: "rocket",
    timeline: "2–6+ weeks",
    description:
      "Ship the agreed slice end-to-end: UX, implementation, integrations, and deploy. Weekly demos so direction stays tight and feedback lands in the product.",
    deliverables: [
      "Working software in staging and production",
      "Integrations and data flows as scoped",
      "Basic analytics or ops hooks where needed",
      "Handoff notes for your team",
    ],
  },
  {
    title: "Launch & iterate",
    icon: "zap",
    timeline: "Ongoing",
    description:
      "Harden for real traffic, fix what breaks, and plan the next bets—whether that’s growth experiments, new features, or a retainer for steady velocity.",
    deliverables: [
      "Launch checklist and monitoring",
      "Bug fixes and performance passes",
      "Backlog for the next cycle",
      "Optional ongoing support or scale engagement",
    ],
  },
];

export const experienceStats = [
  { value: "15+", label: "Projects shipped" },
  { value: "9+", label: "Years of experience" },
  { value: "10+", label: "Client teams" },
  { value: "1", label: "Live in-house product" },
];

export type { BlogPost } from "./marketing/blog-posts";
export { blogPosts } from "./marketing/blog-posts";

export interface ResourceItem {
  title: string;
  description: string;
  href: string;
  tag: string;
  external?: boolean;
}

/** Curated links for /resources and the home Resources section */
export const resourceItems: ResourceItem[] = [
  {
    title: "Blog",
    description:
      "Notes on local growth: revenue leaks, tracking, reviews, referrals, ads, and proving ROI for service businesses.",
    href: "/blog",
    tag: "Writing",
  },
  {
    title: "Case studies",
    description:
      "Selected builds and growth work—product launches, web apps, and systems that scale.",
    href: "/case-studies",
    tag: "Work",
  },
  {
    title: "Pricing & FAQs",
    description:
      "Development, Growth, and Scale programs—scoped on a call.",
    href: "/pricing",
    tag: "Engagement",
  },
  {
    title: "LinkedIn",
    description:
      "Follow for updates on client work, SoldTools, and building software — Miami, FL.",
    href: "https://www.linkedin.com/company/zenpho",
    tag: "Profile",
    external: true,
  },
];
