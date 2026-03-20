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
    title: "SaaS & web applications",
    description:
      "Custom web applications your team and customers use daily — dashboards, account management, workflows, and the integrations that tie them to your business.",
    details: [
      "Authenticated experiences with role-based access and permissions",
      "Admin consoles, internal tools, and customer-facing product surfaces",
      "API design, third-party integrations, and data layer architecture",
      "Deployment, monitoring, and iteration after launch",
    ],
    icon: "code",
  },
  {
    title: "Ecommerce & online stores",
    description:
      "Online stores with catalog management, checkout, payments, and back-office tooling — so marketing and fulfillment can run without waiting on engineering.",
    details: [
      "Shopify themes, custom storefronts, or fully custom carts",
      "Product pages, inventory, tax, and shipping integrations",
      "Mobile-first checkout and conversion-focused UX",
      "Merchandising tools the team can operate day to day",
    ],
    icon: "store",
  },
  {
    title: "Mobile apps",
    description:
      "Native and cross-platform mobile products — React Native or Swift/Kotlin depending on your constraints. App Store submission, push, offline support, and iteration after launch.",
    details: [
      "React Native for cross-platform or Swift/Kotlin for native",
      "Push notifications, offline-first patterns, and background sync",
      "App Store and Play Store submission and review process",
      "Analytics, crash reporting, and post-launch iteration",
    ],
    icon: "rocket",
  },
  {
    title: "Websites & marketing sites",
    description:
      "Fast, well-built marketing and content sites. SEO-friendly, CMS-integrated, and wired to your analytics and CRM.",
    details: [
      "Next.js and modern static/dynamic rendering patterns",
      "CMS, forms, CRM, and analytics wired for your GTM team",
      "Accessibility and Core Web Vitals as defaults, not afterthoughts",
      "Content workflows that let non-technical teammates publish",
    ],
    icon: "compass",
  },
  {
    title: "AI features & integrations",
    description:
      "A growing part of what I build: LLM-powered features, search, automation, and retrieval added to products where they solve a real problem — not bolted on for the sake of it.",
    details: [
      "OpenAI and Anthropic integrations with structured outputs",
      "Search, summarization, and retrieval features in existing apps",
      "Workflow automation tied to your data and internal tools",
      "Evaluation, guardrails, and cost-aware architecture",
    ],
    icon: "brain",
  },
];

export const processSteps: ProcessStep[] = [
  {
    number: "01",
    title: "Discovery",
    description:
      "We align on users, constraints, and what success looks like — before anyone writes code.",
  },
  {
    number: "02",
    title: "Design & architecture",
    description:
      "Solution design covers UX, APIs, data models, and how the system should handle edge cases and failures.",
  },
  {
    number: "03",
    title: "Build & iterate",
    description:
      "Short cycles with visible progress: working software, feedback from your team, and adjustments along the way — not slide decks.",
  },
  {
    number: "04",
    title: "Launch & handoff",
    description:
      "Production rollout with monitoring, documentation, and a clear path for your team to operate and extend what we built.",
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
  { value: "15+", label: "Projects shipped" },
  { value: "9+", label: "Years building software" },
  { value: "10+", label: "Client teams" },
  { value: "1", label: "Live studio product" },
];

export const pricingTiers: PricingTier[] = [
  {
    name: "Flexible consultancy",
    description:
      "Senior guidance on software strategy, architecture, and what to build first — before you commit to a full engagement.",
    price: "From $2K",
    priceNote: "flexible hours",
    features: [
      "10+ hours you can use across strategy and review",
      "Direct access to a senior engineer (me)",
      "Architecture & feasibility review",
      "Technology and tooling evaluation",
      "Clear “what next?” roadmap",
    ],
    highlighted: false,
    cta: "Get started",
  },
  {
    name: "Proof of concept",
    description:
      "Validate the riskiest assumptions with a working slice — real data, real integrations, not a slide deck.",
    price: "$5K – $10K",
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
      "Full custom software: implementation, integration, deployment, and handoff so your team can run it in production.",
    price: "$10K – $50K",
    priceNote: "typical range",
    features: [
      "Roughly 3–4 month timeline (scope-dependent)",
      "End-to-end build: app, APIs, integrations, workflows",
      "Integration with your existing stack and data",
      "Training, documentation, and team handoff",
      "Performance, reliability, and production tuning",
      "Post-launch stabilization period",
    ],
    highlighted: true,
    badge: "Most popular",
    cta: "Build with me",
  },
  {
    name: "Enterprise scale",
    description:
      "Larger programs: multiple systems, phased releases, and ongoing optimization across workstreams.",
    price: "$50K – $100K",
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
    title: "Discovery & architecture",
    description:
      "Align on users, constraints, and risks before you fund a larger build — so scope matches what’s feasible.",
    icon: "brain",
    deliverables: [
      "Stakeholder workshops and success criteria",
      "Target architecture & integration map",
      "Technology shortlist with tradeoffs",
      "Written feasibility, risks, and “go / no-go” notes",
    ],
    timeline: "Typically 2–3 weeks",
  },
  {
    title: "Build, integrate & deploy",
    description:
      "Implementation of apps, APIs, and integrations with production deployment, monitoring, and documentation.",
    icon: "rocket",
    deliverables: [
      "Incremental releases toward staging / production",
      "Integration with auth, data stores, and internal APIs",
      "Evaluation hooks, logging, and basic monitoring",
      "Security-conscious defaults on all integration paths",
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
    content: `I'm not an AI researcher. I don't have 20+ agent deployments under my belt. I'm a software engineer who's been building web apps, SaaS platforms, and ecommerce stores for nine years — and I'm now figuring out where AI genuinely helps in that work.

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
      "The real story of scaling a product from zero to enterprise clients like AT&T, NASA, and Harvard — and what it taught me about building software that grows.",
    date: "2026-02-05",
    readTime: "6 min read",
    category: "Product Growth",
    content: `TapTok was the project that taught me the most about what happens after you ship. We grew it from zero to 15,000 customers, landing accounts at AT&T, Harvard University, NASA, Authentic Brands Group, and thousands of small businesses. The technical challenges were real, but the growth lessons were more valuable.

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
      "Selected client builds in production — SaaS platforms, ecommerce stores, and dashboards.",
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
      "SoldTools — a live product for car sales teams, built alongside client work.",
    href: "/studio",
    tag: "Product",
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
