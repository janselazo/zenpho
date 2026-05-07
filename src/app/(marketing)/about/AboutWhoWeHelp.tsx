import SectionHeading from "@/components/ui/SectionHeading";
import Card from "@/components/ui/Card";

const audience = [
  "Founders turning a concept into a demo, MVP, or first paying customers",
  "Small product teams that need senior hands across UX, engineering, and release",
  "Operators modernizing a legacy site or internal tool into a web or mobile experience",
  "Brands launching ecommerce, membership, or content systems that must work on day one",
  "Agencies or studios looking for a disciplined build partner without hiring a full bench",
  "Teams that already shipped v1 and need stabilization, instrumentation, or roadmap for v2",
  "Non-technical leaders who want weekly visibility into scope, milestones, and tradeoffs",
  "Builders who value documentation, handoff, and pragmatic maintainability",
] as const;

export default function AboutWhoWeHelp() {
  return (
    <section className="mx-auto max-w-3xl px-6 py-20 lg:px-8 lg:py-24">
      <SectionHeading
        align="left"
        title="Built for teams"
        titleAccent="shipping digital products"
        description={
          <p className="!text-[15px] !leading-relaxed text-text-secondary sm:!text-base">
            If you are moving from idea → launch for a website, ecommerce, mobile experience, or MVP, we are built for you.
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
