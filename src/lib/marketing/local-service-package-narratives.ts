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
      "Look professional, get found online, capture leads, and manage contacts from day one.",
    priceSummary: "$2,500 setup + $497/month",
    priceAlternative:
      "Price-sensitive markets: $997 setup + $697/month with a 6-month agreement.",
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
          "3–5 page professional website (mobile-friendly)",
          "Homepage, services, about, contact, booking/lead page",
          "Contact forms connected to your CRM",
          "Call-to-action buttons",
          "Basic website SEO setup",
          "Website analytics installed",
        ],
      },
      {
        heading: "Google Business Profile",
        items: [
          "Profile setup or optimization",
          "Categories, services, hours, description",
          "Photos, logo, service areas",
          "Google Maps optimization basics",
        ],
      },
      {
        heading: "Local SEO foundation",
        items: [
          "Basic keyword research",
          "Homepage and service page SEO",
          "Metadata setup",
          "Local business schema when possible",
          "Google Search Console setup",
          "Google Analytics setup",
          "Basic local citations / directory submissions",
        ],
      },
      {
        heading: "Social media foundation",
        items: [
          "Facebook and Instagram profile setup or optimization",
          "Branded cover and profile images",
          "8–12 starter social posts or templates",
          "Social posting connected through your Zenpho workspace",
        ],
      },
    ],
    platformAndMonthly: [
      "Included in Launch — platform: CRM/contact management, lead pipeline, conversations inbox, website form capture, appointment booking/calendar, proposal templates, social post scheduling, basic automation, review request workflow, reporting dashboard.",
      "Monthly support: website hosting/maintenance, basic edits, 4 social posts/mo, 2 Google Business Profile posts/mo, review monitoring, monthly performance report.",
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
      "Create a predictable lead generation system with paid ads, landing pages, tracking, and CRM automation.",
    priceSummary: "$1,500 setup + $1,997/month",
    priceFootnote: "Ad spend billed separately to platforms.",
    adSpendNote:
      "Typical minimum ad spend: $1,500–$3,000/month. In competitive verticals (roofing, legal, med spa, HVAC, dental, remodeling, etc.), we often recommend $3,000–$10,000/month.",
    includeGroups: [
      {
        heading: "Paid ads management",
        items: [
          "Google Ads setup and management",
          "Meta/Facebook Ads setup and management",
          "Retargeting campaign setup",
          "Local Services-style campaign strategy where applicable",
          "Keyword and audience targeting",
          "Ad copywriting",
          "Monthly creative refreshes",
          "Weekly campaign optimization",
        ],
      },
      {
        heading: "Landing page & funnel",
        items: [
          "Dedicated landing page for paid traffic",
          "Lead form wired to your CRM",
          "Click-to-call tracking",
          "Appointment booking integration",
          "Offer and CTA strategy",
          "Conversion-focused copy",
        ],
      },
      {
        heading: "Tracking & reporting",
        items: [
          "Google Tag Manager setup",
          "Google Analytics tracking",
          "Conversion, call, and form tracking",
          "Cost-per-lead reporting",
          "Appointment tracking inside Zenpho",
        ],
      },
      {
        heading: "Lead follow-up automation",
        items: [
          "Missed-call text-back",
          "New-lead SMS/email follow-up",
          "Appointment confirmation reminders",
          "No-show reduction reminders",
          "Lead nurturing sequence",
          "Pipeline stage automation",
        ],
      },
    ],
    platformAndMonthly: [
      "Everything in Launch, plus: paid lead pipeline, ad campaign reporting, automated follow-up, appointment tracking, conversation history, proposal workflows, sales activity tracking.",
      "Monthly support: strategy call, campaign and landing page optimization, lead quality review, CRM/pipeline review, monthly recommendations report.",
    ],
    positioning: "We help you turn traffic into leads and leads into booked appointments.",
  },
  {
    id: "full-partner",
    tagline: "Full growth system",
    bestFor:
      "Established businesses with proof of demand that want to grow faster: higher conversion, sharper operations, stronger local dominance.",
    mainGoal:
      "Unify paid acquisition, SEO, automation, sales process, CRO, reputation, and expansion strategy into one system.",
    priceSummary: "$5,000 setup + $4,997/month and up",
    priceFootnote: "Ad spend billed separately.",
    adSpendNote:
      "Recommended minimum ad spend typically $5,000/month and up; aggressive growth targets often land in the $10,000–$25,000+/month range.",
    includeGroups: [
      {
        heading: "Advanced paid acquisition",
        items: [
          "Google Ads and Meta Ads management",
          "Retargeting",
          "YouTube/video ad strategy when relevant",
          "Local Services Ads support when applicable",
          "Multi-offer and audience testing",
          "Conversion and attribution rigor",
        ],
      },
      {
        heading: "Local SEO growth",
        items: [
          "Local SEO roadmap",
          "Service and city/location page strategy",
          "Google Business Profile optimization",
          "Review growth campaigns",
          "Content planning",
          "Citations and authority building",
          "Competitor analysis",
        ],
      },
      {
        heading: "Conversion optimization",
        items: [
          "Landing page A/B testing",
          "Offer, CTA, and form testing",
          "Booking flow optimization",
          "Site conversion review",
          "Heatmap / session-recording recommendations when applicable",
        ],
      },
      {
        heading: "Sales process & CRM",
        items: [
          "Pipeline optimization",
          "Lead scoring",
          "Sales-stage automation",
          "Follow-up sequences",
          "Missed-opportunity and old-lead reactivation",
          "Appointment confirmations",
          "Proposal templates & automation guidance",
          "Sales script recommendations",
        ],
      },
      {
        heading: "Reputation & referrals",
        items: [
          "Review generation campaigns",
          "Negative-review response process",
          "Referral campaigns",
          "Past-customer SMS/email promotions",
        ],
      },
      {
        heading: "Reporting & strategy",
        items: [
          "Advanced dashboards",
          "Lead source attribution",
          "Cost per lead & booked appointment",
          "Pipeline revenue visibility when stages are kept current",
          "Monthly growth strategy call",
          "Quarterly planning session",
        ],
      },
      {
        heading: "Optional Scale add-ons (quoted separately)",
        items: [
          "Appointment setting, call answering, sales coaching",
          "Custom integrations and automations",
          "Multi-location expansion",
          "Video/photo production",
          "AI chat / onsite chatbots",
          "Email newsletter management",
        ],
      },
    ],
    platformAndMonthly: [
      "Everything in Launch and Grow, plus: advanced workflows, multi-pipeline support, deeper sales automation, proposal automation, reputation and reactivation programs, advanced reporting, team seats, priority support.",
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
