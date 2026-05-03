/**
 * Copy for CRM "coming soon" placeholder routes (see CrmComingSoonPage).
 * Icons are resolved by key in CrmComingSoonPage.
 */
export type PlaceholderPageKey =
  | "products-services"
  | "estimates"
  | "invoices"
  | "reporting-sales-performance"
  | "reporting-revenue-attribution"
  | "reporting-reviews-referrals"
  | "referrals-partners"
  | "referrals-rewards"
  | "reviews-review-requests"
  | "reviews-feedback";

export type PlaceholderPageCopy = {
  iconKey: string;
  title: string;
  description: string;
  features: string[];
};

export const PLACEHOLDER_PAGE_COPY: Record<PlaceholderPageKey, PlaceholderPageCopy> = {
  "products-services": {
    iconKey: "package",
    title: "Products & Services",
    description:
      "A sales-ready catalog of offerings, packages, and price books — distinct from the delivery pipeline you manage under Work → Products (List / Pipeline).",
    features: [
      "SKUs, service bundles, and default pricing tied to proposals and estimates",
      "Publish what you sell without mixing it with in-flight client build stages",
      "One catalog that stays aligned when Work → Products cards move through Backlog → Release",
      "Hooks into Proposals, Estimates, and Invoices as those modules mature",
    ],
  },
  estimates: {
    iconKey: "calculator",
    title: "Estimates",
    description:
      "Build branded estimates from Products & Services, send for approval, and convert wins to proposals — without leaving Zenpho.",
    features: [
      "Line items tied to your catalog and default terms",
      "Client-facing PDF and e-approve flow",
      "One-click convert to proposal or invoice when you close",
    ],
  },
  invoices: {
    iconKey: "receipt",
    title: "Invoices",
    description:
      "Issue invoices, track payments, and keep finance aligned with what you sold through Sales.",
    features: [
      "Stripe-ready payment links and status tracking",
      "Sync with proposals and accepted estimates",
      "Export and accounting handoff when integrations land",
    ],
  },
  "reporting-sales-performance": {
    iconKey: "trendingUp",
    title: "Sales performance",
    description:
      "Pipeline velocity, win rates, and rep-level performance in one view — built on your CRM and proposal activity.",
    features: [
      "Deals opened, won, and lost by stage and source",
      "Cycle time and forecast rollups",
      "Exports for leadership and QBRs",
    ],
  },
  "reporting-revenue-attribution": {
    iconKey: "pieChart",
    title: "Revenue attribution",
    description:
      "Connect marketing touchpoints to booked revenue so you can double down on what actually pays.",
    features: [
      "Channel and campaign contribution models",
      "First-touch vs assisted conversion views",
      "Ties to appointments, proposals, and closed deals",
    ],
  },
  "reporting-reviews-referrals": {
    iconKey: "star",
    title: "Reviews & referrals",
    description:
      "See review momentum, referral invites, and partner-sourced pipeline alongside core growth KPIs.",
    features: [
      "Review volume and platform mix over time",
      "Referral campaign performance",
      "Partner-influenced opportunities (when Partner CRM ships)",
    ],
  },
  "referrals-partners": {
    iconKey: "handshake",
    title: "Referral partners",
    description:
      "Manage agencies, referrers, and rev-share relationships with shared visibility into introduced deals.",
    features: [
      "Partner directory with owners and tiers",
      "Co-marketing and intro tracking",
      "Pipeline sourced or influenced by each partner",
    ],
  },
  "referrals-rewards": {
    iconKey: "gift",
    title: "Rewards",
    description:
      "Automate thank-yous, spiffs, and milestone rewards when referrals convert — keep partners motivated.",
    features: [
      "Rule-based rewards when deals hit stages",
      "Partner-facing reward history",
      "Lightweight fulfillment tracking",
    ],
  },
  "reviews-review-requests": {
    iconKey: "mailPlus",
    title: "Review requests",
    description:
      "Send timed review requests after jobs complete, tied to Google Business Profile and your Playbook.",
    features: [
      "SMS and email templates with one-tap review links",
      "Triggers from Appointments or Completed deals",
      "Delivery and click tracking",
    ],
  },
  "reviews-feedback": {
    iconKey: "messageCircle",
    title: "Feedback",
    description:
      "Collect private feedback and NPS-style signals before problems hit public reviews.",
    features: [
      "Short post-service surveys mapped to contacts",
      "Alerting for low scores so you can recover fast",
      "Trends by service line or team",
    ],
  },
};
