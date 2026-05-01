import SectionHeading from "@/components/ui/SectionHeading";
import Card from "@/components/ui/Card";

const beliefs = [
  {
    title: "Revenue clarity first",
    body: "If you cannot see leaks, sources, and outcomes, you cannot fix them. We prioritize tracking, reporting, and honest baselines before pouring more budget into channels.",
  },
  {
    title: "The full journey matters",
    body: "Local growth is not only SEO or only ads. Visibility, conversion, follow-up, reviews, referrals, and reactivation all affect whether opportunities become booked work.",
  },
  {
    title: "Systems beat one-off tactics",
    body: "Campaigns work better when dashboards, CRM, automations, and landing pages are aligned so nothing falls through the cracks.",
  },
  {
    title: "Execution, not just recommendations",
    body: "We install tools, improve pages, run ads where appropriate, and stay accountable for monthly outcomes—not PDFs that sit in your inbox.",
  },
  {
    title: "Your stack should flex with you",
    body: "We work with what you already run when it makes sense—whether that is a CRM, a field-service platform, or a reviews tool—and focus on wiring insight and follow-through.",
  },
] as const;

export default function AboutWhatWeBelieve() {
  return (
    <section className="border-t border-border/60 bg-surface/40 py-20 lg:py-24">
      <div className="mx-auto max-w-3xl px-6 lg:px-8">
        <SectionHeading
          align="left"
          label="Philosophy"
          title="How we think about"
          titleAccent="local growth"
          titleAccentInline
        />

        <ul className="mt-12 space-y-5">
          {beliefs.map((item) => (
            <li key={item.title}>
              <Card className="border-border/80 bg-white p-8 shadow-soft sm:p-9">
                <p className="heading-display text-lg font-bold leading-snug text-text-primary">{item.title}</p>
                <p className="mt-3 text-base leading-relaxed text-text-secondary">{item.body}</p>
              </Card>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
