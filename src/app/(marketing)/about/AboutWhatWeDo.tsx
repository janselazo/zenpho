import SectionHeading from "@/components/ui/SectionHeading";
import Card from "@/components/ui/Card";

const activities = [
  "Revenue Leak Audits (Google Business Profile, site, competitors, reviews)",
  "Lead tracking dashboards and source attribution",
  "CRM and pipeline setup—or tuning what you already use",
  "Call, form, and landing-page tracking",
  "Google Business Profile optimization",
  "Website and landing page conversion improvements",
  "Google Ads and paid social when the foundation is ready",
  "Local SEO and content that supports real appointments",
  "Review request systems and referral campaigns",
  "Follow-up automation and proposal workflows",
  "Monthly ROI reporting and revenue-leak monitoring",
  "Growth recommendations with done-for-you execution",
] as const;

export default function AboutWhatWeDo() {
  return (
    <section className="border-t border-border/60 bg-surface/35 py-20 lg:py-24">
      <div className="mx-auto max-w-3xl px-6 lg:px-8">
        <SectionHeading
          align="left"
          title="We help you go from"
          titleAccent="leaks to leverage"
          description={
            <p className="!text-[15px] !leading-relaxed text-text-secondary sm:!text-base">
              A practical mix of diagnosis, systems, and ongoing growth work:
            </p>
          }
        />

        <Card className="mt-2 border-border/80 bg-white p-8 shadow-soft sm:p-10">
          <ul className="grid gap-3 sm:grid-cols-1 sm:gap-x-10">
            {activities.map((line) => (
              <li
                key={line}
                className="flex gap-3 text-[15px] leading-relaxed text-text-secondary sm:text-base"
              >
                <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-accent-violet" aria-hidden />
                {line}
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </section>
  );
}
