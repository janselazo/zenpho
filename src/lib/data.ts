export interface Service {
  title: string;
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

export interface TechItem {
  name: string;
  category: string;
}

export interface FeaturedProject {
  /** Company or brand name (shown above the project title). */
  client?: string;
  title: string;
  description: string;
  tags: string[];
  type: "agency" | "studio";
  result?: string;
}

export type ProjectCategory =
  | "mobile-app"
  | "web-app"
  | "ai-agent"
  | "saas-platform"
  | "data-platform"
  | "automation";

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

export interface PricingTier {
  name: string;
  description: string;
  price: string;
  priceNote: string;
  features: string[];
  highlighted: boolean;
  cta: string;
  /** Ribbon label, e.g. "Most Popular" */
  badge?: string;
}

export interface ServicePackage {
  title: string;
  description: string;
  icon: string;
  deliverables: string[];
  timeline: string;
}

export const services: Service[] = [
  {
    title: "AI development for web apps",
    description:
      "Custom web applications with AI at the core: agents, RAG, copilots, and dashboards your team uses daily—not bolt-on demos.",
    details: [
      "LLM features, tool use, retrieval, and structured outputs in the browser",
      "Admin consoles, internal ops tools, and customer-facing SaaS surfaces",
      "APIs, auth, and observability suited to production model calls",
      "Guardrails, evaluation hooks, and cost-aware architecture",
    ],
    icon: "code",
  },
  {
    title: "iOS & Android apps",
    description:
      "Native and cross-platform mobile products with AI where it helps: on-device patterns, secure sync, and polished App Store delivery.",
    details: [
      "Swift/Kotlin and React Native paths depending on your constraints",
      "AI-assisted flows: capture, summarization, recommendations, voice-ready UX",
      "Push, offline-first patterns, and enterprise MDM considerations",
      "Store submission, analytics, and iteration after launch",
    ],
    icon: "rocket",
  },
  {
    title: "Website development",
    description:
      "Fast, credible marketing and content sites—performance, SEO-friendly structure, and integrations to your stack.",
    details: [
      "Next.js / modern static and dynamic patterns",
      "CMS, forms, CRM, and analytics wired the way your GTM team needs",
      "Optional AI search, chat, or content workflows where they add real value",
      "Accessibility and Core Web Vitals as defaults, not afterthoughts",
    ],
    icon: "compass",
  },
  {
    title: "Store development",
    description:
      "Ecommerce and online store builds: Shopify, headless commerce, or custom checkout flows with catalog, payments, and ops integrations.",
    details: [
      "Shopify themes, custom storefronts, or fully custom carts",
      "Inventory, tax, shipping, and marketplace connector patterns",
      "AI merchandising, support assistants, and personalized journeys",
      "Conversion-focused UX and analytics from day one",
    ],
    icon: "store",
  },
  {
    title: "AI solutions",
    description:
      "End-to-end AI solutions—especially autonomous and semi-autonomous agents that connect to your data, tools, and approval paths.",
    details: [
      "Multi-step agents with tools, memory, and human-in-the-loop checkpoints",
      "Workflow automation across CRM, docs, ticketing, and internal APIs",
      "RAG, fine-tuning, and model routing when quality demands it",
      "Security reviews, logging, and runbooks your team can operate",
    ],
    icon: "brain",
  },
];

export const processSteps: ProcessStep[] = [
  {
    number: "01",
    title: "Discovery",
    description:
      "We align on users, constraints, and success metrics—especially around data, compliance, and how AI should behave in the real world.",
  },
  {
    number: "02",
    title: "Design & architecture",
    description:
      "Solution design covers UX, APIs, model boundaries, evaluation, and how the system fails safely when models or integrations misbehave.",
  },
  {
    number: "03",
    title: "Build & iterate",
    description:
      "Short cycles with visible progress: working software, traced prompts and tools, and feedback from your team—not slide decks.",
  },
  {
    number: "04",
    title: "Launch & handoff",
    description:
      "Production rollout with monitoring, cost and quality dashboards, documentation, and a clear path for your team to operate and extend.",
  },
];

export const ventures: Venture[] = [
  {
    name: "SoldTools",
    tagline: "The toolkit car sales teams run on.",
    description:
      "A live studio product: lead capture from 10+ sources, appointment scheduling, deal intelligence, and a referral engine—built for the showroom, not generic CRM slides.",
    status: "live",
    category: "Automotive / SaaS",
    metrics: "Production app — car sales professionals",
    ctaLabel: "Open SoldTools",
    ctaHref: "https://app.soldtools.com/login",
    ctaExternal: true,
  },
];

export const techStack: TechItem[] = [
  { name: "Next.js", category: "Frontend" },
  { name: "React", category: "Frontend" },
  { name: "React Native", category: "Mobile" },
  { name: "TypeScript", category: "Language" },
  { name: "Python", category: "Language" },
  { name: "Node.js", category: "Backend" },
  { name: "PostgreSQL", category: "Database" },
  { name: "OpenAI", category: "AI" },
  { name: "LangChain", category: "AI" },
  { name: "AWS", category: "Cloud" },
  { name: "Docker", category: "DevOps" },
  { name: "Kubernetes", category: "DevOps" },
  { name: "TensorFlow", category: "AI" },
  { name: "Prisma", category: "ORM" },
  { name: "Redis", category: "Database" },
  { name: "Vercel", category: "Cloud" },
  { name: "GraphQL", category: "API" },
  { name: "Supabase", category: "Backend" },
];

export const portfolioProjects: PortfolioProject[] = [
  // Client case studies (current engagements)
  {
    client: "Apex Inspection Pro",
    title: "SaaS home inspection platform",
    description:
      "Shipped a production SaaS web application so inspectors capture residential and commercial property details, bind the right report template, and complete structured sections—roof, attic, electrical, plumbing, interior, and more—in one guided flow. Outcome: a single source of truth per job, fewer incomplete reports, and a product the team can extend without re-platforming.",
    tags: ["SaaS", "Inspections", "Web app"],
    type: "agency",
    category: "saas-platform",
    result: "Production launch",
  },
  {
    client: "TQMuch",
    title: "SaaS product & customer dashboard",
    description:
      "Built the core web app and dashboard around their SaaS offer: authenticated experiences, account lifecycle, and integrations aligned with how end customers actually adopt the product. Outcome: faster onboarding for new accounts, clearer ownership of product vs. admin surfaces, and a codebase structured for the next feature wave.",
    tags: ["SaaS", "Dashboard", "APIs"],
    type: "agency",
    category: "saas-platform",
    result: "Shipped to active users",
  },
  {
    client: "Craveclean",
    title: "Ecommerce store & catalog operations",
    description:
      "End-to-end online store with merchandising-friendly catalog, PDPs tuned for clarity, checkout and payments, and back-office patterns so marketing and fulfillment could update the catalog without waiting on deploys. Outcome: live commerce with a storefront the brand runs day to day.",
    tags: ["Ecommerce", "Store", "Checkout"],
    type: "agency",
    category: "web-app",
    result: "Live commerce",
  },
  {
    client: "USRallyStripes",
    title: "Automotive ecommerce storefront",
    description:
      "Rally- and automotive-themed ecommerce build focused on speed, mobile checkout, and catalog organization for kits, accessories, and seasonal drops. Outcome: a store that stays fast under traffic spikes and gives the team levers to merchandise without engineering every change.",
    tags: ["Ecommerce", "Automotive", "Performance"],
    type: "agency",
    category: "web-app",
    result: "Store live",
  },
  {
    client: "BeZazzy",
    title: "Customer-facing SaaS web application",
    description:
      "Delivered a multi-tenant style SaaS experience with sign-in, role-aware UI, and API-backed workflows so the client could onboard users, iterate features, and scale usage without a ground-up rewrite. Outcome: production environment ready for growth and handoff documentation their team can own.",
    tags: ["SaaS", "Product", "TypeScript"],
    type: "agency",
    category: "saas-platform",
    result: "Production launch",
  },
  {
    title: "SoldTools",
    description:
      "Live studio product for car sales teams: lead capture from multiple sources, appointment scheduling, deal intelligence, and a referral engine—shipping in production at app.soldtools.com.",
    tags: ["SaaS", "Automotive", "Web app"],
    type: "studio",
    category: "saas-platform",
    status: "live",
    result: "Production app",
  },
];

export const featuredProjects: FeaturedProject[] = [
  {
    client: "Apex Inspection Pro",
    title: "SaaS web application",
    description:
      "An intuitive, easy-to-use SaaS web app for inspection teams: enter residential or commercial property details, select the inspection report tied to that property, and work through the categories in that report—roof, attic, electrical, plumbing, interior, and more—so every run follows the same clear structure.",
    tags: ["SaaS", "Web app", "Inspections"],
    type: "agency",
    result: "Production launch",
  },
  {
    client: "TQMuch",
    title: "SaaS platform & dashboard",
    description:
      "Web application and dashboard for a SaaS offer: core product UX, account management patterns, and integrations that match how their customers work day to day.",
    tags: ["SaaS", "Dashboard", "Web"],
    type: "agency",
    result: "Shipped to users",
  },
  {
    client: "Craveclean",
    title: "Ecommerce store",
    description:
      "Full online store: catalog and PDPs, checkout and payments, and day-to-day tooling so the brand could run merchandising and fulfillment without blocking on engineering.",
    tags: ["Ecommerce", "Store", "Checkout"],
    type: "agency",
    result: "Live commerce",
  },
  {
    client: "USRallyStripes",
    title: "Ecommerce storefront",
    description:
      "Automotive rally–focused ecommerce: fast storefront, mobile-first buying flows, and catalog structure for kits, accessories, and drops the team can merchandise easily.",
    tags: ["Ecommerce", "Automotive", "Performance"],
    type: "agency",
    result: "Store live",
  },
  {
    client: "BeZazzy",
    title: "SaaS web application",
    description:
      "Customer-facing SaaS web app with sign-in, role-aware screens, and API-backed workflows—so the team could onboard users, ship features, and grow without a rewrite.",
    tags: ["SaaS", "Web app", "Product"],
    type: "agency",
    result: "Production launch",
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

export const experienceStats = [
  { value: "50+", label: "Projects delivered" },
  { value: "9+", label: "Years building software" },
  { value: "30+", label: "Client teams" },
  { value: "1", label: "Live studio product" },
];

export const pricingTiers: PricingTier[] = [
  {
    name: "Flexible consultancy",
    description:
      "Senior guidance on AI software strategy, architecture, and what to build first—before you lock in a full engagement.",
    price: "From $3K",
    priceNote: "flexible hours",
    features: [
      "10+ hours you can use across strategy and review",
      "Direct access to a senior engineer (me)",
      "Architecture & feasibility review",
      "Model, vendor, and tooling evaluation",
      "Clear “what next?” roadmap",
    ],
    highlighted: false,
    cta: "Get started",
  },
  {
    name: "Proof of concept",
    description:
      "Validate the riskiest technical assumptions with a working slice—real data path, real integrations, not a slide deck.",
    price: "$20K – $30K",
    priceNote: "typical range",
    features: [
      "Roughly 6–8 week timeline",
      "Working prototype you can test internally",
      "Technical feasibility & integration notes",
      "Risk and constraint assessment",
      "Short post-delivery support window",
    ],
    highlighted: false,
    cta: "Plan a PoC",
  },
  {
    name: "Production ready",
    description:
      "Full custom AI software: implementation, integration, deployment, and handoff so your team can run it in production.",
    price: "$50K – $150K",
    priceNote: "typical range",
    features: [
      "Roughly 3–4 month timeline (scope-dependent)",
      "End-to-end build: app, APIs, agents, workflows",
      "Integration with your stack and data boundaries",
      "Training, documentation, and operator handoff",
      "Performance, reliability, and cost-aware tuning",
      "Post-launch stabilization period",
    ],
    highlighted: true,
    badge: "Most popular",
    cta: "Build with me",
  },
  {
    name: "Enterprise scale",
    description:
      "Larger programs: multiple systems, stricter governance, and ongoing optimization across workstreams.",
    price: "$150K – $300K+",
    priceNote: "program-based",
    features: [
      "6+ month timelines for complex portfolios",
      "Multiple workstreams or phased releases",
      "Advanced integrations and operational guardrails",
      "Dedicated cadence: demos, milestones, reporting",
      "Ongoing optimization after initial launch",
      "Priority response for production issues",
    ],
    highlighted: false,
    cta: "Discuss scope",
  },
];

export const servicePackages: ServicePackage[] = [
  {
    title: "AI discovery & architecture",
    description:
      "Align on use cases, data reality, model choices, and risks before you fund a larger build—so scope matches what’s feasible.",
    icon: "brain",
    deliverables: [
      "Stakeholder workshops and success criteria",
      "Target architecture & integration map",
      "Model / vendor shortlist with tradeoffs",
      "Written feasibility, risks, and “go / no-go” notes",
    ],
    timeline: "Typically 2–3 weeks",
  },
  {
    title: "Build, integrate & deploy",
    description:
      "Implementation of agents, APIs, apps, and automations with production deployment, observability, and guardrails.",
    icon: "rocket",
    deliverables: [
      "Incremental releases toward staging / production",
      "Integration with auth, data stores, and internal APIs",
      "Evaluation hooks, logging, and basic monitoring",
      "Security-conscious defaults on AI and tool paths",
    ],
    timeline: "Scoped to PoC or production tier",
  },
  {
    title: "Enablement & iteration",
    description:
      "Documentation, training, and a clear runway for your team to operate and extend the system after go-live.",
    icon: "zap",
    deliverables: [
      "Runbooks and operator-focused documentation",
      "Knowledge transfer sessions",
      "Prioritized improvement backlog",
      "Optional ongoing advisory or sprint blocks",
    ],
    timeline: "Overlaps launch; extends as needed",
  },
];

export interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  date: string;
  readTime: string;
  category: string;
  content: string;
}

export const blogPosts: BlogPost[] = [
  {
    slug: "why-growth-mindset-matters-in-software",
    title: "Why Growth Mindset Matters More Than Your Tech Stack",
    excerpt:
      "The frameworks you choose matter less than how you architect for change. Here's how I embed growth thinking into every project from day one.",
    date: "2026-03-01",
    readTime: "6 min read",
    category: "Methodology",
    content: `The tech industry obsesses over stack choices. React vs. Vue. PostgreSQL vs. MongoDB. AWS vs. GCP. But after 9+ years of building software that scales, I've learned that the most important decision isn't which tools you pick — it's whether your architecture can evolve when your assumptions change.

## The Growth Mindset in Engineering

Growth mindset in software isn't about positive thinking. It's a concrete set of engineering practices:

**1. Design for extension, not perfection.**
Every module I build has clear boundaries and interfaces. When requirements change (and they always do), I extend rather than rewrite. This means modular architectures, well-defined APIs, and database schemas with room to breathe.

**2. Instrument everything.**
You can't improve what you can't measure. From the very first sprint, I bake in analytics, error tracking, and performance monitoring. This isn't overhead — it's the foundation for every future optimization.

**3. Ship small, learn fast.**
The biggest risk in software isn't a bug in production — it's building the wrong thing. I ship the smallest meaningful increment, measure its impact, and let data drive the next iteration.

## What This Looks Like in Practice

When I built a legal AI platform for a top-tier law firm, I didn't try to automate everything at once. I started with contract clause extraction — one narrow, high-value use case. Within 3 weeks, lawyers were using it daily. Within 3 months, I'd expanded to risk analysis, obligation tracking, and multi-document comparison.

The architecture supported this expansion because I'd designed for it from the start. Not by over-engineering, but by making extension cheap and safe.

## The Takeaway

Your tech stack is a tool. Your growth mindset is a strategy. Invest in architecture that bends, teams that learn, and processes that compound improvements over time.

That's my approach.`,
  },
  {
    slug: "ai-agents-practical-guide",
    title: "AI Agents in Production: A Practical Guide for 2026",
    excerpt:
      "Beyond the hype — what actually works when deploying AI agents in real business workflows. Lessons from 20+ agent deployments.",
    date: "2026-02-18",
    readTime: "8 min read",
    category: "AI Engineering",
    content: `AI agents are the most overhyped and most underestimated technology of 2026. The gap between demo-ware and production-ready agents is enormous — and most teams learn this the hard way.

## What I've Learned from 20+ Deployments

After shipping AI agents across legal, fintech, healthcare, and e-commerce, here are the patterns that actually work:

**Start narrow, expand gradually.**
The most successful agents do one thing exceptionally well. A contract review agent. An expense categorization agent. A customer support triage agent. Resist the temptation to build a "general purpose" agent.

**Build guardrails before capabilities.**
Every agent needs output validation, human-in-the-loop checkpoints, and fallback paths. The first thing I build isn't the agent — it's the safety net.

**Optimize for latency, not just accuracy.**
A 98% accurate agent that responds in 2 seconds beats a 99.5% accurate agent that takes 30 seconds. Users will tolerate occasional errors far more than consistent slowness.

## The Architecture Pattern

My standard agent architecture looks like this:

1. **Intent classifier** — understands what the user is asking
2. **Tool router** — selects the right tool/API for the task
3. **Execution engine** — runs the action with proper error handling
4. **Output validator** — checks the result before returning to the user
5. **Feedback loop** — logs everything for continuous improvement

Each layer is independently testable, replaceable, and monitorable. When a new LLM drops, I swap the model — not the architecture.

## Common Pitfalls

- **Over-relying on prompting:** Prompt engineering hits a ceiling. At some point, you need better tools and retrieval, not longer prompts.
- **Ignoring cost:** A single complex agent call can cost $0.50+ in API fees. At scale, architecture decisions become cost decisions.
- **Skipping evaluation:** If you can't measure agent quality systematically, you can't improve it systematically.

The companies winning with AI agents in 2026 are the ones treating them as engineering problems, not magic.`,
  },
  {
    slug: "mvp-mistakes-founders-make",
    title: "5 MVP Mistakes That Kill Startups Before Launch",
    excerpt:
      "Most MVPs fail not because of bad ideas, but because of bad execution. Here are the traps I see founders fall into — and how to avoid them.",
    date: "2026-02-05",
    readTime: "5 min read",
    category: "Startups",
    content: `I've built 50+ MVPs. Some became funded startups. Some pivoted into something better. A few didn't make it. The difference almost never comes down to the idea — it comes down to execution.

## Mistake #1: Building Too Much

The "minimum" in MVP exists for a reason. I regularly see founders with 30-feature specs for their "MVP." The result? Six months of development, a bloated product, and no market validation.

**Fix:** Define the one core workflow that proves your thesis. Build that. Ship it. Learn.

## Mistake #2: Choosing Tech for Scale Day One

You don't need Kubernetes. You don't need microservices. You don't need a data lake. Not yet. Over-engineering your infrastructure burns cash and slows you down when speed is your only competitive advantage.

**Fix:** Start with a monolith. Use managed services. Optimize for developer velocity, not theoretical scale.

## Mistake #3: Skipping Design

"We'll make it pretty later" is a death sentence. Users form opinions in milliseconds. A functional but ugly MVP signals "amateur." You don't need a design system — you need intentional, clean design on your core screens.

**Fix:** Invest 1-2 weeks in UI/UX for your critical path. Use a component library. Make it feel professional.

## Mistake #4: No Analytics From Day One

If you launch without analytics, you're flying blind. Every click, every drop-off, every conversion — this data is the entire point of an MVP.

**Fix:** Set up event tracking before launch. Define your key metrics. Build a dashboard you check daily.

## Mistake #5: Building in Isolation

The founders who succeed talk to users before, during, and after building. The ones who disappear into a cave for 6 months usually emerge with a product nobody wants.

**Fix:** Share early. Get feedback weekly. Let user behavior — not your assumptions — guide the roadmap.

Building an MVP is an exercise in disciplined restraint. Build less, learn more, iterate faster. That's how startups win.`,
  },
  {
    slug: "building-studio-ventures",
    title: "Inside My Studio: How I Choose What to Build",
    excerpt:
      "A behind-the-scenes look at how I identify opportunities, validate ideas, and go from concept to product.",
    date: "2026-01-20",
    readTime: "7 min read",
    category: "Studio",
    content: `Running an agency and a venture studio simultaneously gives me an unfair advantage: I see problems across dozens of industries every year. The best studio ideas don't come from brainstorming sessions — they come from patterns I notice while building for clients.

## The Opportunity Filter

Not every good idea deserves to become a product. I filter opportunities through four lenses:

**1. Is there a 10x AI improvement possible?**
If AI can only deliver a marginal improvement, it's not worth building a product around. I look for workflows where AI can fundamentally change the economics — 10x faster, 10x cheaper, 10x more accessible.

**2. Is the market underserved?**
I avoid crowded markets. Instead, I look for industries where the existing tools are outdated, fragmented, or built for a different era.

**3. Can a small team win?**
Some markets require enterprise sales teams, regulatory approvals, and massive capital. I target opportunities where a great product can win through self-serve adoption and word of mouth.

**4. Do I have domain insight?**
My agency work gives me deep exposure to specific industries. When I've seen the same problem across 5 different clients, that's a signal.

## From Idea to Venture

Once an idea passes the filter, I follow a structured process:

**Week 1-2: Thesis validation.** Research, user interviews, competitive analysis. The goal is to confirm or kill the idea quickly.

**Week 3-6: Prototype.** A working prototype that tests the core value proposition with real users. Not a landing page — an actual product.

**Week 7-12: Beta.** Iterate based on real usage. Define metrics. Find product-market fit signals.

**Month 4+: Scale or sunset.** If the metrics are there, I invest. If not, I document the learnings and move on.

## The Portfolio Today

- **SoldTools** (Live) — a production toolkit for car sales teams: lead capture, scheduling, deal intelligence, and referrals—shipping at app.soldtools.com.

The studio isn't a side project — it's core to my work. Each product I ship adds to my thesis that focused software, with AI where it earns its place, can reshape how teams work day to day.`,
  },
  {
    slug: "technical-debt-startup-guide",
    title: "Technical Debt Is Not the Enemy — Bad Debt Is",
    excerpt:
      "Stop treating all technical debt as a failure. Strategic debt is a tool. Here's how to tell the difference and manage it intentionally.",
    date: "2026-01-08",
    readTime: "5 min read",
    category: "Engineering",
    content: `"We need to pay down our technical debt" is the battle cry of every engineering team. But not all technical debt is created equal, and treating it as a monolithic problem leads to the wrong solutions.

## Good Debt vs. Bad Debt

**Strategic debt** is intentional. You chose a simpler implementation because speed-to-market mattered more than architectural purity. You documented the trade-off. You have a plan to address it. This is like a business loan — leverage that accelerates growth.

**Accidental debt** is unintentional. It accumulates from shortcuts nobody documented, patterns that diverged over time, and knowledge that left with former team members. This is like credit card debt — it compounds and suffocates.

## The Framework I Use

I categorize debt into four buckets:

**1. Architecture debt** — Structural decisions that limit future capabilities. High impact, high cost to fix. Address before it blocks a critical initiative.

**2. Code quality debt** — Messy code that slows development. Medium impact, medium cost. Address incrementally during feature work.

**3. Dependency debt** — Outdated libraries, EOL frameworks, security vulnerabilities. Variable impact, usually manageable. Schedule regular updates.

**4. Knowledge debt** — Undocumented systems, tribal knowledge, unclear ownership. Invisible until someone leaves. Address continuously.

## Managing Debt Intentionally

The goal isn't zero debt — it's intentional debt with a repayment plan:

- **Document every shortcut** at the time you take it. A TODO comment isn't documentation — an ADR is.
- **Budget 20% of each sprint** for debt repayment. Non-negotiable. If you skip it, the compound interest will eat your velocity.
- **Quantify the cost.** "This hack adds 2 hours to every deployment" is actionable. "We have tech debt" is not.

Technical debt is a tool, not a failure. The founders and teams who manage it intentionally build faster and more sustainably than those who either avoid it completely or let it accumulate unchecked.`,
  },
];

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
      "Articles on AI agents, production engineering, and shipping software that holds up after launch.",
    href: "/blog",
    tag: "Writing",
  },
  {
    title: "Case studies",
    description:
      "Selected client builds in production—agents, apps, and platforms.",
    href: "/case-studies",
    tag: "Work",
  },
  {
    title: "Pricing & FAQs",
    description:
      "Packages, typical timelines, and answers to how engagements are structured.",
    href: "/pricing",
    tag: "Engagement",
  },
  {
    title: "Studio",
    description:
      "SoldTools—live product for car sales teams—built alongside client work, separate from agency delivery.",
    href: "/studio",
    tag: "Product",
  },
  {
    title: "Newsletter",
    description:
      "Short updates on agents, product craft, and what works in production—no fluff.",
    href: "/#newsletter",
    tag: "Subscribe",
  },
  {
    title: "LinkedIn",
    description:
      "Follow for Zenpho, custom AI work, and growth topics—Miami / Fort Lauderdale.",
    href: "https://www.linkedin.com/in/janselazo",
    tag: "Profile",
    external: true,
  },
];

export interface NavLinkItem {
  label: string;
  href: string;
  /** Nested items shown under this link (e.g. Resources mega-menu). */
  children?: NavLinkItem[];
}

export const navLinks: NavLinkItem[] = [
  { label: "Services", href: "/services" },
  { label: "Case Studies", href: "/case-studies" },
  { label: "Studio", href: "/studio" },
  {
    label: "Resources",
    href: "/resources",
    children: [
      { label: "Pricing", href: "/pricing" },
      { label: "About Me", href: "/about" },
      { label: "Blog", href: "/blog" },
    ],
  },
  { label: "Contact", href: "/contact" },
];
