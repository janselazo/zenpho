"use client";

import { useState, type ReactNode } from "react";
import { Reveal } from "@/components/marketing/renaissance/Reveal";
import SectionHead from "./SectionHead";

const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];

export type FAQItem = { q: ReactNode; a: ReactNode };

export default function FAQList({
  items,
  eyebrow = "Frequently asked",
  title,
}: {
  items: FAQItem[];
  eyebrow?: ReactNode;
  title?: ReactNode;
}) {
  const [open, setOpen] = useState(0);
  const resolvedTitle = title ?? (
    <>
      Common <em>questions</em>.
    </>
  );
  return (
    <section className="section" id="faq">
      <div className="shell">
        <SectionHead eyebrow={eyebrow} title={resolvedTitle} />
        <Reveal className="faq-list">
          {items.map((it, i) => (
            <div
              className={`faq-item ${open === i ? "open" : ""}`}
              key={i}
              onClick={() => setOpen(open === i ? -1 : i)}
            >
              <div className="faq-q">
                <h4>
                  <span className="num">№ {ROMAN[i]}</span> {it.q}
                </h4>
                <button
                  type="button"
                  className="faq-toggle"
                  aria-label="Toggle"
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpen(open === i ? -1 : i);
                  }}
                >
                  ▾
                </button>
              </div>
              <div className="faq-a">
                <div>
                  <p>{it.a}</p>
                </div>
              </div>
            </div>
          ))}
        </Reveal>
      </div>
    </section>
  );
}
