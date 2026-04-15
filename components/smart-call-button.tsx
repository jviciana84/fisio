"use client"

import { useEffect, useState } from "react"
import { MessageCircle, Phone } from "lucide-react"
import { Button } from "@/components/ui/button"

const PHONE_TEL = "tel:938085056"
const PHONE_WHATSAPP = "https://wa.me/34938085056"

function isLikelyTablet(): boolean {
  if (typeof navigator === "undefined") return false
  const ua = navigator.userAgent

  if (/iPad|Tablet|PlayBook|SM-T\d| Kindle|Silk|\/Tab\b|\bTab[\/\s]/i.test(ua)) return true
  // Android sin "Mobile" en el UA suele ser tablet
  if (/Android/i.test(ua) && !/Mobile/i.test(ua)) return true
  // iPadOS puede figurar como Mac + multitouch
  if (
    /Macintosh|MacIntel/i.test(navigator.platform) &&
    navigator.maxTouchPoints > 1 &&
    !/iPhone|iPod/.test(ua)
  ) {
    return true
  }

  return false
}

function isLikelyPhone(): boolean {
  if (typeof navigator === "undefined") return false
  const ua = navigator.userAgent
  return /iPhone|iPod|Android.+Mobile|webOS|BlackBerry|IEMobile|Opera Mini/i.test(ua)
}

/**
 * Teléfono móvil pequeño (no tablet): marcador.
 * Tablet, PC y móvil ancho / ratón: WhatsApp.
 */
function prefersDialer(): boolean {
  if (typeof window === "undefined") return false
  if (isLikelyTablet()) return false
  if (!isLikelyPhone()) return false

  const narrow = window.matchMedia("(max-width: 480px)").matches
  const coarse = window.matchMedia("(pointer: coarse)").matches
  return narrow && coarse
}

type SmartCallButtonProps = {
  className?: string
}

export function SmartCallButton({ className }: SmartCallButtonProps) {
  const [useTel, setUseTel] = useState(false)

  useEffect(() => {
    setUseTel(prefersDialer())
  }, [])

  const href = useTel ? PHONE_TEL : PHONE_WHATSAPP
  const label = useTel ? "Llamar" : "WhatsApp"
  const external = !useTel

  return (
    <Button variant="outline" className={className} asChild>
      <a
        href={href}
        {...(external
          ? { target: "_blank", rel: "noopener noreferrer" }
          : {})}
        aria-label={
          useTel
            ? "Llamar al 938 08 50 56"
            : "Abrir WhatsApp para contactar con la clínica"
        }
      >
        {useTel ? (
          <Phone className="mr-2 w-4 h-4 shrink-0" />
        ) : (
          <MessageCircle className="mr-2 w-4 h-4 shrink-0" />
        )}
        {label}
      </a>
    </Button>
  )
}
