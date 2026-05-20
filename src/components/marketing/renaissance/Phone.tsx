// Stylized phone mockup used by the Creatives Generation service page.
// Renders a static Instagram-style ad preview with the patron's caption and
// CTA so we can showcase the look without faking real client work.
//
// Styles live in src/styles/marketing-art.css (`.phone-*` and `.ph-*`).

"use client";

import { useId } from "react";

type Tone =
  | "warm"
  | "coral"
  | "ink"
  | "cream"
  | "forest"
  | "plum"
  | "sun"
  | "sea";

const PALETTES: Record<Tone, { a: string; b: string; text: string }> = {
  warm: { a: "#E8E2D3", b: "#D9CFB6", text: "rgba(20,15,5,.55)" },
  coral: { a: "#F4B89E", b: "#E89876", text: "rgba(40,15,5,.7)" },
  ink: { a: "#1f1d1a", b: "#2A2622", text: "rgba(245,241,232,.55)" },
  cream: { a: "#F0EADC", b: "#E0D6BE", text: "rgba(20,15,5,.55)" },
  forest: { a: "#2A3A2E", b: "#34453A", text: "rgba(220,235,220,.6)" },
  plum: { a: "#3A2A38", b: "#4A3548", text: "rgba(230,210,228,.6)" },
  sun: { a: "#F2C94C", b: "#E0AC2B", text: "rgba(30,20,5,.65)" },
  sea: { a: "#1E3A4A", b: "#264656", text: "rgba(210,230,240,.6)" },
};

function StripedPlaceholder({
  label = "creative",
  tone = "warm",
  aspect = "9:16",
}: {
  label?: string;
  tone?: Tone;
  aspect?: string;
}) {
  const id = useId();
  const p = PALETTES[tone] ?? PALETTES.warm;
  const safeId = `s-${id.replace(/:/g, "")}`;
  return (
    <svg
      viewBox="0 0 100 178"
      preserveAspectRatio="xMidYMid slice"
      width="100%"
      height="100%"
      style={{ display: "block" }}
    >
      <defs>
        <pattern
          id={safeId}
          width="6"
          height="6"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(45)"
        >
          <rect width="6" height="6" fill={p.a} />
          <rect width="3" height="6" fill={p.b} />
        </pattern>
      </defs>
      <rect width="100" height="178" fill={`url(#${safeId})`} />
      <rect x="6" y="6" width="22" height="6" rx="1" fill={p.b} opacity=".55" />
      <text
        x="50"
        y="92"
        textAnchor="middle"
        fontFamily="var(--font-marketing-mono), JetBrains Mono, monospace"
        fontSize="3.2"
        fill={p.text}
        letterSpacing=".4"
      >
        {label.toUpperCase()}
      </text>
      <text
        x="50"
        y="98"
        textAnchor="middle"
        fontFamily="var(--font-marketing-mono), JetBrains Mono, monospace"
        fontSize="2.4"
        fill={p.text}
        opacity=".7"
        letterSpacing=".2"
      >
        {aspect} · PLACEHOLDER
      </text>
    </svg>
  );
}

function IGOverlay({
  caption,
  handle,
  ctaLabel,
}: {
  caption: string;
  handle: string;
  ctaLabel?: string;
}) {
  return (
    <div className="ph-overlay ph-ig">
      <div className="ph-top">
        <div className="ph-top-handle">
          <div className="ph-avatar" />
          <div>
            <div className="ph-handle">{handle}</div>
            <div className="ph-sponsored">Sponsored</div>
          </div>
        </div>
        <svg width="14" height="3" viewBox="0 0 14 3">
          <circle cx="2" cy="1.5" r="1.2" fill="#fff" />
          <circle cx="7" cy="1.5" r="1.2" fill="#fff" />
          <circle cx="12" cy="1.5" r="1.2" fill="#fff" />
        </svg>
      </div>

      <div className="ph-right">
        <div className="ph-icon">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.6">
            <path d="M12 21s-7-4.5-9-9c-1.5-3.5 1-7 4.5-7C9 5 12 8 12 8s3-3 4.5-3C20 5 22.5 8.5 21 12c-2 4.5-9 9-9 9z" />
          </svg>
          <span>12.4k</span>
        </div>
        <div className="ph-icon">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.6">
            <path d="M21 12c0 4.4-4 8-9 8-1.6 0-3.1-.4-4.4-1L3 20l1-4.4C3.4 14.4 3 13 3 12c0-4.4 4-8 9-8s9 3.6 9 8z" />
          </svg>
          <span>284</span>
        </div>
        <div className="ph-icon">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.6">
            <path d="M4 12l16-8-6 18-3-7-7-3z" />
          </svg>
          <span>Share</span>
        </div>
      </div>

      <div className="ph-bottom">
        <div className="ph-caption">{caption}</div>
        {ctaLabel ? (
          <button type="button" className="ph-cta">
            {ctaLabel} <span>→</span>
          </button>
        ) : null}
      </div>
    </div>
  );
}

const PHONE_W = 220;
const PHONE_H = 440;

export default function Phone({
  scale = 1.0,
  tone = "warm",
  caption = "Tap to shop the drop ✨",
  handle = "@brand",
  cta = "Learn more",
  label = "creative",
  aspect = "9:16",
  badge,
  mockupImage,
}: {
  scale?: number;
  tone?: Tone;
  caption?: string;
  handle?: string;
  cta?: string;
  label?: string;
  aspect?: string;
  badge?: string;
  mockupImage?: string;
}) {
  const w = PHONE_W * scale;
  const h = PHONE_H * scale;
  if (mockupImage) {
    return (
      <div className="phone-wrap phone-wrap--mockup" style={{ width: w, height: h }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- static marketing mockup */}
        <img
          src={mockupImage}
          alt=""
          className="phone-mockup-image"
          draggable={false}
        />
        {badge ? <div className="phone-badge">{badge}</div> : null}
      </div>
    );
  }

  return (
    <div className="phone-wrap" style={{ width: w, height: h }}>
      <div className="phone-frame">
        <div className="phone-notch" />
        <div className="phone-screen">
          <StripedPlaceholder label={label} tone={tone} aspect={aspect} />
          <IGOverlay caption={caption} handle={handle} ctaLabel={cta} />
        </div>
      </div>
      {badge ? <div className="phone-badge">{badge}</div> : null}
    </div>
  );
}
