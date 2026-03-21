import type { Metadata } from "next";
import ContactHero from "./ContactHero";
import BookingSection from "@/components/contact/BookingSection";
import ContactForm from "@/components/contact/ContactForm";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Book a call or message Janse Lazo — AI software development agency for MVPs, web, mobile, plus in-house Studio products.",
};

export default function ContactPage() {
  return (
    <>
      <ContactHero />
      <BookingSection />
      <section className="mx-auto max-w-7xl px-6 pb-32 lg:px-8">
        <div className="grid gap-16 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <ContactForm />
          </div>

          <div className="lg:col-span-2">
            <div className="space-y-8">
              <div>
                <h3 className="mb-2 font-mono text-xs uppercase tracking-widest text-text-secondary">
                  Email
                </h3>
                <a
                  href="mailto:hello@janselazo.com"
                  className="text-text-primary transition-colors hover:text-accent"
                >
                  hello@janselazo.com
                </a>
              </div>

              <div>
                <h3 className="mb-2 font-mono text-xs uppercase tracking-widest text-text-secondary">
                  Social
                </h3>
                <div className="flex flex-col gap-2">
                  <a
                    href="https://x.com/janselazo"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-text-primary transition-colors hover:text-accent"
                  >
                    X / Twitter
                  </a>
                  <a
                    href="https://github.com/janselazo"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-text-primary transition-colors hover:text-accent"
                  >
                    GitHub
                  </a>
                  <a
                    href="https://linkedin.com/in/janselazo"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-text-primary transition-colors hover:text-accent"
                  >
                    LinkedIn
                  </a>
                </div>
              </div>

              <div>
                <h3 className="mb-2 font-mono text-xs uppercase tracking-widest text-text-secondary">
                  Response time
                </h3>
                <p className="text-sm text-text-secondary">
                  I typically respond within 24 hours on business days.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
