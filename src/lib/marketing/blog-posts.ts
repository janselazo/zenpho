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
    slug: "scope-leaks-that-kill-mvp-timelines",
    title: "The scope leaks that quietly kill MVP timelines",
    excerpt:
      "Frozen requirements are a myth. When “just one more thing” slips in without a tradeoff, timelines slip—and the launch you promised investors or early users slips with them.",
    date: "2026-04-22",
    readTime: "6 min read",
    category: "Product",
    content: `Most MVPs die from **quiet scope growth**, not from engineering speed.

## Leaks start in the backlog

“A small admin page,” “quick CSV export,” or “just match what Notion does for sharing” rarely stay small once real users arrive. Without a ruthless **in / out list** for version one, every edge case feels reasonable—and the backlog quietly doubles.

## Leaks hide in unnamed owners

Someone needs to decide error states, empty states, who gets notified when something breaks, and what “done” means in production. When those choices float, engineers improvise—or wait—while calendar weeks burn.

## “We’ll polish later” piles up

Animation, onboarding, and instrumentation look optional until demo day or first paying users. Deferred polish turns into rework under pressure, exactly when you have the least slack.

## What to do first

Lock a **narrow outcome** (“book a call,” “complete checkout,” “issue an invite”). Cut anything that doesn’t serve that spine in v1 **or** pair every add with something you remove.

That is how an MVP stays shippable—and how an agency + product studio can stand behind an actual date.`,
  },
  {
    slug: "focused-discovery-sprint-what-you-get",
    title: "What a focused discovery sprint actually leaves you with",
    excerpt:
      "Discovery is not a workshop trophy. Done well you leave with a prioritized problem statement, UX direction, architecture sketch, and a build plan tied to milestones you can defend.",
    date: "2026-04-10",
    readTime: "5 min read",
    category: "Playbooks",
    content: `Discovery exists to **de-risk spend**—yours and ours—not to produce another slide deck.

## Before a single sprint of build

Strong discovery answers: Who is this for? What outcome proves we should keep investing? Which integrations and constraints are immovable?

We map journeys at the level that matters—**signup, core job, monetization edge**—and flag where ambiguity will force expensive guesses later.

## What we actually produce

Depending on stakes, outputs may include prioritized user stories with acceptance sketches, UX wireflows for the critical paths, API and data-shape notes aligned with your CRM or auth choices, environments and release expectations, and a **milestone backlog** grounded in staffing reality.

This is intentionally practical: your team—and ours—knows what “first shippable” means.

## How teams act on it

Some teams pause and self-build against the plan; others engage for **design + build + launch** with checkpoints at demo, staged rollout, and handoff. Either way you stop funding guesswork—you fund a backlog with accountable slices.

Treat discovery as procurement for momentum, not a ceremony. Done right, everyone can explain what ships first and why.`,
  },
  {
    slug: "instrumentation-that-matters-after-you-ship",
    title: "Instrumentation that matters once you ship",
    excerpt:
      "Pageviews spike early and then lie. Sustainable products instrument funnels around your real job-to-be-done so you fix the right bottleneck after launch.",
    date: "2026-03-28",
    readTime: "6 min read",
    category: "Engineering",
    content: `“Things look fine” is not an operating rhythm. Instrumentation aligns product, design, and eng around **truth that forces decisions**.

## Start from the funnel, not the dashboard

Identify the shortest path that proves value—for example **visit → signup → activate → pay**—and ensure each step has an event worth defending in code review.

If nobody knows which event constitutes “activated,” dashboards only decorate arguments.

## Tag releases and experiments

Cheap wins: annotate deploys against metrics, cohort new users cleanly, segment web vs native if you ship both. Naming conventions beat clever charts when you revisit the funnel at 11 p.m.

## Review telemetry like a backlog

Weekly or biweekly, ask which step regressed after the last ship, whether errors spiked along with churn, which paths never complete. Tie each finding to **one** prioritized fix—not a swarm of guesses.

Instrumentation is boring until revenue or retention depends on it. Build it beside the MVP, not six months later when you wish you’d measured activation instead of vanity.`,
  },
  {
    slug: "early-users-feedback-and-launch-credibility",
    title: "Early users, feedback loops, and launch credibility",
    excerpt:
      "Design partners will forgive rough edges—they will not forgive feeling ignored. Credibility compounds when you acknowledge feedback fast and funnel it back into visible shipping.",
    date: "2026-03-12",
    readTime: "5 min read",
    category: "Launch",
    content: `The first cohort does not owe you praise—they owe you honesty if you earn it through **attention and pacing**.

## Build a humane feedback lane

Prefer a crisp channel—a shared doc, Slack, or predictable office hours—to random DMs scattered across screenshots. Lightweight status notes (“accepted / duplicate / roadmap / not planned + why”) build trust faster than silence.

## Close the loop in public-ish ways

Changelogs or short Loom summaries show early adopters they moved the roadmap. Psychological safety matters: people share sharper feedback when they see it matter before you ask again.

## Credibility stacks with reliability

Deployments that fail quietly, flaky magic links, and surprise breaking changes chew trust faster than any missing feature demo. Operational hygiene is chapter one of positioning as a credible **product studio**.

## Measure qualitative like product

Track **sessions held**, **patterns raised**, **items shipped**. Your second cohort inherits the seriousness of how you handled the first.

Momentum is cumulative—what you demonstrate in responsiveness often matters more than a single flashy release.`,
  },
  {
    slug: "before-you-scale-marketing-ship-the-core",
    title: "Before you scale acquisition, nail the core product loop",
    excerpt:
      "Paid traffic buys attention for what already works. Shoveling clicks at a leaky activation path teaches expensive lessons—not traction.",
    date: "2026-02-20",
    readTime: "5 min read",
    category: "Strategy",
    content: `Scaling spend before the **core loop** is reliable is how teams mistake activity for traction.

## “Ready” is behavioral

Acquisition makes sense once new users reliably reach activation, retention on early cohorts is not hiding behind founder hand-holding, and support load is observable.

Otherwise you widen the funnel for a leaky bucket.

## Tight loops beat hero campaigns

Test smaller experiments—segmented onboarding, sharper empty states, a pricing page clarification—against **conversion and retention** before you widen channel mix.

Spend should answer specific hypotheses, not “more logo impressions.”

## Protect velocity with checkpoints

Establish simple gates—support ticket themes, churn reasons, instrumentation gaps—between spend increases.

If fundamentals wobble—auth edge cases, mobile parity, flaky payments—marketing amplifies churn, not conviction.

Acquisition is arithmetic on top of a product experience. Solve the numerator first; widen the denominator only once the numerator holds.`,
  },
];
