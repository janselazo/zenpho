"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Button from "@/components/ui/Button";

const inputClass =
  "w-full rounded-xl border border-border bg-white px-4 py-3 text-sm text-text-primary placeholder:text-text-secondary/40 outline-none shadow-sm transition-all focus:border-accent focus:ring-2 focus:ring-accent/15";

export default function ContactForm() {
  const [projectType, setProjectType] = useState("agency");

  return (
    <motion.form
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.12 }}
      className="mx-auto max-w-xl space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
      }}
    >
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

      <div>
        <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-text-secondary">
          Project type
        </label>
        <div className="flex flex-wrap gap-2">
          {["agency", "studio", "other"].map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setProjectType(type)}
              className={`rounded-full border px-4 py-2 text-xs font-medium capitalize transition-all ${
                projectType === type
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-border bg-white text-text-secondary hover:border-accent/30"
              }`}
            >
              {type}
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
          placeholder="What you’re building, who it’s for, and any timeline or constraints…"
        />
      </div>

      <Button type="submit" variant="primary" size="lg" className="w-full">
        Send message
      </Button>
    </motion.form>
  );
}
