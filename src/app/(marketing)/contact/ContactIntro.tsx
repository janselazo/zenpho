import SectionHeading from "@/components/ui/SectionHeading";

export default function ContactIntro() {
  return (
    <div className="mb-10">
      <SectionHeading
        align="left"
        label="Start here"
        title="Tell us about your business"
        description={
          <p>
            Use the form below to share your services, geography, marketing today, and what you want to fix first. If
            we&apos;re a fit, we&apos;ll follow up to schedule a call and outline scope, timeline, and pricing.
          </p>
        }
      />
    </div>
  );
}
