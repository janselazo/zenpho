import SectionHeading from "@/components/ui/SectionHeading";
import { PRICING_PAGE_FAQS } from "@/lib/marketing/pricing-page-faq-items";

export default function PricingFAQ() {
  return (
    <section className="mx-auto max-w-7xl px-6 py-20 lg:px-8 lg:py-24">
      <SectionHeading
        label="FAQ"
        title="Common"
        titleAccent="questions"
        titleAccentInline
        description="Lead-to-revenue setup, monthly growth plans, ad spend, and how to choose the right level of support."
      />

      <div className="mx-auto max-w-3xl space-y-3">
        {PRICING_PAGE_FAQS.map((faq, i) => (
          <details
            key={i}
            name="pricing-faq"
            className="faq-native overflow-hidden rounded-2xl border border-border bg-white/95 shadow-sm transition-shadow hover:shadow-md"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-4 text-left sm:px-5 [&::-webkit-details-marker]:hidden">
              <span className="text-sm font-medium text-text-primary">{faq.q}</span>
              <svg
                className="faq-chevron h-5 w-5 shrink-0 text-text-secondary transition-transform duration-200"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
                aria-hidden
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
              </svg>
            </summary>
            <div className="border-t border-border/70 px-5 pb-4 pt-3">
              <p className="text-sm leading-relaxed text-text-secondary">{faq.a}</p>
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}
