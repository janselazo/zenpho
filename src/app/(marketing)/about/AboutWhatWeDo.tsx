import SectionHeading from "@/components/ui/SectionHeading";
import Card from "@/components/ui/Card";

const activities = [
  "Discovery workshops, journey mapping, IA, and prioritized screen plans",
  "UX/UI design artifacts and dev-ready notes for web, mobile, or responsive experiences",
  "Full-stack implementation: frontends, APIs, data models, auth, and admin consoles",
  "Integrations—payments, CRMs, messaging, analytics, and third-party APIs",
  "Staging environments, QA passes, instrumentation, and observability hooks",
  "Production releases, DNS/hosting cutovers, rollback plans, and go-live support",
  "Post-launch stabilization, backlog grooming, and roadmap planning for fast follows",
  "Revenue Leak Audits when marketing clarity needs a fast baseline",
  "Milestone demos, documented decisions, and pragmatic scope management",
] as const;

export default function AboutWhatWeDo() {
  return (
    <section className="border-t border-border/60 bg-surface/35 py-20 lg:py-24">
      <div className="mx-auto max-w-3xl px-6 lg:px-8">
        <SectionHeading
          align="left"
          title="We take you from"
          titleAccent="idea to operating product"
          description={
            <p className="!text-[15px] !leading-relaxed text-text-secondary sm:!text-base">
              The practical mix of discovery, design, engineering, release, and iteration:
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
