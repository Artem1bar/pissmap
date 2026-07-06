import type { MetadataRoute } from "next";
import { siteUrl, spotPath } from "@/lib/site";
import { SPOTS } from "@/lib/spots";

// Every crawlable URL: the map, the growth/marketing pages, and all 412 spot
// permalinks. /admin and /api are excluded here and blocked in robots.ts.
export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();

  const core: MetadataRoute.Sitemap = [
    { url: `${base}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/press`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/partners`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/partners/pitch`, changeFrequency: "yearly", priority: 0.4 },
    { url: `${base}/stickers`, changeFrequency: "yearly", priority: 0.3 },
  ];

  const spots: MetadataRoute.Sitemap = SPOTS.map((spot) => ({
    url: `${base}${spotPath(spot.id)}`,
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  return [...core, ...spots];
}
