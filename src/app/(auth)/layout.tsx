import Link from "next/link";
import Image from "next/image";
import AuthMarketingPanel from "@/components/auth/AuthMarketingPanel";

export const metadata = {
  robots: { index: false, follow: false },
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <aside className="relative hidden min-h-0 w-full lg:flex">
        <AuthMarketingPanel />
      </aside>

      <div className="flex min-h-screen flex-1 flex-col bg-white">
        <div className="flex flex-1 flex-col px-6 py-10 sm:px-8 lg:px-14 lg:py-16">
          <div className="mb-8 lg:hidden">
            <Link href="/" className="inline-flex items-center gap-2">
              <Image
                src="/zenpho-logo.png"
                alt="Zenpho"
                width={120}
                height={32}
                className="h-8 w-auto"
                priority
              />
            </Link>
          </div>

          <div className="flex flex-1 flex-col justify-center">
            <div className="mx-auto w-full max-w-md">{children}</div>
          </div>

          <p className="mt-10 text-center text-xs text-text-secondary lg:mt-14">
            <Link href="/" className="text-accent hover:underline">
              ← Back to site
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
