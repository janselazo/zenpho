import SectionHeading from "@/components/ui/SectionHeading";
import Card from "@/components/ui/Card";

export default function AboutOurStory() {
  return (
    <section className="mx-auto max-w-3xl px-6 pb-20 lg:px-8">
      <SectionHeading
        align="left"
        label="Our story"
        title="Zenpho was built for operators"
        titleAccent="who need answers"
      />
      <Card className="border-border/80 bg-white p-8 shadow-soft sm:p-10">
        <p className="text-base leading-relaxed text-text-secondary">
          Most local service businesses are already getting calls, searches, form fills, and referrals—but when those
          moments are not captured, tracked, and followed up, revenue leaks out quietly.
        </p>
        <p className="mt-6 text-base leading-relaxed text-text-secondary">
          Zenpho exists to close that gap: not another generic agency ticket, and not software alone, but a{" "}
          <span className="font-medium text-text-primary">lead-to-revenue system</span> you can actually read—where leads
          came from, what converted, what stalled, and what to fix next.
        </p>
        <p className="mt-6 font-medium text-text-primary">Activity without visibility is expensive.</p>
        <p className="mt-6 text-base leading-relaxed text-text-secondary">
          We started by applying the same discipline we use in product and growth: instrument the funnel, prioritize what
          moves revenue, ship improvements fast, and report in terms owners care about—appointments, jobs won, reviews,
          referrals, and ROI.
        </p>
        <p className="mt-6 text-base leading-relaxed text-text-secondary">
          Today that shows up as Revenue Leak Audits, setup and tracking foundations, ongoing growth management, and
          partnerships for operators who are ready to scale with a clear scoreboard.
        </p>
      </Card>
    </section>
  );
}
