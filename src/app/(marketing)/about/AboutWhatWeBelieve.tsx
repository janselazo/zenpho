import SectionHeading from "@/components/ui/SectionHeading";
import Card from "@/components/ui/Card";

const beliefs = [
  {
    title: "Build less, learn faster",
    body: "The best MVPs are not smaller versions of big products. They are focused tools designed to validate one important assumption.",
  },
  {
    title: "Strategy comes before code",
    body: "Before building, we clarify the user, problem, workflow, features, and success metrics.",
  },
  {
    title: "Launch matters",
    body: "A product sitting in a private demo environment does not create traction. Founders need users, feedback, analytics, and growth experiments.",
  },
  {
    title: "AI should solve real problems",
    body: "AI is powerful, but it should not be added just for hype. We use AI where it improves workflows, automates tasks, generates insights, or creates a better product experience.",
  },
  {
    title: "Every MVP should create momentum",
    body: "A good MVP should help you get users, learn from the market, show progress, and make smarter decisions for the next version.",
  },
] as const;

export default function AboutWhatWeBelieve() {
  return (
    <section className="border-t border-border/60 bg-surface/40 py-20 lg:py-24">
      <div className="mx-auto max-w-3xl px-6 lg:px-8">
        <SectionHeading
          align="left"
          label="Philosophy"
          title="Our product philosophy"
        />

        <ul className="mt-12 space-y-5">
          {beliefs.map((item) => (
            <li key={item.title}>
              <Card className="border-border/80 bg-white p-8 shadow-soft sm:p-9">
                <p className="heading-display text-lg font-bold leading-snug text-text-primary">
                  {item.title}
                </p>
                <p className="mt-3 text-base leading-relaxed text-text-secondary">
                  {item.body}
                </p>
              </Card>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
