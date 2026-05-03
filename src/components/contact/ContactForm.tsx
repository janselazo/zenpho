"use client";

import { useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import Button from "@/components/ui/Button";

const inputClass =
  "w-full rounded-xl border border-border bg-white px-4 py-3 text-sm text-text-primary placeholder:text-text-secondary/40 outline-none shadow-sm transition-all focus:border-accent focus:ring-2 focus:ring-accent/15";

function FormSurface({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border/70 bg-white/95 p-5 shadow-sm sm:p-6">
      <p className="mb-5 border-b border-border/50 pb-3 text-[11px] font-bold uppercase tracking-[0.18em] text-text-secondary">
        {label}
      </p>
      <div className="space-y-5">{children}</div>
    </div>
  );
}

export default function ContactForm() {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const fd = new FormData(e.currentTarget);

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: fd.get("name"),
          email: fd.get("email"),
          phone: fd.get("phone"),
          company: fd.get("company"),
          website_linkedin: fd.get("website_linkedin"),
          sms_consent: fd.get("sms_consent") === "on",
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(
          typeof data.error === "string" ? data.error : "Something went wrong"
        );
        setSubmitting(false);
        return;
      }
      setDone(true);
    } catch {
      setError("Something went wrong. Please try again.");
    }
    setSubmitting(false);
  }

  if (done) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="mx-auto flex max-w-xl flex-col items-center justify-center py-16 text-center"
      >
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
          <Check className="h-7 w-7 text-emerald-600" />
        </div>
        <h3 className="text-lg font-semibold text-text-primary">
          Request received
        </h3>
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-text-secondary">
          Thanks for reaching out. We&apos;ll get back to you within one business
          day.
        </p>
      </motion.div>
    );
  }

  return (
    <motion.form
      initial={{ opacity: 1, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.12 }}
      className="mx-auto max-w-xl space-y-8"
      onSubmit={handleSubmit}
    >
      {error && (
        <p className="rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-700">
          {error}
        </p>
      )}

      <FormSurface label="About you">
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label
              htmlFor="contact-name"
              className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-text-secondary"
            >
              Name
            </label>
            <input
              id="contact-name"
              name="name"
              type="text"
              required
              autoComplete="name"
              className={inputClass}
            />
          </div>
          <div>
            <label
              htmlFor="contact-email"
              className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-text-secondary"
            >
              Email
            </label>
            <input
              id="contact-email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className={inputClass}
            />
          </div>
        </div>
        <div>
          <label
            htmlFor="contact-company"
            className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-text-secondary"
          >
            Company name
          </label>
          <input
            id="contact-company"
            name="company"
            type="text"
            autoComplete="organization"
            className={inputClass}
          />
        </div>
        <div>
          <label
            htmlFor="contact-web"
            className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-text-secondary"
          >
            Website or profile link
          </label>
          <input
            id="contact-web"
            name="website_linkedin"
            type="text"
            className={inputClass}
            placeholder="Your website or Google Business Profile URL"
          />
        </div>
        <div className="max-w-md">
          <label
            htmlFor="contact-phone"
            className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-text-secondary"
          >
            Phone{" "}
            <span className="font-normal normal-case text-text-secondary/70">
              (optional)
            </span>
          </label>
          <input
            id="contact-phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            className={inputClass}
            placeholder="+1 (555) 000-0000"
          />
        </div>

        <div className="flex items-start gap-2.5 rounded-xl border border-border bg-white px-3 py-2.5">
          <input
            id="contact-sms-consent"
            name="sms_consent"
            type="checkbox"
            className="mt-0.5 h-4 w-4 rounded border-border text-accent accent-accent focus:ring-accent/30"
          />
          <label
            htmlFor="contact-sms-consent"
            className="text-xs leading-relaxed text-text-secondary"
          >
            By checking this box, I agree to receive SMS text messages from{" "}
            <span className="font-medium text-text-primary">Zenpho</span> at the phone
            number I provided above, including links and updates about your inquiry or engagement.
            Message frequency is low — typically a few messages per engagement.
            Message and data rates may apply. Reply{" "}
            <span className="font-medium text-text-primary">STOP</span> to unsubscribe.
            Reply{" "}
            <span className="font-medium text-text-primary">HELP</span> for help. See our{" "}
            <a
              href="/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-accent"
            >
              Privacy Policy
            </a>{" "}
            and{" "}
            <a
              href="/terms"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-accent"
            >
              SMS Terms
            </a>
            .
          </label>
        </div>
      </FormSurface>

      <Button
        type="submit"
        variant="primary"
        size="lg"
        className="w-full"
        disabled={submitting}
      >
        {submitting ? "Sending…" : "Submit request"}
      </Button>
    </motion.form>
  );
}
