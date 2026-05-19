"use client";

import { useMemo } from "react";
import { useReveal } from "./Reveal";

type OrnamentVariant = "rule" | "fleuron" | "double" | "vesica";

export function Ornament({
  variant = "fleuron",
  width = 80,
  height = 24,
  className = "",
  color = "currentColor",
}: {
  variant?: OrnamentVariant;
  width?: number;
  height?: number;
  className?: string;
  color?: string;
}) {
  const w = width;
  const h = height;
  const cy = h / 2;
  const stroke = {
    stroke: color,
    strokeWidth: 1,
    fill: "none" as const,
    strokeLinecap: "round" as const,
  };
  const fill = { fill: color };

  if (variant === "rule") {
    return (
      <svg
        className={`orn ${className}`}
        viewBox={`0 0 ${w} ${h}`}
        width={w}
        height={h}
        fill="none"
      >
        <line x1="0" y1={cy} x2={w / 2 - 6} y2={cy} {...stroke} />
        <line x1={w / 2 + 6} y1={cy} x2={w} y2={cy} {...stroke} />
        <path
          d={`M ${w / 2} ${cy - 4} L ${w / 2 + 4} ${cy} L ${w / 2} ${cy + 4} L ${w / 2 - 4} ${cy} Z`}
          {...fill}
        />
      </svg>
    );
  }
  if (variant === "double") {
    return (
      <svg
        className={`orn ${className}`}
        viewBox={`0 0 ${w} ${h}`}
        width={w}
        height={h}
        fill="none"
      >
        <line x1="0" y1={cy - 3} x2={w} y2={cy - 3} {...stroke} />
        <line x1="0" y1={cy + 3} x2={w} y2={cy + 3} {...stroke} />
        <circle cx={w / 2} cy={cy} r="3" {...fill} />
      </svg>
    );
  }
  if (variant === "vesica") {
    const r = h * 0.5;
    return (
      <svg
        className={`orn ${className}`}
        viewBox={`0 0 ${w} ${h}`}
        width={w}
        height={h}
        fill="none"
      >
        <line x1="0" y1={cy} x2={w / 2 - r * 0.8} y2={cy} {...stroke} />
        <line x1={w / 2 + r * 0.8} y1={cy} x2={w} y2={cy} {...stroke} />
        <circle cx={w / 2 - r * 0.3} cy={cy} r={r * 0.6} {...stroke} />
        <circle cx={w / 2 + r * 0.3} cy={cy} r={r * 0.6} {...stroke} />
      </svg>
    );
  }
  return (
    <svg
      className={`orn ${className}`}
      viewBox={`0 0 ${w} ${h}`}
      width={w}
      height={h}
      fill="none"
    >
      <line x1="0" y1={cy} x2={w * 0.32} y2={cy} {...stroke} />
      <line x1={w * 0.68} y1={cy} x2={w} y2={cy} {...stroke} />
      <path
        d={`M ${w * 0.4} ${cy - 5} L ${w * 0.44} ${cy} L ${w * 0.4} ${cy + 5} L ${w * 0.36} ${cy} Z`}
        {...fill}
      />
      <circle cx={w / 2} cy={cy} r="1.6" {...fill} />
      <path
        d={`M ${w * 0.6} ${cy - 5} L ${w * 0.64} ${cy} L ${w * 0.6} ${cy + 5} L ${w * 0.56} ${cy} Z`}
        {...fill}
      />
    </svg>
  );
}

export function Sigil({
  size = 56,
  className = "",
  color = "currentColor",
}: {
  size?: number;
  className?: string;
  color?: string;
}) {
  const s = size;
  const stroke = {
    stroke: color,
    strokeWidth: 1,
    fill: "none" as const,
  };
  const fill = { fill: color };
  return (
    <svg
      className={`orn ${className}`}
      viewBox={`0 0 ${s} ${s}`}
      width={s}
      height={s}
    >
      <circle cx={s / 2} cy={s / 2} r={s / 2 - 1} {...stroke} />
      <circle cx={s / 2} cy={s / 2} r={s / 2 - 8} {...stroke} />
      <path
        d={`M ${s / 2} ${s * 0.18} L ${s * 0.62} ${s / 2} L ${s / 2} ${s * 0.82} L ${s * 0.38} ${s / 2} Z`}
        {...stroke}
      />
      <circle cx={s / 2} cy={s / 2} r="2" {...fill} />
    </svg>
  );
}

export function Starfield({ count = 60, seed = 1 }: { count?: number; seed?: number }) {
  const stars = useMemo(() => {
    let s = seed * 9301 + 49297;
    const r = () => {
      s = (s * 9301 + 49297) % 233280;
      return s / 233280;
    };
    return Array.from({ length: count }, () => ({
      x: r() * 100,
      y: r() * 100,
      d: 1.2 + r() * 1.6,
      delay: r() * 3.5,
    }));
  }, [count, seed]);
  const ref = useReveal<HTMLDivElement>({ threshold: 0.05 });
  return (
    <div ref={ref} className="starfield">
      {stars.map((s, i) => (
        <span
          key={i}
          className="star"
          style={{
            left: `${s.x}%`,
            top: `${s.y}%`,
            width: `${s.d}px`,
            height: `${s.d}px`,
            animationDelay: `${s.delay}s`,
          }}
        />
      ))}
    </div>
  );
}
