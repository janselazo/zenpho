"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { Github, Linkedin, Mail } from "lucide-react";
import { marketingFooterColumns } from "@/lib/marketing-nav";
import Button from "@/components/ui/Button";

function SocialIconLink({
  href,
  ariaLabel,
  external,
  children,
}: {
  href: string;
  ariaLabel: string;
  external?: boolean;
  children: ReactNode;
}) {
  const cls =
    "inline-flex h-9 w-9 items-center justify-center rounded-full border border-border/70 bg-white/90 text-text-secondary shadow-sm transition-colors hover:border-accent/35 hover:text-accent";
  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" aria-label={ariaLabel} className={cls}>
        {children}
      </a>
    );
  }
  return (
    <a href={href} aria-label={ariaLabel} className={cls}>
      {children}
    </a>
  );
}

/** X (Twitter) mark — Lucide does not ship the current X glyph. */
function IconX({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

export default function Footer() {
  return (
    <footer className="relative border-t border-border bg-gradient-to-b from-surface to-background">
      <div className="mx-auto max-w-7xl px-6 py-14 lg:px-8 lg:py-16">
        <div className="grid gap-12 sm:gap-14 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,2.65fr)] lg:gap-16">
          <div className="flex flex-col">
            <Link href="/" className="group inline-block w-fit" aria-label="Zenpho home">
              <Image
                src="/zenpho-logo.png"
                alt="Zenpho"
                width={140}
                height={38}
                className="h-9 w-auto"
              />
            </Link>
            <p className="mt-5 text-sm font-semibold leading-snug text-text-primary">
              Growth for local service businesses
            </p>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-text-secondary">
              We help local owners generate qualified leads, book more appointments, collect Google reviews, grow referrals, and see exactly which marketing channel produces revenue.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button href="/booking" variant="primary" size="md">
                Book a growth call
              </Button>
              <Button href="/revenue" variant="secondary" size="md">
                Free revenue check
              </Button>
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-2">
              <SocialIconLink href="mailto:hello@zenpho.com" ariaLabel="Email hello@zenpho.com">
                <Mail className="h-4 w-4" strokeWidth={2} aria-hidden />
              </SocialIconLink>
              <SocialIconLink href="https://x.com/zenpho" ariaLabel="Zenpho on X" external>
                <IconX className="h-[15px] w-[15px]" />
              </SocialIconLink>
              <SocialIconLink
                href="https://www.linkedin.com/company/zenpho"
                ariaLabel="Zenpho on LinkedIn"
                external
              >
                <Linkedin className="h-4 w-4" strokeWidth={2} aria-hidden />
              </SocialIconLink>
              <SocialIconLink href="https://github.com/zenpho" ariaLabel="Zenpho on GitHub" external>
                <Github className="h-4 w-4" strokeWidth={2} aria-hidden />
              </SocialIconLink>
            </div>
          </div>

          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
            {marketingFooterColumns.map((col) => (
              <div key={col.heading}>
                <h4 className="mb-4 border-b border-border/80 pb-2 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-text-secondary">
                  {col.heading}
                </h4>
                <ul className="flex flex-col gap-2.5">
                  {col.links.map((link) => (
                    <li key={`${col.heading}-${link.href}`}>
                      <Link
                        href={link.href}
                        className="text-sm text-text-secondary transition-colors hover:text-accent"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-14 flex flex-col items-center gap-4 border-t border-border/70 pt-8 sm:flex-row sm:justify-between sm:gap-8">
          <p className="text-xs text-text-secondary/80">
            &copy; {new Date().getFullYear()} Zenpho. All rights reserved.
          </p>
          <div className="flex gap-6">
            <Link
              href="/privacy"
              className="text-xs font-medium text-text-secondary/80 transition-colors hover:text-accent"
            >
              Privacy
            </Link>
            <Link
              href="/terms"
              className="text-xs font-medium text-text-secondary/80 transition-colors hover:text-accent"
            >
              Terms
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
