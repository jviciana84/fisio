import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ 
  subsets: ["latin"],
  display: 'swap',
  variable: '--font-inter'
});

export const metadata: Metadata = {
  metadataBase: new URL('https://fisioterapiarocblanc.es'),
  title: {
    default: 'Fisioterapia Roc Blanc | Centro de Fisioterapia en Terrassa, Barcelona',
    template: '%s | Fisioterapia Roc Blanc'
  },
  description: 'Centro de fisioterapia profesional en Terrassa, Barcelona. Tratamientos personalizados de fisioterapia deportiva, traumatología, neurorehabilitación y más. +15 años de experiencia. Pide cita: 938 08 50 56',
  keywords: [
    'fisioterapia Terrassa',
    'fisioterapeuta Terrassa',
    'centro de fisioterapia Barcelona',
    'fisioterapia deportiva',
    'rehabilitación Terrassa',
    'tratamiento dolor espalda',
    'fisioterapia traumatológica',
    'neurorehabilitación',
    'electroterapia',
    'fisioterapia geriátrica',
    'Roc Blanc fisioterapia'
  ],
  authors: [{ name: 'Fisioterapia Roc Blanc' }],
  creator: 'Fisioterapia Roc Blanc',
  publisher: 'Fisioterapia Roc Blanc',
  formatDetection: {
    email: true,
    address: true,
    telephone: true,
  },
  openGraph: {
    title: 'Fisioterapia Roc Blanc | Centro de Fisioterapia en Terrassa',
    description: 'Centro de fisioterapia profesional en Terrassa, Barcelona. Tratamientos personalizados con tecnología avanzada. Pide tu cita.',
    url: 'https://fisioterapiarocblanc.es',
    siteName: 'Fisioterapia Roc Blanc',
    locale: 'es_ES',
    type: 'website',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Fisioterapia Roc Blanc - Centro de Fisioterapia en Terrassa',
      }
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Fisioterapia Roc Blanc | Terrassa',
    description: 'Centro de fisioterapia profesional en Terrassa, Barcelona. Tratamientos personalizados.',
    images: ['/og-image.jpg'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  alternates: {
    canonical: 'https://fisioterapiarocblanc.es',
    languages: {
      'es-ES': 'https://fisioterapiarocblanc.es',
    },
  },
  category: 'health',
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f1f5f9' },
    { media: '(prefers-color-scheme: dark)', color: '#0f172a' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
}

// Schema.org Structured Data for Local Business
const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Physiotherapy',
  '@id': 'https://fisioterapiarocblanc.es',
  name: 'Fisioterapia Roc Blanc',
  image: 'https://fisioterapiarocblanc.es/logo-roc-blanc.jpg',
  description: 'Centro de fisioterapia profesional en Terrassa, Barcelona. Tratamientos personalizados de fisioterapia deportiva, traumatología, neurorehabilitación y más.',
  url: 'https://fisioterapiarocblanc.es',
  telephone: '+34938085056',
  address: {
    '@type': 'PostalAddress',
    streetAddress: 'Carrer de Pablo Iglesias, 24',
    addressLocality: 'Terrassa',
    addressRegion: 'Barcelona',
    postalCode: '08224',
    addressCountry: 'ES'
  },
  geo: {
    '@type': 'GeoCoordinates',
    latitude: 41.5630,
    longitude: 2.0085
  },
  openingHoursSpecification: [
    {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      opens: '09:00',
      closes: '13:00'
    },
    {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      opens: '15:00',
      closes: '21:00'
    }
  ],
  aggregateRating: {
    '@type': 'AggregateRating',
    ratingValue: '4.19',
    reviewCount: '50'
  },
  priceRange: '$$',
  areaServed: {
    '@type': 'City',
    name: 'Terrassa'
  },
  serviceType: [
    'Fisioterapia Deportiva',
    'Traumatología',
    'Neurorehabilitación',
    'Fisioterapia Cardíaca',
    'Electroterapia',
    'Fisioterapia Geriátrica'
  ],
  sameAs: [
    'https://www.google.com/maps/place/Fisioterapia+Roc+Blanc'
  ]
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" className="bg-background scroll-smooth">
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className={`${inter.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  )
}
