import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://fisioterapiarocblanc.es"),
  title: {
    default: "Fisioterapia Roc Blanc | Centro de Fisioterapia en Terrassa, Barcelona",
    template: "%s | Fisioterapia Roc Blanc",
  },
  description:
    "Centro de fisioterapia profesional en Terrassa, Barcelona. Tratamientos personalizados de fisioterapia deportiva, traumatología, neurorehabilitación y más. +15 años de experiencia. Pide cita: 938 08 50 56",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f1f5f9" },
    { media: "(prefers-color-scheme: dark)", color: "#0f172a" },
  ],
  width: "device-width",
  initialScale: 1,
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Physiotherapy",
  "@id": "https://fisioterapiarocblanc.es",
  name: "Fisioterapia Roc Blanc",
  image: "https://fisioterapiarocblanc.es/logo-roc-blanc.jpg",
  description:
    "Centro de fisioterapia profesional en Terrassa, Barcelona. Tratamientos personalizados de fisioterapia deportiva, traumatología, neurorehabilitación y más.",
  url: "https://fisioterapiarocblanc.es",
  telephone: "+34938085056",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
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
