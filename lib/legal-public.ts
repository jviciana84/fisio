/**
 * Rutas y datos públicos para textos legales y enlaces en formularios.
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
  ownerFullName: "Ana Esther Catalán Calvo",
  taxId: "46401182Q",
  /** Número de teléfono asociado a Bizum para pagos indicados en condiciones de reserva. */
  bizumNumber: "687 54 97 32",
} as const;
