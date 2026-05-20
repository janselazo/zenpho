import Image from "next/image";
import Link from "next/link";
import {
  CelestialField,
  Sunburst,
} from "@/components/marketing/renaissance/RenaissanceArt";

/** Left column for auth routes — Renaissance navy promo (lg+ only). */
export default function AuthMarketingPanel() {
  const year = new Date().getFullYear();

  return (
    <>
      <CelestialField count={7} color="rgba(244,240,228,0.85)" accent="#E6D6A8" />

      <div className="auth-panel-inner">
        <Link href="/" className="auth-panel-brand">
          <Image
            src="/zenpho-logo.png"
            alt="Zenpho"
            width={140}
            height={36}
            priority
          />
        </Link>

        <div className="auth-panel-body">
          <div className="auth-panel-art">
            <Sunburst
              width={180}
              height={180}
              color="rgba(244,240,228,0.85)"
              accent="#F4E4B4"
              className="ra-float-slow"
            />
          </div>

          <h2 className="auth-panel-title">
            One Workspace for <em>Client Delivery</em>.
          </h2>

          <p className="auth-panel-lead">
            Sign in to manage pipeline, clients, projects, budgets, and reports
            from the CRM Zenpho uses every day.
          </p>

          <figure className="auth-panel-quote">
            <blockquote>
              &ldquo;Zenpho CRM keeps prospecting, client management, delivery, and
              reporting in one place, so every commission has a clear next
              step.&rdquo;
            </blockquote>
            <figcaption>Built by Zenpho · Used on every commission</figcaption>
          </figure>
        </div>

        <div className="auth-panel-footer">
          <span>© {year} Zenpho</span>
          <span>Secure session · TLS</span>
        </div>
      </div>
    </>
  );
}
