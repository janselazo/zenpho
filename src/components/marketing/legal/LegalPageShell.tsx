import type { ReactNode } from "react";
import Link from "next/link";

export function LegalPageShell({
  title,
  effective,
  intro,
  children,
}: {
  title: string;
  effective: string;
  intro: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="section section-light legal-page">
      <div className="shell legal-page-shell">
        <header className="legal-page-head">
          <div className="eyebrow">Legal</div>
          <h1 className="legal-page-title">{title}</h1>
          <p className="legal-page-intro">
            Effective date: {effective}. {intro}
          </p>
        </header>
        <div className="legal-doc">
          <div className="legal-prose">{children}</div>
        </div>
      </div>
    </section>
  );
}

export function LegalSection({
  id,
  title,
  children,
}: {
  id?: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="legal-section">
      <h2>{title}</h2>
      {children}
    </section>
  );
}

export function LegalLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  if (href.startsWith("mailto:") || href.startsWith("tel:")) {
    return (
      <a href={href} className="legal-link">
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className="legal-link">
      {children}
    </Link>
  );
}

export function LegalCallout({ children }: { children: ReactNode }) {
  return <div className="legal-callout">{children}</div>;
}
