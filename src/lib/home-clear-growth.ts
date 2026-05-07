export const homeClearGrowthEyebrow = "LAUNCH OUTCOMES";

export const homeClearGrowthHeadline = "What a Clean Product Launch Looks Like";

/** Subheadline — accent word rendered in component */
export const homeClearGrowthSubheadParts = {
  before: "We do not just design concepts. We deliver a ",
  accent: "working",
  after: " product with the core pieces needed to test, launch, and improve.",
} as const;

export type ClearGrowthMetricIcon =
  | "users"
  | "phone"
  | "fileText"
  | "calendar"
  | "send"
  | "dollarSign"
  | "star"
  | "handshake"
  | "userPlus"
  | "target";

/** Visual tone for icon chip + metric number (bars removed; color carries hierarchy) */
export type ClearGrowthMetricTone =
  | "sky"
  | "teal"
  | "indigo"
  | "violet"
  | "cyan"
  | "emerald"
  | "amber"
  | "blue"
  | "orange"
  | "rose";

export type ClearGrowthMetricCard = {
  id: string;
  icon: ClearGrowthMetricIcon;
  value: string;
  label: string;
  tone: ClearGrowthMetricTone;
};

/** Illustrative launch snapshot — not a guaranteed outcome */
export const homeClearGrowthMetricCards: ClearGrowthMetricCard[] = [
  { id: "live-product", icon: "users", value: "1", label: "Live product launched", tone: "sky" },
  { id: "core-flows", icon: "phone", value: "5", label: "Core user flows built", tone: "teal" },
  { id: "screens-designed", icon: "fileText", value: "12", label: "Pages or screens designed", tone: "indigo" },
  { id: "integrations", icon: "calendar", value: "3", label: "Integrations connected", tone: "violet" },
  { id: "admin-dashboard", icon: "send", value: "1", label: "Admin dashboard included", tone: "cyan" },
  {
    id: "mobile-responsive",
    icon: "dollarSign",
    value: "100%",
    label: "Mobile responsive experience",
    tone: "emerald",
  },
  { id: "payment-flow", icon: "star", value: "1", label: "Payment or booking flow", tone: "amber" },
  { id: "analytics", icon: "handshake", value: "1", label: "Analytics setup completed", tone: "blue" },
  { id: "launch-support", icon: "userPlus", value: "90", label: "Days of launch support", tone: "orange" },
  { id: "roadmap-next", icon: "target", value: "Next", label: "Version roadmap defined", tone: "rose" },
];

export const homeClearGrowthSummaryItems = [
  {
    id: "best-next-step",
    eyebrow: "Best Next Step",
    value: "Launch with real users",
    icon: "barChart3" as const,
  },
  {
    id: "biggest-opportunity",
    eyebrow: "Biggest Opportunity",
    value: "Improve from feedback",
    icon: "alertTriangle" as const,
  },
] as const;

export const homeClearGrowthClosingLead =
  "This is the difference between an idea and a ";

export const homeClearGrowthClosingAccent = "working product people can actually use.";

export const homeClearGrowthFinalCtaHeadline = "Ready to Launch Your Product With Clarity?";

export const homeClearGrowthFinalCtaBody =
  "Tell us what you want to build — website, web app, mobile app, or MVP — and we'll help you map the fastest path from idea to launch.";
