import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Reservar cita online",
  description:
    "Elige día y hora para tu cita en Fisioterapia Roc Blanc, Terrassa. Confirmación por correo.",
};

export default function ReservarLayout({ children }: { children: ReactNode }) {
  return children;
}
