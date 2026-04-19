import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo-public";

/** Genera `/sitemap.xml`; enlázalo en Search Console / Bing. URLs canónicas (sin `#`). */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    {
      url: SITE_URL,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${SITE_URL}/reservar`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.9,
    },
  ];
}
