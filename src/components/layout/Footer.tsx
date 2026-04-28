"use client";

import Image from "next/image";
import Link from "next/link";
import { footerNavLinks } from "@/lib/data";
import Button from "@/components/ui/Button";

export default function Footer() {
  return (
    <footer className="relative border-t border-border bg-gradient-to-b from-surface to-background">
      <div className="mx-auto max-w-7xl px-6 py-14 lg:px-8 lg:py-16">
        <div className="grid gap-12 sm:gap-14 md:grid-cols-2 lg:grid-cols-[1.25fr_1fr_1fr] lg:gap-16">
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
              Zenpho — AI MVP Development Studio
            </p>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-text-secondary">
              We help founders build and launch AI-powered MVPs through product
              strategy, UX/UI, development, analytics, and growth support.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button href="/booking" variant="primary" size="md">
                Book an MVP Strategy Call
              </Button>
            </div>
          </div>

          <div>
            <h4 className="mb-5 border-b border-border/80 pb-2 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-text-secondary">
              Navigate
            </h4>
            <div className="flex flex-col gap-3">
              {footerNavLinks.map((link) =>
                link.children ? (
                  <div key={link.href} className="flex flex-col gap-2">
                    <Link
                      href={link.href}
                      className="text-sm font-semibold text-text-primary transition-colors hover:text-accent"
                    >
                      {link.label}
                    </Link>
                    <div className="ml-1 flex flex-col gap-2 border-l border-border/70 pl-3">
                      {link.children.map((child) => (
                        <Link
                          key={child.href}
                          href={child.href}
                          className="text-sm text-text-secondary transition-colors hover:text-accent"
                        >
                          {child.label}
                        </Link>
                      ))}
                    </div>
                  </div>
                ) : (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="text-sm text-text-secondary transition-colors hover:text-accent"
                  >
                    {link.label}
                  </Link>
                ),
              )}
            </div>
          </div>

          <div>
            <h4 className="mb-5 border-b border-border/80 pb-2 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-text-secondary">
              Connect
            </h4>
            <div className="rounded-2xl border border-border/60 bg-white/80 px-5 py-5 shadow-sm">
              <div className="flex flex-col gap-3">
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
          </div>
        </div>

        <div className="mt-14 flex flex-col items-center gap-4 border-t border-border/70 pt-8 sm:flex-row sm:justify-between">
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
