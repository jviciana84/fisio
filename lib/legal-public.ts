/**
 * Rutas y datos públicos para textos legales y enlaces en formularios.
 * Sustituye los campos marcados como pendientes cuando los tengas definitivos.
 */
export const LEGAL_PATHS = {
  privacy: "/politica-privacidad",
  legalNotice: "/aviso-legal",
  bookingPaymentCancel: "/condiciones-reserva-pago-cancelacion",
  cookies: "/politica-cookies",
} as const;

export const PUBLIC_LEGAL_IDENTITY = {
  brand: "Fisioterapia Roc Blanc",
  email: "fisioterapia.rocblanc@gmail.com",
  phoneDisplay: "938 08 50 56",
  phoneTel: "938085056",
  addressLines: ["Carrer de Pablo Iglesias, 24", "08224 Terrassa (Roc Blanc), Barcelona"],
  mapsQueryUrl: "https://maps.google.com/?q=Carrer+de+Pablo+Iglesias+24+Terrassa",
  /** Pendiente: nombre completo del titular responsable */
  ownerFullName: "[Nombre y Apellidos del Responsable]",
  /** Pendiente: DNI o CIF */
  taxId: "[Tu DNI o CIF]",
  /** Pendiente: número de colegiado */
  collegiateNumber: "[Número]",
  /** Pendiente: comunidad autónoma del colegio */
  collegiateRegion: "[Comunidad Autónoma]",
  /** Pendiente: número Bizum para pagos */
  bizumNumber: "[Tu Número de Bizum]",
} as const;
