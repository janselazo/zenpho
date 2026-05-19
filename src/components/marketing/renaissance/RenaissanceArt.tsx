// Pure SVG renaissance illustrations — server-renderable.
// Ported 1:1 from design-handoff/renaissance-art.jsx.
// Animation styles live in src/styles/marketing-art.css.

import { useMemo, type ReactNode } from "react";

type ArtProps = {
  width?: number;
  height?: number;
  color?: string;
  accent?: string;
  className?: string;
};

export function ArchColonnade({
  width = 400,
  height = 280,
  color = "currentColor",
  accent,
  className = "",
}: ArtProps) {
  const a = accent || color;
  return (
    <svg
      className={`ra ra-arch ${className}`}
      viewBox="0 0 400 280"
      width={width}
      height={height}
      fill="none"
      stroke={color}
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 260 H380 M30 250 H370 M40 240 H360" />
      <g>
        <rect x="60" y="100" width="36" height="140" />
        <rect x="50" y="90" width="56" height="14" />
        <rect x="56" y="240" width="44" height="12" />
        <path d="M66 110 V236 M74 110 V236 M82 110 V236 M90 110 V236" opacity=".4" />
        <circle cx="58" cy="98" r="4" />
        <circle cx="98" cy="98" r="4" />
      </g>
      <g>
        <rect x="304" y="100" width="36" height="140" />
        <rect x="294" y="90" width="56" height="14" />
        <rect x="300" y="240" width="44" height="12" />
        <path d="M310 110 V236 M318 110 V236 M326 110 V236 M334 110 V236" opacity=".4" />
        <circle cx="302" cy="98" r="4" />
        <circle cx="342" cy="98" r="4" />
      </g>
      <path d="M50 100 H350" strokeWidth="1.4" />
      <path d="M70 100 C 70 30, 330 30, 330 100" strokeWidth="1.4" />
      <path d="M70 100 C 70 40, 330 40, 330 100" />
      <path d="M192 30 L208 30 L212 50 L188 50 Z" fill={a} stroke="none" />
      <path d="M30 80 H370 M36 72 H364 M44 64 H356" />
      <g opacity=".55">
        <circle cx="200" cy="150" r="6" fill={a} stroke="none" />
        <path d="M200 130 V120 M200 180 V170 M180 150 H170 M230 150 H220 M186 136 L180 130 M214 164 L220 170 M214 136 L220 130 M186 164 L180 170" />
      </g>
    </svg>
  );
}

export function Putti({
  width = 140,
  height = 140,
  color = "currentColor",
  accent,
  className = "",
}: ArtProps) {
  const a = accent || color;
  return (
    <svg
      className={`ra ra-putti ${className}`}
      viewBox="0 0 140 140"
      width={width}
      height={height}
      fill="none"
      stroke={color}
      strokeWidth="1.1"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="70" cy="36" r="22" opacity=".45" />
      <circle cx="70" cy="44" r="14" fill={a} fillOpacity=".08" />
      <path d="M58 38 q-3 -5 2 -8 M62 32 q-2 -4 3 -6 M78 32 q2 -4 -3 -6 M82 38 q3 -5 -2 -8 M64 30 q1 -3 6 -3 q5 0 6 3" />
      <path d="M64 43 q2 -1 4 0 M76 43 q-2 -1 -4 0" />
      <path d="M58 58 q12 12 24 0" />
      <path d="M48 56 q-22 -4 -28 16 q12 -4 22 0 q-6 4 -8 14 q14 -8 22 -16" fill={a} fillOpacity=".06" />
      <path d="M92 56 q22 -4 28 16 q-12 -4 -22 0 q6 4 8 14 q-14 -8 -22 -16" fill={a} fillOpacity=".06" />
      <path d="M44 64 q-12 4 -16 14 M52 70 q-10 4 -14 14" opacity=".5" />
      <path d="M96 64 q12 4 16 14 M88 70 q10 4 14 14" opacity=".5" />
      <path d="M52 72 q-4 18 -2 36 q20 -8 40 0 q2 -18 -2 -36" fill={a} fillOpacity=".05" />
      <path d="M58 88 q12 6 24 0 M60 100 q10 6 20 0" opacity=".5" />
      <path
        d="M70 8 l2 4 l4 1 l-3 3 l1 4 l-4 -2 l-4 2 l1 -4 l-3 -3 l4 -1 z"
        fill={a}
        stroke="none"
        opacity=".7"
      />
    </svg>
  );
}

export function LaurelWreath({
  width = 200,
  height = 200,
  color = "currentColor",
  accent,
  className = "",
  content = "I",
}: ArtProps & { content?: string }) {
  const a = accent || color;
  const cx = 100;
  const cy = 100;
  const leftLeaves = Array.from({ length: 10 }, (_, i) => {
    const t = -Math.PI / 2 - (Math.PI * 0.7) * (i / 9);
    const x = cx + 78 * Math.cos(t);
    const y = cy + 78 * Math.sin(t);
    const ang = (t * 180) / Math.PI + 90;
    return { x, y, ang, key: `L${i}` };
  });
  const rightLeaves = Array.from({ length: 10 }, (_, i) => {
    const t = -Math.PI / 2 + (Math.PI * 0.7) * (i / 9);
    const x = cx + 78 * Math.cos(t);
    const y = cy + 78 * Math.sin(t);
    const ang = (t * 180) / Math.PI + 90;
    return { x, y, ang, key: `R${i}` };
  });
  return (
    <svg
      className={`ra ra-wreath ${className}`}
      viewBox="0 0 200 200"
      width={width}
      height={height}
      fill="none"
      stroke={color}
      strokeWidth="1.1"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M100 22 Q 28 70 60 178 Q 100 168 100 168" opacity=".7" />
      <path d="M100 22 Q 172 70 140 178 Q 100 168 100 168" opacity=".7" />
      {[...leftLeaves, ...rightLeaves].map(({ x, y, ang, key }) => (
        <g key={key} transform={`translate(${x} ${y}) rotate(${ang})`}>
          <path d="M0 -10 q5 5 0 12 q-5 -7 0 -12 z" fill={a} fillOpacity=".15" />
          <line x1="0" y1="-9" x2="0" y2="2" opacity=".5" />
        </g>
      ))}
      <path d="M82 174 q18 -10 36 0" />
      <path d="M82 174 q-10 6 -16 14 M118 174 q10 6 16 14" />
      <text
        x="100"
        y="112"
        textAnchor="middle"
        fontFamily="var(--font-marketing-serif), Cinzel, serif"
        fontWeight="500"
        fontSize="32"
        letterSpacing="0.08em"
        fill={color}
        stroke="none"
      >
        {content}
      </text>
    </svg>
  );
}

export function Sunburst({
  width = 240,
  height = 240,
  color = "currentColor",
  accent,
  className = "",
  rayCount = 24,
}: ArtProps & { rayCount?: number }) {
  const a = accent || color;
  const cx = 120;
  const cy = 120;
  const rays = Array.from({ length: rayCount }, (_, i) => {
    const ang = (i / rayCount) * Math.PI * 2;
    const r1 = 36;
    const r2 = i % 2 === 0 ? 110 : 78;
    return {
      x1: cx + r1 * Math.cos(ang),
      y1: cy + r1 * Math.sin(ang),
      x2: cx + r2 * Math.cos(ang),
      y2: cy + r2 * Math.sin(ang),
      key: i,
    };
  });
  return (
    <svg
      className={`ra ra-sun ${className}`}
      viewBox="0 0 240 240"
      width={width}
      height={height}
      fill="none"
      stroke={color}
      strokeWidth="1"
      strokeLinecap="round"
    >
      <g className="ra-sun-rays">
        {rays.map((r) => (
          <line
            key={r.key}
            x1={r.x1}
            y1={r.y1}
            x2={r.x2}
            y2={r.y2}
            opacity={r.key % 2 === 0 ? 1 : 0.5}
          />
        ))}
      </g>
      <circle cx={cx} cy={cy} r="32" stroke={color} fill={a} fillOpacity=".18" />
      <circle cx={cx} cy={cy} r="22" stroke={color} opacity=".7" />
      <circle cx={cx} cy={cy} r="6" fill={a} stroke="none" />
    </svg>
  );
}

export function Cartouche({
  width = 320,
  height = 200,
  color = "currentColor",
  accent,
  className = "",
  children,
}: ArtProps & { children?: ReactNode }) {
  const a = accent || color;
  return (
    <div
      className={`ra-cartouche-wrap ${className}`}
      style={{ width, height, position: "relative" }}
    >
      <svg
        className="ra-cartouche-svg"
        viewBox="0 0 320 200"
        width={width}
        height={height}
        fill="none"
        stroke={color}
        strokeWidth="1.1"
        strokeLinecap="round"
        strokeLinejoin="round"
        preserveAspectRatio="none"
      >
        <rect x="14" y="14" width="292" height="172" />
        <rect x="22" y="22" width="276" height="156" opacity=".5" />
        <g>
          <path d="M14 32 Q 4 22 14 14 Q 22 4 32 14" />
          <path d="M306 32 Q 316 22 306 14 Q 298 4 288 14" />
          <path d="M14 168 Q 4 178 14 186 Q 22 196 32 186" />
          <path d="M306 168 Q 316 178 306 186 Q 298 196 288 186" />
        </g>
        <g transform="translate(160 14)">
          <path d="M-12 0 L0 -8 L12 0 L0 8 Z" fill={a} stroke="none" />
          <circle cx="0" cy="0" r="2" fill={color} stroke="none" />
        </g>
        <g transform="translate(160 186)">
          <path d="M-12 0 L0 -8 L12 0 L0 8 Z" fill={a} stroke="none" />
          <circle cx="0" cy="0" r="2" fill={color} stroke="none" />
        </g>
        <g transform="translate(14 100)">
          <circle cx="0" cy="0" r="3" fill={a} stroke="none" />
        </g>
        <g transform="translate(306 100)">
          <circle cx="0" cy="0" r="3" fill={a} stroke="none" />
        </g>
      </svg>
      {children ? <div className="ra-cartouche-inner">{children}</div> : null}
    </div>
  );
}

export function VitruvianMark({
  width = 200,
  height = 200,
  color = "currentColor",
  accent,
  className = "",
}: ArtProps) {
  const a = accent || color;
  return (
    <svg
      className={`ra ra-vitruvian ${className}`}
      viewBox="0 0 200 200"
      width={width}
      height={height}
      fill="none"
      stroke={color}
      strokeWidth="1"
      strokeLinecap="round"
    >
      <circle cx="100" cy="100" r="92" />
      <rect x="22" y="22" width="156" height="156" opacity=".7" />
      <circle cx="100" cy="100" r="78" opacity=".5" />
      <path d="M100 8 V192 M8 100 H192" opacity=".25" />
      <path d="M30 30 L170 170 M170 30 L30 170" opacity=".2" />
      <circle cx="100" cy="100" r="6" fill={a} stroke="none" />
      <text
        x="100"
        y="106"
        textAnchor="middle"
        fontFamily="var(--font-marketing-serif), Cinzel, serif"
        fontWeight="500"
        fontSize="10"
        letterSpacing="0.18em"
        fill={color}
        stroke="none"
        opacity=".7"
      >
        ZP
      </text>
    </svg>
  );
}

export function Drapery({
  width = 400,
  height = 80,
  color = "currentColor",
  accent,
  className = "",
}: ArtProps) {
  const a = accent || color;
  return (
    <svg
      className={`ra ra-drapery ${className}`}
      viewBox="0 0 400 80"
      width={width}
      height={height}
      preserveAspectRatio="none"
      fill="none"
      stroke={color}
      strokeWidth="1"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path
        d="M0 8 Q 50 40 100 16 Q 150 -8 200 16 Q 250 40 300 16 Q 350 -8 400 8 L400 0 L0 0 Z"
        fill={a}
        fillOpacity=".08"
      />
      <path d="M0 8 Q 50 40 100 16 Q 150 -8 200 16 Q 250 40 300 16 Q 350 -8 400 8" />
      <g opacity=".7">
        <line x1="50" y1="36" x2="50" y2="58" />
        <circle cx="50" cy="62" r="3" fill={a} stroke="none" />
        <line x1="150" y1="6" x2="150" y2="28" />
        <circle cx="150" cy="32" r="3" fill={a} stroke="none" />
        <line x1="250" y1="36" x2="250" y2="58" />
        <circle cx="250" cy="62" r="3" fill={a} stroke="none" />
        <line x1="350" y1="6" x2="350" y2="28" />
        <circle cx="350" cy="32" r="3" fill={a} stroke="none" />
      </g>
    </svg>
  );
}

export function Pediment({
  width = 300,
  height = 80,
  color = "currentColor",
  accent,
  className = "",
}: ArtProps) {
  const a = accent || color;
  return (
    <svg
      className={`ra ra-pediment ${className}`}
      viewBox="0 0 300 80"
      width={width}
      height={height}
      preserveAspectRatio="none"
      fill="none"
      stroke={color}
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M0 70 L150 6 L300 70" />
      <path d="M0 78 H300" />
      <path d="M6 70 L150 18 L294 70" opacity=".5" />
      <circle cx="150" cy="56" r="6" fill={a} stroke="none" />
      <circle cx="150" cy="56" r="11" opacity=".4" />
    </svg>
  );
}

export function ClassicalHand({
  width = 200,
  height = 200,
  color = "currentColor",
  accent,
  className = "",
}: ArtProps) {
  const a = accent || color;
  return (
    <svg
      className={`ra ra-hand ${className}`}
      viewBox="0 0 200 200"
      width={width}
      height={height}
      fill="none"
      stroke={color}
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 150 Q 40 130 70 130 Q 100 130 120 110 Q 140 90 170 90" />
      <path d="M20 165 Q 40 145 70 145 Q 100 145 120 125 Q 140 105 170 105" opacity=".55" />
      <path
        d="M120 110 Q 124 90 138 84 Q 152 80 162 82 Q 172 84 178 92 Q 182 100 178 108 Q 174 116 160 118 L 130 122"
        fill={a}
        fillOpacity=".06"
      />
      <path d="M162 82 Q 168 70 172 56 Q 174 46 180 44" />
      <path d="M180 44 Q 184 44 188 46" />
      <circle cx="148" cy="98" r="1.4" fill={color} />
      <circle cx="156" cy="100" r="1.4" fill={color} />
      <circle cx="164" cy="100" r="1.4" fill={color} />
      <g transform="translate(186 38)" opacity=".7">
        <circle cx="0" cy="0" r="3" fill={a} stroke="none" />
        <line x1="-8" y1="0" x2="-4" y2="0" />
        <line x1="8" y1="0" x2="4" y2="0" />
        <line x1="0" y1="-8" x2="0" y2="-4" />
        <line x1="0" y1="8" x2="0" y2="4" />
        <line x1="-6" y1="-6" x2="-3" y2="-3" />
        <line x1="6" y1="6" x2="3" y2="3" />
        <line x1="-6" y1="6" x2="-3" y2="3" />
        <line x1="6" y1="-6" x2="3" y2="-3" />
      </g>
    </svg>
  );
}

export function Shield({
  width = 160,
  height = 200,
  color = "currentColor",
  accent,
  className = "",
  content,
}: ArtProps & { content?: string }) {
  const a = accent || color;
  return (
    <svg
      className={`ra ra-shield ${className}`}
      viewBox="0 0 160 200"
      width={width}
      height={height}
      fill="none"
      stroke={color}
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path
        d="M16 18 H144 V100 Q 144 160 80 188 Q 16 160 16 100 Z"
        fill={a}
        fillOpacity=".06"
      />
      <path d="M24 26 H136 V100 Q 136 154 80 178 Q 24 154 24 100 Z" opacity=".6" />
      <path d="M80 26 V178" opacity=".4" />
      <path d="M24 100 H136" opacity=".4" />
      <circle cx="80" cy="100" r="14" fill={a} fillOpacity=".15" />
      <circle cx="80" cy="100" r="6" fill={a} stroke="none" />
      {content ? (
        <text
          x="80"
          y="104"
          textAnchor="middle"
          fontFamily="var(--font-marketing-serif), Cinzel, serif"
          fontWeight="600"
          fontSize="8"
          letterSpacing="0.2em"
          fill={color}
          stroke="none"
        >
          {content}
        </text>
      ) : null}
    </svg>
  );
}

export function Banderole({
  width = 360,
  height = 60,
  color = "currentColor",
  accent,
  className = "",
  text = "",
}: ArtProps & { text?: string }) {
  const a = accent || color;
  return (
    <svg
      className={`ra ra-banderole ${className}`}
      viewBox="0 0 360 60"
      width={width}
      height={height}
      fill="none"
      stroke={color}
      strokeWidth="1"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path
        d="M0 30 Q 20 14 40 22 L 320 22 Q 340 14 360 30 Q 340 46 320 38 L 40 38 Q 20 46 0 30 Z"
        fill={a}
        fillOpacity=".08"
      />
      <path d="M40 22 L 32 30 L 40 38 M 320 22 L 328 30 L 320 38" opacity=".7" />
      {text ? (
        <text
          x="180"
          y="34"
          textAnchor="middle"
          fontFamily="var(--font-marketing-serif), Cormorant Garamond, serif"
          fontStyle="italic"
          fontSize="16"
          fill={color}
          stroke="none"
        >
          {text}
        </text>
      ) : null}
    </svg>
  );
}

export function CompassRose({
  width = 160,
  height = 160,
  color = "currentColor",
  accent,
  className = "",
}: ArtProps) {
  const a = accent || color;
  return (
    <svg
      className={`ra ra-compass ${className}`}
      viewBox="0 0 160 160"
      width={width}
      height={height}
      fill="none"
      stroke={color}
      strokeWidth="1"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="80" cy="80" r="72" />
      <circle cx="80" cy="80" r="60" opacity=".5" />
      <circle cx="80" cy="80" r="42" opacity=".3" />
      <path d="M80 12 L86 80 L80 148 L74 80 Z" fill={a} fillOpacity=".15" />
      <path d="M12 80 L80 86 L148 80 L80 74 Z" fill={a} fillOpacity=".15" />
      <path d="M32 32 L80 80 L128 32 L80 76 Z" opacity=".4" />
      <path d="M32 128 L80 80 L128 128 L80 84 Z" opacity=".4" />
      <circle cx="80" cy="80" r="4" fill={a} stroke="none" />
      <text
        x="80"
        y="9"
        textAnchor="middle"
        fontFamily="var(--font-marketing-serif), Cinzel, serif"
        fontSize="9"
        fontWeight="600"
        fill={color}
        stroke="none"
      >
        N
      </text>
      <text
        x="155"
        y="84"
        textAnchor="middle"
        fontFamily="var(--font-marketing-serif), Cinzel, serif"
        fontSize="9"
        fontWeight="600"
        fill={color}
        stroke="none"
      >
        E
      </text>
      <text
        x="80"
        y="158"
        textAnchor="middle"
        fontFamily="var(--font-marketing-serif), Cinzel, serif"
        fontSize="9"
        fontWeight="600"
        fill={color}
        stroke="none"
      >
        S
      </text>
      <text
        x="5"
        y="84"
        textAnchor="middle"
        fontFamily="var(--font-marketing-serif), Cinzel, serif"
        fontSize="9"
        fontWeight="600"
        fill={color}
        stroke="none"
      >
        W
      </text>
    </svg>
  );
}

export function Astrolabe({
  width = 220,
  height = 220,
  color = "currentColor",
  accent,
  className = "",
}: ArtProps) {
  const a = accent || color;
  return (
    <svg
      className={`ra ra-astrolabe ${className}`}
      viewBox="0 0 220 220"
      width={width}
      height={height}
      fill="none"
      stroke={color}
      strokeWidth="1"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <g className="ra-astrolabe-outer">
        <circle cx="110" cy="110" r="100" />
        <circle cx="110" cy="110" r="92" opacity=".6" />
      </g>
      <g opacity=".7">
        {Array.from({ length: 36 }, (_, i) => {
          const ang = (i / 36) * Math.PI * 2;
          const r1 = 92;
          const r2 = i % 3 === 0 ? 100 : 96;
          return (
            <line
              key={i}
              x1={110 + r1 * Math.cos(ang)}
              y1={110 + r1 * Math.sin(ang)}
              x2={110 + r2 * Math.cos(ang)}
              y2={110 + r2 * Math.sin(ang)}
            />
          );
        })}
      </g>
      <g className="ra-astrolabe-inner">
        <circle cx="110" cy="110" r="74" />
        <circle cx="110" cy="110" r="58" opacity=".5" />
        <circle cx="110" cy="110" r="42" opacity=".4" />
        <path d="M110 36 V184 M36 110 H184" opacity=".5" />
        <path d="M58 58 L162 162 M162 58 L58 162" opacity=".3" />
      </g>
      <g className="ra-astrolabe-alidade">
        <line x1="20" y1="110" x2="200" y2="110" strokeWidth="1.5" />
        <circle cx="20" cy="110" r="4" fill={a} stroke="none" />
        <circle cx="200" cy="110" r="4" fill={a} stroke="none" />
      </g>
      <circle cx="110" cy="110" r="6" fill={a} stroke="none" />
    </svg>
  );
}

export function Obelisk({
  width = 120,
  height = 280,
  color = "currentColor",
  accent,
  className = "",
}: ArtProps) {
  const a = accent || color;
  const W = 120;
  const H = 280;
  const cx = W / 2;
  const cy = 130;
  return (
    <svg
      className={`ra ra-mobile ${className}`}
      viewBox={`0 0 ${W} ${H}`}
      width={width}
      height={height}
      fill="none"
      stroke={color}
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <g transform={`translate(${cx} ${cy})`} opacity=".8">
        {Array.from({ length: 24 }, (_, i) => {
          const ang = (i / 24) * Math.PI * 2;
          const r1 = 40;
          const r2 = i % 2 === 0 ? 78 : 60;
          return (
            <line
              key={i}
              x1={r1 * Math.cos(ang)}
              y1={r1 * Math.sin(ang)}
              x2={r2 * Math.cos(ang)}
              y2={r2 * Math.sin(ang)}
              opacity={i % 2 === 0 ? 0.9 : 0.45}
            />
          );
        })}
        <circle cx="0" cy="0" r="36" />
        <circle cx="0" cy="0" r="28" opacity=".55" />
      </g>
      <g transform={`translate(${cx} ${cy})`}>
        <circle cx="0" cy="0" r="20" fill={a} fillOpacity=".15" />
        <circle cx="0" cy="0" r="20" />
        <path d="M 0 -14 L 11 0 L 0 14 L -11 0 Z" fill={a} fillOpacity=".35" />
        <path d="M 0 -14 L 11 0 L 0 14 L -11 0 Z" />
        <circle cx="0" cy="0" r="2.4" fill={a} stroke="none" />
      </g>
      <line x1={cx} y1={cy + 78} x2={cx} y2={H - 38} opacity=".55" />
      <rect x="14" y={H - 16} width={W - 28} height="12" />
      <rect x="22" y={H - 26} width={W - 44} height="10" />
      <rect x="30" y={H - 36} width={W - 60} height="10" />
      <rect x={cx - 12} y={H - 42} width="24" height="6" fill={a} fillOpacity=".22" />
    </svg>
  );
}

export function HeraldTrumpet({
  width = 180,
  height = 180,
  color = "currentColor",
  accent,
  className = "",
}: ArtProps) {
  const a = accent || color;
  const W = 180;
  const H = 180;
  return (
    <svg
      className={`ra ra-trumpet ${className}`}
      viewBox={`0 0 ${W} ${H}`}
      width={width}
      height={height}
      fill="none"
      stroke={color}
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <g opacity=".55">
        <path d="M138 36 L158 22" />
        <path d="M144 60 L168 56" />
        <path d="M148 86 L172 90" />
        <path d="M142 110 L162 124" />
        <path d="M128 130 L142 152" />
      </g>
      <g opacity=".35">
        <path d="M142 48 L154 42" />
        <path d="M148 72 L160 70" />
        <path d="M148 100 L160 108" />
        <path d="M138 122 L150 138" />
      </g>
      <path d="M 60 70 L 134 38 L 134 142 L 60 110 Z" fill={a} fillOpacity=".1" />
      <path d="M134 38 Q 142 90 134 142" />
      <path d="M134 50 Q 140 90 134 130" opacity=".55" />
      <rect x="20" y="78" width="40" height="24" fill={a} fillOpacity=".15" />
      <rect x="14" y="74" width="14" height="32" fill={a} fillOpacity=".25" />
      <line x1="32" y1="78" x2="32" y2="102" opacity=".55" />
      <line x1="44" y1="78" x2="44" y2="102" opacity=".55" />
      <circle cx="14" cy="90" r="4" fill={a} stroke="none" />
      <path
        d="M44 102 L44 134 Q 56 130 68 134 L 68 102"
        fill={a}
        fillOpacity=".18"
      />
      <line x1="44" y1="134" x2="44" y2="140" opacity=".7" />
      <line x1="56" y1="132" x2="56" y2="138" opacity=".7" />
      <line x1="68" y1="134" x2="68" y2="140" opacity=".7" />
      <path
        d="M56 118 l1.5 3 l3.2 .5 l-2.3 2.3 l.6 3.2 l-3 -1.6 l-3 1.6 l.6 -3.2 l-2.3 -2.3 l3.2 -.5 z"
        fill={a}
        stroke="none"
        opacity=".85"
      />
      <g transform="translate(134 90)">
        <path d="M-4 0 L0 -4 L4 0 L0 4 Z" fill={a} stroke="none" />
        <circle cx="0" cy="0" r="1.2" fill={color} stroke="none" />
      </g>
    </svg>
  );
}

export function CelestialField({
  count = 5,
  color = "currentColor",
  accent,
  className = "",
}: {
  count?: number;
  color?: string;
  accent?: string;
  className?: string;
}) {
  const a = accent || color;
  const spheres = useMemo(() => {
    let s = 7919;
    const r = () => {
      s = (s * 9301 + 49297) % 233280;
      return s / 233280;
    };
    return Array.from({ length: count }, (_, i) => ({
      x: 10 + r() * 80,
      y: 10 + r() * 80,
      size: 12 + r() * 28,
      delay: r() * 4,
      key: i,
    }));
  }, [count]);
  return (
    <div className={`ra-celestial ${className}`} aria-hidden="true">
      {spheres.map((sp) => (
        <svg
          key={sp.key}
          style={{
            position: "absolute",
            left: `${sp.x}%`,
            top: `${sp.y}%`,
            width: sp.size,
            height: sp.size,
            animationDelay: `${sp.delay}s`,
          }}
          className="ra-celestial-sphere"
          viewBox="0 0 40 40"
          fill="none"
          stroke={color}
          strokeWidth="0.8"
        >
          <circle cx="20" cy="20" r="18" />
          <circle cx="20" cy="20" r="14" opacity=".5" />
          <circle cx="20" cy="20" r="10" opacity=".3" />
          <circle cx="20" cy="20" r="2" fill={a} stroke="none" />
        </svg>
      ))}
    </div>
  );
}
