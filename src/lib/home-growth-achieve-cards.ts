export type HomeGrowthAchieveCard = {
  id: string;
  title: string;
  description: string;
  imageSrc: string;
  imageLabel: string;
};

export const homeGrowthAchieveSectionEyebrow = "What We Help You Achieve";

export const homeGrowthAchieveHeadline = "A Complete Growth System for Local Service Businesses";

export const homeGrowthAchieveDescription =
  "We do not just run ads, build websites, or set up automation. We help you build a complete system to generate, capture, manage, convert, and multiply local business opportunities.";

export const homeGrowthAchieveCards: HomeGrowthAchieveCard[] = [
  {
    id: "qualified-leads",
    title: "More Qualified Leads",
    description:
      "Get found by more people searching for your services through Google, local SEO, optimized landing pages, paid ads, reviews, referrals, and local visibility.",
    imageSrc: "/home-growth-achieve/qualified-leads.svg",
    imageLabel: "Local search and leads",
  },
  {
    id: "appointments",
    title: "More Appointments",
    description:
      "Turn more calls, forms, and inquiries into booked estimates, consultations, service calls, or appointments.",
    imageSrc: "/home-growth-achieve/appointments.svg",
    imageLabel: "Booked appointments",
  },
  {
    id: "paying-clients",
    title: "More Paying Clients",
    description:
      "Improve follow-up, proposal tracking, lead management, and conversion so fewer opportunities fall through the cracks.",
    imageSrc: "/home-growth-achieve/paying-clients.svg",
    imageLabel: "Client conversion",
  },
  {
    id: "revenue",
    title: "More Revenue",
    description:
      "Track which channels are creating real business outcomes, not just clicks, impressions, or website traffic.",
    imageSrc: "/home-growth-achieve/revenue.svg",
    imageLabel: "Revenue attribution",
  },
  {
    id: "reviews",
    title: "More Reviews",
    description:
      "Automatically ask happy customers for Google reviews after completed jobs, improving trust and local conversion.",
    imageSrc: "/home-growth-achieve/reviews.svg",
    imageLabel: "Google reviews",
  },
  {
    id: "referrals",
    title: "More Referrals",
    description:
      "Turn satisfied customers into referral sources with simple campaigns, follow-up workflows, and referral tracking.",
    imageSrc: "/home-growth-achieve/referrals.svg",
    imageLabel: "Referral growth",
  },
];
