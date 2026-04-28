import SectionHeading from "@/components/ui/SectionHeading";
import Card from "@/components/ui/Card";

const activities = [
  "MVP scoping",
  "Product strategy",
  "UX/UI design",
  "AI development",
  "Web app development",
  "Mobile-first MVP development",
  "SaaS development",
  "Landing pages",
  "Analytics setup",
  "Launch campaigns",
  "Beta user acquisition",
  "Growth experiments",
] as const;

export default function AboutWhatWeDo() {
  return (
    <section className="border-t border-border/60 bg-surface/35 py-20 lg:py-24">
      <div className="mx-auto max-w-3xl px-6 lg:px-8">
        <SectionHeading
          align="left"
          title="We help you go from"
          titleAccent="idea to launch."
          description={
            <p className="!text-[15px] !leading-relaxed text-text-secondary sm:!text-base">
              Our work covers the full early product journey:
            </p>
          }
        />

        <Card className="mt-2 border-border/80 bg-white p-8 shadow-soft sm:p-10">
          <ul className="grid gap-3 sm:grid-cols-2 sm:gap-x-10">
            {activities.map((line) => (
              <li
                key={line}
                className="flex gap-3 text-[15px] leading-relaxed text-text-secondary sm:text-base"
              >
                <span
                  className="mt-2 h-1 w-1 shrink-0 rounded-full bg-accent-violet"
                  aria-hidden
                />
                {line}
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </section>
  );
}
