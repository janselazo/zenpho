import { permanentRedirect } from "next/navigation";

/** Clients UI lives under Leads → Clients tab; keep /clients for bookmarks and links. */
export default function ClientsPage() {
  permanentRedirect("/leads?section=clients");
}
