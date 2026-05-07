export type HomeGrowthAchieveCard = {
  id: string;
  title: string;
  description: string;
  imageSrc: string;
  imageLabel: string;
};

export const homeGrowthAchieveSectionEyebrow = "WHAT WE HELP YOU LAUNCH";

export const homeGrowthAchieveHeadline = "Websites, Apps & MVPs Built to Go Live Fast";

export const homeGrowthAchieveDescription =
  "We do not just design screens or write code. We help you clarify the idea, define the first version, build the product, and launch with a clear path for improvement.";

export const homeGrowthAchieveCards: HomeGrowthAchieveCard[] = [
  {
    id: "qualified-leads",
    title: "Launch-Ready Websites",
    description:
      "Build a professional business or ecommerce website that explains your offer, builds trust, and gives visitors a clear path to take action.",
    imageSrc: "/home-growth-achieve/qualified-leads.svg",
    imageLabel: "Launch-Ready Websites",
  },
  {
    id: "appointments",
    title: "Functional Web Apps",
    description:
      "Turn your idea into a working web app with user login, dashboards, admin tools, databases, payments, and integrations.",
    imageSrc: "/home-growth-achieve/appointments.svg",
    imageLabel: "Functional Web Apps",
  },
  {
    id: "paying-clients",
    title: "Mobile App MVPs",
    description:
      "Launch a focused mobile app experience for iOS and Android users with clean onboarding, core features, and a smooth user flow.",
    imageSrc: "/home-growth-achieve/paying-clients.svg",
    imageLabel: "Mobile App MVPs",
  },
  {
    id: "revenue",
    title: "Clear Product Roadmaps",
    description:
      "Define what needs to be built first, what can wait, and how to avoid wasting time and budget on unnecessary features.",
    imageSrc: "/home-growth-achieve/revenue.svg",
    imageLabel: "Clear Product Roadmaps",
  },
  {
    id: "reviews",
    title: "Faster Market Validation",
    description:
      "Get your first version in front of real users quickly so you can collect feedback, test demand, and improve with confidence.",
    imageSrc: "/home-growth-achieve/reviews.svg",
    imageLabel: "Faster Market Validation",
  },
  {
    id: "referrals",
    title: "Post-Launch Improvements",
    description:
      "After launch, we help you improve features, fix friction points, add integrations, and build the next version based on real feedback.",
    imageSrc: "/home-growth-achieve/referrals.svg",
    imageLabel: "Post-Launch Improvements",
  },
];
