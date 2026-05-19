import PageHero from "@/components/marketing/sections/PageHero";
import SectionHead from "@/components/marketing/sections/SectionHead";
import { Reveal } from "@/components/marketing/renaissance/Reveal";
import {
  ClassicalHand,
  Sunburst,
} from "@/components/marketing/renaissance/RenaissanceArt";
import MarketingContactForm from "./MarketingContactForm";

export default function ContactPageContent() {
  return (
    <>
      <PageHero
        eyebrow="Contact · MMXXVI"
        headline={
          <>
            Tell us what you <em>want to build.</em>
          </>
        }
        lead="Thirty minutes. No pitch deck. We listen, we ask, and we leave you with a clearer path forward — whether or not you commission us."
        art={
          <Sunburst
            width={420}
            height={420}
            color="rgba(244,240,228,.92)"
            accent="#E6D6A8"
            className="ra-float-slow"
          />
        }
        ctaPrimary="Skip to the form"
        ctaHref="#contact-form"
      />

      <section className="section" id="contact-form">
        <div className="shell">
          <SectionHead
            eyebrow="Book a call"
            title={
              <>
                Tell us what you want <em>to build.</em>
              </>
            }
            blurb="A free thirty-minute build call. We'll ask, listen, suggest the smallest version that proves the idea, and quote a fixed price within 48 hours."
          />

          <Reveal className="contact-wrap">
            <MarketingContactForm />

            <div className="contact-info">
              <div className="contact-info-art">
                <ClassicalHand
                  width={260}
                  height={260}
                  color="var(--navy)"
                  accent="#C19D5A"
                  className="ra-draw"
                />
              </div>
              <div className="contact-info-list">
                <a href="mailto:hello@zenpho.com" className="contact-info-row">
                  <span className="label">Email</span>
                  <span className="value">hello@zenpho.com</span>
                </a>
                <a href="tel:+17866235157" className="contact-info-row">
                  <span className="label">Telephone</span>
                  <span className="value">+1 (786) 623-5157</span>
                </a>
                <div className="contact-info-row">
                  <span className="label">Response time</span>
                  <span className="value">Within twenty-four hours.</span>
                </div>
                <div className="contact-info-row">
                  <span className="label">Reply with</span>
                  <span className="value">A fixed quote, in writing.</span>
                </div>
                <div className="contact-info-row" style={{ borderBottom: 0 }}>
                  <span className="label">Social</span>
                  <span className="value">
                    <a href="https://x.com/zenpho" style={{ color: "inherit" }}>
                      X
                    </a>{" "}
                    ·{" "}
                    <a
                      href="https://www.linkedin.com/company/zenpho"
                      style={{ color: "inherit" }}
                    >
                      LinkedIn
                    </a>{" "}
                    ·{" "}
                    <a
                      href="https://github.com/janselazo"
                      style={{ color: "inherit" }}
                    >
                      GitHub
                    </a>
                  </span>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
