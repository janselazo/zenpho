"use client";

import { useEffect, useRef, useState } from "react";

type VideoSource = {
  src: string;
  type: string;
};

/**
 * Two stacked <video> tags that crossfade just before the active one ends.
 * Mirrors the design's `LoopingVideo` from design-handoff/page-home.jsx so
 * the loop seam is invisible.
 */
export default function HomeLoopingVideo({
  sources,
  poster,
  fadeMs = 600,
}: {
  sources: VideoSource[];
  poster?: string;
  fadeMs?: number;
}) {
  const aRef = useRef<HTMLVideoElement | null>(null);
  const bRef = useRef<HTMLVideoElement | null>(null);
  const activeRef = useRef<"a" | "b">("a");
  const [front, setFront] = useState<"a" | "b">("a");
  const [isCycling, setIsCycling] = useState(false);

  useEffect(() => {
    const a = aRef.current;
    const b = bRef.current;
    if (!a || !b) return;
    let armed = false;
    const timers: number[] = [];

    const switchVideo = (el: HTMLVideoElement) => {
      if (armed) return;
      armed = true;

      const other = el === a ? b : a;
      const nextFront = el === a ? "b" : "a";

      try {
        other.currentTime = 0;
      } catch {
        /* ignore */
      }

      setIsCycling(true);
      const p = other.play();
      if (p && typeof p.catch === "function") p.catch(() => {});

      activeRef.current = nextFront;
      setFront(nextFront);

      timers.push(
        window.setTimeout(() => {
          try {
            el.pause();
            el.currentTime = 0;
          } catch {
            /* ignore */
          }
          armed = false;
        }, fadeMs + 100),
      );

      timers.push(
        window.setTimeout(() => {
          setIsCycling(false);
        }, fadeMs + 260),
      );
    };

    const onTime = (e: Event) => {
      const el = e.target as HTMLVideoElement;
      const currentFront = el === a ? "a" : "b";
      if (currentFront !== activeRef.current) return;

      const dur = el.duration;
      if (!Number.isFinite(dur)) return;
      if (!armed && dur - el.currentTime <= fadeMs / 1000 + 0.05) {
        switchVideo(el);
      }
    };

    const onEnd = (e: Event) => {
      const el = e.target as HTMLVideoElement;
      const currentFront = el === a ? "a" : "b";
      if (currentFront === activeRef.current) switchVideo(el);
    };

    a.addEventListener("timeupdate", onTime);
    b.addEventListener("timeupdate", onTime);
    a.addEventListener("ended", onEnd);
    b.addEventListener("ended", onEnd);

    const start = a.play();
    if (start && typeof start.catch === "function") start.catch(() => {});

    return () => {
      timers.forEach(window.clearTimeout);
      a.removeEventListener("timeupdate", onTime);
      b.removeEventListener("timeupdate", onTime);
      a.removeEventListener("ended", onEnd);
      b.removeEventListener("ended", onEnd);
      a.pause();
      b.pause();
    };
  }, [fadeMs]);

  const fadeStyle = (which: "a" | "b"): React.CSSProperties => ({
    transition: `opacity ${fadeMs}ms linear`,
    opacity: front === which ? 1 : 0,
  });

  const renderSources = () =>
    sources.map((source) => (
      <source key={source.src} src={source.src} type={source.type} />
    ));

  return (
    <>
      <video
        ref={aRef}
        className="hero-video-el"
        poster={poster}
        muted
        playsInline
        preload="auto"
        aria-hidden="true"
        style={fadeStyle("a")}
      >
        {renderSources()}
      </video>
      <video
        ref={bRef}
        className="hero-video-el"
        poster={poster}
        muted
        playsInline
        preload="metadata"
        aria-hidden="true"
        style={fadeStyle("b")}
      >
        {renderSources()}
      </video>
      <div
        className={`hero-video-cycle-shade ${isCycling ? "is-active" : ""}`}
        aria-hidden="true"
      />
    </>
  );
}
