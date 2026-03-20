"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { navLinks } from "@/lib/data";
import Button from "@/components/ui/Button";

export default function Navbar() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <header className="fixed top-0 left-0 z-50 w-full px-4 pt-4 md:px-6 md:pt-5">
      <div
        className={`mx-auto max-w-5xl transition-all duration-300 ${
          scrolled ? "shadow-soft-lg" : "shadow-soft"
        }`}
      >
        <nav className="relative flex items-center gap-3 rounded-full border border-white/80 bg-white/85 px-3 py-2.5 shadow-soft backdrop-blur-xl md:px-4 md:py-2">
          <Link
            href="/"
            className="group flex shrink-0 items-center gap-2 pl-1 md:pl-2"
          >
            <span className="text-base font-bold tracking-tight text-text-primary">
              Janse Lazo
            </span>
            <span
              className="h-2 w-2 rounded-full bg-accent"
              aria-hidden
            />
          </Link>

          <div className="absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 md:flex md:items-center md:gap-7">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`text-sm font-medium transition-colors ${
                  pathname === link.href
                    ? "text-accent"
                    : "text-text-secondary hover:text-text-primary"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="ml-auto flex shrink-0 items-center gap-2 md:gap-3">
            <Link
              href="/contact"
              className="hidden text-sm font-medium text-text-secondary transition-colors hover:text-text-primary lg:inline"
            >
              Contact
            </Link>
            <Button href="/contact" variant="primary" size="sm" className="!px-5">
              Get started
            </Button>
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="flex flex-col gap-1.5 rounded-full p-2 md:hidden"
              aria-label="Toggle menu"
            >
              <span
                className={`h-0.5 w-5 rounded-full bg-text-primary transition-all ${
                  mobileOpen ? "translate-y-[5px] rotate-45" : ""
                }`}
              />
              <span
                className={`h-0.5 w-5 rounded-full bg-text-primary transition-all ${
                  mobileOpen ? "opacity-0" : ""
                }`}
              />
              <span
                className={`h-0.5 w-5 rounded-full bg-text-primary transition-all ${
                  mobileOpen ? "-translate-y-[5px] -rotate-45" : ""
                }`}
              />
            </button>
          </div>
        </nav>
      </div>

      <div
        className={`mx-auto mt-2 max-w-5xl overflow-hidden rounded-2xl border border-border bg-white shadow-soft transition-all md:hidden ${
          mobileOpen ? "max-h-[28rem] opacity-100" : "max-h-0 border-0 opacity-0"
        }`}
      >
        <div className="flex flex-col gap-0.5 p-3">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-xl px-4 py-3 text-sm font-medium ${
                pathname === link.href
                  ? "bg-surface text-accent"
                  : "text-text-secondary"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </header>
  );
}
