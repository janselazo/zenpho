import Link from "next/link";
import AuthMarketingPanel from "@/components/auth/AuthMarketingPanel";
import "@/styles/marketing.css";
import "@/styles/marketing-art.css";

export const metadata = {
  robots: { index: false, follow: false },
};

const marketingSiteHref =
  process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "") || "/";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const year = new Date().getFullYear();

  return (
    <div className="auth-shell">
      <aside className="marketing-page-bg dark auth-panel">
        <AuthMarketingPanel />
      </aside>

      <main className="marketing-page-bg auth-main">
        <div className="auth-main-top">
          <Link href={marketingSiteHref} className="auth-back-link">
            ← Back to site
          </Link>
        </div>

        <div className="auth-card-wrap">
          <div className="auth-card">{children}</div>
        </div>

        <div className="auth-bottom-bar">
          <span>
            © {year} Zenpho · Atelier of New Media ·{" "}
            <Link href={`${marketingSiteHref}/privacy`}>Privacy</Link> ·{" "}
            <Link href={`${marketingSiteHref}/terms`}>Terms</Link>
          </span>
        </div>
      </main>
    </div>
  );
}
