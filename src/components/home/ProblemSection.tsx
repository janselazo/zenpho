import SectionHeading from "@/components/ui/SectionHeading";

export default function ProblemSection() {
  return (
    <section className="relative w-full py-24 marketing-section-band lg:py-28">
      <div className="mx-auto max-w-3xl px-6 lg:px-8">
        <SectionHeading
          title="Most founders lose months"
          titleAccent="building too much too early."
          align="center"
          description={
            <p>
              You do not need a full product to validate demand. You need a
              focused MVP that proves the core idea, gets users in, and helps
              you learn fast.
            </p>
          }
        />
      </div>
    </section>
  );
}
