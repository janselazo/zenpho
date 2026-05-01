import Card from "@/components/ui/Card";

const goodFit = [
  "Local service businesses that rely on calls, forms, and appointments",
  "Owners who want clearer tracking from lead to booked job",
  "Teams spending on marketing without confident ROI reporting",
  "Operators ready to improve Google presence, landing pages, reviews, or referrals",
  "Businesses open to setup work before scaling ad spend",
  "Anyone who wants execution—not just a slide deck of recommendations",
] as const;

const notFit = [
  "National e-commerce brands with no local intake or service area",
  "Projects seeking only a one-time SEO report with no follow-through",
  "Teams that cannot implement basic call or form routing improvements",
  "Expectations of guaranteed rankings or overnight lead volume",
  "No budget or authority to act on prioritized fixes",
  "Pure software product builds unrelated to local lead generation",
] as const;

export default function ContactFitSection() {
  return (
    <section className="mx-auto max-w-7xl px-6 pb-20 lg:px-8">
      <div className="grid gap-8 lg:grid-cols-2 lg:gap-10">
        <Card className="border-border/80 bg-white p-8 shadow-soft sm:p-10">
          <h2 className="text-xl font-bold text-text-primary">
            Who we are a good fit for
          </h2>
          <ul className="mt-5 list-inside list-disc space-y-2.5 text-sm leading-relaxed text-text-secondary">
            {goodFit.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </Card>
        <Card className="border-border/80 bg-white p-8 shadow-soft sm:p-10">
          <h2 className="text-xl font-bold text-text-primary">
            Who we may not be a fit for
          </h2>
          <ul className="mt-5 list-inside list-disc space-y-2.5 text-sm leading-relaxed text-text-secondary">
            {notFit.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </Card>
      </div>
    </section>
  );
}
