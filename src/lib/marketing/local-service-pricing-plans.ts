export type LocalServicePricingPlan = {
  id: string;
  title: string;
  price: string;
  summary: string;
  included: string[];
  bestFor: string[];
  outcome: string;
  ctaLabel: string;
  ctaHref: string;
  /** Emphasize as recommended tier */
  featured?: boolean;
};

export const localServicePricingIntro = {
  eyebrow: "Pricing",
  headline: "Growth Plans for Local Service Businesses",
  description:
    "Choose the level of support you need to generate more leads, book more appointments, close more clients, collect more reviews, increase referrals, and track real ROI.",
};

export const localServicePricingPlans: LocalServicePricingPlan[] = [
  {
    id: "setup",
    title: "Lead-to-Revenue Setup",
    price: "$2,500 one-time",
    summary:
      "Install the foundation your business needs to capture, track, follow up with, and convert more leads.",
    included: [
      "Lead tracking dashboard setup",
      "CRM pipeline setup",
      "Call tracking setup",
      "Form tracking setup",
      "Lead source tracking",
      "Google Business Profile optimization",
      "Website or landing page quick improvements",
      "Review request system",
      "Basic follow-up workflow",
      "First ROI report",
      "30-day implementation",
    ],
    bestFor: [
      "Businesses with no clear lead tracking",
      "Businesses losing leads from missed calls or poor follow-up",
      "Businesses that do not know where leads are coming from",
      "Businesses that want better visibility before spending more on ads",
    ],
    outcome:
      "You get a working system to capture every lead, track every opportunity, follow up faster, and understand what is producing revenue.",
    ctaLabel: "Book Setup Call",
    ctaHref: "/booking",
  },
  {
    id: "growth-engine",
    title: "Growth Engine Management",
    price: "$1,500/month + ad spend",
    summary:
      "Ongoing lead generation, Google optimization, landing page improvements, reviews, referrals, and ROI reporting.",
    included: [
      "Google Ads management",
      "Google Business Profile improvements",
      "Landing page optimization",
      "Local SEO improvements",
      "Review generation campaigns",
      "Referral campaigns",
      "Follow-up optimization",
      "Lead quality analysis",
      "Monthly ROI reporting",
      "Monthly strategy call",
      "Ongoing revenue leak monitoring",
      "Performance recommendations",
    ],
    bestFor: [
      "Businesses that want more qualified leads",
      "Businesses already spending on marketing but lacking clear ROI",
      "Businesses that want consistent monthly optimization",
      "Businesses that want help improving leads, appointments, reviews, referrals, and revenue",
    ],
    outcome:
      "We manage and improve your growth system every month so more leads become appointments, clients, reviews, referrals, and revenue.",
    ctaLabel: "Grow My Business",
    ctaHref: "/booking",
    featured: true,
  },
  {
    id: "full-partner",
    title: "Full Growth Partner",
    price: "$4,500/month + ad spend",
    summary:
      "Complete done-for-you growth system for businesses ready to scale with a dedicated growth partner.",
    included: [
      "Full growth strategy",
      "Website rebuild or major redesign",
      "Multiple high-converting landing pages",
      "Google Ads management",
      "Facebook/Instagram Ads when relevant",
      "Local SEO strategy and execution",
      "Google Business Profile optimization",
      "Advanced lead tracking",
      "CRM and sales pipeline setup",
      "Proposal and follow-up workflows",
      "Review generation system",
      "Referral campaigns",
      "Past customer reactivation",
      "Revenue dashboard",
      "Weekly or biweekly reporting",
      "Growth strategy and ongoing optimization",
      "Sales process improvement recommendations",
    ],
    bestFor: [
      "Larger local service businesses",
      "High-ticket service providers",
      "Businesses ready to scale aggressively",
      "Businesses needing a complete marketing, tracking, and conversion system",
      "Multi-location or expanding businesses",
    ],
    outcome:
      "We become your growth partner, managing the full system from lead generation to booked jobs, revenue tracking, reviews, referrals, and continuous optimization.",
    ctaLabel: "Talk to Us",
    ctaHref: "/booking",
  },
];
