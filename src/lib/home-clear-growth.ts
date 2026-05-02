export const homeClearGrowthEyebrow = "Real results";

export const homeClearGrowthHeadline = "What Clear Growth Looks Like";

/** Subheadline — accent word rendered in component */
export const homeClearGrowthSubheadParts = {
  before: "We don't just drive clicks. We deliver ",
  accent: "measurable",
  after: " business growth.",
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

/** Order matches homepage story: funnel → revenue → reputation → diagnostics */
export const homeClearGrowthMetricCards: ClearGrowthMetricCard[] = [
  { id: "leads", icon: "users", value: "84", label: "New leads generated", tone: "sky" },
  { id: "calls", icon: "phone", value: "42", label: "Calls from Google", tone: "teal" },
  { id: "quotes", icon: "fileText", value: "18", label: "Quote requests from landing pages", tone: "indigo" },
  { id: "appointments", icon: "calendar", value: "31", label: "Appointments booked", tone: "violet" },
  { id: "proposals", icon: "send", value: "16", label: "Proposals sent", tone: "cyan" },
  { id: "revenue", icon: "dollarSign", value: "$42,000", label: "Estimated revenue", tone: "emerald" },
  { id: "reviews", icon: "star", value: "9", label: "New Google reviews", tone: "amber" },
  { id: "jobs", icon: "handshake", value: "7", label: "Jobs won", tone: "blue" },
  { id: "referrals", icon: "userPlus", value: "5", label: "Referrals generated", tone: "orange" },
  { id: "missed", icon: "target", value: "11", label: "Missed opportunities identified", tone: "rose" },
];

export const homeClearGrowthSummaryItems = [
  {
    id: "best-channel",
    eyebrow: "Best Channel",
    value: "Google Business Profile",
    icon: "barChart3" as const,
  },
  {
    id: "biggest-opportunity",
    eyebrow: "Biggest Opportunity",
    value: "Proposal follow-up",
    icon: "alertTriangle" as const,
  },
] as const;

export const homeClearGrowthClosingLead =
  "This is the difference between marketing activity and ";

export const homeClearGrowthClosingAccent = "real business growth.";

export const homeClearGrowthFinalCtaHeadline = "Ready to Grow With More Clarity?";

export const homeClearGrowthFinalCtaBody =
  "Run your Revenue Leak Audit to see where opportunities are slipping through—or book a call and we’ll map the right next step.";
