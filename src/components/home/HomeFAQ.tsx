import SectionHeading from "@/components/ui/SectionHeading";

const faqs = [
  {
    q: "What exactly does Zenpho build?",
    a: "We focus on founders shipping AI-assisted MVPs: SaaS surfaces, dashboards, PWAs and mobile-first apps, prototypes, marketplace slices, lightweight internal tooling, and MVP Growth after launch.",
  },
  {
    q: "What’s your main timeline promise?",
    a: "We aim for a demo-ready MVP in about two weeks when scope stays disciplined. Larger bets split into milestones so you still get working software every week.",
  },
  {
    q: "Do I need to be technical?",
    a: "No. We partner with both technical and non-technical founders — you own the problem and users; we own stack choices, delivery, and instrumentation.",
  },
  {
    q: "How much does it cost?",
    a: "Two clear starting points: MVP Development from $5,000 and MVP Growth from $2,500. Exact quotes come after a short scoping call — no surprise line items.",
  },
  {
    q: "What if I only have an idea?",
    a: "That’s the default starting point. Discovery turns the idea into a crisp MVP definition, success metrics, and what we’re explicitly not building in v1.",
  },
  {
    q: "Do you work with founders outside the U.S.?",
    a: "Yes — U.S., Latin America, and Europe, in English and Spanish.",
  },
  {
    q: "Will I own the code?",
    a: "Yes. You own the product, repository, and assets once delivered per agreement.",
  },
  {
    q: "What happens after launch?",
    a: "We include a post-launch support window with MVP Development. When you’re ready to optimize traction, MVP Growth layers on experiments, analytics, and lifecycle work.",
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
        description="Clear answers for founders evaluating an AI MVP studio."
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
