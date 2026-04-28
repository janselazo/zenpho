import SectionHeading from "@/components/ui/SectionHeading";

export default function ContactIntro() {
  return (
    <div className="mb-10">
      <SectionHeading
        align="left"
        label="Start here"
        title="Start with an MVP Strategy Call."
        description={
          <p>
            Use the form below to share your idea, product stage, timeline, and goals.
            If your project is a good fit, we&apos;ll schedule a strategy call to discuss
            scope, timeline, and next steps.
          </p>
        }
      />
    </div>
  );
}
