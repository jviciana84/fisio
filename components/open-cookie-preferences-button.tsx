"use client";

import { Button } from "@/components/ui/button";

export function OpenCookiePreferencesButton({ className }: { className?: string }) {
  return (
    <Button
      type="button"
      variant="outline"
      className={className}
      onClick={() => {
        window.dispatchEvent(new CustomEvent("frb:open-cookie-settings"));
      }}
    >
      Cambiar preferencias de cookies
    </Button>
  );
}
