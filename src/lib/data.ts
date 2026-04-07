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

export interface TechItem {
  name: string;
  category: string;
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

/** Single offering on the pricing page (one starting price + highlights). */
export interface DevelopmentPricingOffering {
  id: string;
  title: string;
  subtitle: string;
  /** Formatted dollar amount, e.g. "$1,000" */
  priceAmount: string;
  /** Shown after price, e.g. "starting" */
  priceSuffix?: string;
  /** Middle / highlighted tier in the grid */
  featured?: boolean;
  features: string[];
}

/** Development offerings in ascending price order for the pricing grid. */
export const developmentPricingOfferings: DevelopmentPricingOffering[] = [
  {
    id: "websites-development",
    title: "Custom Websites",
    subtitle:
      "Marketing sites, landing pages, and company presence — fast to ship, on-brand, and built to convert.",
    priceAmount: "$2,500",
    priceSuffix: "starting",
    features: [
      "Discovery and IA scoped to your audience, goals, and primary calls to action",
      "Responsive layouts, performance-minded frontend, and accessible UI patterns",
      "Contact and lead capture, analytics hooks, and SEO-friendly structure as scoped",
      "Staging preview, launch checklist, and handoff so you can update copy or use a light CMS",
      "Slack channel + post-launch support window",
    ],
  },
  {
    id: "web-apps",
    title: "Web Apps",
    subtitle: "SaaS, dashboards, and internal tools — built to scale with usage.",
    priceAmount: "$5,000",
    priceSuffix: "starting",
    featured: true,
    features: [
      "Auth, roles, and production-ready patterns",
      "APIs, integrations, and data models as scoped",
      "Phased delivery with weekly milestones — ship a usable slice, then extend",
      "CI-friendly codebase your team can extend",
      "Slack channel + post-launch support window",
    ],
  },
  {
    id: "mobile-apps",
    title: "Mobile Apps",
    subtitle: "iOS, Android, or both",
    priceAmount: "$7,000",
    priceSuffix: "starting",
    features: [
      "Cross-platform or native by scope",
      "App Store / Play submission support",
      "Push, offline patterns, and core native hooks",
      "Mobile-first UI/UX and accessibility",
      "Slack channel + post-launch support window",
    ],
  },
];

/** Full-width row below the main 3-column pricing grid. */
export const aiAutomationsPricingOffering: DevelopmentPricingOffering = {
  id: "ai-automations",
  title: "AI Automations",
  subtitle:
    "Workflows, agents, and integrations that reduce manual work — scoped with guardrails, logging, and handoff your team can run.",
  priceAmount: "$3,000",
  priceSuffix: "starting",
  features: [
    "Discovery focused on one high-ROI automation or assistive workflow",
    "LLM or deterministic steps with human approval where revenue or customers are involved",
    "Hooks into your stack: CRM, email, spreadsheets, webhooks, or custom APIs as scoped",
    "Retries, error surfacing, and basic observability so failures aren’t silent",
    "Runbook-style handoff so you can extend, pause, or retrain safely",
    "Slack channel + post-launch support window",
  ],
};

/** Services grid on /services — Custom Websites → Web Apps → Mobile Apps → AI Automations. */
export const services: Service[] = [
  {
    slug: "websites-development",
    title: "Custom Websites",
    subtitle: "A site that reflects your brand and drives the next step",
    description:
      "We design and build marketing sites, landing pages, and company presence on the web — clear story, strong calls to action, and fast, accessible pages your team can evolve without a rebuild every quarter.",
    details: [
      "Structure and messaging aligned to who you’re for, what you want them to do, and what proof they need to see",
      "Modern frontend stack with performance, accessibility, and SEO hygiene baked in — not bolted on after launch",
      "Forms, tracking, and handoff patterns that fit how you sell: book a call, request a quote, or join a list",
    ],
    icon: "globe",
  },
  {
    slug: "web-applications",
    title: "Web Apps",
    subtitle: "SaaS, dashboards, and internal tools",
    description:
      "SaaS, dashboards, and internal tools — secure, maintainable, and ready to grow with real traffic and real users.",
    details: [
      "Next.js / React, APIs, auth, roles, and production patterns",
      "Performance, observability, and CI-friendly delivery",
      "Handoff your team can extend — no mystery box codebase",
    ],
    icon: "code",
  },
  {
    slug: "mobile-apps",
    title: "Mobile Apps",
    subtitle: "iOS, Android, or both",
    description:
      "iOS and Android when the product belongs in someone’s pocket — including offline-first when the job doesn’t stop at the signal bar.",
    details: [
      "React Native or native where constraints demand it",
      "Push, store submission, and post-launch iteration",
      "Aligned with the same metrics mindset as your web product",
    ],
    icon: "rocket",
  },
  {
    slug: "ai-automations",
    title: "AI Automations",
    subtitle: "Workflows and integrations that reduce manual work — safely",
    description:
      "We scope and build automations that combine AI where it helps with deterministic steps where it must: CRM and email hooks, webhooks, internal tools, and guarded multi-step flows your team can run and extend.",
    details: [
      "One high-ROI workflow per engagement — discovery, approvals where money or customers are involved, and observability so failures aren’t silent",
      "Connects to your stack: spreadsheets, SaaS APIs, custom backends, and LLM-assisted steps with clear boundaries",
      "Handoff and runbooks so you can pause, extend, or retrain without vendor lock-in on every tweak",
    ],
    icon: "brain",
  },
];

export const processSteps: ProcessStep[] = [
  {
    number: "01",
    title: "Discovery",
    description:
      "We listen to your idea, understand your goals, and define the scope of your product in a single strategy call.",
  },
  {
    number: "02",
    title: "Design",
    description:
      "We create the structure and visual flow of your product so you can see exactly what we're building before we write a single line of code.",
  },
  {
    number: "03",
    title: "Build",
    description:
      "Our team develops your fully functional website, web app, or mobile app fast, clean, and built to scale.",
  },
  {
    number: "04",
    title: "Launch",
    description:
      "We deliver your working software product, support you through go-live, and make sure everything works perfectly from day one.",
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
      "Built a mobile-first ordering experience with a full product catalog, temperature-controlled shipping, and automated fulfillment — so the team focuses on the food, not the orders.",
    tags: [],
    type: "agency",
    category: "ecommerce",
    result: "Ecommerce Website",
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
      "Built a mobile-first ordering experience with a full product catalog, temperature-controlled shipping, and automated fulfillment — so the team focuses on the food, not the orders.",
    tags: [],
    type: "agency",
    category: "ecommerce",
    result: "Ecommerce Website",
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
      "Align on users, outcomes, and constraints. Map the smallest shippable slice, risks, and how success will be measured before writing production code.",
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
    slug: "nine-years-shipping-custom-software",
    title: "What I've Learned from Nine Years of Shipping Custom Software",
    excerpt:
      "The technical decisions matter less than you think. What actually determines whether a project ships well comes down to a few things most engineers overlook.",
    date: "2026-03-01",
    readTime: "6 min read",
    category: "Engineering",
    content: `After nine years of building custom software for startups and growing teams, the lessons that stick aren't about frameworks or architecture patterns. They're about the unglamorous stuff that determines whether a project actually ships and survives contact with real users.

## Understand the business before you write code

The single biggest predictor of project success isn't technical skill — it's how well you understand what the client's business actually needs. I've watched talented engineers build beautiful systems that solved the wrong problem because nobody slowed down to ask the right questions in week one.

Every project I take on now starts with discovery: who are the users, what does success look like, and what constraints are non-negotiable? It sounds obvious, but skipping this step is the most common and most expensive mistake I see.

## Scope tightly, then tighter

Clients almost always want more than they need for launch. My job is to find the smallest version of the product that proves the core value — and ship that first. The features you leave out of v1 are just as important as the ones you include.

I've learned this the hard way. Early in my career, I'd agree to ambitious scopes and then scramble to deliver. Now I push back on scope before the first commit. It makes the work better and the relationship healthier.

## Handoffs are the real deliverable

Code that only I can maintain isn't a product — it's a dependency. Every project I ship includes documentation, clear architecture decisions, and patterns that the client's team can extend. The measure of a good engagement isn't how impressive the code is — it's how smoothly the client can operate without me.

## Technology choices should be boring

I use Next.js, React, TypeScript, PostgreSQL, and a handful of well-understood tools for almost everything. Not because they're trendy, but because they're predictable. When you're building for a client, surprises are expensive. Boring technology that ships reliably beats exciting technology that introduces unknown risks.

## The pattern that keeps showing up

The projects that go well share a few traits: tight scope, honest communication, and a builder who cares about what happens after launch. The ones that struggle usually have too much scope, too little alignment, or an engineer who's more interested in the technology than the outcome.

Nine years in, that's the lesson I keep re-learning.`,
  },
  {
    slug: "adding-ai-to-my-toolkit-honestly",
    title: "Why I'm Adding AI to My Toolkit (Honestly)",
    excerpt:
      "I'm a traditional software builder learning to use AI where it helps. Here's what I've found actually works, what's hype, and how I think about it.",
    date: "2026-02-18",
    readTime: "7 min read",
    category: "AI & Software",
    content: `I'm not an AI researcher. I don't have 20+ agent deployments under my belt. I'm a software engineer who's been building web apps, SaaS platforms, and customer-facing products for nine years — and I'm now figuring out where AI genuinely helps in that work.

I'm writing this because most AI content online falls into two camps: breathless hype from people selling AI services, or deep technical content from ML engineers. There's not much written for builders like me — people who ship products and want to know where AI fits in honestly.

## What I've actually used AI for

So far, the AI features I've built or integrated into client projects are modest but real:

**Search and retrieval.** Adding semantic search to an existing product so users can find things by meaning, not just keywords. This works well and is relatively straightforward to implement with embeddings and a vector store.

**Content generation helpers.** Giving users a starting point for text fields — product descriptions, report summaries, form pre-fills. Not replacing human judgment, but reducing blank-page friction.

**Structured data extraction.** Pulling structured information out of unstructured text — invoices, inspection reports, customer messages. This is where LLMs shine for me: messy real-world input, clean structured output.

## What I'm skeptical about

**Autonomous agents in production.** The demos are impressive, but giving an AI agent real authority over production systems still feels premature for most of the teams I work with. The failure modes are hard to predict and harder to debug.

**AI as a core value proposition.** For most products, AI is a feature, not the product. If the underlying software doesn't work well, adding AI won't save it.

**Replacing developers.** AI makes me faster at certain tasks — boilerplate, research, debugging. But the hard parts of software engineering — understanding requirements, making architectural tradeoffs, communicating with stakeholders — are still entirely human problems.

## How I'm approaching it

I'm treating AI the way I'd treat any new technology: learn it by building with it, be honest about what I don't know, and only add it to client projects when it solves a real problem. I'm not going to reposition my entire practice around AI just because it's the current hype cycle.

The builders who will do well with AI are the ones who already know how to ship software. AI is a powerful new tool, but it doesn't replace the fundamentals.`,
  },
  {
    slug: "lessons-from-taptok-growth",
    title: "Lessons from Growing TapTok to 15,000 Customers",
    excerpt:
      "The real story of scaling a product from zero to enterprise clients like AT&T, Coral Gables City, and Harvard — and what it taught me about building software that grows.",
    date: "2026-02-05",
    readTime: "6 min read",
    category: "Product Growth",
    content: `TapTok was the project that taught me the most about what happens after you ship. We grew it from zero to 15,000 customers, landing accounts at AT&T, Harvard University, Coral Gables City, Authentic Brands Group, and thousands of small businesses. The technical challenges were real, but the growth lessons were more valuable.

## The product had to work for everyone

Our customer base ranged from solo shop owners to enterprise teams with procurement processes and security reviews. Building for that range forced us to think carefully about onboarding, permissions, and how different users experience the same product.

The biggest lesson: onboarding is the product. If someone can't get value in their first session, nothing else matters — not features, not performance, not design. We rewrote our onboarding three times before it worked.

## Enterprise and SMB are different planets

Selling to AT&T is nothing like selling to a local business. Enterprise needs security documentation, admin controls, and a sales process that can take months. SMBs need to sign up and get value in minutes.

We made the mistake of trying to serve both with the same experience early on. Eventually we learned to create separate paths — self-serve for SMBs, high-touch for enterprise — while keeping the core product the same.

## Growth comes from the product, not from marketing

The channels that actually drove growth for us were referrals and word of mouth. Paid acquisition was expensive and the users it brought churned faster. The users who stuck were the ones who came because someone they trusted told them about it.

This taught me that the best growth investment is making the product genuinely useful. Everything else — campaigns, content, partnerships — amplifies good product-market fit but can't create it.

## What I carry forward

TapTok shaped how I build software today. Every project I take on, I think about: how does this onboard? How does this scale from one user to a thousand? What happens when a team with different needs tries to use it?

These aren't just product questions — they're architecture questions. The way you structure your database, your auth system, your API — all of it should account for growth, not just the current use case.`,
  },
  {
    slug: "building-soldtools-alongside-client-work",
    title: "Building SoldTools: Shipping Your Own Product Alongside Client Work",
    excerpt:
      "How I built and launched a live SaaS product for car sales teams while running client engagements — and what I'd do differently.",
    date: "2026-01-20",
    readTime: "6 min read",
    category: "Studio",
    content: `SoldTools is my own product — a toolkit for car sales professionals that handles lead capture, appointment scheduling, deal intelligence, and referrals. It's live at app.soldtools.com and being used by real salespeople.

Building it alongside client work was one of the hardest things I've done. Here's what that actually looks like.

## Why I built it

Client work is rewarding, but it's always someone else's product. I wanted to experience the full cycle — identifying a problem, building the solution, getting it into users' hands, and iterating based on real feedback. SoldTools came from noticing that car sales teams were using a patchwork of spreadsheets, generic CRMs, and text messages to manage their pipeline.

The existing tools weren't built for how car salespeople actually work. They needed something faster, simpler, and designed around the showroom workflow — not adapted from generic sales software.

## The reality of building two things at once

I won't sugarcoat it: it's hard. Client work pays the bills and deserves full attention. SoldTools gets evenings, weekends, and the gaps between engagements. There were months where it barely moved forward.

What made it possible was keeping the scope small. SoldTools doesn't try to be a full CRM. It does a few things well — lead capture from multiple sources, scheduling, and deal tracking — and leaves the rest alone.

## What I learned from being my own client

Building your own product teaches you things client work can't. When you're the one fielding support requests and watching usage analytics, you develop a different relationship with the code. Every shortcut you took during development comes back to visit you personally.

It also made me a better client-work builder. I'm more honest about timelines, more careful about documentation, and more focused on building things that can be maintained long-term.

## What I'd do differently

I'd ship even smaller. The first version of SoldTools had features nobody used because I assumed they'd be important. The features that actually stuck were the ones I built after watching salespeople use the early version.

I'd also set clearer boundaries between client time and product time. In the beginning, I'd context-switch constantly, which made both worse. Now I batch my SoldTools work into dedicated blocks.

SoldTools is still growing, and I'm still learning from it. That's the point.`,
  },
  {
    slug: "how-i-scope-projects-to-ship",
    title: "How I Scope Projects So They Actually Ship",
    excerpt:
      "Most software projects fail because of scope, not skill. Here's the process I use to keep builds focused and get them into production.",
    date: "2026-01-08",
    readTime: "5 min read",
    category: "Process",
    content: `The most common reason software projects fail isn't bad code or the wrong technology — it's scope. Too much of it, too vaguely defined, with too many stakeholders pulling in different directions. After years of watching this pattern, I've developed a process for scoping that keeps projects focused and shippable.

## Start with the outcome, not the feature list

When a client comes to me, they usually have a list of features they want. My first job is to figure out what outcome those features are supposed to produce. Sometimes the feature list is right. More often, there's a simpler path to the same outcome.

The question I always ask: "If this project is successful, what's different for your users in three months?" That answer becomes the north star. Every feature either serves it or doesn't.

## Phase everything

No matter the project size, I break it into phases. Phase one is always the smallest version that delivers real value. Not a prototype, not a demo — actual working software that real users can use.

This serves two purposes: it validates that we're building the right thing, and it builds trust. When a client sees working software in weeks instead of months, the rest of the engagement goes smoother.

## Write down what you're not building

The most useful document in any project isn't the spec — it's the "out of scope" list. Explicitly naming the things you've decided not to build prevents scope creep and gives you something concrete to point to when new ideas come up mid-project.

I keep this list visible and reference it in every status update. It's not about saying no to good ideas — it's about saying "not yet" so the current phase can ship cleanly.

## Budget for the unknowns

Every project has surprises — a third-party API that doesn't work as documented, a database migration that's more complex than expected, a user flow that needs rethinking after testing. I build buffer into every estimate, and I'm transparent with clients about it.

The projects that ship on time aren't the ones with perfect estimates — they're the ones with honest estimates and a process for handling the inevitable surprises.

## The common failure mode

The pattern I see most often with projects that stall: the team agrees on a large scope, starts building, hits unexpected complexity in month two, and then spends months in a cycle of "almost done" without ever shipping. By the time something launches, the original requirements have changed and morale is low.

Phased delivery breaks this cycle. You ship early, adjust, and keep momentum. It's less dramatic than a big reveal, but it works.`,
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
      "Writing on shipping software, working with clients, and lessons from nine years of building products.",
    href: "/blog",
    tag: "Writing",
  },
  {
    title: "Case studies",
    description:
      "Selected client builds in production — SaaS platforms, MVPs, and dashboards.",
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
      "In-house products like SoldTools — experiments we ship on our own roadmap alongside client work.",
    href: "/studio",
    tag: "Studio",
  },
  {
    title: "Newsletter",
    description:
      "Occasional notes on shipping products, working with clients, and what I’m learning.",
    href: "/#newsletter",
    tag: "Subscribe",
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

export interface NavLinkItem {
  label: string;
  href: string;
  /** Nested items shown under this link (e.g. Resources mega-menu). */
  children?: NavLinkItem[];
}

/** Primary header: About → Work → Services → Pricing → Studio. */
export const headerNavLinks: NavLinkItem[] = [
  { label: "About", href: "/about" },
  { label: "Work", href: "/case-studies" },
  { label: "Services", href: "/services" },
  { label: "Pricing", href: "/pricing" },
  { label: "Studio", href: "/studio" },
];

/** Footer: same primary links as header. */
export const footerNavLinks: NavLinkItem[] = [
  { label: "About", href: "/about" },
  { label: "Work", href: "/case-studies" },
  { label: "Services", href: "/services" },
  { label: "Pricing", href: "/pricing" },
  { label: "Studio", href: "/studio" },
  { label: "Blog", href: "/blog" },
  { label: "Contact", href: "/contact" },
  { label: "Privacy", href: "/privacy" },
  { label: "Terms", href: "/terms" },
];
