"use client";

import Image from "next/image";
import Link from "next/link";
import { footerNavLinks } from "@/lib/data";
import Button from "@/components/ui/Button";

export default function Footer() {
  return (
    <footer className="relative border-t border-border bg-surface">
      <div className="mx-auto max-w-7xl px-6 py-14 lg:px-8">
        <div className="grid gap-10 md:grid-cols-3">
          <div>
            <Link href="/" className="group inline-block" aria-label="Zenpho home">
              <Image
                src="/zenpho-logo.png"
                alt="Zenpho"
                width={140}
                height={38}
                className="h-9 w-auto"
              />
            </Link>
            <p className="mt-4 text-sm font-semibold leading-snug text-text-primary">
              Zenpho — AI MVP Development Studio for Founders.
            </p>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-text-secondary">
              We help founders build and launch AI-powered MVPs through product
              strategy, UX/UI, development, analytics, and growth support.
            </p>
            <p className="mt-6 text-base font-semibold leading-snug text-text-primary">
              Build your MVP in 2 weeks.
            </p>
            <div className="mt-4">
              <Button href="/booking" variant="primary" size="md">
                Book an MVP Strategy Call
              </Button>
            </div>
          </div>

          <div>
            <h4 className="mb-4 text-xs font-semibold uppercase tracking-widest text-text-primary">
              Navigate
            </h4>
            <div className="flex flex-col gap-3">
              {footerNavLinks.map((link) =>
                link.children ? (
                  <div key={link.href} className="flex flex-col gap-2">
                    <Link
                      href={link.href}
                      className="text-sm font-medium text-text-primary transition-colors hover:text-accent"
                    >
                      {link.label}
                    </Link>
                    <div className="ml-1 flex flex-col gap-1.5 border-l border-border pl-3">
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
            <h4 className="mb-4 text-xs font-semibold uppercase tracking-widest text-text-primary">
              Connect
            </h4>
            <div className="flex flex-col gap-2">
              <a
                href="mailto:hello@zenpho.com"
                className="text-sm text-text-secondary transition-colors hover:text-accent"
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

        <div className="mt-12 flex flex-col items-center gap-3 border-t border-border pt-8 sm:flex-row sm:justify-between">
          <p className="text-xs text-text-secondary/70">
            &copy; {new Date().getFullYear()} Zenpho. All rights reserved.
          </p>
          <div className="flex gap-4">
            <Link href="/privacy" className="text-xs text-text-secondary/70 transition-colors hover:text-accent">
              Privacy
            </Link>
            <Link href="/terms" className="text-xs text-text-secondary/70 transition-colors hover:text-accent">
              Terms
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
