import SectionHeading from "@/components/ui/SectionHeading";

export default function ProblemSection() {
  return (
    <section className="relative w-full border-t border-border/50 bg-background pb-24 pt-24 lg:pb-28 lg:pt-28">
      <div className="mx-auto max-w-4xl px-6 lg:px-8">
        <SectionHeading
          className="!mb-0 !max-w-4xl"
          title="More Leads. More Booked Jobs. More Reviews. More Referrals."
          titleAccent="Clear ROI."
          align="center"
          description={
            <p>
              We help local service businesses generate qualified leads, turn them into appointments and paying
              clients, collect more Google reviews, increase referrals, and track exactly what marketing is producing
              revenue.
            </p>
          }
        />
      </div>
    </section>
  );
}
