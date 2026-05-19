import type { Metadata } from "next";
import {
  LegalLink,
  LegalPageShell,
  LegalSection,
} from "@/components/marketing/legal/LegalPageShell";
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
    <LegalPageShell
      title="Terms of Service"
      effective={effective}
      intro={
        <>By using zenpho.com and related Zenpho services, you agree to these terms.</>
      }
    >
      <LegalSection title="1. Who we are">
        <p>
          Zenpho provides software development, product, and related services. These terms apply to
          our public website and general use of our online presence unless a separate signed
          agreement governs a specific project.
        </p>
      </LegalSection>

      <LegalSection title="2. Use of the website">
        <p>
          You agree to use our site only for lawful purposes and in a way that does not infringe
          others&apos; rights or disrupt the service. We may suspend or restrict access for
          violations or risk to security.
        </p>
      </LegalSection>

      <LegalSection id="sms" title="3. SMS text message program (SMS Terms)">
        <p className="legal-em">Program name</p>
        <p>Zenpho.</p>

        <p className="legal-em">Program description</p>
        <p>
          Business conversation and project communication. If you provide a mobile number on our{" "}
          <LegalLink href="/contact">Contact</LegalLink> or{" "}
          <LegalLink href="/booking">Booking</LegalLink> form and check the SMS consent box, you
          agree to receive SMS text messages from Zenpho at that number — for example, links to
          hosted design previews, scheduling confirmations, and follow-up about our services.
          Messages are conversational and tied to your relationship with Zenpho, not bulk marketing
          to purchased lists.
        </p>

        <p className="legal-em">How to opt in</p>
        <p>
          Submit our <LegalLink href="/contact">Contact</LegalLink> or{" "}
          <LegalLink href="/booking">Booking</LegalLink> form with a valid mobile number and check
          the SMS consent box. By checking that box, you confirm you are the subscriber or
          authorized user of the mobile number and consent to receive SMS text messages from Zenpho.
        </p>

        <p className="legal-em">Message frequency &amp; rates</p>
        <p>
          Message frequency is low — typically{" "}
          <span className="legal-em">1–5 messages per engagement</span>, based on our conversation
          and your requests. Message and data rates may apply depending on your carrier plan.
        </p>

        <p className="legal-em">Opt-out (STOP)</p>
        <p>
          You can cancel SMS messages at any time by replying{" "}
          <span className="legal-em">STOP</span> to any message. After you send{" "}
          <span className="legal-em">STOP</span>, we will send a confirmation and you will no longer
          receive SMS from that program unless you opt in again consistent with applicable law.
        </p>

        <p className="legal-em">Help (HELP)</p>
        <p>
          For help, reply <span className="legal-em">HELP</span> to any message, or email{" "}
          <LegalLink href="mailto:hello@zenpho.com">hello@zenpho.com</LegalLink>, or call{" "}
          <LegalLink href={ZENPHO_PHONE_TEL_HREF}>{ZENPHO_PHONE_DISPLAY}</LegalLink>.
        </p>

        <p className="legal-em">Supported carriers</p>
        <p>
          All major U.S. mobile carriers, including AT&amp;T, T-Mobile, Verizon Wireless, Sprint,
          Boost Mobile, U.S. Cellular, and Metro by T-Mobile. Carriers are not liable for delayed or
          undelivered messages. Availability may vary by carrier and device.
        </p>

        <p className="legal-em">Privacy</p>
        <p>
          <span className="legal-em">
            No mobile information will be shared with third parties or affiliates for marketing or
            promotional purposes.
          </span>{" "}
          Text messaging originator opt-in data and consent will not be shared with any third
          parties. See our <LegalLink href="/privacy#sms">Privacy Policy</LegalLink> for more
          detail.
        </p>
      </LegalSection>

      <LegalSection title="4. Intellectual property">
        <p>
          Content on this site (text, graphics, logos, and other materials) is owned by Zenpho or
          our licensors and is protected by intellectual property laws. You may not copy, modify,
          or distribute it without permission, except as allowed by law or with our consent.
        </p>
      </LegalSection>

      <LegalSection title="5. Third-party links">
        <p>
          Our site may link to third-party sites. We are not responsible for their content or
          practices. Review their terms and privacy policies.
        </p>
      </LegalSection>

      <LegalSection title="6. Disclaimers and limitation of liability">
        <p>
          The site and any information on it are provided &quot;as is&quot; without warranties of
          any kind, to the fullest extent permitted by law. To the fullest extent permitted by law,
          Zenpho and its team will not be liable for indirect, incidental, special, consequential,
          or punitive damages, or any loss of profits or data, arising from your use of the site. Our
          total liability for claims relating to the site is limited to the greater of (a) the
          amount you paid us for the specific service giving rise to the claim in the twelve months
          before the claim or (b) one hundred U.S. dollars, except where prohibited by law.
        </p>
      </LegalSection>

      <LegalSection title="7. Indemnity">
        <p>
          To the extent permitted by law, you agree to indemnify and hold harmless Zenpho from
          claims arising out of your misuse of the site or violation of these terms.
        </p>
      </LegalSection>

      <LegalSection title="8. Governing law">
        <p>
          These terms are governed by the laws of the State of Florida, USA, without regard to
          conflict-of-law rules, except where preempted by applicable federal law. Courts in
          Miami-Dade County, Florida, shall have exclusive jurisdiction for disputes arising from
          these terms related to the public website, subject to mandatory consumer protections in
          your jurisdiction where applicable.
        </p>
      </LegalSection>

      <LegalSection title="9. Changes">
        <p>
          We may update these terms. The updated version will be posted on this page with a new
          effective date. Continued use after changes constitutes acceptance of the revised terms.
        </p>
      </LegalSection>

      <LegalSection title="10. Contact">
        <p>
          <LegalLink href="mailto:hello@zenpho.com">hello@zenpho.com</LegalLink>
        </p>
        <p>
          Phone: <LegalLink href={ZENPHO_PHONE_TEL_HREF}>{ZENPHO_PHONE_DISPLAY}</LegalLink>
        </p>
        <p>
          Privacy: see our <LegalLink href="/privacy">Privacy Policy</LegalLink>.
        </p>
      </LegalSection>
    </LegalPageShell>
  );
}
