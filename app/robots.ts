import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

// Crawl the whole public map; keep bots out of the moderation console and the
// JSON APIs. Points crawlers at the generated sitemap.
export default function robots(): MetadataRoute.Robots {
  const base = siteUrl();
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/api"],
    },
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
