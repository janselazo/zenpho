export type HomeGrowthAchieveCard = {
  id: string;
  title: string;
  description: string;
  imageSrc: string;
  imageLabel: string;
};

export const homeGrowthAchieveSectionEyebrow = "What we deliver";

export const homeGrowthAchieveHeadline = "Outcomes from a disciplined MVP sprint";

export const homeGrowthAchieveDescription =
  "Not scattered tasks—a sequenced path from clarity to shipped software: scope, UX, build, launch prep, and handoff so stakeholders see real progress every week.";

export const homeGrowthAchieveCards: HomeGrowthAchieveCard[] = [
  {
    id: "qualified-leads",
    title: "Scope you can actually ship",
    description:
      "A prioritized version-one slice with clear acceptance criteria—so engineering time buys a demoable product, not endless exploration.",
    imageSrc: "/home-growth-achieve/qualified-leads.svg",
    imageLabel: "Roadmap & priorities",
  },
  {
    id: "appointments",
    title: "UX/UI for hero workflows",
    description:
      "Screens, flows, and components aligned to how users adopt your product—not decorative mockups disconnected from behavior.",
    imageSrc: "/home-growth-achieve/appointments.svg",
    imageLabel: "Core journeys designed",
  },
  {
    id: "paying-clients",
    title: "Production-ready implementation",
    description:
      "Staging-backed builds with disciplined QA: fewer surprises at launch and a product your team can click through end-to-end.",
    imageSrc: "/home-growth-achieve/paying-clients.svg",
    imageLabel: "Staging demos",
  },
  {
    id: "revenue",
    title: "Auth, data & integrations",
    description:
      "Login, roles, database modeling, APIs, payments or booking when scoped—wired so your MVP behaves like real software.",
    imageSrc: "/home-growth-achieve/revenue.svg",
    imageLabel: "Foundations in place",
  },
  {
    id: "reviews",
    title: "Launch readiness",
    description:
      "Performance checks, analytics foundations for public surfaces, deployment support, and documentation so go-live isn’t a scramble.",
    imageSrc: "/home-growth-achieve/reviews.svg",
    imageLabel: "Release checklist",
  },
  {
    id: "referrals",
    title: "Support after go-live",
    description:
      "A defined post-launch window and handoff so you can stabilize with users—and plan the next build wave with evidence.",
    imageSrc: "/home-growth-achieve/referrals.svg",
    imageLabel: "Handoff & iteration",
  },
];
