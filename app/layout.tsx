import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { getGoogleBusinessRating } from "@/lib/google-business-rating";
import {
  HOME_DESCRIPTION,
  HOME_KEYWORDS,
  PUBLIC_BRAND,
  SITE_URL,
  buildPublicJsonLdGraph,
  homeMetadata,
} from "@/lib/seo-public";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${PUBLIC_BRAND} | Fisioterapia en Terrassa, Roc Blanc y Vallès Occidental`,
    template: `%s | ${PUBLIC_BRAND}`,
  },
  description: HOME_DESCRIPTION,
  keywords: HOME_KEYWORDS,
  robots: { index: true, follow: true },
  authors: [{ name: PUBLIC_BRAND, url: SITE_URL }],
  creator: PUBLIC_BRAND,
  category: "health",
  ...homeMetadata,
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f1f5f9" },
    { media: "(prefers-color-scheme: dark)", color: "#0f172a" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const ratingInfo = await getGoogleBusinessRating();
  const jsonLd = buildPublicJsonLdGraph({
    aggregateRating:
      ratingInfo.source !== "default"
        ? {
            ratingValue: ratingInfo.rating.toFixed(2),
            ...(ratingInfo.userRatingsTotal != null
              ? { reviewCount: ratingInfo.userRatingsTotal }
              : {}),
            bestRating: "5",
            worstRating: "1",
          }
        : null,
  });

  return (
    <html lang="es" className="bg-background scroll-smooth" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/apple-icon.png" />
        <link rel="manifest" href="/manifest.json" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className={`${inter.variable} font-sans antialiased`} suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
