import type {
  StartupSignalAdapterContext,
  StartupSignalAdapterResult,
} from "@/lib/crm/startup-signal-types";
import {
  contextKeywords,
  domainFromUrl,
  fetchJson,
  setupWarning,
  sinceDateIso,
  stableId,
} from "@/lib/integrations/startup-signals/utils";

type CrunchbaseSearchResponse = {
  entities?: {
    uuid?: string;
    properties?: Record<string, unknown>;
  }[];
};

function textProp(obj: Record<string, unknown>, key: string): string | null {
  const v = obj[key];
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

export async function searchCrunchbaseSignals(
  ctx: StartupSignalAdapterContext
): Promise<StartupSignalAdapterResult> {
  const key = process.env.CRUNCHBASE_API_KEY?.trim();
  if (!key) return setupWarning("crunchbase", "CRUNCHBASE_API_KEY", "Crunchbase funding signals");

  const keywords = contextKeywords(ctx, "crunchbase").slice(0, 5).join(" ");
  const res = await fetchJson<CrunchbaseSearchResponse>(
    "https://api.crunchbase.com/api/v4/searches/organizations",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-cb-user-key": key,
      },
      body: JSON.stringify({
        field_ids: [
          "identifier",
          "short_description",
          "website_url",
          "rank_org",
          "last_funding_at",
          "last_funding_type",
          "last_funding_total",
        ],
        order: [{ field_id: "last_funding_at", sort: "desc" }],
        query: [
          {
            type: "predicate",
            field_id: "last_funding_at",
            operator_id: "gte",
            values: [sinceDateIso(ctx).slice(0, 10)],
          },
          ...(keywords
            ? [
                {
                  type: "predicate",
                  field_id: "short_description",
                  operator_id: "contains",
                  values: [keywords],
                },
              ]
            : []),
        ],
        limit: ctx.filters.limit,
      }),
    }
  );

  if (!res.ok) return { ok: false, warning: `Crunchbase: ${res.warning}` };

  return {
    ok: true,
    hits: (res.data.entities ?? []).map((entity) => {
      const p = entity.properties ?? {};
      const identifier = p.identifier as { value?: string; permalink?: string } | undefined;
      const name = identifier?.value ?? textProp(p, "name") ?? "Crunchbase funding signal";
      const url =
        textProp(p, "website_url") ??
        (identifier?.permalink
          ? `https://www.crunchbase.com/organization/${identifier.permalink}`
          : "https://www.crunchbase.com/");
      const stage = textProp(p, "last_funding_type");
      const date = textProp(p, "last_funding_at");
      return {
        source: "crunchbase",
        sourceLabel: "Crunchbase",
        channel: "funding",
        sourceItemId: entity.uuid ?? stableId("crunchbase", url, name),
        title: stage ? `${name} raised ${stage}` : `${name} has a recent funding signal`,
        excerpt: textProp(p, "short_description"),
        url,
        authorName: null,
        authorUrl: null,
        company: name,
        companyDomain: domainFromUrl(url),
        postedAt: date ? new Date(date).toISOString() : null,
        rawPayload: p,
      };
    }),
  };
}
