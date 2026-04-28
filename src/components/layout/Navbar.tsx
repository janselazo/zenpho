"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { headerNavLinks } from "@/lib/data";
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
        className={`mx-auto max-w-7xl transition-all duration-300 ${
          scrolled ? "shadow-soft-lg" : "shadow-soft"
        }`}
      >
        <nav className="flex items-center gap-1.5 rounded-full border border-white/80 bg-white/85 px-2.5 py-2 shadow-soft backdrop-blur-xl sm:gap-2 sm:px-3 sm:py-2.5 md:gap-3 md:px-4 md:py-2">
          <Link
            href="/"
            className="group relative min-w-0 shrink-0 pl-0.5 sm:pl-1 md:pl-2"
            aria-label="Zenpho home"
          >
            <Image
              src="/zenpho-logo.png"
              alt="Zenpho"
              width={132}
              height={36}
              className="h-7 w-auto sm:h-8"
              priority
            />
          </Link>

          <div className="hidden min-w-0 flex-1 items-center justify-center lg:flex">
            <ul className="flex items-center justify-center gap-5 xl:gap-6">
              {headerNavLinks.map((link) => (
                <li key={link.href} className="shrink-0">
                  <Link
                    href={link.href}
                    className={`block whitespace-nowrap text-sm font-medium transition-colors ${
                      pathname === link.href
                        ? "text-accent"
                        : "text-text-secondary hover:text-text-primary"
                    }`}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2 md:gap-3">
            <Button
              href="/booking"
              variant="primary"
              size="sm"
              className="!px-3.5 sm:!px-5"
              aria-label="Book a Call"
            >
              <span className="sm:hidden">Book</span>
              <span className="hidden sm:inline">Book a Call</span>
            </Button>
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="flex flex-col gap-1.5 rounded-full p-2 lg:hidden"
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
        className={`mx-auto mt-2 max-w-7xl overflow-hidden rounded-2xl border border-border bg-white shadow-soft transition-all lg:hidden ${
          mobileOpen ? "max-h-[32rem] opacity-100" : "max-h-0 border-0 opacity-0"
        }`}
      >
        <div className="flex flex-col gap-0.5 p-3">
          <Link
            href="/booking"
            className="rounded-xl bg-accent px-4 py-3 text-center text-sm font-semibold text-white shadow-sm"
          >
            Book a Call
          </Link>
          {headerNavLinks.map((link) => (
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
