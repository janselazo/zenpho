import { platformIncludedInAllPlans } from "@/lib/marketing/local-service-pricing-plans";

export type PricingComparisonPlanId = "setup" | "growth-engine" | "full-partner";

export type PricingComparisonCells = Record<PricingComparisonPlanId, boolean>;

export type PricingComparisonFeatureRow = {
  id: string;
  label: string;
  /** Short explanation shown in the comparison tooltip */
  tooltip?: string;
  cells: PricingComparisonCells;
};

export type PricingComparisonSection = {
  id: string;
  heading: string;
  rows: PricingComparisonFeatureRow[];
};

const allTrue: PricingComparisonCells = {
  setup: true,
  "growth-engine": true,
  "full-partner": true,
};

const growthAndScale: PricingComparisonCells = {
  setup: false,
  "growth-engine": true,
  "full-partner": true,
};

const scaleOnly: PricingComparisonCells = {
  setup: false,
  "growth-engine": false,
  "full-partner": true,
};

function platformRows(): PricingComparisonFeatureRow[] {
  return platformIncludedInAllPlans.map((item, i) => ({
    id: `platform-${i}`,
    label: item.label,
    tooltip: item.tooltip,
    cells: { ...allTrue },
  }));
}

export const pricingComparisonSections: PricingComparisonSection[] = [
  {
    id: "platform",
    heading: "Zenpho platform",
    rows: platformRows(),
  },
  {
    id: "development",
    heading: "Development",
    rows: [
      {
        id: "dev-site",
        label: "Website development",
        tooltip: "Stack-agnostic site build or refresh scoped to your brand.",
        cells: { ...allTrue },
      },
      {
        id: "dev-gbp",
        label: "Google Business Profile setup",
        tooltip:
          "Claim, verify, and tune your profile—categories, services, photos, and posts aligned to how you win locally.",
        cells: { ...allTrue },
      },
      {
        id: "dev-email",
        label: "Business email setup",
        tooltip:
          "Professional email on your domain with DNS basics and deliverability setup so you look credible in the inbox.",
        cells: { ...allTrue },
      },
      {
        id: "dev-seo-foundational",
        label: "SEO and optimization (foundational)",
        tooltip: "On-site and local foundations laid during Development—not the same as ongoing SEO services in Growth.",
        cells: { ...allTrue },
      },
      {
        id: "dev-hosting",
        label: "Hosting and support",
        tooltip:
          "Managed hosting with backups and monitoring plus technical support when your site needs attention.",
        cells: { ...allTrue },
      },
      {
        id: "dev-branding",
        label: "Branding (optional)",
        tooltip:
          "Logo, palette, and voice guidelines when you want a cohesive refresh—not required for every engagement.",
        cells: { ...allTrue },
      },
    ],
  },
  {
    id: "growth_services",
    heading: "Growth",
    rows: [
      {
        id: "gr-meta",
        label: "Meta (Facebook & Instagram) ads management",
        tooltip:
          "Campaign structure, targeting, budgets, and iteration across Meta placements with testing baked into the rhythm.",
        cells: { ...growthAndScale },
      },
      {
        id: "gr-creative",
        label: "Performance Creatives",
        tooltip:
          "Static and motion creative built to test hooks, offers, and angles—then double down on what wins.",
        cells: { ...growthAndScale },
      },
      {
        id: "gr-seo-ongoing",
        label: "SEO services (ongoing)",
        tooltip: "Continuous SEO program beyond foundational optimization from Development.",
        cells: { ...growthAndScale },
      },
    ],
  },
  {
    id: "scale_only",
    heading: "Scale",
    rows: [
      {
        id: "sc-google",
        label: "Google Ads (Search & Performance Max)",
        tooltip:
          "Search and Performance Max programs with conversion signals tied back to leads, appointments, and revenue.",
        cells: { ...scaleOnly },
      },
    ],
  },
];
