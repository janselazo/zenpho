import { platformIncludedInAllPlans } from "@/lib/marketing/local-service-pricing-plans";

export type PricingComparisonPlanId = "setup" | "growth-engine" | "full-partner";

export type PricingComparisonCells = Record<PricingComparisonPlanId, boolean>;

export type PricingComparisonFeatureRow = {
  id: string;
  label: string;
  tooltip?: string;
  cells: PricingComparisonCells;
};

export type PricingComparisonSection = {
  id: string;
  heading: string;
  rows: PricingComparisonFeatureRow[];
};

const allPlans: PricingComparisonCells = {
  setup: true,
  "growth-engine": true,
  "full-partner": true,
};

const growScale: PricingComparisonCells = {
  setup: false,
  "growth-engine": true,
  "full-partner": true,
};

const scaleOnlyCells: PricingComparisonCells = {
  setup: false,
  "growth-engine": false,
  "full-partner": true,
};

const launchOnlyCells: PricingComparisonCells = {
  setup: true,
  "growth-engine": false,
  "full-partner": false,
};

function platformFoundationRows(): PricingComparisonFeatureRow[] {
  return platformIncludedInAllPlans.map((item, i) => ({
    id: `platform-${i}`,
    label: item.label,
    tooltip: item.tooltip,
    cells: { ...allPlans },
  }));
}

export const pricingComparisonSections: PricingComparisonSection[] = [
  {
    id: "platform_core",
    heading: "Platform",
    rows: [
      ...platformFoundationRows(),
      {
        id: "plat-paid-pipeline",
        label: "Paid-lead pipeline & advertising dashboards",
        tooltip:
          "Unified views that tie ad spend to captured leads and booked appointments—introduced once Grow is active.",
        cells: { ...growScale },
      },
      {
        id: "plat-deep-automation",
        label: "Advanced workflows, multi-pipelines, proposal automation",
        tooltip:
          "Complex automation paths, extra pipelines, and deeper proposal tooling for mature sales teams on Scale.",
        cells: { ...scaleOnlyCells },
      },
      {
        id: "plat-team-priority",
        label: "Team seats & priority support",
        tooltip: "Additional operator seats plus faster response windows for Scale clients.",
        cells: { ...scaleOnlyCells },
      },
    ],
  },
  {
    id: "launch_deliverables",
    heading: "Launch",
    rows: [
      {
        id: "ln-strategy-brand",
        label: "Strategy onboarding, brand direction, email guidance, site messaging",
        tooltip:
          "Kickoff working session, starter palette/type/messaging, domain/email guidance, and service-page storylines.",
        cells: { ...launchOnlyCells },
      },
      {
        id: "ln-website",
        label: "3 to 5 page website with booking/lead capture + analytics",
        tooltip:
          "Mobile-friendly build with homepage, services, about, contact, and a dedicated booking/lead page wired into Zenpho.",
        cells: { ...launchOnlyCells },
      },
      {
        id: "ln-gbp",
        label: "Google Business Profile setup or optimization",
        tooltip:
          "Categories, services, hours, creative assets, service areas, Maps fundamentals, and review-request workflow setup tied to Zenpho.",
        cells: { ...launchOnlyCells },
      },
      {
        id: "ln-local-seo",
        label: "Local SEO foundation, schema, Search Console, citations",
        tooltip:
          "Keyword discovery, on-page fundamentals, metadata, structured data where possible, analytics + GSC wiring, starter directories.",
        cells: { ...launchOnlyCells },
      },
      {
        id: "ln-social-foundation",
        label: "Social foundation + starter content library",
        tooltip:
          "FB/IG optimization, branded cover/profile art, and 8–12 launch posts/templates scheduled through Zenpho.",
        cells: { ...launchOnlyCells },
      },
      {
        id: "ln-monthly-rhythm",
        label: "Monthly site care, social/GBP posts, review monitoring, performance report",
        tooltip:
          "Hosting/maintenance, light content updates, four social posts, two GBP updates, review monitoring, and reporting.",
        cells: { ...launchOnlyCells },
      },
    ],
  },
  {
    id: "grow_leadgen",
    heading: "Grow",
    rows: [
      {
        id: "gr-ads",
        label: "Google & Meta ads management + retargeting",
        tooltip:
          "Always-on campaign builds, testing, and budget stewardship across Search/Social placements with retargeting layers.",
        cells: { ...growScale },
      },
      {
        id: "gr-landing",
        label: "Dedicated landing page + offer & CTA strategy",
        tooltip:
          "Conversion-focused page for paid traffic with forms routed into Zenpho, click-to-call, and booking embeds.",
        cells: { ...growScale },
      },
      {
        id: "gr-tracking",
        label: "Tag Manager, analytics, call/form/conversion tracking",
        tooltip:
          "Full instrumentation for CPL math, including call and form events feeding reporting inside Zenpho.",
        cells: { ...growScale },
      },
      {
        id: "gr-automation",
        label: "Lead follow-up automations & nurture sequences",
        tooltip:
          "Missed-call SMS, new-lead outreach, reminders, no-show reduction, and pipeline-aware sequences.",
        cells: { ...growScale },
      },
      {
        id: "gr-ops",
        label: "Weekly optimizations + monthly strategy & performance review",
        tooltip:
          "Hands-on budget/creative iteration weekly with a standing monthly call to review pipeline quality.",
        cells: { ...growScale },
      },
    ],
  },
  {
    id: "scale_growth",
    heading: "Scale",
    rows: [
      {
        id: "sc-paid-advanced",
        label: "Advanced paid acquisition (LSA, YouTube/video, multi-offer testing)",
        tooltip:
          "Layered programs across additional networks with structured testing matrices for offers and audiences.",
        cells: { ...scaleOnlyCells },
      },
      {
        id: "sc-seo-growth",
        label: "Local SEO growth, content, citations, competitor intelligence",
        tooltip:
          "Ongoing local authority work, page expansion, competitive benchmarking, and review growth initiatives.",
        cells: { ...scaleOnlyCells },
      },
      {
        id: "sc-cro",
        label: "Conversion optimization & experimentation",
        tooltip:
          "Landing and site experiments (A/B tests, CTA/form tuning) plus tooling recommendations like heatmaps when useful.",
        cells: { ...scaleOnlyCells },
      },
      {
        id: "sc-sales",
        label: "Sales process design, scoring, reactivation, proposal ops",
        tooltip:
          "Pipeline tuning, lead scoring, win-back plays, proposal automation guidance, and script coaching.",
        cells: { ...scaleOnlyCells },
      },
      {
        id: "sc-reputation",
        label: "Reputation, referral, and customer monetization programs",
        tooltip:
          "Always-on review generation, escalation playbooks, referral campaigns, and past-customer promotions.",
        cells: { ...scaleOnlyCells },
      },
      {
        id: "sc-reporting",
        label: "Advanced reporting, attribution, quarterly planning",
        tooltip:
          "Executive-ready dashboards, booked-appointment economics, and quarterly roadmap sessions beyond monthly calls.",
        cells: { ...scaleOnlyCells },
      },
    ],
  },
];
