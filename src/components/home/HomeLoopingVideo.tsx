"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Two stacked <video> tags that crossfade just before the active one ends.
 * Mirrors the design's `LoopingVideo` from design-handoff/page-home.jsx so
 * the loop seam is invisible.
 */
export default function HomeLoopingVideo({
  src,
  poster,
  fadeMs = 600,
}: {
  src: string;
  poster?: string;
  fadeMs?: number;
}) {
  const aRef = useRef<HTMLVideoElement | null>(null);
  const bRef = useRef<HTMLVideoElement | null>(null);
  const [front, setFront] = useState<"a" | "b">("a");

  useEffect(() => {
    const a = aRef.current;
    const b = bRef.current;
    if (!a || !b) return;
    let armed = false;

    const onTime = (e: Event) => {
      const el = e.target as HTMLVideoElement;
      const dur = el.duration;
      if (!Number.isFinite(dur)) return;
      if (!armed && dur - el.currentTime <= fadeMs / 1000 + 0.05) {
        armed = true;
        const other = el === a ? b : a;
        try {
          other.currentTime = 0;
        } catch {
          /* ignore */
        }
        const p = other.play();
        if (p && typeof p.catch === "function") p.catch(() => {});
        setFront(el === a ? "b" : "a");
        window.setTimeout(() => {
          armed = false;
        }, fadeMs + 200);
      }
    };

    const onEnd = (e: Event) => {
      const el = e.target as HTMLVideoElement;
      try {
        el.currentTime = 0;
        const p = el.play();
        if (p && typeof p.catch === "function") p.catch(() => {});
      } catch {
        /* ignore */
      }
    };

    a.addEventListener("timeupdate", onTime);
    b.addEventListener("timeupdate", onTime);
    a.addEventListener("ended", onEnd);
    b.addEventListener("ended", onEnd);

    const start = a.play();
    if (start && typeof start.catch === "function") start.catch(() => {});

    return () => {
      a.removeEventListener("timeupdate", onTime);
      b.removeEventListener("timeupdate", onTime);
      a.removeEventListener("ended", onEnd);
      b.removeEventListener("ended", onEnd);
    };
  }, [fadeMs]);

  const fadeStyle = (which: "a" | "b"): React.CSSProperties => ({
    transition: `opacity ${fadeMs}ms linear`,
    opacity: front === which ? 1 : 0,
  });

  return (
    <>
      <video
        ref={aRef}
        className="hero-video-el"
        src={src}
        poster={poster}
        muted
        playsInline
        preload="metadata"
        aria-hidden="true"
        style={fadeStyle("a")}
      />
      <video
        ref={bRef}
        className="hero-video-el"
        src={src}
        poster={poster}
        muted
        playsInline
        preload="metadata"
        aria-hidden="true"
        style={fadeStyle("b")}
      />
    </>
  );
}
