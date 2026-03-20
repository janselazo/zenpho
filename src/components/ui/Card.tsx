interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  glow?: "blue" | "green" | "none";
  /** Relink-style gradient feature card */
  variant?: "default" | "gradient";
}

export default function Card({
  children,
  className = "",
  hover = true,
  glow = "none",
  variant = "default",
}: CardProps) {
  const glowClass =
    glow === "blue" ? "glow-blue" : glow === "green" ? "glow-green" : "";

  if (variant === "gradient") {
    return (
      <div
        className={`rounded-3xl border border-transparent bg-gradient-to-br from-accent via-accent to-accent-hover p-[1px] shadow-soft-lg ${glowClass} ${className}`}
      >
        <div className="h-full rounded-[1.4rem] bg-gradient-to-br from-accent to-accent-hover p-6 text-white sm:p-8">
          {children}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`rounded-3xl border border-border bg-white p-6 shadow-soft sm:p-8 ${
        hover
          ? "transition-all duration-200 hover:border-accent/20 hover:shadow-soft-lg"
          : ""
      } ${glowClass} ${className}`}
    >
      {children}
    </div>
  );
}
