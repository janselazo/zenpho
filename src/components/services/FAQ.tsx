import SectionHeading from "@/components/ui/SectionHeading";

const faqs = [
  {
    q: "How much does MVP Development cost?",
    a: "MVP Development starts at $5,000. Most projects range from $5,000 to $50,000+, depending on the scope, complexity, integrations, and product requirements.",
  },
  {
    q: "How much does MVP Growth cost?",
    a: "MVP Growth starts at $2,500. Most projects range from $2,500 to $25,000+, depending on the launch scope, acquisition campaigns, landing page work, and growth support needed.",
  },
  {
    q: "Can you really build an MVP in 2 weeks?",
    a: "Yes, if the MVP is focused. Our 2-week sprint is designed for products with one core workflow, essential features, and a clear launch goal.",
  },
  {
    q: "Can you build any product in 2 weeks?",
    a: "No. We can move fast, but not every product fits a 2-week timeline. Complex platforms, advanced mobile apps, enterprise systems, and compliance-heavy products may require a larger scope.",
  },
  {
    q: "Do you build websites?",
    a: "Yes. MVP Development can include a launch landing page. MVP Growth can include landing page creation or optimization.",
  },
  {
    q: "Do you build mobile apps?",
    a: "Yes, when the scope fits. For most early-stage founders, we recommend starting with a mobile-first web app or PWA before investing in full native iOS/Android development.",
  },
  {
    q: "Do I need both MVP Development and MVP Growth?",
    a: "Not always. If you need the product built, start with MVP Development. If you already have a product and need users, start with MVP Growth. Many founders use both: first build the MVP, then launch and grow it.",
  },
];

export default function FAQ() {
  return (
    <section className="mx-auto max-w-7xl px-6 py-24 lg:px-8">
      <SectionHeading
        label="FAQ"
        title="Common"
        titleAccent="questions"
        titleAccentInline
        description="Pricing, scope, and what to expect from an AI-powered MVP engagement."
      />

      <div className="mx-auto max-w-3xl space-y-3">
        {faqs.map((faq, i) => (
          <details
            key={i}
            name="services-faq"
            className="faq-native overflow-hidden rounded-2xl border border-border bg-white shadow-sm"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-left [&::-webkit-details-marker]:hidden">
              <span className="text-sm font-medium text-text-primary">
                {faq.q}
              </span>
              <svg
                className="faq-chevron h-5 w-5 shrink-0 text-text-secondary transition-transform duration-200"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
                aria-hidden
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m19.5 8.25-7.5 7.5-7.5-7.5"
                />
              </svg>
            </summary>
            <div className="border-t border-border/70 px-5 pb-4 pt-3">
              <p className="text-sm leading-relaxed text-text-secondary">
                {faq.a}
              </p>
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}
