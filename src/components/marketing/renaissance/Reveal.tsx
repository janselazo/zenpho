"use client";

import {
  Children,
  Fragment,
  cloneElement,
  isValidElement,
  useEffect,
  useRef,
  type ElementType,
  type ReactNode,
  type HTMLAttributes,
} from "react";

/**
 * IntersectionObserver-based reveal — adds `.in` class to the wrapped element
 * once it scrolls into view. Mirrors the Renaissance/Editorial design's
 * pure-CSS reveal pattern (`.reveal` + `.in`, `.reveal-stagger` + `.in`).
 */
export function useReveal<T extends Element = HTMLElement>(
  options: { once?: boolean; threshold?: number; rootMargin?: string } = {},
) {
  const ref = useRef<T | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            el.classList.add("in");
            if (options.once !== false) io.unobserve(el);
          } else if (options.once === false) {
            el.classList.remove("in");
          }
        });
      },
      {
        threshold: options.threshold ?? 0.15,
        rootMargin: options.rootMargin ?? "0px 0px -10% 0px",
      },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [options.once, options.threshold, options.rootMargin]);
  return ref;
}

type RevealProps = {
  as?: ElementType;
  className?: string;
  stagger?: boolean;
  children?: ReactNode;
} & Omit<HTMLAttributes<HTMLElement>, "className" | "children">;

export function Reveal({
  as: Tag = "div",
  className = "",
  stagger = false,
  children,
  ...rest
}: RevealProps) {
  const ref = useReveal<HTMLElement>();
  const cls = `${stagger ? "reveal-stagger" : "reveal"} ${className}`.trim();
  return (
    <Tag ref={ref as never} className={cls} {...rest}>
      {children}
    </Tag>
  );
}

/**
 * Word-by-word fade-up reveal used for hero headlines. Splits string children
 * into `<span class="word">` tokens; preserves nested JSX (em, span, etc.).
 */
export function WordReveal({
  children,
  delay = 0,
  className = "",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const words = el.querySelectorAll<HTMLElement>(".word");
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          words.forEach((w, i) => {
            setTimeout(() => w.classList.add("in"), delay + i * 90);
          });
          io.unobserve(el);
        }
      },
      { threshold: 0.2 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [delay]);

  const splitString = (s: string): ReactNode[] =>
    s.split(/(\s+)/).map((tok, i) =>
      tok.match(/^\s+$/) ? (
        tok
      ) : (
        <span key={i} className="word">
          {tok}
        </span>
      ),
    );

  const render = (node: ReactNode): ReactNode => {
    if (typeof node === "string") return splitString(node);
    if (Array.isArray(node)) {
      return node.map((n, i) => <Fragment key={i}>{render(n)}</Fragment>);
    }
    if (isValidElement(node)) {
      const el = node as React.ReactElement<{ children?: ReactNode }>;
      return cloneElement(el, undefined, render(el.props.children));
    }
    if (node && typeof node === "object" && "props" in (node as object)) {
      return Children.map(node as ReactNode, (child) => render(child));
    }
    return node;
  };

  return (
    <span ref={ref} className={className}>
      {render(children)}
    </span>
  );
}
