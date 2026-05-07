import Image from "next/image";
import Link from "next/link";
import {
  CalendarClock,
  Inbox,
  Shield,
  ShoppingBag,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { experienceStats } from "@/lib/data";

const FEATURES = [
  {
    id: "leads",
    title: "Smart lead capture",
    body: "Web, phone, forms, and referrals in one inbox.",
    Icon: Inbox,
  },
  {
    id: "appointments",
    title: "Appointments & pipeline",
    body: "Inquiry through booked job with fewer dropped follow-ups.",
    Icon: CalendarClock,
  },
  {
    id: "reviews-roi",
    title: "Reviews, referrals & ROI",
    body: "Grow word-of-mouth and see what marketing earns revenue.",
    Icon: TrendingUp,
  },
  {
    id: "store",
    title: "Zenpho Store",
    body: "Cards, apparel, print, and marketing materials on demand.",
    Icon: ShoppingBag,
  },
];

/** Left column for auth routes — lg+ only; mobile uses form column brand bar. */
export default function AuthMarketingPanel() {
  const year = new Date().getFullYear();
  const statRow = experienceStats.slice(0, 3);

  return (
    <div className="relative flex min-h-[min(100vh,900px)] flex-1 flex-col overflow-hidden bg-[#060a12] lg:min-h-screen">
      {/* Radial glow */}
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(59,130,246,0.18),transparent_55%),radial-gradient(ellipse_60%_45%_at_80%_90%,rgba(16,185,129,0.1),transparent_50%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(255,255,255,0.04),transparent_70%)]"
        aria-hidden
      />

      <div className="relative z-10 flex min-h-[min(100vh,900px)] flex-1 flex-col px-8 py-10 lg:min-h-screen lg:px-12 lg:py-12">
        <Link href="/" className="inline-flex w-fit shrink-0 items-center gap-2">
          <Image
            src="/zenpho-logo.png"
            alt="Zenpho"
            width={140}
            height={38}
            className="h-9 w-auto brightness-0 invert"
            priority
          />
        </Link>

        <div className="mx-auto mt-10 flex w-full max-w-xl flex-1 flex-col items-center text-center lg:mt-14 lg:max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/50 bg-emerald-500/10 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-400 sm:text-xs">
            <Sparkles className="h-3.5 w-3.5 shrink-0 text-emerald-400" aria-hidden />
            The #1 toolkit for local businesses
          </div>

          <h2 className="mt-8 text-4xl font-black leading-[1.08] tracking-tight text-white sm:text-5xl lg:text-[3.25rem] lg:leading-[1.06]">
            Everything in one flow.
            <span className="mt-1 block bg-gradient-to-r from-sky-300 via-teal-400 to-emerald-400 bg-clip-text text-transparent">
              From hello to booked.
            </span>
          </h2>

          <p className="mt-6 max-w-lg text-base leading-relaxed text-slate-400 sm:text-lg">
            Everything you need to capture leads, schedule appointments, close work, and grow
            referrals — in one workspace built for local owners.
          </p>

          <div className="mt-10 grid w-full max-w-lg grid-cols-3 gap-6 sm:gap-10">
            {statRow.map((s) => (
              <div key={s.label} className="text-center">
                <p className="text-2xl font-bold tabular-nums text-white sm:text-3xl">{s.value}</p>
                <p className="mt-1 text-[11px] font-medium leading-snug text-slate-500 sm:text-xs">
                  {s.label}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-12 grid w-full gap-3 text-left sm:grid-cols-2 sm:gap-4">
            {FEATURES.map(({ id, title, body, Icon }) => (
              <div
                key={id}
                className="rounded-2xl border border-white/[0.08] bg-slate-900/50 p-4 backdrop-blur-sm sm:p-4"
              >
                <div className="flex gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-blue-500/25 bg-blue-500/10 text-blue-400">
                    <Icon className="h-5 w-5" strokeWidth={1.35} aria-hidden />
                  </span>
                  <div className="min-w-0 pt-0.5">
                    <p className="text-sm font-semibold text-white">{title}</p>
                    <p className="mt-1 text-xs leading-relaxed text-slate-400">{body}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <blockquote className="mt-8 w-full max-w-xl rounded-2xl border border-white/[0.08] bg-slate-900/40 p-5 text-left backdrop-blur-sm lg:mt-10">
            <p className="text-sm italic leading-relaxed text-slate-300">
              &ldquo;Zenpho put web leads, phone calls, and referrals in{" "}
              <span className="font-semibold not-italic text-emerald-400">one workspace</span>. We
              respond faster and finally see which marketing brings real booked jobs—not just
              clicks.&rdquo;
            </p>
            <footer className="mt-5 flex items-center gap-3 border-t border-white/10 pt-4">
              <span
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-base font-bold text-white"
                aria-hidden
              >
                M
              </span>
              <div className="min-w-0">
                <p className="truncate font-semibold text-white">Marcus V.</p>
                <p className="truncate text-xs text-slate-400">Owner, Lakeside Property Care</p>
              </div>
            </footer>
          </blockquote>
        </div>

        <footer className="mt-12 flex shrink-0 flex-col gap-3 border-t border-white/[0.06] pt-8 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between lg:mt-14">
          <p>© {year} Zenpho. All rights reserved.</p>
          <p className="flex items-center gap-2 text-slate-500">
            <Shield className="h-4 w-4 shrink-0 text-slate-500" aria-hidden />
            Secure authentication
          </p>
        </footer>
      </div>
    </div>
  );
}
