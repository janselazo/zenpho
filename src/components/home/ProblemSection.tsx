import SectionHeading from "@/components/ui/SectionHeading";

export default function ProblemSection() {
  return (
    <section className="marketing-section-band relative w-full pb-10 pt-24 lg:pb-12 lg:pt-28">
      <div className="mx-auto max-w-3xl px-6 lg:px-8">
        <SectionHeading
          className="!mb-0"
          title="Most founders lose months"
          titleAccent="building too much too early"
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
