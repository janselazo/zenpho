import Card from "@/components/ui/Card";

const goodFit = [
  "You are a founder building a technology product",
  "You want to launch quickly",
  "You have a clear problem or target user",
  "You need product strategy and development",
  "You are open to starting with a focused MVP",
  "You want help with launch and early growth",
] as const;

const notFit = [
  "You want to build a large platform in 2 weeks",
  "You need a complex enterprise system immediately",
  "You do not have a clear target user",
  "You want every feature in version one",
  "You are looking for equity-only development",
  "You need advanced compliance-heavy infrastructure from day one",
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
