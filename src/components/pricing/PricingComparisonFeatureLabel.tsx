"use client";

import { createPortal } from "react-dom";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

export default function PricingComparisonFeatureLabel({
  rowId,
  label,
  tooltip,
}: {
  rowId: string;
  label: string;
  tooltip?: string;
}) {
  if (!tooltip?.trim()) {
    return <span className="font-normal leading-snug text-text-primary">{label}</span>;
  }

  const tipId = `pricing-tip-${rowId}`;
  const btnRef = useRef<HTMLButtonElement>(null);
  const [show, setShow] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  const place = useCallback(() => {
    const el = btnRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const margin = 8;
    const maxW = Math.min(280, window.innerWidth - margin * 2);
    let left = r.left;
    left = Math.max(margin, Math.min(left, window.innerWidth - maxW - margin));
    setPos({ top: r.bottom + margin, left });
  }, []);

  useLayoutEffect(() => {
    if (!show) return;
    place();
  }, [show, place]);

  useEffect(() => {
    if (!show) return;
    const onScroll = () => place();
    const onResize = () => place();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShow(false);
    };
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [show, place]);

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        className="inline cursor-help border-0 border-b border-dotted border-text-secondary/45 bg-transparent p-0 text-left font-normal leading-snug text-text-primary underline-offset-[3px] hover:border-text-secondary/70 focus-visible:rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        aria-describedby={show ? tipId : undefined}
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onFocus={() => setShow(true)}
        onBlur={() => setShow(false)}
      >
        {label}
      </button>
      {show && typeof document !== "undefined"
        ? createPortal(
            <span
              id={tipId}
              role="tooltip"
              style={{
                position: "fixed",
                top: pos.top,
                left: pos.left,
                maxWidth: "min(280px, calc(100vw - 16px))",
                zIndex: 9999,
              }}
              className="pointer-events-none rounded-lg border border-border/80 bg-white px-3 py-2 text-left text-[11px] font-normal leading-snug text-text-primary shadow-md ring-1 ring-black/[0.04]"
            >
              {tooltip}
            </span>,
            document.body,
          )
        : null}
    </>
  );
}
