"use client";

import { useState } from "react";

/**
 * Marketing-site contact form — styled to match the Renaissance/Editorial
 * design (`.contact-form` from marketing.css). Submits to the same
 * /api/contact endpoint that ContactForm uses, so the Supabase wiring is
 * preserved.
 */
export default function MarketingContactForm() {
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
          company: fd.get("company"),
          product_type: fd.get("product_type"),
          budget_range: fd.get("budget_range"),
          notes_extra: fd.get("notes_extra"),
        }),
      });

      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(
          typeof data.error === "string"
            ? data.error
            : "Something went wrong. Please try again.",
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
      <div
        style={{
          padding: "32px 0",
          fontFamily: "var(--serif)",
          fontStyle: "italic",
          fontSize: 30,
          lineHeight: 1.25,
          color: "var(--fg)",
        }}
      >
        Received with grace.
        <div style={{ marginTop: 16, fontSize: 20, opacity: 0.7 }}>
          A reply will follow within twenty-four hours.
        </div>
      </div>
    );
  }

  return (
    <form className="contact-form" onSubmit={handleSubmit} noValidate>
      <div className="cta-form-row" style={{ gap: 24 }}>
        <label>
          Your name
          <input type="text" name="name" placeholder="Jane Doe" required />
        </label>
        <label>
          Email
          <input
            type="email"
            name="email"
            placeholder="jane@brand.com"
            required
          />
        </label>
      </div>
      <div className="cta-form-row" style={{ gap: 24 }}>
        <label>
          Company
          <input type="text" name="company" placeholder="Brand Co." />
        </label>
        <label>
          I want to build…
          <select name="product_type" defaultValue="">
            <option value="" disabled>
              Select…
            </option>
            <option>A custom website</option>
            <option>A web app / SaaS MVP</option>
            <option>A mobile app</option>
            <option>Ad creatives</option>
            <option>Something else</option>
          </select>
        </label>
      </div>
      <label>
        Budget range
        <select name="budget_range" defaultValue="">
          <option value="" disabled>
            Select…
          </option>
          <option>Under $5k</option>
          <option>$5k — $15k</option>
          <option>$15k — $40k</option>
          <option>$40k+</option>
          <option>Retainer</option>
        </select>
      </label>
      <label>
        What do you need?
        <textarea
          name="notes_extra"
          rows={4}
          placeholder="A few sentences about the product, audience and timeline."
        />
      </label>
      {error ? (
        <p
          role="alert"
          style={{
            margin: 0,
            color: "#9a1d1d",
            fontSize: 14,
            fontFamily: "var(--display)",
          }}
        >
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        className="btn-primary"
        style={{ alignSelf: "flex-start", marginTop: 8 }}
        disabled={submitting}
      >
        {submitting ? "Sending…" : "Book the call"}{" "}
        <span className="btn-arrow">↗</span>
      </button>
    </form>
  );
}
