import SectionHeading from "@/components/ui/SectionHeading";

export default function ContactIntro() {
  return (
    <div className="mb-10">
      <SectionHeading
        align="left"
        label="Start here"
        title="Tell us about your product"
        description={
          <p>
            Use the form below to share your idea, timeline, stack, and what you need first—Design, Build, Launch, or a
            quick audit. If we&apos;re a fit, we&apos;ll follow up to schedule a call and outline scope, milestones, and
            pricing.
          </p>
        }
      />
    </div>
  );
}
