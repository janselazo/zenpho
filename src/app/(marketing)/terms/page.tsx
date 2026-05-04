import type { Metadata } from "next";
import Card from "@/components/ui/Card";
import Link from "next/link";
import { ZENPHO_PHONE_DISPLAY, ZENPHO_PHONE_TEL_HREF } from "@/lib/zenpho-contact";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "Terms governing use of Zenpho’s website and services, including SMS program details (STOP, HELP).",
  alternates: { canonical: "https://zenpho.com/terms" },
  openGraph: { url: "https://zenpho.com/terms" },
};

const effective = "April 22, 2026";

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

          <section id="sms" className="space-y-3">
            <h2 className="text-lg font-semibold text-text-primary">
              3. SMS text message program (SMS Terms)
            </h2>

            <p className="font-medium text-text-primary">Program name</p>
            <p>Zenpho.</p>

            <p className="font-medium text-text-primary">Program description</p>
            <p>
              Business conversation and project communication. If you provide a mobile number on
              our{" "}
              <Link href="/contact" className="font-medium text-accent underline-offset-2 hover:underline">
                Contact
              </Link>{" "}
              or{" "}
              <Link href="/booking" className="font-medium text-accent underline-offset-2 hover:underline">
                Booking
              </Link>{" "}
              form and check the SMS consent box, you agree to receive SMS text messages from
              Zenpho at that number — for example, links to hosted design previews, scheduling
              confirmations, and follow-up about our services. Messages are conversational and
              tied to your relationship with Zenpho, not bulk marketing to purchased lists.
            </p>

            <p className="font-medium text-text-primary">How to opt in</p>
            <p>
              Submit our{" "}
              <Link href="/contact" className="font-medium text-accent underline-offset-2 hover:underline">
                Contact
              </Link>{" "}
              or{" "}
              <Link href="/booking" className="font-medium text-accent underline-offset-2 hover:underline">
                Booking
              </Link>{" "}
              form with a valid mobile number and check the SMS consent box. By checking that box,
              you confirm you are the subscriber or authorized user of the mobile number and
              consent to receive SMS text messages from Zenpho.
            </p>

            <p className="font-medium text-text-primary">Message frequency &amp; rates</p>
            <p>
              Message frequency is low — typically{" "}
              <span className="font-medium text-text-primary">1–5 messages per engagement</span>,
              based on our conversation and your requests. Message and data rates may apply
              depending on your carrier plan.
            </p>

            <p className="font-medium text-text-primary">Opt-out (STOP)</p>
            <p>
              You can cancel SMS messages at any time by replying{" "}
              <strong className="text-text-primary">STOP</strong> to any message. After you send{" "}
              <strong className="text-text-primary">STOP</strong>, we will send a confirmation and
              you will no longer receive SMS from that program unless you opt in again consistent
              with applicable law.
            </p>

            <p className="font-medium text-text-primary">Help (HELP)</p>
            <p>
              For help, reply <strong className="text-text-primary">HELP</strong> to any message,
              or email{" "}
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
              .
            </p>

            <p className="font-medium text-text-primary">Supported carriers</p>
            <p>
              All major U.S. mobile carriers, including AT&amp;T, T-Mobile, Verizon Wireless,
              Sprint, Boost Mobile, U.S. Cellular, and Metro by T-Mobile. Carriers are not liable
              for delayed or undelivered messages. Availability may vary by carrier and device.
            </p>

            <p className="font-medium text-text-primary">Privacy</p>
            <p>
              <span className="font-medium text-text-primary">
                No mobile information will be shared with third parties or affiliates for
                marketing or promotional purposes.
              </span>{" "}
              Text messaging originator opt-in data and consent will not be shared with any third
              parties. See our{" "}
              <Link href="/privacy#sms" className="font-medium text-accent underline-offset-2 hover:underline">
                Privacy Policy
              </Link>{" "}
              for more detail.
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
              Phone:{" "}
              <a
                href={ZENPHO_PHONE_TEL_HREF}
                className="font-medium text-accent underline-offset-2 hover:underline"
              >
                {ZENPHO_PHONE_DISPLAY}
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
