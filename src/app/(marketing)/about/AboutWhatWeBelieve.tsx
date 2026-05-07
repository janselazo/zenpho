import SectionHeading from "@/components/ui/SectionHeading";
import Card from "@/components/ui/Card";

const beliefs = [
  {
    title: "Clarity beats thrash",
    body: "We document assumptions, sequencing, and tradeoffs early so builders and stakeholders share the same picture of scope, milestones, and risk.",
  },
  {
    title: "The smallest coherent release wins",
    body: "We bias toward scopes that prove value quickly—experience, integrations, and quality included—rather than spreadsheets that balloon before users ever click.",
  },
  {
    title: "Instrumentation is part of MVP",
    body: "If you cannot see adoption, friction, or errors, you cannot iterate. Observability hooks are planned alongside features—not bolted on after launch surprises.",
  },
  {
    title: "Partnership ends with usable software",
    body: "We ship code your team can run: handoffs, runbooks, and pragmatic documentation so launches do not evaporate when the sprint ends.",
  },
  {
    title: "Your stack should evolve with you",
    body: "We integrate sensibly with what you already rely on—auth providers, commerce platforms, Zenpho workspaces, CRMs—and focus on seams that unblock product velocity.",
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
          titleAccent="product delivery"
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
