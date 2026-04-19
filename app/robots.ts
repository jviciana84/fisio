import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo-public";

/**
 * Genera `/robots.txt`. Importante: nunca usar `disallow: "/"` (bloquearía todo el sitio).
 * Las rutas privadas van en `disallow`; el resto queda permitido con `allow: "/"`.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/dashboard", "/login", "/onboarding", "/api/"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: new URL(SITE_URL).host,
  };
}
