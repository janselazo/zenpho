import SectionHeading from "@/components/ui/SectionHeading";
import Card from "@/components/ui/Card";

const audience = [
  "Roofers, HVAC, plumbers, and remodelers",
  "Med spas, dental practices, and other appointment-driven clinics",
  "Attorneys and professional services that live on consultations",
  "Auto repair and home service brands with local search volume",
  "Multi-location operators standardizing lead handling",
  "Owners spending on marketing without clear ROI",
  "Teams losing leads to missed calls, slow follow-up, or weak proposals",
  "Businesses ready to invest in reviews, referrals, and reactivation",
] as const;

export default function AboutWhoWeHelp() {
  return (
    <section className="mx-auto max-w-3xl px-6 py-20 lg:px-8 lg:py-24">
      <SectionHeading
        align="left"
        title="Built for local service"
        titleAccent="businesses"
        description={
          <p className="!text-[15px] !leading-relaxed text-text-secondary sm:!text-base">
            If your growth depends on nearby customers booking calls, visits, or jobs—we are built for you.
          </p>
        }
      />

      <p className="-mt-4 mb-5 text-xs font-semibold uppercase tracking-widest text-text-secondary">
        We are a strong fit for:
      </p>

      <Card className="border-border/80 bg-white p-8 shadow-soft sm:p-10">
        <ul className="space-y-3">
          {audience.map((line) => (
            <li
              key={line}
              className="flex gap-3 text-[15px] leading-relaxed text-text-secondary sm:text-base"
            >
              <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-accent" aria-hidden />
              {line}
            </li>
          ))}
        </ul>
      </Card>
    </section>
  );
}
