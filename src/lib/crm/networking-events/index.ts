/**
 * Facade for networking event search. Currently uses Ticketmaster only;
 * merge in Meetup or other providers here without changing the route/UI types.
 */

import { searchTicketmasterEvents } from "./ticketmaster";
import type {
  NetworkingSearchInput,
  NetworkingSearchResult,
} from "./types";

export type { NetworkingEvent, NetworkingSearchInput, NetworkingSearchResult } from "./types";

export async function searchNetworkingEvents(
  input: NetworkingSearchInput,
  options: { ticketmasterApiKey: string | undefined }
): Promise<NetworkingSearchResult> {
  const key = options.ticketmasterApiKey?.trim();
  if (!key) {
    return {
      events: [],
      warning:
        "Set TICKETMASTER_API_KEY in .env.local (Ticketmaster Developer Portal) to search events.",
    };
  }

  return searchTicketmasterEvents(key, input);
}
