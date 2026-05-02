import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  CalendarClock,
  Inbox,
  ShoppingBag,
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
    footerLink: { href: "/store", label: "Visit Store" },
  },
];

/** Left column for auth routes — lg+ only; mobile uses form column brand bar. */
export default function AuthMarketingPanel() {
  const year = new Date().getFullYear();
  const statRow = experienceStats.slice(0, 3);

  const trustLine = statRow
    .map((s) => `${s.value} ${s.label.toLowerCase()}`)
    .join(" · ");

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

        <div className="mt-14 max-w-xl lg:mt-16">
          <h2 className="text-3xl font-black leading-tight tracking-tight text-white sm:text-4xl lg:text-[2.35rem] lg:leading-[1.12]">
            The #1 sales toolkit for local businesses
          </h2>
          <p className="mt-5 text-lg font-medium leading-snug text-slate-300 sm:text-xl">
            One workspace for leads, bookings, referrals, and marketing ROI—built for local owners.
          </p>
        </div>

        <p className="mt-7 text-xs font-medium leading-relaxed tracking-wide text-slate-400 sm:text-sm">
          {trustLine}
        </p>

        <div className="mt-12 grid gap-3 sm:grid-cols-2 sm:gap-3.5">
          {FEATURES.map(({ id, title, body, Icon, footerLink }) => (
            <div
              key={id}
              className="rounded-2xl border border-white/10 bg-white/[0.06] p-3.5 backdrop-blur-sm sm:p-3"
            >
              <div className="flex gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/20 text-accent">
                  <Icon className="h-4.5 w-4.5" strokeWidth={2} aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white">{title}</p>
                  <p className="mt-0.5 text-xs leading-snug text-slate-400">{body}</p>
                  {footerLink ? (
                    <Link
                      href={footerLink.href}
                      className="mt-2 inline-flex min-h-9 items-center gap-1 py-1 text-sm font-semibold text-accent hover:underline"
                    >
                      {footerLink.label}
                      <ArrowRight className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    </Link>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <p className="relative z-10 mt-14 text-xs text-slate-500 lg:mt-16">
        © {year} Zenpho. All rights reserved.
      </p>
    </div>
  );
}
