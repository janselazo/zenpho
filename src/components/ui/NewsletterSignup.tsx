"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Button from "@/components/ui/Button";
import {
  SECTION_EYEBROW_CLASSNAME,
  SECTION_EYEBROW_COMPACT_CLASSNAME,
} from "@/components/ui/SectionHeading";

interface NewsletterSignupProps {
  compact?: boolean;
}

export default function NewsletterSignup({ compact }: NewsletterSignupProps) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">(
    "idle"
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus("loading");
    await new Promise((r) => setTimeout(r, 800));
    setStatus("success");
    setEmail("");
  };

  if (compact) {
    return (
      <div className="rounded-xl border border-border bg-white p-4 shadow-sm">
        <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-accent">
          Newsletter
        </p>
        {status === "success" ? (
          <p className="text-sm text-accent-violet">Thanks for subscribing.</p>
        ) : (
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              required
              disabled={status === "loading"}
              className="flex-1 rounded-full border border-border bg-surface px-3 py-2 text-sm text-text-primary outline-none transition-all focus:border-accent disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={status === "loading"}
              className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {status === "loading" ? "…" : "Join"}
            </button>
          </form>
        )}
      </div>
    );
  }

  return (
    <section
      id="newsletter"
      className="mx-auto max-w-2xl scroll-mt-28 px-6 py-16 lg:px-8"
    >
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.45 }}
        className="rounded-2xl border border-border bg-white p-8 text-center shadow-sm"
      >
        <div className="mb-4 flex justify-center">
          <span className={SECTION_EYEBROW_CLASSNAME}>Newsletter</span>
        </div>
        <h3 className="heading-display text-xl font-bold tracking-tight text-text-primary sm:text-2xl lg:text-3xl">
          <span className="block">Practical notes on</span>
          <span className="mt-1 block text-accent">AI product development</span>
        </h3>
        <p className="mt-2 text-sm text-text-secondary">
          Occasional writing on agents, shipping, and what holds up in
          production—no fluff.
        </p>
        {status === "success" ? (
          <p className="mt-6 text-sm text-accent-violet">
            Thanks—check your inbox to confirm.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-2 sm:flex-row">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              required
              disabled={status === "loading"}
              className="flex-1 rounded-full border border-border bg-surface px-4 py-3 text-sm text-text-primary outline-none transition-all focus:border-accent disabled:opacity-50"
            />
            <Button
              type="submit"
              variant="primary"
              size="lg"
              disabled={status === "loading"}
            >
              {status === "loading" ? "…" : "Subscribe"}
            </Button>
          </form>
        )}
      </motion.div>
    </section>
  );
}
