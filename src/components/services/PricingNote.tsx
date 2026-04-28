import SectionHeading from "@/components/ui/SectionHeading";

export default function PricingNote() {
  return (
    <div className="mx-auto mt-16 max-w-3xl text-center lg:mt-24">
      <SectionHeading
        align="center"
        title="Every MVP is different."
        description={
          <>
            <p>
              Final pricing depends on product complexity, number of workflows, AI requirements, integrations,
              mobile requirements, design complexity, and launch goals.
            </p>
            <p className="!mt-4 font-medium text-text-primary/95">
              The goal is not to build everything.
            </p>
            <p className="!mt-3">
              The goal is to build the right version one, launch it quickly, and learn from real users.
            </p>
          </>
        }
      />
    </div>
  );
}
