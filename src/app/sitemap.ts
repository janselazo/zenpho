import type { MetadataRoute } from "next";
import { blogPosts } from "@/lib/marketing/blog-posts";
import { marketingSolutionSlugs } from "@/lib/marketing/solution-offering-data";
import { serviceDetailSlugs } from "@/lib/marketing/service-detail-content";
import { siteUrl } from "@/lib/marketing/seo";

const now = new Date();

function entry(
  path: string,
  priority: number,
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"] = "monthly",
  lastModified: Date | string = now,
): MetadataRoute.Sitemap[number] {
  return {
    url: siteUrl(path),
    lastModified,
    changeFrequency,
    priority,
  };
}

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    entry("/", 1, "weekly"),
    entry("/services", 0.95, "monthly"),
    ...serviceDetailSlugs().map((slug) => entry(`/services/${slug}`, 0.9, "monthly")),
    ...marketingSolutionSlugs.map((slug) => entry(`/solutions/${slug}`, 0.85, "monthly")),
    entry("/pricing", 0.85, "monthly"),
    entry("/case-studies", 0.8, "monthly"),
    entry("/studio", 0.75, "monthly"),
    entry("/about", 0.75, "monthly"),
    entry("/contact", 0.85, "monthly"),
    entry("/booking", 0.65, "monthly"),
    entry("/blog", 0.7, "weekly"),
    ...blogPosts.map((post) =>
      entry(`/blog/${post.slug}`, 0.65, "monthly", post.date),
    ),
    entry("/tools/business-audit", 0.75, "monthly"),
    entry("/privacy", 0.2, "yearly"),
    entry("/terms", 0.2, "yearly"),
  ];
}
