import RevenueLeakHomeHero from "@/components/home/RevenueLeakHomeHero";
import ProblemSection from "@/components/home/ProblemSection";
import FoundersStuckSection from "@/components/home/FoundersStuckSection";
import SolutionSection from "@/components/home/SolutionSection";
import ScopeNoteSection from "@/components/home/ScopeNoteSection";
import FeaturedWork from "@/components/home/FeaturedWork";
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
      <FoundersStuckSection />
      <SolutionSection />
      <ScopeNoteSection />
      <FeaturedWork />
      <Testimonials />
      <TechStrip />
      <HomeFAQ />
      <NewsletterSignup />
      <HomeFinalCTA />
    </>
  );
}
