import RevenueLeakHomeHero from "@/components/home/RevenueLeakHomeHero";
import ProblemSection from "@/components/home/ProblemSection";
import HomeLocalProblemSection from "@/components/home/HomeLocalProblemSection";
import HomeGrowthAchieveSection from "@/components/home/HomeGrowthAchieveSection";
import Testimonials from "@/components/home/Testimonials";
import TechStrip from "@/components/home/TechStrip";
import HomeFAQ from "@/components/home/HomeFAQ";
import NewsletterSignup from "@/components/ui/NewsletterSignup";
import HomeFinalCTA from "@/components/home/HomeFinalCTA";

export default function HomePageContent() {
  return (
    <>
      <RevenueLeakHomeHero />
      <ProblemSection />
      <HomeLocalProblemSection />
      <HomeGrowthAchieveSection />
      <Testimonials />
      <TechStrip />
      <HomeFAQ />
      <NewsletterSignup />
      <HomeFinalCTA />
    </>
  );
}
