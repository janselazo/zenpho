"use client";

import { useState } from "react";
import MarketingSlotPicker, {
  type PickerSlot,
} from "@/components/marketing/booking/MarketingSlotPicker";

type Step = "form" | "pick" | "done";

type ContactDetails = {
  name: string;
  email: string;
  company: string;
  product_type: string;
  budget_range: string;
  notes_extra: string;
};

const EMPTY_DETAILS: ContactDetails = {
  name: "",
  email: "",
  company: "",
  product_type: "",
  budget_range: "",
  notes_extra: "",
};

function buildBookingMessage(details: ContactDetails) {
  const parts: string[] = [];
  if (details.product_type) {
    parts.push(`Project type:\n${details.product_type}`);
  }
  if (details.budget_range) {
    parts.push(`Budget / investment range:\n${details.budget_range}`);
  }
  if (details.notes_extra) {
    parts.push(`Additional notes:\n${details.notes_extra}`);
  }
  return parts.join("\n\n—\n\n");
}

export default function ContactBookingFlow() {
  const [step, setStep] = useState<Step>("form");
  const [details, setDetails] = useState<ContactDetails>(EMPTY_DETAILS);
  const [slot, setSlot] = useState<PickerSlot | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleDetailsSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const next: ContactDetails = {
      name: String(fd.get("name") ?? "").trim(),
      email: String(fd.get("email") ?? "").trim(),
      company: String(fd.get("company") ?? "").trim(),
      product_type: String(fd.get("product_type") ?? ""),
      budget_range: String(fd.get("budget_range") ?? ""),
      notes_extra: String(fd.get("notes_extra") ?? "").trim(),
    };
    if (!next.name || !next.email) {
      setError("Please share your name and email so we can confirm the call.");
      return;
    }
    setDetails(next);
    setError(null);
    setStep("pick");
  }

  async function handleBook() {
    if (!slot) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: details.name,
          email: details.email,
          company: details.company,
          message: buildBookingMessage(details),
          sms_consent: false,
          starts_at: slot.start.toISOString(),
          ends_at: slot.end.toISOString(),
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
      setStep("done");
    } catch {
      setError("Something went wrong. Please try again.");
    }
    setSubmitting(false);
  }

  if (step === "done" && slot) {
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
          You&apos;re booked for{" "}
          <span style={{ color: "var(--fg)" }}>
            {slot.start.toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </span>{" "}
          at <span style={{ color: "var(--fg)" }}>{slot.label}</span>. A calendar
          invite will follow within twenty-four hours.
        </div>
      </div>
    );
  }

  if (step === "pick") {
    return (
      <div className="contact-form">
        <div className="contact-steps">
          <span>Step 2 of 2 · Pick a time</span>
          <button
            type="button"
            className="contact-step-back"
            onClick={() => setStep("form")}
          >
            ← Back to details
          </button>
        </div>

        <MarketingSlotPicker value={slot} onChange={setSlot} />

        {slot ? (
          <p className="contact-slot-summary">
            <span>Selected</span>
            {slot.start.toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}{" "}
            at {slot.label}
          </p>
        ) : null}

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

        <div className="contact-flow-actions">
          <button
            type="button"
            className="btn-primary"
            disabled={!slot || submitting}
            onClick={handleBook}
          >
            {submitting ? "Booking…" : "Book the call"}{" "}
            <span className="btn-arrow">↗</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <form className="contact-form" onSubmit={handleDetailsSubmit} noValidate>
      <div className="contact-steps">
        <span>Step 1 of 2 · Your details</span>
      </div>

      <div className="cta-form-row" style={{ gap: 24 }}>
        <label>
          Your name
          <input
            type="text"
            name="name"
            placeholder="Jane Doe"
            defaultValue={details.name}
            required
          />
        </label>
        <label>
          Email
          <input
            type="email"
            name="email"
            placeholder="jane@brand.com"
            defaultValue={details.email}
            required
          />
        </label>
      </div>
      <div className="cta-form-row" style={{ gap: 24 }}>
        <label>
          Company
          <input
            type="text"
            name="company"
            placeholder="Brand Co."
            defaultValue={details.company}
          />
        </label>
        <label>
          I want to build…
          <select name="product_type" defaultValue={details.product_type}>
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
        <select name="budget_range" defaultValue={details.budget_range}>
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
          defaultValue={details.notes_extra}
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
      >
        Next <span className="btn-arrow">↗</span>
      </button>
    </form>
  );
}
