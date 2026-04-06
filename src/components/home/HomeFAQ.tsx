import SectionHeading from "@/components/ui/SectionHeading";

const faqs = [
  {
    q: "What exactly do you build?",
    a: "We build custom web apps, mobile apps, and marketing sites — from simple MVPs to fully functional software products ready to scale.",
  },
  {
    q: "How long does it take to build my product?",
    a: "We deliver your first ready-to-launch version in as little as 2 weeks, depending on the scope and complexity of your idea.",
  },
  {
    q: "Do I need to be technical to work with you?",
    a: "Not at all. We work with both tech and non-tech founders. You bring the idea — we handle everything else.",
  },
  {
    q: "How much does it cost?",
    a: "Every project is different. We offer affordable, transparent pricing based on your scope. Book a call and we'll give you a clear quote with no surprises.",
  },
  {
    q: "What if I only have an idea and nothing else?",
    a: "That's exactly where we start. Our discovery process is designed to take you from raw idea to a defined, buildable product in one strategy call.",
  },
  {
    q: "Do you work with startups outside the U.S.?",
    a: "Yes. We work with founders across the U.S., Latin America, and Europe — in both English and Spanish.",
  },
  {
    q: "Will I own the code and the product?",
    a: "Absolutely. Once delivered, you have full ownership of your product, codebase, and all associated assets.",
  },
  {
    q: "What happens after launch?",
    a: "We support you through go-live and can continue as your development partner for future updates, new features, and scaling needs.",
  },
];

/** Native `<details>` so expand/collapse works without JS (reliable in embedded browsers). `name` = exclusive accordion in supporting browsers. */
export default function HomeFAQ() {
  return (
    <section className="mx-auto max-w-7xl px-6 py-24 lg:px-8">
      <SectionHeading
        label="FAQ"
        title="Common"
        titleAccent="questions"
        titleAccentInline
        description="No surprises, just clear answers about how we work."
      />

      <div className="mx-auto max-w-3xl space-y-3">
        {faqs.map((faq, i) => (
          <details
            key={i}
            name="home-faq"
            className="faq-native overflow-hidden rounded-3xl border border-border bg-white shadow-soft"
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
