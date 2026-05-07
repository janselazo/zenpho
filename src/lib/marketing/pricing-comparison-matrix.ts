export type PricingComparisonPlanId = "setup" | "growth-engine" | "full-partner";

/** Check/X use booleans; other cells render centered plan-specific copy. */
export type PricingCellValue = boolean | string;

export type PricingComparisonCells = Record<PricingComparisonPlanId, PricingCellValue>;

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

const c = (
  websiteLaunch: PricingCellValue,
  webAppMvp: PricingCellValue,
  mobileAppMvp: PricingCellValue,
): PricingComparisonCells => ({
  setup: websiteLaunch,
  "growth-engine": webAppMvp,
  "full-partner": mobileAppMvp,
});

export const pricingComparisonSections: PricingComparisonSection[] = [
  {
    id: "strategy_planning",
    heading: "STRATEGY & PLANNING",
    rows: [
      {
        id: "sp-discovery",
        label: "Discovery and strategy session",
        cells: c(true, true, true),
      },
      {
        id: "sp-prioritize",
        label: "Feature prioritization session",
        cells: c(true, true, true),
      },
      {
        id: "sp-roadmap",
        label: "Launch scope and roadmap",
        cells: c(true, true, true),
      },
      {
        id: "sp-flows",
        label: "Sitemap, user flows, or app flow planning",
        cells: c(true, true, true),
      },
      {
        id: "sp-v1",
        label: "Version-one product planning",
        cells: c(true, true, true),
      },
    ],
  },
  {
    id: "design",
    heading: "DESIGN",
    rows: [
      {
        id: "de-uxui",
        label: "Custom UX/UI design",
        cells: c(true, true, true),
      },
      {
        id: "de-responsive",
        label: "Mobile-responsive design",
        cells: c(true, true, true),
      },
      {
        id: "de-landing",
        label: "Landing page or homepage design",
        cells: c(true, true, true),
      },
      {
        id: "de-core-screens",
        label: "Core pages or screens designed",
        cells: c(true, true, true),
      },
      {
        id: "de-components",
        label: "Reusable design components",
        cells: c("Basic", true, true),
      },
    ],
  },
  {
    id: "development",
    heading: "DEVELOPMENT",
    rows: [
      {
        id: "dv-site",
        label: "Business website or ecommerce storefront",
        cells: c(true, true, true),
      },
      {
        id: "dv-webapp",
        label: "Functional web app development",
        cells: c(false, true, false),
      },
      {
        id: "dv-mobile",
        label: "Mobile app MVP development",
        cells: c(false, false, true),
      },
      {
        id: "dv-auth",
        label: "User authentication and login",
        cells: c(false, true, true),
      },
      {
        id: "dv-user-dash",
        label: "User dashboard or account area",
        cells: c(false, true, true),
      },
      {
        id: "dv-admin",
        label: "Admin dashboard or admin panel",
        cells: c(false, true, true),
      },
      {
        id: "dv-db",
        label: "Database setup",
        cells: c("Basic", true, true),
      },
      {
        id: "dv-forms",
        label: "Forms, submissions, or user actions",
        cells: c(true, true, true),
      },
      {
        id: "dv-payment",
        label: "Payment or booking flow",
        cells: c(true, true, true),
      },
      {
        id: "dv-api",
        label: "API integrations",
        cells: c("Basic", true, true),
      },
    ],
  },
  {
    id: "launch_setup",
    heading: "LAUNCH SETUP",
    rows: [
      {
        id: "ls-analytics",
        label: "Analytics tracking",
        cells: c(true, true, true),
      },
      {
        id: "ls-seo",
        label: "SEO foundation for public pages",
        cells: c(true, true, "Landing page only"),
      },
      {
        id: "ls-speed",
        label: "Speed and performance checks",
        cells: c(true, true, true),
      },
      {
        id: "ls-qa",
        label: "Testing and quality checks",
        cells: c(true, true, true),
      },
      {
        id: "ls-deploy",
        label: "Production deployment support",
        cells: c(true, true, true),
      },
      {
        id: "ls-docs",
        label: "Documentation and handoff",
        cells: c(true, true, true),
      },
    ],
  },
  {
    id: "support_timeline",
    heading: "SUPPORT & TIMELINE",
    rows: [
      {
        id: "st-support",
        label: "Post-launch support",
        cells: c("30 days", "90 days", "90 days"),
      },
      {
        id: "st-timeline",
        label: "Timeline",
        cells: c("1–2 weeks", "2 weeks", "2–4 weeks"),
      },
      {
        id: "st-payment",
        label: "Payment structure",
        cells: c(
          "50% upfront / 50% on delivery",
          "50% upfront / 50% on delivery",
          "50% upfront / 50% on delivery",
        ),
      },
      {
        id: "st-bestfor",
        label: "Best for",
        cells: c(
          "Websites, landing pages, ecommerce",
          "SaaS, portals, dashboards, internal tools",
          "Mobile app ideas, customer apps, mobile MVPs",
        ),
      },
    ],
  },
];
