import HomeHero from "./HomeHero";
import HomeProblem from "./HomeProblem";
import HomeOffer from "./HomeOffer";
import HomeDifferent from "./HomeDifferent";
import HomeProcess from "./HomeProcess";
import HomeTestimonials from "./HomeTestimonials";
import TrustedBy from "@/components/marketing/sections/TrustedBy";
import FAQList from "@/components/marketing/sections/FAQList";
import CTABanner from "@/components/marketing/sections/CTABanner";

const HOME_FAQ = [
  {
    q: "What do you do?",
    a: "We help founders, startups and businesses design, build, and launch websites, ecommerce websites, web apps, mobile apps and MVPs. We handle strategy, UX/UI design, development, integrations, testing, deployment and launch support.",
  },
  {
    q: "What is an MVP?",
    a: "An MVP, or minimum viable product, is the first focused version of your product. It includes the core features needed to test your idea with real users, collect feedback and decide what to build next.",
  },
  {
    q: "Can you really launch in 2 weeks?",
    a: "Yes, if the scope is focused. We help you define the most important version-one features so your product can launch quickly without being overbuilt. Larger projects may require additional sprints.",
  },
  {
    q: "What can you build?",
    a: "We build business websites, ecommerce websites, SaaS MVPs, dashboards, client portals, booking platforms, admin panels, internal tools, mobile app MVPs and custom web apps.",
  },
  {
    q: "Do I need designs ready before starting?",
    a: "No. We can handle the full process from idea to launch, including strategy, user flows, wireframes, UX/UI design, development, testing and deployment.",
  },
  {
    q: "Do you also handle ad creatives?",
    a: "Yes. Our Creatives Generation service ships Renaissance-grade ad creatives for Meta, Instagram and TikTok — UGC, talking head, product demos, motion, AI-generated and founder-led formats.",
  },
];

export default function HomePageContent() {
  return (
    <>
      <HomeHero />
      <TrustedBy />
      <HomeProblem />
      <HomeOffer />
      <HomeDifferent />
      <HomeProcess />
      <HomeTestimonials />
      <FAQList
        items={HOME_FAQ}
        eyebrow="FAQ"
        title={
          <>
            Common <em>questions</em>.
          </>
        }
      />
      <CTABanner
        title={
          <>
            Ready to launch your product <em>with clarity?</em>
          </>
        }
        lead="Tell us what you want to build — website, web app, mobile app or MVP — and we'll help you map the fastest path from idea to launch."
      />
    </>
  );
}
