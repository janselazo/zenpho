import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  CalendarClock,
  Inbox,
  ShoppingBag,
  Star,
  TrendingUp,
} from "lucide-react";
import { experienceStats } from "@/lib/data";

const FEATURES = [
  {
    id: "leads",
    title: "Smart lead capture",
    body: "Capture and track leads from web, phone, forms, and referrals in one workspace.",
    Icon: Inbox,
  },
  {
    id: "appointments",
    title: "Appointments & pipeline",
    body: "See every opportunity from inquiry to booked job—without losing follow-ups.",
    Icon: CalendarClock,
  },
  {
    id: "reviews",
    title: "Reviews & referrals",
    body: "Grow reputation and word-of-mouth with structured review and referral workflows.",
    Icon: Star,
  },
  {
    id: "roi",
    title: "Channel ROI",
    body: "Know which marketing drives revenue—not just clicks.",
    Icon: TrendingUp,
  },
  {
    id: "store",
    title: "Zenpho Store",
    body: "Order business cards, T-shirts, marketing materials, and more for your business.",
    Icon: ShoppingBag,
    footerLink: { href: "/store", label: "Visit Store" },
  },
];

/** Left column for auth routes — lg+ only; mobile uses form column brand bar. */
export default function AuthMarketingPanel() {
  const year = new Date().getFullYear();
  const statRow = experienceStats.slice(0, 3);

  return (
    <div className="relative flex min-h-[min(100vh,900px)] flex-1 flex-col justify-between overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 px-8 py-10 lg:min-h-screen lg:px-12 lg:py-14">
      <div
        className="pointer-events-none absolute inset-0 opacity-90"
        aria-hidden
      >
        <div className="absolute -left-1/4 top-0 h-[420px] w-[420px] rounded-full bg-accent/20 blur-3xl" />
        <div className="absolute -right-1/4 bottom-0 h-[380px] w-[380px] rounded-full bg-blue-500/15 blur-3xl" />
      </div>

      <div className="relative z-10 flex flex-1 flex-col">
        <Link href="/" className="inline-flex w-fit items-center gap-2">
          <Image
            src="/zenpho-logo.png"
            alt="Zenpho"
            width={140}
            height={38}
            className="h-9 w-auto brightness-0 invert"
            priority
          />
        </Link>

        <div className="mt-12 max-w-xl">
          <h2 className="text-3xl font-black leading-tight tracking-tight text-white sm:text-4xl lg:text-[2.35rem] lg:leading-[1.12]">
            The #1 sales toolkits for local businesses
          </h2>
          <p className="mt-4 text-xl font-bold leading-snug text-white sm:text-2xl">
            Grow local revenue.
            <span className="text-accent"> See what works.</span>
          </p>
          <p className="mt-5 text-base leading-relaxed text-slate-300 lg:text-lg">
            Everything you need to generate leads, book appointments, earn reviews, grow referrals,
            and see which marketing channel produces revenue—in one platform built for local owners.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-3 gap-3 sm:gap-4">
          {statRow.map((s) => (
            <div
              key={s.label}
              className="rounded-2xl border border-white/10 bg-white/[0.06] px-3 py-4 text-center backdrop-blur-sm sm:px-4"
            >
              <p className="text-2xl font-black tabular-nums text-white sm:text-3xl">{s.value}</p>
              <p className="mt-1 text-[11px] font-medium leading-snug text-slate-400 sm:text-xs">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 grid gap-3 sm:grid-cols-2">
          {FEATURES.map(({ id, title, body, Icon, footerLink }) => (
            <div
              key={id}
              className="rounded-2xl border border-white/10 bg-white/[0.06] p-4 backdrop-blur-sm"
            >
              <div className="flex gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/20 text-accent">
                  <Icon className="h-5 w-5" strokeWidth={2} aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="font-semibold text-white">{title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-slate-400">{body}</p>
                  {footerLink ? (
                    <Link
                      href={footerLink.href}
                      className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-accent hover:underline"
                    >
                      {footerLink.label}
                      <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                    </Link>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <p className="relative z-10 mt-12 text-xs text-slate-500">
        © {year} Zenpho. All rights reserved.
      </p>
    </div>
  );
}
