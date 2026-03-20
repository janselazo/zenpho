import Link from "next/link";

type ButtonVariant = "primary" | "secondary" | "ghost" | "dark";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps {
  children: React.ReactNode;
  href?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  type?: "button" | "submit";
  disabled?: boolean;
  onClick?: () => void;
  /** Green “live” dot (Relink-style secondary CTA) */
  showLiveDot?: boolean;
  target?: string;
  rel?: string;
}

/** `dark` = outlined secondary (light surface + accent border); use beside `primary` or with `showLiveDot`. */
const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-accent text-white border border-transparent hover:bg-accent-hover shadow-sm hover:shadow-md",
  secondary:
    "bg-white text-text-primary border border-border hover:border-accent/30 hover:bg-surface",
  ghost:
    "bg-transparent text-text-secondary border border-transparent hover:text-accent hover:bg-surface",
  dark:
    "border border-accent/20 bg-white/95 text-text-primary shadow-soft backdrop-blur-sm hover:border-accent/40 hover:bg-surface hover:shadow-md",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "px-5 py-2.5 text-xs gap-2",
  md: "px-6 py-3 text-sm gap-2",
  lg: "px-8 py-3.5 text-sm gap-2.5",
};

function LiveDot() {
  return (
    <span
      className="h-2 w-2 shrink-0 rounded-full bg-live shadow-[0_0_0_3px_rgba(34,197,94,0.25)] animate-pulse-glow"
      aria-hidden
    />
  );
}

export default function Button({
  children,
  href,
  variant = "primary",
  size = "md",
  className = "",
  type = "button",
  disabled = false,
  onClick,
  showLiveDot = false,
  target,
  rel,
}: ButtonProps) {
  const baseStyles =
    "inline-flex items-center justify-center rounded-full font-semibold tracking-tight transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed";
  const styles = `${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`;

  const inner = (
    <>
      {showLiveDot && <LiveDot />}
      {children}
    </>
  );

  if (href) {
    return (
      <Link href={href} className={styles} target={target} rel={rel}>
        {inner}
      </Link>
    );
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={styles}
    >
      {inner}
    </button>
  );
}
