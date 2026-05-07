import dynamic from "next/dynamic";
import RevenueLeakHomeHero from "@/components/home/RevenueLeakHomeHero";
import ProblemSection from "@/components/home/ProblemSection";
import HomeLocalProblemSection from "@/components/home/HomeLocalProblemSection";
import HomeGrowthAchieveSection from "@/components/home/HomeGrowthAchieveSection";
import HomeHowItWorksSection from "@/components/home/HomeHowItWorksSection";
import HomeWhatMakesUsDifferentSection from "@/components/home/HomeWhatMakesUsDifferentSection";
import HomeFAQ from "@/components/home/HomeFAQ";

/** Code-split Framer Motion — smaller initial JS for Lighthouse / mobile. */
const HomeClearGrowthFinalCta = dynamic(() => import("@/components/home/HomeClearGrowthFinalCta"));
const Testimonials = dynamic(() => import("@/components/home/Testimonials"));

export default function HomePageContent() {
  return (
    <>
      <RevenueLeakHomeHero
        badgeLabel="MVP Development Agency"
        headlineLine1="We build and scale"
        headlineLine2Prefix=""
        headlineAccent="software"
        headlineLine2Suffix=" companies"
        subheadline="We help founders and businesses turn ideas into software products in 2 weeks"
      />
      <ProblemSection />
      <HomeLocalProblemSection />
      <HomeGrowthAchieveSection />
      <HomeWhatMakesUsDifferentSection />
      <HomeHowItWorksSection />
      <Testimonials />
      <HomeFAQ />
      <HomeClearGrowthFinalCta />
    </>
  );
}
