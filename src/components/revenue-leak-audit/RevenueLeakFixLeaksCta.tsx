"use client";

import { useCallback, useEffect, useId, useState } from "react";
import { X } from "lucide-react";
import type { RevenueLeakAudit } from "@/lib/revenue-leak-audit/types";
import Button from "@/components/ui/Button";

const inputClass =
  "w-full rounded-2xl border border-border bg-white px-4 py-3 text-sm text-text-primary outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/15";

type Props = {
  audit: RevenueLeakAudit;
  /** When true, omit outer section chrome (for embedding inside another card). */
  embedSurface?: boolean;
  surfaceEyebrow?: string;
  surfaceTitle?: string;
  surfaceBody?: string;
  surfaceCtaLabel?: string;
  /** Midpoint monthly estimate for lead notes when assumptions were edited client-side. */
  monthlyLeakOverride?: number;
};

export default function RevenueLeakFixLeaksCta({
  audit,
  embedSurface = false,
  surfaceEyebrow = "Next step",
  surfaceTitle = "Ready to recover lost revenue?",
  surfaceBody = "We'll help you identify the highest-value fixes, prioritize implementation, and build a plan to recover lost revenue.",
  surfaceCtaLabel = "Start fixing leaks",
  monthlyLeakOverride,
}: Props) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const titleId = useId();

  const close = useCallback(() => {
    setOpen(false);
    setError(null);
    if (!pending) {
      /* keep fields after success for a moment — reset when reopen */
    }
  }, [pending]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const res = await fetch("/api/revenue-leak-audit/capture-lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          phone,
          company_website: honeypot,
          audit: {
            businessName: audit.business.name,
            placeId: audit.business.placeId,
            auditId: audit.id,
            overallScore: audit.scores.overall,
            monthlyLeakEstimate: monthlyLeakOverride ?? audit.moneySummary.estimatedMonthlyCost,
          },
        }),
      });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error ?? "Could not send your details.");
      }
      setDone(true);
      setName("");
      setEmail("");
      setPhone("");
      window.setTimeout(() => {
        setDone(false);
        setOpen(false);
      }, 2400);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setPending(false);
    }
  }

  function openFresh() {
    setDone(false);
    setError(null);
    setHoneypot("");
    setOpen(true);
  }

  const banner = (
    <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-accent">{surfaceEyebrow}</p>
        <h2 className="mt-2 text-2xl font-black tracking-tight text-text-primary">{surfaceTitle}</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-text-secondary">{surfaceBody}</p>
      </div>
      <Button type="button" size="lg" onClick={openFresh} className="shrink-0">
        {surfaceCtaLabel}
      </Button>
    </div>
  );

  return (
    <>
      {embedSurface ? (
        banner
      ) : (
        <section className="rounded-[2rem] border border-accent/20 bg-white p-6 shadow-soft-lg sm:p-8">{banner}</section>
      )}

      {open ? (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-black/45 p-4 sm:items-center"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) close();
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="max-h-[min(92vh,640px)] w-full max-w-md overflow-y-auto rounded-3xl border border-border bg-white shadow-2xl"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
              <h3 id={titleId} className="text-lg font-black text-text-primary">
                {done ? "You're all set" : "Get help fixing these leaks"}
              </h3>
              <button
                type="button"
                onClick={close}
                className="rounded-full p-1.5 text-text-secondary hover:bg-surface hover:text-text-primary"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="px-5 py-5">
              {done ? (
                <p className="text-sm leading-6 text-text-secondary">
                  Thanks — your info was saved to Leads. Someone from the team will reach out shortly.
                </p>
              ) : (
                <form onSubmit={onSubmit} className="space-y-4">
                  <p className="text-sm text-text-secondary">
                    We&apos;ll attach context from this audit ({audit.business.name}) to the lead notes.
                  </p>
                  <div className="sr-only" aria-hidden>
                    <label htmlFor="rva-company-website">Company website</label>
                    <input
                      id="rva-company-website"
                      name="company_website"
                      tabIndex={-1}
                      autoComplete="off"
                      value={honeypot}
                      onChange={(e) => setHoneypot(e.target.value)}
                    />
                  </div>
                  <div>
                    <label htmlFor="rva-name" className="mb-1.5 block text-xs font-bold text-text-secondary">
                      Name <span className="text-red-600">*</span>
                    </label>
                    <input
                      id="rva-name"
                      name="name"
                      required
                      autoComplete="name"
                      className={inputClass}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label htmlFor="rva-email" className="mb-1.5 block text-xs font-bold text-text-secondary">
                      Email <span className="text-red-600">*</span>
                    </label>
                    <input
                      id="rva-email"
                      name="email"
                      type="email"
                      required
                      autoComplete="email"
                      className={inputClass}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  <div>
                    <label htmlFor="rva-phone" className="mb-1.5 block text-xs font-bold text-text-secondary">
                      Phone
                    </label>
                    <input
                      id="rva-phone"
                      name="phone"
                      type="tel"
                      autoComplete="tel"
                      className={inputClass}
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>
                  {error ? (
                    <p className="text-sm font-semibold text-red-600" role="alert">
                      {error}
                    </p>
                  ) : null}
                  <div className="flex flex-wrap gap-3 pt-1">
                    <Button type="submit" disabled={pending} size="lg">
                      {pending ? "Sending…" : "Submit"}
                    </Button>
                    <Button type="button" variant="secondary" disabled={pending} onClick={close}>
                      Cancel
                    </Button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
