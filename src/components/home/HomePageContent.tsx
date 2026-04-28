import Hero from "@/components/home/Hero";
import ProblemSection from "@/components/home/ProblemSection";
import SolutionSection from "@/components/home/SolutionSection";
import SplitIntro from "@/components/home/SplitIntro";
import ScopeNoteSection from "@/components/home/ScopeNoteSection";
import WhyZenphoSection from "@/components/home/WhyZenphoSection";
import FeaturedWork from "@/components/home/FeaturedWork";
import Testimonials from "@/components/home/Testimonials";
import TechStrip from "@/components/home/TechStrip";
import StudioPreviewSection from "@/components/home/StudioPreviewSection";
import HomeFAQ from "@/components/home/HomeFAQ";
import NewsletterSignup from "@/components/ui/NewsletterSignup";
import HomeFinalCTA from "@/components/home/HomeFinalCTA";

export default function HomePageContent() {
  return (
    <>
      <Hero />
      <ProblemSection />
      <SolutionSection />
      <SplitIntro />
      <ScopeNoteSection />
      <WhyZenphoSection />
      <FeaturedWork />
      <Testimonials />
      <TechStrip />
      <StudioPreviewSection />
      <HomeFAQ />
      <NewsletterSignup />
      <HomeFinalCTA />
    </>
  );
}
