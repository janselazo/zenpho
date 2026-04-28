import type { Metadata } from "next";
import ContactHero from "./ContactHero";
import ContactIntro from "./ContactIntro";
import ContactForm from "@/components/contact/ContactForm";
import ContactFitSection from "./ContactFitSection";
import ContactPageCTA from "./ContactPageCTA";
import ContactAside from "@/components/contact/ContactAside";

export const metadata: Metadata = {
  title: {
    absolute: "Contact Zenpho | Build Your MVP",
  },
  description:
    "Contact Zenpho to discuss your MVP, AI product, web app, mobile-first app, or launch strategy. Book an MVP Strategy Call today.",
};

export default function ContactPage() {
  return (
    <>
      <ContactHero />
      <section className="mx-auto max-w-7xl px-6 pb-20 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)] lg:gap-14 xl:gap-16 lg:items-start">
          <div className="min-w-0">
            <ContactIntro />
            <ContactForm />
          </div>

          <div className="min-w-0 lg:sticky lg:top-[6.75rem]">
            <ContactAside />
          </div>
        </div>
      </section>
      <ContactFitSection />
      <ContactPageCTA />
    </>
  );
}
