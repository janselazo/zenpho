"use client";

import Image from "next/image";
import Link from "next/link";
import { marketingFooterColumns } from "@/lib/marketing-nav";
import Button from "@/components/ui/Button";

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
              We help local owners generate qualified leads, book more appointments, collect Google reviews, grow referrals, and see exactly which marketing produces revenue—with our product and our team in the loop when you want us there.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button href="/booking" variant="primary" size="md">
                Book a growth call
              </Button>
              <Button href="/revenue" variant="secondary" size="md">
                Free revenue check
              </Button>
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

        <div className="mt-14 flex flex-col items-center gap-6 border-t border-border/70 pt-8 lg:flex-row lg:justify-between">
          <div className="w-full rounded-2xl border border-border/60 bg-white/80 px-5 py-5 shadow-sm lg:max-w-md">
            <h4 className="border-b border-border/70 pb-2 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-text-secondary">
              Connect
            </h4>
            <div className="mt-4 flex flex-col gap-3">
              <a
                href="mailto:hello@zenpho.com"
                className="text-sm font-semibold text-text-primary transition-colors hover:text-accent"
              >
                hello@zenpho.com
              </a>
              <a
                href="https://x.com/zenpho"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-text-secondary transition-colors hover:text-accent"
              >
                X / Twitter
              </a>
              <a
                href="https://www.linkedin.com/company/zenpho"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-text-secondary transition-colors hover:text-accent"
              >
                LinkedIn
              </a>
              <a
                href="https://github.com/zenpho"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-text-secondary transition-colors hover:text-accent"
              >
                GitHub
              </a>
            </div>
          </div>
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:gap-8">
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
      </div>
    </footer>
  );
}
