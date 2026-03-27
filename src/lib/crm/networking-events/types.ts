/**
 * Provider-agnostic networking event row for Prospecting → Networking.
 * Add Meetup (or others) by mapping into this shape in `index.ts`.
 */

export type NetworkingEvent = {
  id: string;
  title: string;
  /** ISO 8601 start date/time when available */
  start: string | null;
  venueName: string | null;
  /** Echo of search city (or best-known locality) */
  city: string;
  organizerName: string | null;
  url: string | null;
};

export type NetworkingSearchInput = {
  city: string;
  /** Inclusive range, `YYYY-MM-DD` */
  dateFrom: string;
  dateTo: string;
  /** Defaults to "networking" in the API layer if omitted */
  keyword?: string;
};

export type NetworkingSearchResult = {
  events: NetworkingEvent[];
  /** Non-fatal message (e.g. missing API key, provider notice) */
  warning?: string;
  /** Short error detail for debugging (never secrets) */
  detail?: string;
};
