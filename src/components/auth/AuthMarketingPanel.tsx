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
            Atelier of <em>new media.</em>
          </h2>

          <p className="auth-panel-lead">
            Sign in to commission, review, and ship the work in progress —
            websites, applications, and campaigns drafted by Zenpho.
          </p>

          <figure className="auth-panel-quote">
            <blockquote>
              &ldquo;Zenpho gave us a single workshop for our website, our store,
              and our pipeline. We respond faster and finally see which work
              earns the booking.&rdquo;
            </blockquote>
            <figcaption>Marcus V. · Lakeside Property Care</figcaption>
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
