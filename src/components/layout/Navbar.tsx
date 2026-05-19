"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  marketingTopNav,
  isMarketingTopNavLinkActive,
  type MarketingMegaItem,
  type MarketingTopNavItem,
} from "@/lib/marketing-nav";

type OpenMenu = string | null;

function megaContainsPath(items: MarketingMegaItem[], pathname: string) {
  return items.some(
    (i) => pathname === i.href || pathname.startsWith(`${i.href}/`),
  );
}

export default function Navbar() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [openDesktop, setOpenDesktop] = useState<OpenMenu>(null);
  const [openMobileMenu, setOpenMobileMenu] = useState(false);
  const navRef = useRef<HTMLElement | null>(null);

  // Match shared.jsx: scrolled state after 80px.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close desktop dropdowns when clicking outside.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const target = e.target as Node | null;
      if (target && navRef.current && !navRef.current.contains(target)) {
        setOpenDesktop(null);
      }
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  // Close mobile menu on route change.
  useEffect(() => {
    setOpenMobileMenu(false);
    setOpenDesktop(null);
  }, [pathname]);

  return (
    <nav ref={navRef} className={`nav ${scrolled ? "scrolled" : ""}`}>
      <div className="nav-inner">
        <Link href="/" className="brand" aria-label="Zenpho — home">
          <Image
            src="/marketing/logo-white.png"
            alt="Zenpho"
            width={140}
            height={28}
            className="brand-logo"
            priority
          />
        </Link>

        <div className="nav-links">
          {marketingTopNav.map((item) =>
            item.type === "link" ? (
              <Link
                key={item.href}
                href={item.href}
                className={
                  isMarketingTopNavLinkActive(pathname, item.href) ? "active" : ""
                }
              >
                {item.label}
              </Link>
            ) : (
              <DesktopMega
                key={item.label}
                item={item}
                pathname={pathname}
                open={openDesktop === item.label}
                onToggle={() =>
                  setOpenDesktop((curr) =>
                    curr === item.label ? null : item.label,
                  )
                }
                onClose={() => setOpenDesktop(null)}
              />
            ),
          )}
        </div>

        <Link href="/contact" className="nav-cta">
          Book a call
        </Link>

        <button
          type="button"
          className="nav-burger"
          aria-label="Toggle menu"
          aria-expanded={openMobileMenu}
          onClick={() => setOpenMobileMenu((v) => !v)}
        >
          <span />
          <span />
          <span />
        </button>
      </div>

      {openMobileMenu ? <MobileMenu pathname={pathname} /> : null}
    </nav>
  );
}

function DesktopMega({
  item,
  pathname,
  open,
  onToggle,
  onClose,
}: {
  item: Extract<MarketingTopNavItem, { type: "mega" }>;
  pathname: string;
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
}) {
  const isActive = megaContainsPath(item.items, pathname);
  return (
    <div className={`nav-menu ${open ? "open" : ""}`}>
      <button
        type="button"
        className={`nav-link-btn ${isActive ? "active" : ""}`}
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        aria-haspopup="true"
        aria-expanded={open}
      >
        {item.label} <span className="nav-caret">▾</span>
      </button>
      <div className="nav-dropdown">
        <div className="nav-dropdown-label">{item.sectionEyebrow}</div>
        {item.items.map((sub) => {
          const active =
            pathname === sub.href || pathname.startsWith(`${sub.href}/`);
          return (
            <Link
              key={sub.href}
              href={sub.href}
              className={active ? "active" : ""}
              onClick={onClose}
            >
              <b>{sub.title}</b>
              <span>{sub.description}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function MobileMenu({ pathname }: { pathname: string }) {
  const [openSections, setOpenSections] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    for (const item of marketingTopNav) {
      const key = mobileSectionKey(item);
      const active =
        item.type === "link"
          ? isMarketingTopNavLinkActive(pathname, item.href)
          : megaContainsPath(item.items, pathname);
      if (active) initial.add(key);
    }
    return initial;
  });

  const toggleSection = (key: string) => {
    setOpenSections((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <div className="nav-mobile">
      {marketingTopNav.map((item) => {
        const key = mobileSectionKey(item);
        const open = openSections.has(key);
        const title = item.type === "mega" ? item.sectionEyebrow : item.label;
        const isActive =
          item.type === "link"
            ? isMarketingTopNavLinkActive(pathname, item.href)
            : megaContainsPath(item.items, pathname);

        return (
          <div
            key={key}
            className={`nav-mobile-section${open ? " open" : ""}${isActive ? " active" : ""}`}
          >
            <button
              type="button"
              className="nav-mobile-section-toggle"
              aria-expanded={open}
              onClick={() => toggleSection(key)}
            >
              {title}
              <span className="nav-mobile-caret" aria-hidden>
                ▾
              </span>
            </button>
            <div className="nav-mobile-section-panel">
              <div className="nav-mobile-section-panel-inner">
                {item.type === "mega" ? (
                  item.items.map((sub) => {
                    const active =
                      pathname === sub.href || pathname.startsWith(`${sub.href}/`);
                    return (
                      <Link
                        key={sub.href}
                        href={sub.href}
                        className={
                          active ? "nav-mobile-link active" : "nav-mobile-link"
                        }
                      >
                        <b>{sub.title}</b>
                        <span>{sub.description}</span>
                      </Link>
                    );
                  })
                ) : (
                  <Link
                    href={item.href}
                    className={
                      isMarketingTopNavLinkActive(pathname, item.href)
                        ? "nav-mobile-link active"
                        : "nav-mobile-link"
                    }
                  >
                    <b>{item.label}</b>
                  </Link>
                )}
              </div>
            </div>
          </div>
        );
      })}
      <Link href="/contact" className="nav-mobile-cta">
        Book a call
      </Link>
    </div>
  );
}

function mobileSectionKey(item: MarketingTopNavItem) {
  return item.type === "link" ? item.href : item.label;
}
