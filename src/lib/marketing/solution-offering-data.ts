import type { LucideIcon } from "lucide-react";
import { Globe, LayoutDashboard, Smartphone } from "lucide-react";
import type { PricingComparisonPlanId } from "@/lib/marketing/pricing-comparison-matrix";

export type MarketingSolutionSlug = "custom-websites" | "web-apps" | "mobile-apps";

export const marketingSolutionToPlanId: Record<
  MarketingSolutionSlug,
  PricingComparisonPlanId
> = {
  "custom-websites": "setup",
  "web-apps": "growth-engine",
  "mobile-apps": "full-partner",
};

export type SolutionProcessStep = {
  title: string;
  description: string;
};

export type MarketingSolutionPage = {
  slug: MarketingSolutionSlug;
  title: string;
  description: string;
  icon: LucideIcon;
  iconClassName: string;
  metaTitle: string;
  metaDescription: string;
  heroHeadline: string;
  heroSubheadline: string;
  primaryCtaLabel: string;
  secondaryCtaLabel: string;
  whatWeBuild: {
    headline: string;
    copy: string;
    typesHeading: string;
    types: string[];
  };
  whatsIncluded: {
    headline: string;
    items: string[];
  };
  bestFor: {
    headline: string;
    items: string[];
  };
  process: {
    headline: string;
    steps: SolutionProcessStep[];
  };
  finalCta: {
    headline: string;
    subheadline: string;
    buttonLabel: string;
  };
};

export const marketingSolutionPages: MarketingSolutionPage[] = [
  {
    slug: "custom-websites",
    title: "Custom Websites",
    description:
      "Websites and stores built to explain, build trust, and convert.",
    icon: Globe,
    iconClassName: "bg-indigo-500/15 text-indigo-600",
    metaTitle: "Custom Website Development | Zenpho",
    metaDescription:
      "Zenpho builds custom business and ecommerce websites designed to build trust, convert visitors, and support your launch.",
    heroHeadline: "Custom Websites Built to Launch and Convert",
    heroSubheadline:
      "We design and build professional business and ecommerce websites that clearly explain your offer, build credibility, and help visitors take action.",
    primaryCtaLabel: "Start My Website",
    secondaryCtaLabel: "View Pricing",
    whatWeBuild: {
      headline: "Websites that do more than look good.",
      copy: "Your website should help people understand what you do, trust your business, and know exactly what to do next. We build clean, modern websites focused on clarity, speed, and conversion.",
      typesHeading: "Website Types",
      types: [
        "Business websites",
        "Ecommerce websites",
        "Landing pages",
        "Service websites",
        "Startup websites",
        "Personal brand websites",
        "Portfolio websites",
        "Website redesigns",
      ],
    },
    whatsIncluded: {
      headline: "Everything needed for a polished website launch.",
      items: [
        "Website strategy session",
        "Sitemap and page planning",
        "Custom UX/UI design",
        "Homepage design",
        "Core inner pages",
        "Mobile-responsive development",
        "Contact forms",
        "Booking or calendar links",
        "Ecommerce setup if needed",
        "Basic copy support",
        "SEO foundation",
        "Analytics setup",
        "Speed and performance checks",
        "Testing and launch support",
        "Documentation and handoff",
      ],
    },
    bestFor: {
      headline: "Perfect for businesses that need a stronger online presence.",
      items: [
        "Service businesses",
        "Ecommerce brands",
        "Consultants",
        "Agencies",
        "Coaches",
        "Creators",
        "Startups",
        "Local businesses",
        "Productized services",
      ],
    },
    process: {
      headline: "From idea to live website.",
      steps: [
        {
          title: "Plan",
          description:
            "We define your website goals, pages, audience, offer, and calls-to-action.",
        },
        {
          title: "Design",
          description:
            "We create a clean, modern design that matches your brand and guides visitors clearly.",
        },
        {
          title: "Build",
          description:
            "We develop your responsive website and connect forms, tools, ecommerce, or booking flows.",
        },
        {
          title: "Launch",
          description: "We test, deploy, and support your website after launch.",
        },
      ],
    },
    finalCta: {
      headline: "Ready to launch a better website?",
      subheadline:
        "Let’s build a website that makes your business look credible and helps visitors take action.",
      buttonLabel: "Start My Website",
    },
  },
  {
    slug: "web-apps",
    title: "Web Apps",
    description:
      "Dashboards, portals, and SaaS MVPs with login and integrations.",
    icon: LayoutDashboard,
    iconClassName: "bg-rose-500/15 text-rose-600",
    metaTitle: "Web App Development | Dashboards, Portals & SaaS MVPs | Zenpho",
    metaDescription:
      "Zenpho builds custom web apps, SaaS MVPs, dashboards, portals, booking platforms, and internal tools for founders and businesses.",
    heroHeadline: "Custom Web Apps Built for Real Business Use",
    heroSubheadline:
      "We build functional web apps with user login, dashboards, databases, admin tools, payments, and integrations — designed around your first launch.",
    primaryCtaLabel: "Start My Web App",
    secondaryCtaLabel: "View Pricing",
    whatWeBuild: {
      headline: "For products that need more than a website.",
      copy: "If users need to log in, manage data, complete actions, make payments, or use a custom workflow, you need a web app. We help you plan, design, build, and launch the first working version.",
      typesHeading: "Web App Types",
      types: [
        "SaaS MVPs",
        "Client portals",
        "Admin dashboards",
        "Booking platforms",
        "Internal tools",
        "Marketplaces",
        "Membership platforms",
        "CRM-style tools",
        "Data dashboards",
        "Customer portals",
      ],
    },
    whatsIncluded: {
      headline: "Core features for a working web app MVP.",
      items: [
        "Product strategy session",
        "Feature prioritization",
        "User flow planning",
        "UX/UI design",
        "Landing page if needed",
        "User authentication",
        "User dashboard",
        "Admin panel",
        "Database setup",
        "Forms and submissions",
        "Search or filtering if needed",
        "Payment or booking flow if needed",
        "API integrations",
        "Email notifications",
        "Analytics tracking",
        "Testing and quality checks",
        "Production deployment",
        "Documentation and handoff",
        "Launch support",
      ],
    },
    bestFor: {
      headline: "Built for founders, teams, and businesses with a product idea.",
      items: [
        "Startup founders",
        "SaaS products",
        "Service platforms",
        "Booking systems",
        "Internal business tools",
        "Customer portals",
        "Marketplace ideas",
        "Teams replacing spreadsheets or manual workflows",
      ],
    },
    process: {
      headline: "A focused path from scope to launch.",
      steps: [
        {
          title: "Define the MVP",
          description:
            "We identify the core features your web app needs for version one.",
        },
        {
          title: "Map the User Flow",
          description:
            "We outline how users move through the product from sign-up to key actions.",
        },
        {
          title: "Design the Interface",
          description:
            "We create clean dashboards, forms, screens, and admin views.",
        },
        {
          title: "Build the App",
          description:
            "We develop the core functionality, database, integrations, and user experience.",
        },
        {
          title: "Launch and Improve",
          description:
            "We test, deploy, and help you plan the next version after real feedback.",
        },
      ],
    },
    finalCta: {
      headline: "Have a web app idea?",
      subheadline:
        "Let’s turn it into a working MVP users can test, use, and give feedback on.",
      buttonLabel: "Start My Web App",
    },
  },
  {
    slug: "mobile-apps",
    title: "Mobile Apps",
    description: "Mobile MVPs with onboarding, accounts, and core features.",
    icon: Smartphone,
    iconClassName: "bg-emerald-500/15 text-emerald-700",
    metaTitle: "Mobile App Development | Mobile App MVPs | Zenpho",
    metaDescription:
      "Zenpho builds mobile app MVPs with onboarding, user accounts, core app screens, integrations, and launch support.",
    heroHeadline: "Mobile App MVPs Built for Launch",
    heroSubheadline:
      "We help founders and businesses design and build focused mobile apps with the core features needed to test the idea, serve users, and improve after launch.",
    primaryCtaLabel: "Start My Mobile App",
    secondaryCtaLabel: "View Pricing",
    whatWeBuild: {
      headline: "Mobile-first products with a clear version one.",
      copy: "A successful mobile app does not need every feature on day one. It needs a clear purpose, simple onboarding, useful core functionality, and a smooth user experience.",
      typesHeading: "Mobile App Types",
      types: [
        "Mobile app MVPs",
        "Customer apps",
        "Booking apps",
        "Community apps",
        "Membership apps",
        "Internal team apps",
        "Ecommerce apps",
        "Event apps",
        "Wellness or service apps",
      ],
    },
    whatsIncluded: {
      headline: "Everything needed for a focused mobile MVP.",
      items: [
        "Mobile app strategy session",
        "Feature prioritization",
        "App flow planning",
        "Mobile UX/UI design",
        "Onboarding screens",
        "User authentication",
        "User account area",
        "Core app screens",
        "Core app features",
        "Database setup",
        "Admin access or management panel",
        "API integrations",
        "Push notification planning if needed",
        "Payment or booking flow if needed",
        "Analytics tracking",
        "Testing support",
        "Launch preparation",
        "Documentation and handoff",
        "Launch support",
      ],
    },
    bestFor: {
      headline: "Ideal for mobile-first ideas and user experiences.",
      items: [
        "Founders with an app idea",
        "Businesses launching a customer app",
        "Booking-based businesses",
        "Communities and memberships",
        "Internal team workflows",
        "Mobile-first ecommerce ideas",
        "MVPs that need user testing",
      ],
    },
    process: {
      headline: "From app idea to working mobile MVP.",
      steps: [
        {
          title: "Clarify the App",
          description:
            "We define the problem, users, core features, and launch goal.",
        },
        {
          title: "Plan the Flow",
          description:
            "We map onboarding, account creation, key screens, and user actions.",
        },
        {
          title: "Design the Screens",
          description:
            "We create a clean mobile interface that is easy to understand and use.",
        },
        {
          title: "Build the MVP",
          description:
            "We develop the core app experience, connect integrations, and prepare for testing.",
        },
        {
          title: "Launch and Learn",
          description:
            "We help you test, launch, collect feedback, and plan the next version.",
        },
      ],
    },
    finalCta: {
      headline: "Ready to build your mobile app MVP?",
      subheadline:
        "Start with the focused version your users can actually test and use.",
      buttonLabel: "Start My Mobile App",
    },
  },
];

export const marketingSolutionSlugs = marketingSolutionPages.map((s) => s.slug);

export function getMarketingSolutionPage(
  slug: string,
): MarketingSolutionPage | undefined {
  return marketingSolutionPages.find((s) => s.slug === slug);
}
