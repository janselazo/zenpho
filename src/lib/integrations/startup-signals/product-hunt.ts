import type {
  StartupSignalAdapterContext,
  StartupSignalAdapterResult,
} from "@/lib/crm/startup-signal-types";
import {
  contextKeywords,
  domainFromUrl,
  fetchJson,
  setupWarning,
  stableId,
} from "@/lib/integrations/startup-signals/utils";

type ProductHuntResponse = {
  data?: {
    posts?: {
      edges?: {
        node?: {
          id?: string;
          name?: string;
          tagline?: string;
          url?: string;
          website?: string;
          createdAt?: string;
          user?: { name?: string; url?: string };
        };
      }[];
    };
  };
  errors?: { message?: string }[];
};

export async function searchProductHuntSignals(
  ctx: StartupSignalAdapterContext
): Promise<StartupSignalAdapterResult> {
  const token = process.env.PRODUCT_HUNT_ACCESS_TOKEN?.trim();
  if (!token) {
    return setupWarning(
      "product_hunt",
      "PRODUCT_HUNT_ACCESS_TOKEN",
      "Product Hunt launch signals"
    );
  }

  const keyword = contextKeywords(ctx, "product_hunt")[0] ?? "";
  const res = await fetchJson<ProductHuntResponse>("https://api.producthunt.com/v2/api/graphql", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query: `
        query RecentPosts($first: Int!, $query: String) {
          posts(first: $first, order: NEWEST, query: $query) {
            edges {
              node {
                id
                name
                tagline
                url
                website
                createdAt
                user { name url }
              }
            }
          }
        }
      `,
      variables: { first: Math.min(20, ctx.filters.limit), query: keyword || null },
    }),
  });

  if (!res.ok) return { ok: false, warning: `Product Hunt: ${res.warning}` };
  if (res.data.errors?.length) {
    return {
      ok: false,
      warning: `Product Hunt: ${res.data.errors.map((e) => e.message).filter(Boolean).join("; ")}`,
    };
  }

  return {
    ok: true,
    hits: (res.data.data?.posts?.edges ?? []).flatMap((edge) => {
      const post = edge.node;
      if (!post?.name || !post.url) return [];
      const companyUrl = post.website ?? post.url;
      return [
        {
          source: "product_hunt",
          sourceLabel: "Product Hunt",
          channel: "launches",
          sourceItemId: post.id ?? stableId("product_hunt", post.url, post.name),
          title: `${post.name} launched on Product Hunt`,
          excerpt: post.tagline ?? null,
          url: post.url,
          authorName: post.user?.name ?? null,
          authorUrl: post.user?.url ?? null,
          company: post.name,
          companyDomain: domainFromUrl(companyUrl),
          postedAt: post.createdAt ?? null,
          rawPayload: post as Record<string, unknown>,
        },
      ];
    }),
  };
}
