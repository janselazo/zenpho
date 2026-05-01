import MoreRotatingHeadline from "@/components/home/MoreRotatingHeadline";

export default function ProblemSection() {
  return (
    <section className="relative w-full border-t border-border/50 bg-background pb-24 pt-24 lg:pb-28 lg:pt-28">
      <div className="mx-auto max-w-4xl px-6 lg:px-8">
        <div className="mx-auto mb-12 max-w-4xl text-center sm:mb-14">
          <MoreRotatingHeadline />
          <div className="mx-auto mt-3 max-w-2xl space-y-3 text-pretty sm:mt-3.5 [&_p]:text-base [&_p]:leading-relaxed [&_p]:text-text-secondary [&_p]:sm:text-lg">
            <p>
              We help local service businesses generate, track, and convert more opportunities into revenue.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
