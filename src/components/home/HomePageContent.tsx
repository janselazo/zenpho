import dynamic from "next/dynamic";
import RevenueLeakHomeHero from "@/components/home/RevenueLeakHomeHero";
import ProblemSection from "@/components/home/ProblemSection";
import HomeLocalProblemSection from "@/components/home/HomeLocalProblemSection";
import HomeGrowthAchieveSection from "@/components/home/HomeGrowthAchieveSection";
import HomeHowItWorksSection from "@/components/home/HomeHowItWorksSection";
import HomeWhatMakesUsDifferentSection from "@/components/home/HomeWhatMakesUsDifferentSection";
import HomeFAQ from "@/components/home/HomeFAQ";

/** Code-split Framer Motion — smaller initial JS for Lighthouse / mobile. */
const HomeClearGrowthSection = dynamic(() => import("@/components/home/HomeClearGrowthSection"));
const Testimonials = dynamic(() => import("@/components/home/Testimonials"));

export default function HomePageContent() {
  return (
    <>
      <RevenueLeakHomeHero />
      <ProblemSection />
      <HomeLocalProblemSection />
      <HomeGrowthAchieveSection />
      <HomeWhatMakesUsDifferentSection />
      <HomeHowItWorksSection />
      <HomeClearGrowthSection />
      <Testimonials />
      <HomeFAQ />
    </>
  );
}
