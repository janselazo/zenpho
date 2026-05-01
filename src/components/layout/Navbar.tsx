"use client";

import { ChevronDown } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { MarketingMegaItem } from "@/lib/marketing-nav";
import { marketingTopNav } from "@/lib/marketing-nav";
import Button from "@/components/ui/Button";

function desktopLinkClass(active: boolean) {
  return `flex items-center gap-1 whitespace-nowrap border-b-2 pb-1 text-sm font-medium transition-colors ${
    active
      ? "border-accent font-semibold text-text-primary"
      : "border-transparent text-text-secondary hover:border-accent/35 hover:text-text-primary"
  }`;
}

function megaPanelOpenClass() {
  return "invisible opacity-0 transition-[opacity,visibility] duration-150 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100";
}

function isPathActiveForMega(pathname: string, items: MarketingMegaItem[]) {
  return items.some(
    (i) => pathname === i.href || pathname.startsWith(`${i.href}/`),
  );
}

function MegaPanel({ eyebrow, items }: { eyebrow: string; items: MarketingMegaItem[] }) {
  return (
    <div
      className={`absolute left-1/2 top-full z-50 w-[min(92vw,44rem)] -translate-x-1/2 pt-3 ${megaPanelOpenClass()} pointer-events-none group-hover:pointer-events-auto group-focus-within:pointer-events-auto`}
    >
      {/* pt-3 is padding inside this wrapper so the gap under the nav trigger stays hoverable (margin was a dead zone that closed the menu). */}
      <div
        className="max-h-[min(85vh,calc(100vh-5.5rem))] overflow-y-auto overscroll-contain rounded-2xl border border-border bg-white p-6 shadow-soft-lg ring-1 ring-black/[0.04]"
        role="region"
        aria-label={eyebrow}
      >
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-700/85">
          {eyebrow}
        </p>
        <ul className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-x-6 md:gap-y-3">
          {items.map((item) => (
            <li key={item.href}>
              <MegaCell item={item} />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function MegaCell({ item }: { item: MarketingMegaItem }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className="flex gap-4 rounded-xl p-2.5 transition-colors hover:bg-emerald-50/90 md:p-3"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-600 md:h-11 md:w-11 dark:bg-emerald-500/20 dark:text-emerald-400">
        <Icon className="h-5 w-5" aria-hidden />
      </div>
      <div className="min-w-0 pt-0.5">
        <span className="block text-sm font-bold text-emerald-800 dark:text-emerald-200">
          {item.title}
        </span>
        <span className="mt-0.5 block text-sm leading-snug text-emerald-700/90 dark:text-emerald-300/90">
          {item.description}
        </span>
      </div>
    </Link>
  );
}

function MobileAccordion({
  label,
  eyebrow,
  items,
  pathname,
}: {
  label: string;
  eyebrow: string;
  items: MarketingMegaItem[];
  pathname: string;
}) {
  const [open, setOpen] = useState(false);
  const pathnameSafe = pathname;

  return (
    <div className="border-b border-border/55 last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left text-sm font-semibold text-text-primary"
        aria-expanded={open}
      >
        {label}
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-text-secondary transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden
        />
      </button>
      {open ? (
        <div className="border-t border-border/40 bg-surface/40 px-3 pb-3 pt-1">
          <p className="px-3 py-2 font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-emerald-700/90">
            {eyebrow}
          </p>
          <ul className="flex flex-col gap-0.5">
            {items.map((item) => {
              const active =
                pathnameSafe === item.href || pathnameSafe.startsWith(`${item.href}/`);
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`flex gap-3 rounded-xl px-3 py-2.5 text-sm ${
                      active
                        ? "bg-emerald-600/12 font-semibold text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-200"
                        : "text-emerald-800 hover:bg-emerald-50/90 dark:text-emerald-200 dark:hover:bg-emerald-950/40"
                    }`}
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
                      <Icon className="h-4 w-4" aria-hidden />
                    </span>
                    <span className="min-w-0">
                      <span className="block font-semibold text-emerald-800 dark:text-emerald-200">
                        {item.title}
                      </span>
                      <span className="mt-0.5 block text-xs leading-snug text-emerald-700/90 dark:text-emerald-300/90">
                        {item.description}
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

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
        <nav className="flex items-center gap-1.5 rounded-full border border-white/90 bg-white/90 px-2.5 py-2 shadow-soft ring-1 ring-black/[0.04] backdrop-blur-xl sm:gap-2 sm:px-3 sm:py-2.5 md:gap-3 md:px-5 md:py-2.5">
          <Link
            href="/"
            className="group relative min-w-0 shrink-0 pl-0.5 sm:pl-1 md:pl-0"
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
              {marketingTopNav.map((item) =>
                item.type === "link" ? (
                  <li key={item.href} className="shrink-0">
                    <Link
                      href={item.href}
                      className={desktopLinkClass(pathname === item.href)}
                    >
                      {item.label}
                    </Link>
                  </li>
                ) : (
                  <li key={item.label} className="group relative shrink-0">
                    <button
                      type="button"
                      className={`${desktopLinkClass(isPathActiveForMega(pathname, item.items))} cursor-pointer bg-transparent`}
                      aria-haspopup="true"
                      aria-expanded="false"
                    >
                      {item.label}
                      <ChevronDown
                        className="h-4 w-4 text-text-secondary/90 opacity-80"
                        aria-hidden
                      />
                    </button>
                    <MegaPanel eyebrow={item.sectionEyebrow} items={item.items} />
                  </li>
                ),
              )}
            </ul>
          </div>

          <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2 md:gap-3">
            <Button
              href="/booking"
              variant="primary"
              size="sm"
              className="!px-3 sm:!px-4 md:!px-5"
              aria-label="Book a growth call"
            >
              <span className="sm:hidden">Book call</span>
              <span className="hidden sm:inline xl:hidden">Book a call</span>
              <span className="hidden xl:inline">Book a growth call</span>
            </Button>
            <button
              type="button"
              onClick={() => setMobileOpen(!mobileOpen)}
              className="flex flex-col gap-1.5 rounded-full p-2 lg:hidden"
              aria-expanded={mobileOpen}
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
        className={`mx-auto mt-2 max-w-7xl overflow-hidden rounded-2xl border border-border/80 bg-white/95 shadow-soft-lg backdrop-blur-md transition-all lg:hidden ${
          mobileOpen ? "max-h-[min(85vh,40rem)] opacity-100" : "max-h-0 border-0 opacity-0"
        }`}
      >
        <div className="flex max-h-[min(85vh,40rem)] flex-col">
          <div className="shrink-0 p-3 pb-0">
            <Link
              href="/booking"
              className="block rounded-xl bg-accent px-4 py-3 text-center text-sm font-semibold text-white shadow-md"
            >
              Book a growth call
            </Link>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain py-2">
            {marketingTopNav.map((item) =>
              item.type === "link" ? (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`block px-4 py-3.5 text-sm font-medium ${
                    pathname === item.href
                      ? "bg-accent/10 font-semibold text-accent"
                      : "text-text-secondary hover:bg-surface"
                  }`}
                >
                  {item.label}
                </Link>
              ) : (
                <MobileAccordion
                  key={item.label}
                  label={item.label}
                  eyebrow={item.sectionEyebrow}
                  items={item.items}
                  pathname={pathname}
                />
              ),
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
