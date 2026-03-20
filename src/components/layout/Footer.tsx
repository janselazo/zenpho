"use client";

import Link from "next/link";
import NewsletterSignup from "@/components/ui/NewsletterSignup";
import { navLinks } from "@/lib/data";

export default function Footer() {
  return (
    <footer className="relative border-t border-border bg-surface">
      <div className="mx-auto max-w-7xl px-6 py-14 lg:px-8">
        <div className="grid gap-10 md:grid-cols-3">
          <div>
            <Link href="/" className="group inline-block">
              <span className="text-lg font-bold tracking-tight text-text-primary">
                Janse Lazo
              </span>
            </Link>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-text-secondary">
              Custom AI software development and AI agents—for web, mobile,
              stores, and the workflows your team runs every day.
            </p>
          </div>

          <div>
            <h4 className="mb-4 text-xs font-semibold uppercase tracking-widest text-text-primary">
              Navigate
            </h4>
            <div className="flex flex-col gap-3">
              {navLinks.map((link) =>
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
              Newsletter
            </h4>
            <NewsletterSignup compact />
            <h4 className="mb-3 mt-8 text-xs font-semibold uppercase tracking-widest text-text-primary">
              Connect
            </h4>
            <div className="flex flex-col gap-2">
              <a
                href="mailto:hello@janselazo.com"
                className="text-sm text-text-secondary transition-colors hover:text-accent"
              >
                hello@janselazo.com
              </a>
              <a
                href="https://x.com/janselazo"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-text-secondary transition-colors hover:text-accent"
              >
                X / Twitter
              </a>
              <a
                href="https://github.com/janselazo"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-text-secondary transition-colors hover:text-accent"
              >
                GitHub
              </a>
              <a
                href="https://linkedin.com/in/janselazo"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-text-secondary transition-colors hover:text-accent"
              >
                LinkedIn
              </a>
            </div>
          </div>
        </div>

        <div className="mt-12 border-t border-border pt-8">
          <p className="text-center text-xs text-text-secondary/70">
            &copy; {new Date().getFullYear()} Janse Lazo. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
