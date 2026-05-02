import { platformIncludedInAllPlans } from "@/lib/marketing/local-service-pricing-plans";

export type PricingComparisonPlanId = "setup" | "growth-engine" | "full-partner";

export type PricingComparisonCells = Record<PricingComparisonPlanId, boolean>;

export type PricingComparisonFeatureRow = {
  id: string;
  label: string;
  /** Optional longer explanation for `title` on label cell */
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
  return platformIncludedInAllPlans.map((label, i) => ({
    id: `platform-${i}`,
    label,
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
        cells: { ...allTrue },
      },
      {
        id: "dev-email",
        label: "Business email setup",
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
        cells: { ...allTrue },
      },
      {
        id: "dev-branding",
        label: "Branding (optional)",
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
        cells: { ...growthAndScale },
      },
      {
        id: "gr-creative",
        label: "Performance Creatives",
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
        cells: { ...scaleOnly },
      },
    ],
  },
];
