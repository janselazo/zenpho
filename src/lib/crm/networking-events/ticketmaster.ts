/**
 * Ticketmaster Discovery API v2 — event catalog skews toward ticketed entertainment;
 * many small B2B networking meetups will not appear. Meetup or a second source can be added later.
 *
 * @see https://developer.ticketmaster.com/products-and-docs/apis/discovery-api/v2/
 */

import type { NetworkingEvent, NetworkingSearchInput, NetworkingSearchResult } from "./types";

const DISCOVERY_EVENTS = "https://app.ticketmaster.com/discovery/v2/events.json";

type TmEvent = {
  id?: string;
  name?: string;
  url?: string;
  dates?: {
    start?: {
      dateTime?: string;
      localDate?: string;
      localTime?: string;
    };
  };
  _embedded?: {
    venues?: Array<{
      name?: string;
      city?: { name?: string };
    }>;
  };
  promoter?: { name?: string };
  promoters?: Array<{ name?: string }>;
  attractions?: Array<{ name?: string }>;
};

type TmDiscoveryResponse = {
  _embedded?: { events?: TmEvent[] };
  page?: { totalElements?: number };
};

function firstStartIso(e: TmEvent): string | null {
  const d = e.dates?.start;
  if (d?.dateTime) return d.dateTime;
  if (d?.localDate) {
    if (d.localTime) return `${d.localDate}T${d.localTime}`;
    return `${d.localDate}T12:00:00`;
  }
  return null;
}

function venueName(e: TmEvent): string | null {
  const v = e._embedded?.venues?.[0];
  return v?.name?.trim() || null;
}

function organizerName(e: TmEvent): string | null {
  if (e.promoter?.name?.trim()) return e.promoter.name.trim();
  const p = e.promoters?.[0]?.name?.trim();
  if (p) return p;
  const a = e.attractions?.[0]?.name?.trim();
  return a || null;
}

function mapEvent(e: TmEvent, cityEcho: string): NetworkingEvent | null {
  const id = e.id?.trim();
  const title = e.name?.trim();
  if (!id || !title) return null;
  return {
    id,
    title,
    start: firstStartIso(e),
    venueName: venueName(e),
    city: cityEcho,
    organizerName: organizerName(e),
    url: e.url?.trim() || null,
  };
}

export async function searchTicketmasterEvents(
  apiKey: string,
  input: NetworkingSearchInput
): Promise<NetworkingSearchResult> {
  const keyword = (input.keyword ?? "networking").trim() || "networking";
  const city = input.city.trim();

  const params = new URLSearchParams({
    apikey: apiKey,
    city,
    keyword,
    size: "30",
    page: "0",
    sort: "date,asc",
  });

  // Inclusive calendar range → UTC day bounds
  params.set("startDateTime", `${input.dateFrom}T00:00:00Z`);
  params.set("endDateTime", `${input.dateTo}T23:59:59Z`);

  const url = `${DISCOVERY_EVENTS}?${params.toString()}`;

  const res = await fetch(url, {
    method: "GET",
    headers: { Accept: "application/json" },
    next: { revalidate: 0 },
  });

  if (!res.ok) {
    const text = await res.text();
    return {
      events: [],
      warning: `Ticketmaster returned ${res.status}. Check API key and quotas.`,
      detail: text.slice(0, 300),
    };
  }

  const data = (await res.json()) as TmDiscoveryResponse;
  const raw = data._embedded?.events ?? [];
  const events = raw
    .map((e) => mapEvent(e, city))
    .filter((x): x is NetworkingEvent => x !== null);

  return { events };
}
