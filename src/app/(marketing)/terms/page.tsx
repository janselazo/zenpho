import type { Metadata } from "next";
import Card from "@/components/ui/Card";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "Terms governing use of Zenpho’s website and services, including SMS program details (STOP, HELP).",
  alternates: { canonical: "https://zenpho.com/terms" },
  openGraph: { url: "https://zenpho.com/terms" },
};

const effective = "April 6, 2026";

export default function TermsPage() {
  return (
    <article className="mx-auto max-w-3xl px-6 pb-28 pt-20 lg:px-8 lg:pt-24">
      <p className="font-mono text-xs uppercase tracking-widest text-text-secondary">
        Legal
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-text-primary sm:text-4xl">
        Terms of Service
      </h1>
      <p className="mt-3 text-sm text-text-secondary">
        Effective date: {effective}. By using zenpho.com and related Zenpho services, you agree
        to these terms.
      </p>

      <Card className="mt-10 border-border/80 bg-white p-8 shadow-soft sm:p-10">
        <div className="space-y-8 text-base leading-relaxed text-text-secondary">
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-text-primary">1. Who we are</h2>
            <p>
              Zenpho provides software development, product, and related services. These terms
              apply to our public website and general use of our online presence unless a separate
              signed agreement governs a specific project.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-text-primary">2. Use of the website</h2>
            <p>
              You agree to use our site only for lawful purposes and in a way that does not
              infringe others&apos; rights or disrupt the service. We may suspend or restrict access
              for violations or risk to security.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-text-primary">
              3. SMS text message program
            </h2>
            <p className="font-medium text-text-primary">Program name</p>
            <p>Zenpho — business SMS (previews, project follow-up, and related communication).</p>

            <p className="font-medium text-text-primary">Description</p>
            <p>
              If you provide a mobile number and agree to receive texts, we may send SMS messages
              related to your inquiry or engagement — for example, links to hosted design previews,
              scheduling, or follow-up about our services. Content is conversational and tied to
              your relationship with Zenpho, not bulk unsolicited marketing to purchased lists.
            </p>

            <p className="font-medium text-text-primary">Message frequency &amp; rates</p>
            <p>
              Message frequency varies based on our conversation and your requests. Message and data
              rates may apply depending on your carrier plan.
            </p>

            <p className="font-medium text-text-primary">Opt-out</p>
            <p>
              You can cancel SMS messages at any time by replying{" "}
              <strong className="text-text-primary">STOP</strong> to any message. After you send{" "}
              <strong className="text-text-primary">STOP</strong>, we will send a confirmation and
              you will no longer receive SMS from that program unless you opt in again consistent
              with applicable law.
            </p>

            <p className="font-medium text-text-primary">Help</p>
            <p>
              For help, reply <strong className="text-text-primary">HELP</strong> or email{" "}
              <a
                href="mailto:hello@zenpho.com"
                className="font-medium text-accent underline-offset-2 hover:underline"
              >
                hello@zenpho.com
              </a>
              .
            </p>

            <p className="font-medium text-text-primary">Carriers</p>
            <p>
              Carriers are not liable for delayed or undelivered messages. Availability may vary by
              carrier and device.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-text-primary">4. Intellectual property</h2>
            <p>
              Content on this site (text, graphics, logos, and other materials) is owned by Zenpho or
              our licensors and is protected by intellectual property laws. You may not copy,
              modify, or distribute it without permission, except as allowed by law or with our
              consent.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-text-primary">5. Third-party links</h2>
            <p>
              Our site may link to third-party sites. We are not responsible for their content or
              practices. Review their terms and privacy policies.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-text-primary">
              6. Disclaimers and limitation of liability
            </h2>
            <p>
              The site and any information on it are provided &quot;as is&quot; without warranties
              of any kind, to the fullest extent permitted by law. To the fullest extent permitted
              by law, Zenpho and its team will not be liable for indirect, incidental, special,
              consequential, or punitive damages, or any loss of profits or data, arising from your
              use of the site. Our total liability for claims relating to the site is limited to the
              greater of (a) the amount you paid us for the specific service giving rise to the
              claim in the twelve months before the claim or (b) one hundred U.S. dollars, except
              where prohibited by law.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-text-primary">7. Indemnity</h2>
            <p>
              To the extent permitted by law, you agree to indemnify and hold harmless Zenpho from
              claims arising out of your misuse of the site or violation of these terms.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-text-primary">8. Governing law</h2>
            <p>
              These terms are governed by the laws of the State of Florida, USA, without regard to
              conflict-of-law rules, except where preempted by applicable federal law. Courts in
              Miami-Dade County, Florida, shall have exclusive jurisdiction for disputes arising
              from these terms related to the public website, subject to mandatory consumer
              protections in your jurisdiction where applicable.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-text-primary">9. Changes</h2>
            <p>
              We may update these terms. The updated version will be posted on this page with a new
              effective date. Continued use after changes constitutes acceptance of the revised
              terms.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-text-primary">10. Contact</h2>
            <p>
              <a
                href="mailto:hello@zenpho.com"
                className="font-medium text-accent underline-offset-2 hover:underline"
              >
                hello@zenpho.com
              </a>
            </p>
            <p>
              Privacy: see our{" "}
              <Link href="/privacy" className="font-medium text-accent underline-offset-2 hover:underline">
                Privacy Policy
              </Link>
              .
            </p>
          </section>
        </div>
      </Card>
    </article>
  );
}
