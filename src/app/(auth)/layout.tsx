export const metadata = {
  title: "Sign in",
  robots: { index: false, follow: false },
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-border bg-white p-8 shadow-soft">
        {children}
      </div>
      <p className="mt-6 text-center text-xs text-text-secondary">
        <a href="/" className="text-accent hover:underline">
          ← Back to site
        </a>
      </p>
    </div>
  );
}
