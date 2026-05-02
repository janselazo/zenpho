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

export type ClearGrowthMetricCard = {
  id: string;
  icon: ClearGrowthMetricIcon;
  value: string;
  label: string;
  /** Referrals uses brand orange (matches product pillar) */
  accent?: "orange";
};

/** Order matches homepage story: funnel → revenue → reputation → diagnostics */
export const homeClearGrowthMetricCards: ClearGrowthMetricCard[] = [
  { id: "leads", icon: "users", value: "84", label: "New leads generated" },
  { id: "calls", icon: "phone", value: "42", label: "Calls from Google" },
  { id: "quotes", icon: "fileText", value: "18", label: "Quote requests from landing pages" },
  { id: "appointments", icon: "calendar", value: "31", label: "Appointments booked" },
  { id: "proposals", icon: "send", value: "16", label: "Proposals sent" },
  { id: "revenue", icon: "dollarSign", value: "$42,000", label: "Estimated revenue" },
  { id: "reviews", icon: "star", value: "9", label: "New Google reviews" },
  { id: "jobs", icon: "handshake", value: "7", label: "Jobs won" },
  { id: "referrals", icon: "userPlus", value: "5", label: "Referrals generated", accent: "orange" },
  { id: "missed", icon: "target", value: "11", label: "Missed opportunities identified" },
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
