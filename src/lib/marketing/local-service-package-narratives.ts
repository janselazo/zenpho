import type { PricingComparisonPlanId } from "@/lib/marketing/pricing-comparison-matrix";

export type PackageIncludeGroup = {
  heading: string;
  items: string[];
};

export type PackageNarrativeContent = {
  id: PricingComparisonPlanId;
  /** Eyebrow chip, e.g. "Start & Establish" */
  tagline: string;
  bestFor: string;
  mainGoal: string;
  /** Primary price line (shown in card; matches table header intent) */
  priceSummary: string;
  /** Footnote under price, e.g. ad spend */
  priceFootnote?: string;
  /** Alternative offer (Launch only) */
  priceAlternative?: string;
  /** Ad spend guidance (Grow/Scale) */
  adSpendNote?: string;
  includeGroups: PackageIncludeGroup[];
  /** Platform & monthly bullets not already in includeGroups */
  platformAndMonthly?: string[];
  positioning: string;
};

export const localServicePackageNarratives: PackageNarrativeContent[] = [
  {
    id: "setup",
    tagline: "Start & Establish",
    bestFor:
      "Business owners who are just starting out and need their digital foundation built correctly.",
    mainGoal:
      "Help them look professional, get found online, capture leads, and manage contacts from day one.",
    priceSummary: "$1,500/month",
    priceAlternative:
      "Alternative entry-level pricing if your market is more price-sensitive: $997 setup + $697/month with a 6-month agreement.",
    includeGroups: [
      {
        heading: "Digital foundation",
        items: [
          "Business strategy onboarding session",
          "Basic brand direction: colors, fonts, messaging",
          "Logo cleanup or simple starter logo if needed",
          "Business email/domain setup guidance",
          "Website copy structure and service positioning",
        ],
      },
      {
        heading: "Website",
        items: [
          "3 to 5-page professional website",
          "Mobile-friendly design",
          "Homepage, services, about, contact, and booking/lead page",
          "Contact forms connected to your CRM platform",
          "Call-to-action buttons",
          "Basic website SEO setup",
          "Website analytics installed",
        ],
      },
      {
        heading: "Google Business Profile",
        items: [
          "Google Business Profile setup or optimization",
          "Business categories, services, hours, description",
          "Photos, logo, service areas",
          "Google Maps optimization basics",
          "Review request system setup",
        ],
      },
      {
        heading: "Local SEO foundation",
        items: [
          "Basic keyword research",
          "Homepage and service page SEO",
          "Metadata setup",
          "Local business schema if possible",
          "Google Search Console setup",
          "Google Analytics setup",
          "Basic local citations/directory submissions",
        ],
      },
      {
        heading: "Social media foundation",
        items: [
          "Facebook and Instagram profile setup or optimization",
          "Branded cover images/profile images",
          "8 to 12 starter social media posts or templates",
          "Social media posting connected through Zenpho",
        ],
      },
    ],
    platformAndMonthly: [
      "Included in Launch — Zenpho platform access: CRM/contact management; lead pipeline; conversations inbox; website form capture; appointment booking/calendar; proposal templates; social media post scheduling; basic automation; review request workflow; monthly reporting dashboard.",
      "Monthly support: Zenpho platform access; website hosting/maintenance; basic edits and updates; 4 social media posts per month; 2 Google Business Profile posts per month; review monitoring; monthly performance report.",
    ],
    positioning:
      "We build your online business foundation so customers can find you, trust you, and contact you.",
  },
  {
    id: "growth-engine",
    tagline: "Lead Generation",
    bestFor:
      "Businesses that already have a website and online presence but need more leads, calls, and appointments.",
    mainGoal:
      "Create a predictable lead generation system using paid ads, landing pages, tracking, and CRM automation.",
    priceSummary: "$2,000/month",
    priceFootnote: "Ad spend is separate.",
    adSpendNote:
      "Recommended minimum ad spend: $1,500 to $3,000/month. For competitive industries like roofing, legal, med spa, HVAC, dental, or home remodeling, recommend $3,000 to $10,000/month in ad spend.",
    includeGroups: [
      {
        heading: "Paid ads management",
        items: [
          "Google Ads campaign setup and management",
          "Meta/Facebook Ads campaign setup and management",
          "Retargeting campaign setup",
          "Local service campaign strategy if applicable",
          "Keyword research",
          "Audience targeting",
          "Ad copywriting",
          "Monthly ad creative updates",
          "Weekly campaign optimization",
        ],
      },
      {
        heading: "Landing page/funnel",
        items: [
          "Dedicated landing page for paid traffic",
          "Lead form connected to your CRM",
          "Click-to-call tracking",
          "Appointment booking integration",
          "Offer and call-to-action strategy",
          "Conversion-focused copywriting",
        ],
      },
      {
        heading: "Tracking and reporting",
        items: [
          "Google Tag Manager setup",
          "Google Analytics tracking",
          "Conversion tracking",
          "Call tracking",
          "Form tracking",
          "Cost per lead reporting",
          "Appointment tracking inside Zenpho",
        ],
      },
      {
        heading: "Lead follow-up automation",
        items: [
          "Missed call text-back",
          "New lead SMS/email follow-up",
          "Appointment confirmation reminders",
          "No-show reduction reminders",
          "Lead nurturing sequence",
          "Pipeline stage automation",
        ],
      },
    ],
    platformAndMonthly: [
      "Everything from Launch, plus Zenpho paid lead pipeline, ad campaign reporting dashboard, automated lead follow-up, appointment tracking, conversation history, proposal workflows, and sales activity tracking.",
      "Monthly support: monthly strategy call; campaign optimization; landing page optimization; lead quality review; CRM/pipeline review; monthly report with recommendations.",
    ],
    positioning: "We help you turn traffic into leads and leads into booked appointments.",
  },
  {
    id: "full-partner",
    tagline: "Full growth system",
    bestFor:
      "Established businesses that already have proof of demand and want to grow faster, increase conversion rates, improve operations, and dominate their local market.",
    mainGoal:
      "Build a complete growth system: paid ads, SEO, automation, sales process, conversion optimization, reputation, and expansion strategy.",
    priceSummary: "$3,000/month",
    priceFootnote: "Ad spend is separate.",
    adSpendNote:
      "Recommended minimum ad spend: $5,000/month and up. For aggressive growth: $10,000 to $25,000+/month in ad spend.",
    includeGroups: [
      {
        heading: "Advanced paid acquisition",
        items: [
          "Google Ads management",
          "Meta Ads management",
          "Retargeting campaigns",
          "YouTube or video ad strategy if relevant",
          "Local Services Ads support if applicable",
          "Campaign testing across multiple offers",
          "Advanced audience targeting",
          "Conversion tracking and attribution",
        ],
      },
      {
        heading: "Local SEO growth",
        items: [
          "Local SEO strategy",
          "Service page expansion",
          "City/location page strategy",
          "Google Business Profile optimization",
          "Review growth campaigns",
          "Content planning",
          "Citation and authority building",
          "Competitor analysis",
        ],
      },
      {
        heading: "Conversion optimization",
        items: [
          "Landing page A/B testing",
          "Offer testing",
          "Call-to-action testing",
          "Form optimization",
          "Appointment booking optimization",
          "Website conversion review",
          "Heatmap/session recording recommendations if applicable",
        ],
      },
      {
        heading: "Sales process improvement",
        items: [
          "CRM pipeline optimization",
          "Lead scoring",
          "Sales stage automation",
          "Follow-up sequences",
          "Missed opportunity campaigns",
          "Old lead reactivation",
          "Appointment confirmation workflows",
          "Proposal templates and automation",
          "Sales script recommendations",
        ],
      },
      {
        heading: "Reputation and referrals",
        items: [
          "Review generation campaigns",
          "Negative review response process",
          "Referral campaign setup",
          "Customer reactivation campaigns",
          "Email/SMS promotions to past customers",
        ],
      },
      {
        heading: "Reporting and strategy",
        items: [
          "Advanced dashboard",
          "Lead source attribution",
          "Cost per lead tracking",
          "Cost per booked appointment tracking",
          "Revenue pipeline tracking if the client updates deal stages",
          "Monthly growth strategy call",
          "Quarterly planning session",
        ],
      },
      {
        heading: "Optional Scale add-ons (quoted separately)",
        items: [
          "Appointment setting",
          "Call answering",
          "Sales team training",
          "Custom software integrations",
          "Custom automations",
          "Multi-location expansion",
          "Video/photo content production",
          "AI chatbot or website chat",
          "Email newsletter management",
        ],
      },
    ],
    platformAndMonthly: [
      "Everything from Launch and Grow, plus Zenpho advanced CRM workflows; multi-pipeline support; sales automation; proposal automation; reputation campaigns; reactivation campaigns; advanced reporting dashboard; team user access; priority support.",
    ],
    positioning:
      "We help established local businesses turn marketing, sales, automation, and operations into one growth system.",
  },
];

export type DevelopmentAddOn = {
  title: string;
  description: string;
};

/** Custom builds layered on top of any Launch–Scale engagement (separate scopes & quotes). */
export const crossTierDevelopmentAddOns: DevelopmentAddOn[] = [
  {
    title: "Ecommerce website",
    description:
      "Shopping experiences with catalog/checkout flows, payments, and fulfillment-friendly structure—scoped beyond Launch brochure sites.",
  },
  {
    title: "Web app development",
    description:
      "Authenticated SaaS-style products, customer portals, and internal tools with ongoing release planning.",
  },
  {
    title: "Mobile app development",
    description:
      "iOS and Android experiences or hybrid shells tied to your brand and data model—ideal when the job site needs a dedicated app surface.",
  },
];
