"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Camera, QrCode, ScanLine } from "lucide-react";
import { Button } from "@/components/ui/button";

type ConsumeResult = {
  bonoId: string;
  uniqueCode: string;
  productName: string;
  sessionsRemaining: number;
  sessionsTotal: number;
  expiresAt: string;
  clientName: string | null;
  emailStatus: "not_sent" | "sent" | "smtp_not_configured" | "failed";
};

type Msg = { type: "ok" | "err"; text: string } | null;

export function BonoConsumePanel() {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<Msg>(null);
  const [result, setResult] = useState<ConsumeResult | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const scannerRef = useRef<unknown>(null);
  const scannerRegionId = "bono-qr-reader-region";

  const canConsume = useMemo(() => code.trim().length > 0 && !loading, [code, loading]);

  async function consume(source: "manual" | "qr") {
    if (!code.trim()) return;
    setLoading(true);
    setMessage(null);
    setResult(null);
    try {
      const res = await fetch("/api/admin/bonos/consume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim(), source }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        message?: string;
        result?: ConsumeResult;
      };
      if (!res.ok || !data.ok || !data.result) {
        setMessage({ type: "err", text: data.message ?? "No se pudo consumir la sesión." });
        return;
      }
      setResult(data.result);
      setMessage({ type: "ok", text: "Sesión de bono consumida correctamente." });
    } catch {
      setMessage({ type: "err", text: "Error de red al consumir sesión." });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!scannerOpen) return;
    let cancelled = false;

    void (async () => {
      try {
        const mod = await import("html5-qrcode");
        if (cancelled) return;
        const Html5Qrcode = mod.Html5Qrcode;
        const scanner = new Html5Qrcode(scannerRegionId, { verbose: false });
        scannerRef.current = scanner;
        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 220, height: 220 } },
          (decodedText: string) => {
            setCode(decodedText);
            setScannerOpen(false);
            void consume("qr");
          },
          () => {
            // Ignorar frames sin QR.
          },
        );
      } catch {
        setMessage({
          type: "err",
          text: "No se pudo iniciar la cámara. Puedes consumir el bono manualmente.",
        });
        setScannerOpen(false);
      }
    })();

    return () => {
      cancelled = true;
      const scanner = scannerRef.current as
        | {
            stop: () => Promise<void>;
            clear: () => Promise<void> | void;
          }
        | null;
      if (scanner) {
        void scanner
          .stop()
          .catch(() => undefined)
          .finally(() => {
            void Promise.resolve(scanner.clear()).catch(() => undefined);
            scannerRef.current = null;
          });
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scannerOpen]);

  return (
    <section className="glass-inner mt-4 rounded-2xl border border-white/65 bg-gradient-to-r from-white/85 to-cyan-50/45 p-4 ring-1 ring-blue-100/60">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-700">Bonos</p>
          <h3 className="text-base font-semibold text-slate-900">Consumir sesión</h3>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setScannerOpen((v) => !v)}
          className="inline-flex items-center gap-1.5"
        >
          <Camera className="h-4 w-4" aria-hidden />
          {scannerOpen ? "Cerrar cámara" : "Lector QR"}
        </Button>
      </div>

      {scannerOpen ? (
        <div className="mt-3 rounded-xl border border-cyan-200 bg-white p-3">
          <p className="mb-2 text-xs text-slate-600">Apunta la cámara al QR del bono.</p>
          <div id={scannerRegionId} className="min-h-[260px] w-full overflow-hidden rounded-lg border border-slate-200" />
        </div>
      ) : null}

      <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-700">Código / contenido QR</span>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="BONO-xxxxxx o texto leído del QR"
            className="w-full rounded-xl border border-blue-100/90 bg-white/95 px-4 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </label>
        <div className="flex items-end">
          <Button
            type="button"
            variant="gradient"
            disabled={!canConsume}
            onClick={() => void consume("manual")}
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl sm:w-auto"
          >
            <ScanLine className="h-4 w-4" aria-hidden />
            {loading ? "Procesando…" : "Consumir manual"}
          </Button>
        </div>
      </div>

      {message ? (
        <p
          className={`mt-3 rounded-lg px-3 py-2 text-xs ${
            message.type === "ok"
              ? "border border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border border-rose-200 bg-rose-50 text-rose-800"
          }`}
        >
          {message.text}
        </p>
      ) : null}

      {result ? (
        <div className="mt-3 rounded-xl border border-cyan-200 bg-cyan-50/60 p-3 text-xs text-slate-800">
          <p className="font-semibold text-slate-900">
            {result.clientName ?? "Cliente"} · {result.productName}
          </p>
          <p className="mt-1">
            Código <span className="font-semibold">{result.uniqueCode}</span>
          </p>
          <p>
            Sesiones restantes:{" "}
            <span className="font-semibold">
              {result.sessionsRemaining}/{result.sessionsTotal}
            </span>
          </p>
          <p>Caduca: {new Date(`${result.expiresAt}T12:00:00`).toLocaleDateString("es-ES")}</p>
          <p className="mt-1">
            Email:{" "}
            {result.emailStatus === "sent"
              ? "enviado al cliente y copia a clínica"
              : result.emailStatus === "smtp_not_configured"
                ? "no enviado (SMTP no configurado)"
                : result.emailStatus === "failed"
                  ? "falló el envío"
                  : "no enviado"}
          </p>
        </div>
      ) : null}

      <p className="mt-2 inline-flex items-center gap-1 text-[11px] text-slate-500">
        <QrCode className="h-3.5 w-3.5" aria-hidden />
        Si el lector falla, usa el campo manual.
      </p>
    </section>
  );
}
