"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import Button from "@/components/ui/Button";

const inputClass =
  "w-full rounded-xl border border-border bg-white px-4 py-3 text-sm text-text-primary placeholder:text-text-secondary/40 outline-none shadow-sm transition-all focus:border-accent focus:ring-2 focus:ring-accent/15";

export default function ContactForm() {
  const [projectType, setProjectType] = useState("websites-development");
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
          message: fd.get("message"),
          project_type: projectType,
          sms_consent: fd.get("sms_consent") === "on",
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong");
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
          Message sent!
        </h3>
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-text-secondary">
          Thanks for reaching out. We&apos;ll get back to you within one
          business day.
        </p>
      </motion.div>
    );
  }

  return (
    <motion.form
      initial={{ opacity: 1, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.12 }}
      className="mx-auto max-w-xl space-y-5"
      onSubmit={handleSubmit}
    >
      {error && (
        <p className="rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-700">
          {error}
        </p>
      )}

      <div>
        <label
          htmlFor="name"
          className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-text-secondary"
        >
          Name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          className={inputClass}
          placeholder="Your name"
        />
      </div>

      <div>
        <label
          htmlFor="email"
          className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-text-secondary"
        >
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          className={inputClass}
          placeholder="you@company.com"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label
            htmlFor="phone"
            className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-text-secondary"
          >
            Phone
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            className={inputClass}
            placeholder="+1 (555) 000-0000"
          />
        </div>
        <div>
          <label
            htmlFor="company"
            className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-text-secondary"
          >
            Company
          </label>
          <input
            id="company"
            name="company"
            type="text"
            className={inputClass}
            placeholder="Your company (optional)"
          />
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-text-secondary">
          Project type
        </label>
        <div className="flex flex-wrap gap-2">
          {[
            {
              value: "websites-development",
              label: "Custom Websites",
            },
            { value: "web-apps", label: "Web Apps" },
            { value: "mobile-apps", label: "Mobile Apps" },
            { value: "ai-automations", label: "AI Automations" },
          ].map((type) => (
            <button
              key={type.value}
              type="button"
              onClick={() => setProjectType(type.value)}
              className={`rounded-full border px-4 py-2 text-xs font-medium transition-all ${
                projectType === type.value
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-border bg-white text-text-secondary hover:border-accent/30"
              }`}
            >
              {type.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label
          htmlFor="message"
          className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-text-secondary"
        >
          Message
        </label>
        <textarea
          id="message"
          name="message"
          rows={5}
          required
          className={`${inputClass} resize-none`}
          placeholder="What you're building, who it's for, and any timeline or constraints…"
        />
      </div>

      <div className="flex items-start gap-2.5 rounded-xl border border-border bg-white/70 px-3 py-2.5">
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
          <span className="font-medium text-text-primary">Zenpho</span> at the
          phone number I provided above, including links to design previews and
          project updates. Message frequency is low — typically 1–5 messages per
          engagement. Message and data rates may apply. Reply{" "}
          <span className="font-medium text-text-primary">STOP</span> to
          unsubscribe. Reply{" "}
          <span className="font-medium text-text-primary">HELP</span> for help.
          See our{" "}
          <a href="/privacy" target="_blank" rel="noopener" className="underline hover:text-accent">
            Privacy Policy
          </a>{" "}
          and{" "}
          <a href="/terms" target="_blank" rel="noopener" className="underline hover:text-accent">
            SMS Terms
          </a>
          .
        </label>
      </div>

      <Button type="submit" variant="primary" size="lg" className="w-full" disabled={submitting}>
        {submitting ? "Sending…" : "Send message"}
      </Button>
    </motion.form>
  );
}
