"use client";

import CrmComingSoonPage from "@/components/crm/CrmComingSoonPage";
import {
  PLACEHOLDER_PAGE_COPY,
  type PlaceholderPageKey,
} from "@/lib/crm/placeholder-pages";

export default function CrmPlaceholderRoute({ pageKey }: { pageKey: PlaceholderPageKey }) {
  return <CrmComingSoonPage {...PLACEHOLDER_PAGE_COPY[pageKey]} />;
}
