import type { Metadata } from "next";
import {
  LegalCallout,
  LegalLink,
  LegalPageShell,
  LegalSection,
} from "@/components/marketing/legal/LegalPageShell";
import { ZENPHO_PHONE_DISPLAY, ZENPHO_PHONE_TEL_HREF } from "@/lib/zenpho-contact";
import { buildMarketingMetadata } from "@/lib/marketing/seo";

export const metadata: Metadata = buildMarketingMetadata({
  title: "Privacy Policy",
  description:
    "How Zenpho collects, uses, and protects personal information — including website visitors, clients, and SMS.",
  path: "/privacy",
});

const effective = "April 22, 2026";

export default function PrivacyPage() {
  return (
    <LegalPageShell
      title="Privacy Policy"
      effective={effective}
      intro={
        <>
          Zenpho (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) operates zenpho.com and
          related services.
        </>
      }
    >
      <LegalSection title="1. Scope">
        <p>
          This policy describes how we handle personal information when you visit our marketing
          site, contact us, use our client tools (where applicable), or receive messages from us.
          If you engage us under a separate agreement, that contract may include additional or
          overriding terms for that engagement.
        </p>
      </LegalSection>

      <LegalSection title="2. Information we collect">
        <ul>
          <li>
            <span className="legal-em">Contact and inquiry data</span> — such as name, email
            address, phone number, company, and message content you submit through forms, email,
            or calls.
          </li>
          <li>
            <span className="legal-em">Account and usage data</span> — if we provide you with a
            login, we process credentials and activity needed to operate and secure that service.
          </li>
          <li>
            <span className="legal-em">Technical data</span> — such as IP address, device/browser
            type, and cookies or similar technologies where we use them for security, preferences,
            or basic analytics.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="3. How we use information">
        <p>We use personal information to:</p>
        <ul>
          <li>Respond to inquiries and deliver our services;</li>
          <li>Operate, secure, and improve our websites and tools;</li>
          <li>
            Send transactional or relationship messages you have agreed to receive, including SMS
            where applicable (see below);
          </li>
          <li>Comply with law and protect our rights and users.</li>
        </ul>
      </LegalSection>

      <LegalSection id="sms" title="4. SMS and text messages">
        <p>
          <span className="legal-em">Program name:</span> Zenpho.{" "}
          <span className="legal-em">Program purpose:</span> business conversation and project
          communication (for example, links to design previews, scheduling confirmations, and
          follow-up about our services).
        </p>
        <p>
          If you provide a mobile number on our <LegalLink href="/contact">Contact</LegalLink> or{" "}
          <LegalLink href="/booking">Booking</LegalLink> form and check the SMS consent box, you
          agree to receive SMS text messages from Zenpho at that number. Message frequency is low
          — typically <span className="legal-em">1–5 messages per engagement</span>. Message and
          data rates may apply.
        </p>
        <p>
          You can opt out at any time by replying <span className="legal-em">STOP</span> to any
          message. Reply <span className="legal-em">HELP</span> for help, email{" "}
          <LegalLink href="mailto:hello@zenpho.com">hello@zenpho.com</LegalLink>, or call{" "}
          <LegalLink href={ZENPHO_PHONE_TEL_HREF}>{ZENPHO_PHONE_DISPLAY}</LegalLink>. Full SMS
          program details are in our <LegalLink href="/terms#sms">SMS Terms</LegalLink>.
        </p>
        <LegalCallout>
          <span className="legal-em">
            No mobile information will be shared with third parties or affiliates for marketing
            or promotional purposes.
          </span>{" "}
          All categories of data exclude text messaging originator opt-in data and consent; this
          information will not be shared with any third parties. Information sharing is limited to
          subcontractors supporting delivery of the service (for example, our SMS delivery
          provider), and only to the extent necessary to operate the service.
        </LegalCallout>
      </LegalSection>

      <LegalSection title="5. Sharing and sale of personal information">
        <p>
          We use service providers (for example, hosting, email delivery, SMS delivery,
          authentication, and database providers) to run our business. They process information
          on our instructions and under appropriate safeguards.
        </p>
        <p>
          We do <span className="legal-em">not</span> sell your personal information. We do{" "}
          <span className="legal-em">not</span> share phone numbers, SMS opt-in status, or other
          contact details with unaffiliated third parties or affiliates for their own marketing
          or promotional purposes.
        </p>
        <p>
          <span className="legal-em">
            Text messaging originator opt-in data and consent will not be shared with any third
            parties.
          </span>
        </p>
        <p>
          We may disclose information if required by law, to enforce our terms, or to protect
          rights, safety, and security.
        </p>
      </LegalSection>

      <LegalSection title="6. Retention">
        <p>
          We keep information only as long as needed for the purposes above, unless a longer period
          is required or permitted by law.
        </p>
      </LegalSection>

      <LegalSection title="7. Security">
        <p>
          We use reasonable technical and organizational measures designed to protect personal
          information. No method of transmission or storage is completely secure.
        </p>
      </LegalSection>

      <LegalSection title="8. Your choices">
        <p>
          Depending on where you live, you may have rights to access, correct, delete, or restrict
          certain processing of your personal information, or to object to certain uses. To make a
          request, contact us at{" "}
          <LegalLink href="mailto:hello@zenpho.com">hello@zenpho.com</LegalLink> or{" "}
          <LegalLink href={ZENPHO_PHONE_TEL_HREF}>{ZENPHO_PHONE_DISPLAY}</LegalLink>. We may need
          to verify your request.
        </p>
      </LegalSection>

      <LegalSection title="9. International transfers">
        <p>
          We are based in the United States. If you access our services from other countries, your
          information may be processed in the U.S. or other locations where we or our providers
          operate.
        </p>
      </LegalSection>

      <LegalSection title="10. Children">
        <p>
          Our services are not directed to children under 13, and we do not knowingly collect their
          personal information.
        </p>
      </LegalSection>

      <LegalSection title="11. Changes">
        <p>
          We may update this policy from time to time. We will post the updated version on this
          page and revise the effective date above.
        </p>
      </LegalSection>

      <LegalSection title="12. Contact">
        <p>
          Questions about this policy:{" "}
          <LegalLink href="mailto:hello@zenpho.com">hello@zenpho.com</LegalLink>
        </p>
        <p>
          Phone: <LegalLink href={ZENPHO_PHONE_TEL_HREF}>{ZENPHO_PHONE_DISPLAY}</LegalLink>
        </p>
      </LegalSection>
    </LegalPageShell>
  );
}
