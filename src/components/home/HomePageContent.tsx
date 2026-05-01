import RevenueLeakHomeHero from "@/components/home/RevenueLeakHomeHero";
import ProblemSection from "@/components/home/ProblemSection";
import HomeLocalProblemSection from "@/components/home/HomeLocalProblemSection";
import HomeGrowthAchieveSection from "@/components/home/HomeGrowthAchieveSection";
import HomeHowItWorksSection from "@/components/home/HomeHowItWorksSection";
import HomeOurDifferenceSection from "@/components/home/HomeOurDifferenceSection";
import HomeWhatMakesUsDifferentSection from "@/components/home/HomeWhatMakesUsDifferentSection";
import Testimonials from "@/components/home/Testimonials";
import HomeFAQ from "@/components/home/HomeFAQ";
import HomeClearGrowthSection from "@/components/home/HomeClearGrowthSection";

export default function HomePageContent() {
  return (
    <>
      <RevenueLeakHomeHero />
      <ProblemSection />
      <HomeLocalProblemSection />
      <HomeGrowthAchieveSection />
      <HomeWhatMakesUsDifferentSection />
      <HomeOurDifferenceSection />
      <HomeHowItWorksSection />
      <Testimonials />
      <HomeFAQ />
      <HomeClearGrowthSection />
    </>
  );
}
