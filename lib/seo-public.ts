import type { Metadata } from "next";

/** URL canónica del sitio público (sin barra final en paths salvo raíz). */
export const SITE_URL = "https://fisioterapiarocblanc.es" as const;

export const PUBLIC_BRAND = "Fisioterapia Roc Blanc";

/**
 * Descripción principal: local + servicios, redactada para buscadores sin perder legibilidad.
 * Incluye municipios del Vallès y términos habituales de búsqueda.
 */
export const HOME_DESCRIPTION =
  "Clínica de fisioterapia en el barrio de Roc Blanc, Terrassa (Vallès Occidental). Fisioterapia deportiva, recuperación muscular y lesiones, traumatología, acupuntura, suelo pélvico y readaptación. Atendemos pacientes de Viladecavalls, Rubí, Matadepera, Olesa de Montserrat, Vacarisses y zonas cercanas. Más de 15 años de experiencia. Tel. 938 08 50 56.";

export const HOME_KEYWORDS: string[] = [
  "fisioterapia Terrassa",
  "fisioterapia Roc Blanc",
  "fisioterapeuta Terrassa",
  "fisioterapia deportiva Terrassa",
  "fisioterapia Viladecavalls",
  "fisioterapia Rubí",
  "fisioterapia Matadepera",
  "fisioterapia Olesa",
  "fisioterapia Vacarisses",
  "acupuntura Terrassa",
  "suelo pélvico Terrassa",
  "recuperación muscular",
  "lesiones deportivas",
  "centro fisioterapia Vallès Occidental",
];

/** Municipios y zona para datos estructurados y coherencia de marca. */
export const AREAS_SERVED = [
  "Terrassa",
  "Roc Blanc",
  "Viladecavalls",
  "Rubí",
  "Matadepera",
  "Olesa de Montserrat",
  "Vacarisses",
] as const;

export const CLINIC_ADDRESS = {
  street: "Carrer de Pablo Iglesias, 24",
  locality: "Terrassa",
  region: "Barcelona",
  postalCode: "08224",
  country: "ES",
} as const;

/** Foto representativa de las instalaciones (OG/Twitter/Google). Subir `v=` si cambias el archivo. */
const OG_IMAGE_PATH = "/images/og-clinica-instalaciones.png?v=1";
const OG_IMAGE_WIDTH = 900;
const OG_IMAGE_HEIGHT = 675;
const OG_IMAGE_ALT =
  "Sala de fisioterapia y entrenamiento funcional en Fisioterapia Roc Blanc, Terrassa";

/** Logo de marca (JSON-LD secundario y coherencia con redes si hiciera falta). */
const SCHEMA_LOGO_IMAGE = "/og-social.jpg?v=2";

export function absoluteUrl(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${SITE_URL}${p}`;
}

/** Open Graph / Twitter de la home — el canonical `/` va en `app/page.tsx`. */
export const homeMetadata: Metadata = {
  openGraph: {
    type: "website",
    locale: "es_ES",
    url: SITE_URL,
    siteName: PUBLIC_BRAND,
    title: `${PUBLIC_BRAND} | Fisioterapia en Terrassa y Vallès Occidental`,
    description: HOME_DESCRIPTION,
    images: [
      {
        url: absoluteUrl(OG_IMAGE_PATH),
        width: OG_IMAGE_WIDTH,
        height: OG_IMAGE_HEIGHT,
        alt: OG_IMAGE_ALT,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${PUBLIC_BRAND} | Fisioterapia en Terrassa`,
    description: HOME_DESCRIPTION,
    images: [absoluteUrl(OG_IMAGE_PATH)],
  },
};

export const reservarMetadata: Metadata = {
  robots: { index: true, follow: true },
  title: "Reservar cita online",
  description:
    "Reserva tu cita de fisioterapia en Terrassa (Roc Blanc): elige día y hora online. Ideal si buscas fisioterapeuta cerca de Viladecavalls, Rubí, Matadepera, Olesa o Vacarisses. Confirmación por correo.",
  keywords: [
    "cita fisioterapia Terrassa",
    "reservar fisioterapeuta Terrassa",
    "fisioterapia Roc Blanc cita",
    ...HOME_KEYWORDS.slice(0, 6),
  ],
  alternates: { canonical: "/reservar" },
  openGraph: {
    type: "website",
    locale: "es_ES",
    url: absoluteUrl("/reservar"),
    siteName: PUBLIC_BRAND,
    title: `Reservar cita | ${PUBLIC_BRAND}`,
    description:
      "Elige día y hora para tu cita en Terrassa. Fisioterapia deportiva, recuperación, acupuntura y más.",
    images: [
      {
        url: absoluteUrl(OG_IMAGE_PATH),
        width: OG_IMAGE_WIDTH,
        height: OG_IMAGE_HEIGHT,
        alt: `${OG_IMAGE_ALT} — reservar cita`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `Reservar cita | ${PUBLIC_BRAND}`,
    description: "Cita online en Fisioterapia Roc Blanc, Terrassa.",
    images: [absoluteUrl(OG_IMAGE_PATH)],
  },
};

export type AggregateRatingLd = {
  ratingValue: string;
  reviewCount?: number;
  bestRating: string;
  worstRating: string;
};

const CLINIC_ID = `${SITE_URL}/#clinic`;
const WEBSITE_ID = `${SITE_URL}/#website`;

export function buildPublicJsonLdGraph(opts: { aggregateRating?: AggregateRatingLd | null }): Record<string, unknown> {
  const clinic: Record<string, unknown> = {
    "@type": "MedicalClinic",
    "@id": CLINIC_ID,
    name: PUBLIC_BRAND,
    url: SITE_URL,
    telephone: "+34938085056",
    image: [absoluteUrl(OG_IMAGE_PATH), absoluteUrl(SCHEMA_LOGO_IMAGE)],
    description: HOME_DESCRIPTION,
    address: {
      "@type": "PostalAddress",
      streetAddress: CLINIC_ADDRESS.street,
      addressLocality: CLINIC_ADDRESS.locality,
      addressRegion: CLINIC_ADDRESS.region,
      postalCode: CLINIC_ADDRESS.postalCode,
      addressCountry: CLINIC_ADDRESS.country,
    },
    areaServed: AREAS_SERVED.map((name) => {
      const label = name === "Roc Blanc" ? "Roc Blanc, Terrassa" : name;
      return { "@type": "City", name: label };
    }),
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        opens: "09:00",
        closes: "13:00",
      },
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        opens: "15:00",
        closes: "21:00",
      },
    ],
    medicalSpecialty: [
      "Fisioterapia",
      "Fisioterapia deportiva",
      "Traumatología",
      "Acupuntura",
      "Rehabilitación del suelo pélvico",
    ],
    knowsAbout: [
      "Fisioterapia deportiva",
      "Recuperación muscular",
      "Traumatología",
      "Acupuntura",
      "Suelo pélvico",
      "Electroterapia",
      "Neurorehabilitación",
    ],
  };

  if (opts.aggregateRating) {
    clinic.aggregateRating = {
      "@type": "AggregateRating",
      ...opts.aggregateRating,
    };
  }

  const website: Record<string, unknown> = {
    "@type": "WebSite",
    "@id": WEBSITE_ID,
    url: `${SITE_URL}/`,
    name: PUBLIC_BRAND,
    inLanguage: "es-ES",
    publisher: { "@id": CLINIC_ID },
    about: { "@id": CLINIC_ID },
  };

  return {
    "@context": "https://schema.org",
    "@graph": [clinic, website],
  };
}
