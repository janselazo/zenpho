/**
 * Marketing FAQs — homepage (full list) and any route using SITE_PRIMARY_FAQS.
 */

export interface SiteFaqItem {
  q: string;
  a: string;
}

export const SITE_HOME_FULL_FAQS: SiteFaqItem[] = [
  {
    q: "What do you do?",
    a: "We help local service businesses generate more leads, book more appointments, close more clients, collect more reviews, increase referrals, and track revenue from marketing.",
  },
  {
    q: "What is a Revenue Leak Audit?",
    a: "A Revenue Leak Audit analyzes your Google Business Profile, competitors, reviews, website, photos, tracking, ads readiness, and local positioning to identify where your business may be losing revenue.",
  },
  {
    q: "Is this just an SEO audit?",
    a: "No. SEO is only one part. The audit looks at the full local growth journey: visibility, conversion, tracking, follow-up, reviews, referrals, and revenue opportunity.",
  },
  {
    q: "Is this just software?",
    a: "No. We combine software, tracking, automation, strategy, and done-for-you growth services. You get the system and the execution needed to improve results.",
  },
  {
    q: "Do you run ads?",
    a: "Yes. We manage Google Ads and other paid channels when they make sense. But first, we make sure your tracking, landing pages, and follow-up systems are ready so ad spend is not wasted.",
  },
  {
    q: "Do you build websites?",
    a: "Yes. We build and optimize websites and landing pages designed to turn visitors into calls, quote requests, appointments, and clients.",
  },
  {
    q: "Do you help with reviews?",
    a: "Yes. We install review request systems to help happy customers leave Google reviews consistently.",
  },
  {
    q: "Do you help with referrals?",
    a: "Yes. We help create referral campaigns and customer follow-up workflows so satisfied customers can generate more business.",
  },
  {
    q: "How do you prove ROI?",
    a: "We track leads, sources, appointments, proposals, closed jobs, revenue, reviews, and referrals. This helps show which channels are creating real business results.",
  },
  {
    q: "Who is this for?",
    a: "This is for local service businesses such as roofers, HVAC companies, plumbers, remodelers, med spas, dentists, lawyers, auto repair shops, and other businesses that rely on local leads and appointments.",
  },
  {
    q: "Do I need to replace my current tools?",
    a: "Not necessarily. If you already use tools like Podium, Birdeye, GoHighLevel, Jobber, ServiceTitan, or another CRM, we can work with what you have. Our focus is helping you understand what is working, what is leaking, and what actions will grow revenue.",
  },
];

/** Same list as home — used by legacy `components/services/FAQ` if mounted on a route. */
export const SITE_PRIMARY_FAQS: SiteFaqItem[] = SITE_HOME_FULL_FAQS;

/** Kept empty so imports do not break; home uses `SITE_HOME_FULL_FAQS` only. */
export const SITE_HOME_SUPPLEMENT_FAQS: SiteFaqItem[] = [];
