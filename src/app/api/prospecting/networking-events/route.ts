import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { searchNetworkingEvents } from "@/lib/crm/networking-events";
import type { NetworkingEvent } from "@/lib/crm/networking-events";

const MAX_CITY_LEN = 120;
const MAX_KEYWORD_LEN = 80;
const MAX_RANGE_DAYS = 90;

function isYmd(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

function parseYmdUtc(s: string): Date | null {
  if (!isYmd(s)) return null;
  const [y, m, d] = s.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (
    dt.getUTCFullYear() !== y ||
    dt.getUTCMonth() !== m - 1 ||
    dt.getUTCDate() !== d
  ) {
    return null;
  }
  return dt;
}

function daysBetweenInclusive(from: string, to: string): number {
  const a = parseYmdUtc(from);
  const b = parseYmdUtc(to);
  if (!a || !b) return Infinity;
  const diff = (b.getTime() - a.getTime()) / (24 * 60 * 60 * 1000);
  return Math.floor(diff) + 1;
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { error: "Unauthorized", events: [] as NetworkingEvent[] },
      { status: 401 }
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "agency_admin" && profile?.role !== "agency_member") {
    return NextResponse.json(
      { error: "Forbidden", events: [] as NetworkingEvent[] },
      { status: 403 }
    );
  }

  let body: {
    city?: string;
    dateFrom?: string;
    dateTo?: string;
    keyword?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON", events: [] as NetworkingEvent[] },
      { status: 400 }
    );
  }

  const city = String(body.city ?? "").trim();
  const dateFrom = String(body.dateFrom ?? "").trim();
  const dateTo = String(body.dateTo ?? "").trim();
  const keywordRaw = body.keyword != null ? String(body.keyword).trim() : undefined;

  if (!city || city.length > MAX_CITY_LEN) {
    return NextResponse.json(
      {
        error: `Enter a city (1–${MAX_CITY_LEN} characters).`,
        events: [] as NetworkingEvent[],
      },
      { status: 400 }
    );
  }

  if (!isYmd(dateFrom) || !isYmd(dateTo)) {
    return NextResponse.json(
      {
        error: "Use dateFrom and dateTo as YYYY-MM-DD.",
        events: [] as NetworkingEvent[],
      },
      { status: 400 }
    );
  }

  const fromD = parseYmdUtc(dateFrom);
  const toD = parseYmdUtc(dateTo);
  if (!fromD || !toD || fromD > toD) {
    return NextResponse.json(
      {
        error: "dateFrom must be on or before dateTo.",
        events: [] as NetworkingEvent[],
      },
      { status: 400 }
    );
  }

  const span = daysBetweenInclusive(dateFrom, dateTo);
  if (span > MAX_RANGE_DAYS) {
    return NextResponse.json(
      {
        error: `Choose a range of at most ${MAX_RANGE_DAYS} days.`,
        events: [] as NetworkingEvent[],
      },
      { status: 400 }
    );
  }

  if (keywordRaw !== undefined && keywordRaw.length > MAX_KEYWORD_LEN) {
    return NextResponse.json(
      {
        error: `Keyword must be at most ${MAX_KEYWORD_LEN} characters.`,
        events: [] as NetworkingEvent[],
      },
      { status: 400 }
    );
  }

  const apiKey = process.env.TICKETMASTER_API_KEY?.trim();

  const result = await searchNetworkingEvents(
    {
      city,
      dateFrom,
      dateTo,
      ...(keywordRaw !== undefined ? { keyword: keywordRaw } : {}),
    },
    { ticketmasterApiKey: apiKey }
  );

  return NextResponse.json({
    events: result.events,
    ...(result.warning ? { warning: result.warning } : {}),
    ...(result.detail ? { detail: result.detail } : {}),
  });
}
