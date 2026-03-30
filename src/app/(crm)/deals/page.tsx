import { permanentRedirect } from "next/navigation";

/** Deals UI lives under Leads → Deals tab; keep /deals for bookmarks and links. */
export default function DealsPage() {
  permanentRedirect("/leals?section=deals");
}
