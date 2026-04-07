import type { Metadata } from "next";
import Card from "@/components/ui/Card";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How Zenpho collects, uses, and protects personal information — including website visitors, clients, and SMS.",
  alternates: { canonical: "https://zenpho.com/privacy" },
  openGraph: { url: "https://zenpho.com/privacy" },
};

const effective = "April 6, 2026";

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

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-text-primary">
              4. SMS and text messages
            </h2>
            <p>
              If you provide a mobile number and consent to text messages from Zenpho, we may send
              SMS related to your request or project (for example, a link to a preview or follow-up).
              Message frequency varies. Message and data rates may apply. You can opt out as
              described in our{" "}
              <Link href="/terms" className="font-medium text-accent underline-offset-2 hover:underline">
                Terms
              </Link>{" "}
              (including{" "}
              <span className="font-medium text-text-primary">STOP</span> and{" "}
              <span className="font-medium text-text-primary">HELP</span>).
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
              phone numbers or contact details with unaffiliated third parties for their own
              marketing purposes.
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
          </section>
        </div>
      </Card>
    </article>
  );
}
