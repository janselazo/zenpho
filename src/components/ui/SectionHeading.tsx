import type { ReactNode } from "react";

/** Green-on-white pill label — use with `motion.span` on heroes via `className={SECTION_EYEBROW_CLASSNAME}`. */
export const SECTION_EYEBROW_CLASSNAME =
  "inline-block rounded-full bg-white/90 px-5 py-2 text-xs font-bold uppercase tracking-widest text-accent-green shadow-soft ring-1 ring-accent-green/25";

/** Smaller pill for footer / compact newsletter cards. */
export const SECTION_EYEBROW_COMPACT_CLASSNAME =
  "inline-block rounded-full bg-white/90 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-accent-green shadow-soft ring-1 ring-accent-green/25";

interface SectionHeadingProps {
  label?: string;
  title: string;
  /** Second line / phrase in accent blue (matches Services hero titles). */
  titleAccent?: string;
  /** When set with `titleAccent`, render both on one line instead of stacked. */
  titleAccentInline?: boolean;
  description?: ReactNode;
  align?: "left" | "center";
}

export default function SectionHeading({
  label,
  title,
  titleAccent,
  titleAccentInline = false,
  description,
  align = "center",
}: SectionHeadingProps) {
  const alignment = align === "center" ? "text-center mx-auto" : "text-left";
  const labelRowClass =
    align === "center" ? "mb-4 flex justify-center" : "mb-4 flex justify-start";
  const titleStackAlign =
    align === "center" ? "items-center" : "items-start";

  return (
    <div className={`max-w-3xl ${alignment} mb-12 sm:mb-14`}>
      {label ? (
        <div className={labelRowClass}>
          <span className={SECTION_EYEBROW_CLASSNAME}>{label}</span>
        </div>
      ) : null}
      <h2 className="heading-display text-3xl font-bold tracking-tight text-text-primary sm:text-4xl lg:text-5xl">
        {titleAccent ? (
          titleAccentInline ? (
            <span className="block leading-[1.08] sm:leading-[1.1]">
              <span className="text-text-primary">{title}</span>{" "}
              <span className="text-accent">{titleAccent}</span>
            </span>
          ) : (
            <span
              className={`flex flex-col ${titleStackAlign} gap-0 leading-[1.05] sm:leading-[1.08]`}
            >
              <span className="block text-text-primary">{title}</span>
              <span className="block text-accent">{titleAccent}</span>
            </span>
          )
        ) : (
          title
        )}
      </h2>
      {description ? (
        <div
          className={`mt-3 space-y-3 text-pretty sm:mt-3.5 [&_p]:text-base [&_p]:leading-relaxed [&_p]:text-text-secondary [&_p]:sm:text-lg ${
            align === "center"
              ? "mx-auto max-w-2xl"
              : "max-w-2xl"
          }`}
        >
          {typeof description === "string" ? <p>{description}</p> : description}
        </div>
      ) : null}
    </div>
  );
}
