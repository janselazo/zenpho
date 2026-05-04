import type { Metadata } from "next";
import Card from "@/components/ui/Card";
import Link from "next/link";
import { ZENPHO_PHONE_DISPLAY, ZENPHO_PHONE_TEL_HREF } from "@/lib/zenpho-contact";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How Zenpho collects, uses, and protects personal information — including website visitors, clients, and SMS.",
  alternates: { canonical: "https://zenpho.com/privacy" },
  openGraph: { url: "https://zenpho.com/privacy" },
};

const effective = "April 22, 2026";

export default function PrivacyPage() {
  return (
    <article className="mx-auto max-w-3xl px-6 pb-28 pt-20 lg:px-8 lg:pt-24">
      <p className="font-mono text-xs uppercase tracking-widest text-text-secondary">
        Legal
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-text-primary sm:text-4xl">
        Privacy Policy
      </h1>
      <p className="mt-3 text-sm text-text-secondary">
        Effective date: {effective}. Zenpho (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;)
        operates zenpho.com and related services.
      </p>

      <Card className="mt-10 border-border/80 bg-white p-8 shadow-soft sm:p-10">
        <div className="space-y-8 text-base leading-relaxed text-text-secondary">
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-text-primary">1. Scope</h2>
            <p>
              This policy describes how we handle personal information when you visit our marketing
              site, contact us, use our client tools (where applicable), or receive messages from us.
              If you engage us under a separate agreement, that contract may include additional or
              overriding terms for that engagement.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-text-primary">
              2. Information we collect
            </h2>
            <ul className="list-disc space-y-2 pl-5">
              <li>
                <span className="font-medium text-text-primary">Contact and inquiry data</span> —
                such as name, email address, phone number, company, and message content you submit
                through forms, email, or calls.
              </li>
              <li>
                <span className="font-medium text-text-primary">Account and usage data</span> — if
                we provide you with a login, we process credentials and activity needed to operate
                and secure that service.
              </li>
              <li>
                <span className="font-medium text-text-primary">Technical data</span> — such as IP
                address, device/browser type, and cookies or similar technologies where we use them
                for security, preferences, or basic analytics.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-text-primary">
              3. How we use information
            </h2>
            <p>We use personal information to:</p>
            <ul className="list-disc space-y-2 pl-5">
              <li>Respond to inquiries and deliver our services;</li>
              <li>Operate, secure, and improve our websites and tools;</li>
              <li>
                Send transactional or relationship messages you have agreed to receive, including
                SMS where applicable (see below);
              </li>
              <li>Comply with law and protect our rights and users.</li>
            </ul>
          </section>

          <section id="sms" className="space-y-3">
            <h2 className="text-lg font-semibold text-text-primary">
              4. SMS and text messages
            </h2>
            <p>
              <span className="font-medium text-text-primary">Program name:</span> Zenpho.{" "}
              <span className="font-medium text-text-primary">Program purpose:</span> business
              conversation and project communication (for example, links to design previews,
              scheduling confirmations, and follow-up about our services).
            </p>
            <p>
              If you provide a mobile number on our{" "}
              <Link href="/contact" className="font-medium text-accent underline-offset-2 hover:underline">
                Contact
              </Link>{" "}
              or{" "}
              <Link href="/booking" className="font-medium text-accent underline-offset-2 hover:underline">
                Booking
              </Link>{" "}
              form and check the SMS consent box, you agree to receive SMS text messages from
              Zenpho at that number. Message frequency is low — typically{" "}
              <span className="font-medium text-text-primary">1–5 messages per engagement</span>.
              Message and data rates may apply.
            </p>
            <p>
              You can opt out at any time by replying{" "}
              <span className="font-medium text-text-primary">STOP</span> to any message. Reply{" "}
              <span className="font-medium text-text-primary">HELP</span> for help, email{" "}
              <a
                href="mailto:hello@zenpho.com"
                className="font-medium text-accent underline-offset-2 hover:underline"
              >
                hello@zenpho.com
              </a>
              , or call{" "}
              <a
                href={ZENPHO_PHONE_TEL_HREF}
                className="font-medium text-accent underline-offset-2 hover:underline"
              >
                {ZENPHO_PHONE_DISPLAY}
              </a>
              . Full SMS program details are in our{" "}
              <Link href="/terms#sms" className="font-medium text-accent underline-offset-2 hover:underline">
                SMS Terms
              </Link>
              .
            </p>
            <p className="rounded-xl border border-border bg-surface/60 px-4 py-3 text-sm">
              <span className="font-medium text-text-primary">
                No mobile information will be shared with third parties or affiliates for
                marketing or promotional purposes.
              </span>{" "}
              All categories of data exclude text messaging originator opt-in data and consent;
              this information will not be shared with any third parties. Information sharing is
              limited to subcontractors supporting delivery of the service (for example, our SMS
              delivery provider), and only to the extent necessary to operate the service.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-text-primary">
              5. Sharing and sale of personal information
            </h2>
            <p>
              We use service providers (for example, hosting, email delivery, SMS delivery,
              authentication, and database providers) to run our business. They process information
              on our instructions and under appropriate safeguards.
            </p>
            <p>
              We do <span className="font-medium text-text-primary">not</span> sell your personal
              information. We do <span className="font-medium text-text-primary">not</span> share
              phone numbers, SMS opt-in status, or other contact details with unaffiliated third
              parties or affiliates for their own marketing or promotional purposes.
            </p>
            <p>
              <span className="font-medium text-text-primary">
                Text messaging originator opt-in data and consent will not be shared with any
                third parties.
              </span>
            </p>
            <p>
              We may disclose information if required by law, to enforce our terms, or to protect
              rights, safety, and security.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-text-primary">6. Retention</h2>
            <p>
              We keep information only as long as needed for the purposes above, unless a longer
              period is required or permitted by law.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-text-primary">7. Security</h2>
            <p>
              We use reasonable technical and organizational measures designed to protect personal
              information. No method of transmission or storage is completely secure.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-text-primary">8. Your choices</h2>
            <p>
              Depending on where you live, you may have rights to access, correct, delete, or
              restrict certain processing of your personal information, or to object to certain
              uses. To make a request, contact us at{" "}
              <a
                href="mailto:hello@zenpho.com"
                className="font-medium text-accent underline-offset-2 hover:underline"
              >
                hello@zenpho.com
              </a>{" "}
              or{" "}
              <a
                href={ZENPHO_PHONE_TEL_HREF}
                className="font-medium text-accent underline-offset-2 hover:underline"
              >
                {ZENPHO_PHONE_DISPLAY}
              </a>
              . We may need to verify your request.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-text-primary">
              9. International transfers
            </h2>
            <p>
              We are based in the United States. If you access our services from other countries,
              your information may be processed in the U.S. or other locations where we or our
              providers operate.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-text-primary">10. Children</h2>
            <p>
              Our services are not directed to children under 13, and we do not knowingly collect
              their personal information.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-text-primary">11. Changes</h2>
            <p>
              We may update this policy from time to time. We will post the updated version on this
              page and revise the effective date above.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-text-primary">12. Contact</h2>
            <p>
              Questions about this policy:{" "}
              <a
                href="mailto:hello@zenpho.com"
                className="font-medium text-accent underline-offset-2 hover:underline"
              >
                hello@zenpho.com
              </a>
            </p>
            <p>
              Phone:{" "}
              <a
                href={ZENPHO_PHONE_TEL_HREF}
                className="font-medium text-accent underline-offset-2 hover:underline"
              >
                {ZENPHO_PHONE_DISPLAY}
              </a>
            </p>
          </section>
        </div>
      </Card>
    </article>
  );
}
