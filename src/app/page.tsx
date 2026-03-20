import Hero from "@/components/home/Hero";
import AboutIntro from "@/components/home/AboutIntro";
import SplitIntro from "@/components/home/SplitIntro";
import Process from "@/components/agency/Process";
import FeaturedWork from "@/components/home/FeaturedWork";
import ResourcesSection from "@/components/home/ResourcesSection";
import TechStrip from "@/components/home/TechStrip";
import HomeFAQ from "@/components/home/HomeFAQ";
import NewsletterSignup from "@/components/ui/NewsletterSignup";
import CTASection from "@/components/home/CTASection";

export default function HomePage() {
  return (
    <>
      <Hero />
      <AboutIntro />
      <SplitIntro />
      <Process />
      <FeaturedWork />
      <ResourcesSection />
      <TechStrip />
      <HomeFAQ />
      <NewsletterSignup />
      <CTASection />
    </>
  );
}
