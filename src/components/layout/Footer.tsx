import Image from "next/image";
import Link from "next/link";
import { marketingFooterColumns } from "@/lib/marketing-nav";
import { Ornament } from "@/components/marketing/renaissance/Ornament";
import { FooterConnectIcon } from "@/components/layout/FooterConnectIcons";

function FooterColumnLink({
  link,
}: {
  link: (typeof marketingFooterColumns)[number]["links"][number];
}) {
  if (link.icon) {
    const className = "site-footer-connect-icon";
    if (link.external) {
      return (
        <a
          href={link.href}
          className={className}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={link.label}
        >
          <FooterConnectIcon icon={link.icon} />
        </a>
      );
    }
    return (
      <a href={link.href} className={className} aria-label={link.label}>
        <FooterConnectIcon icon={link.icon} />
      </a>
    );
  }

  if (link.external) {
    return (
      <a
        href={link.href}
        target="_blank"
        rel="noopener noreferrer"
      >
        {link.label}
      </a>
    );
  }

  if (link.href.startsWith("mailto:") || link.href.startsWith("tel:")) {
    return <a href={link.href}>{link.label}</a>;
  }

  return <Link href={link.href}>{link.label}</Link>;
}

const appLoginHref =
  process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "") ||
  "https://app.zenpho.com";

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="shell">
        <div className="site-footer-top">
          <div className="site-footer-brand">
            <Link href="/" className="brand brand-light" aria-label="Zenpho — home">
              <Image
                src="/marketing/logo-white.png"
                alt="Zenpho"
                width={160}
                height={32}
                className="brand-logo"
              />
            </Link>
            <p className="site-footer-tag">
              Websites, web apps, mobile apps and ad creatives — from discovery
              and UX through build, deploy and hand-off.
            </p>
            <div className="site-footer-actions">
              <Link href="/contact" className="btn-primary">
                Book a free build call <span className="btn-arrow">↗</span>
              </Link>
              <a
                href={`${appLoginHref}/login`}
                className="btn-ghost"
              >
                Login
              </a>
            </div>
          </div>

          <div className="site-footer-cols">
            {marketingFooterColumns.map((col) => (
              <div key={col.heading} className="site-footer-col">
                <h5>{col.heading}</h5>
                {col.links.some((link) => link.icon) ? (
                  <div className="site-footer-connect-icons">
                    {col.links.map((link) => (
                      <FooterColumnLink key={link.href} link={link} />
                    ))}
                  </div>
                ) : (
                  col.links.map((link) => (
                    <FooterColumnLink key={link.href} link={link} />
                  ))
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="site-footer-fleuron">
          <Ornament
            variant="fleuron"
            width={120}
            height={24}
            color="rgba(244,240,228,.4)"
          />
        </div>

        <div className="site-footer-bottom">
          <div>© MMXXVI · Zenpho · MVP Development Agency</div>
          <div className="site-footer-legal">
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
