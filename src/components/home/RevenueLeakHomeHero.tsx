"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import RevenueLeakHeroSearch from "@/components/revenue-leak-audit/RevenueLeakHeroSearch";
import type { BusinessSearchResult } from "@/lib/revenue-leak-audit/types";

type SearchResponse = {
  ok: boolean;
  businesses?: BusinessSearchResult[];
  error?: string;
  warnings?: string[];
};

function InlineAlert({ message }: { message: string }) {
  return (
    <div className="mx-auto max-w-6xl px-4 pt-4 sm:px-6 lg:px-8">
      <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{message}</div>
    </div>
  );
}

export default function RevenueLeakHomeHero() {
  const router = useRouter();
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function goToAudit(result: BusinessSearchResult) {
    router.push(`/revenue?placeId=${encodeURIComponent(result.placeId)}`);
  }

  async function handleSearch(businessName: string) {
    if (businessName.trim().length < 2) {
      setError("Enter a business name.");
      return;
    }
    setSearching(true);
    setError(null);
    try {
      const res = await fetch("/api/revenue-leak-audit/business-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessName }),
      });
      const data = (await res.json()) as SearchResponse;
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Search failed.");
      const firstMatch = data.businesses?.[0];
      if (!firstMatch) {
        throw new Error("No Google Business Profile matches were found.");
      }
      goToAudit(firstMatch);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Search failed.");
    } finally {
      setSearching(false);
    }
  }

  return (
    <>
      <RevenueLeakHeroSearch
        variant="homepage"
        onSearch={handleSearch}
        onSelectBusiness={(r) => goToAudit(r)}
        searching={searching}
      />
      {error ? <InlineAlert message={error} /> : null}
    </>
  );
}
