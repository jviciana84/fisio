"use client";

import { forwardRef, useCallback, useRef, useState, type RefObject } from "react";
import { toCanvas } from "html-to-image";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { Copy, FileDown, FileImage, Loader2, Mail, Send, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Logo/marca de agua corporativa (texto oscuro → en la tarjeta oscura se invierte para verse sutil). */
const CORPORATE_WATERMARK_SRC = "/images/watermark-logo-frb3-texto-oscuro.svg";

/** Texto neutro si compartimos sin adjunto (mailto / wa.no link no permite PDF). */
const BRAND = "Fisioterapia Roc Blanc";

/**
 * Multiplicador de píxeles en capturas (JPEG/PNG/PDF raster).
 * Antes acotábamos a ~2; subir a ~3–4.5 duplica o más el lienzo respecto a eso y aguanta ampliar el archivo.
 */
const BONO_EXPORT_PIXEL_RATIO_MIN = 3;
const BONO_EXPORT_PIXEL_RATIO_MAX = 4.5;

function resolveBonoExportPixelRatio(): number {
  if (typeof window === "undefined") return BONO_EXPORT_PIXEL_RATIO_MIN;
  const dpr = window.devicePixelRatio || 1.5;
  return Math.min(BONO_EXPORT_PIXEL_RATIO_MAX, Math.max(BONO_EXPORT_PIXEL_RATIO_MIN, dpr * 2));
}

export type BonoPrettyCardData = {
  id: string;
  uniqueCode: string;
  productName: string;
  sessionsTotal: number;
  sessionsRemaining: number;
  expiresAt: string;
  clientName?: string | null;
  /** Opcional: pre-relleno en “Compartir por email”. */
  clientEmail?: string | null;
  /** Opcional: abrir WhatsApp al número correcto cuando exista. */
  clientPhone?: string | null;
  qrDataUrl: string | null;
};

function statusPill(sessionsRemaining: number, expiresAt: string) {
  const today = new Date();
  const end = new Date(`${expiresAt}T23:59:59`);
  if (sessionsRemaining <= 0) {
    return { text: "Agotado", cls: "bg-slate-200 text-slate-700" };
  }
  if (end.getTime() < today.getTime()) {
    return { text: "Caducado", cls: "bg-rose-100 text-rose-700" };
  }
  const days = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (days <= 30) {
    return { text: `Caduca en ${days} día${days === 1 ? "" : "s"}`, cls: "bg-amber-100 text-amber-800" };
  }
  return { text: "Activo", cls: "bg-emerald-100 text-emerald-700" };
}

function expiresLabel(isoDate: string) {
  return new Date(`${isoDate}T12:00:00`).toLocaleDateString("es-ES");
}

function bonoPdfFilename(bono: BonoPrettyCardData) {
  const safe = (bono.uniqueCode || "bono").replace(/[^a-zA-Z0-9-_]/g, "_").slice(0, 48);
  return `bono-${safe}.pdf`;
}

/**
 * Solo dígitos; si tiene 9 cifras (móvil ES) anteponemos 34 como fallback razonable.
 */
function whatsappDialDigits(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;
  const d = raw.replace(/\D/g, "");
  if (!d) return null;
  if (d.startsWith("00")) return d.replace(/^00/, "") || null;
  if (d.length === 9) return `34${d}`;
  return d;
}

function formatBonoShareText(bono: BonoPrettyCardData) {
  const lines = [
    `📋 *Bono — ${BRAND}*`,
    "",
    `*Producto:* ${bono.productName}`,
    `*Código:* ${bono.uniqueCode}`,
    bono.clientName?.trim() ? `*Cliente:* ${bono.clientName.trim()}` : null,
    `*Sesiones:* ${bono.sessionsRemaining} de ${bono.sessionsTotal} pendientes`,
    `*Caducidad:* ${expiresLabel(bono.expiresAt)}`,
    "",
    "Presenta este código o el QR PDF en recepción para usar el bono.",
    "Para enviar foto y texto: móvil «Compartir» o WhatsApp después de descargar la imagen/PDF. El enlace wa.me solo rellena texto.",
  ];
  return lines.filter(Boolean).join("\n");
}

function formatEmailShareBodyPlain(bono: BonoPrettyCardData) {
  const lines = [
    `Bono — ${BRAND}`,
    "",
    `Producto: ${bono.productName}`,
    `Código: ${bono.uniqueCode}`,
    bono.clientName?.trim() ? `Cliente: ${bono.clientName.trim()}` : null,
    `Sesiones pendientes: ${bono.sessionsRemaining} de ${bono.sessionsTotal}`,
    `Caducidad: ${expiresLabel(bono.expiresAt)}`,
    "",
    "Presenta este código en recepción o usa el PDF/imagen.",
    "",
    "Para enviar el QR por correo usa en el panel «Email con QR» (adjunto real). Este borrador desde el navegador no adjunta archivos.",
    "",
    "---",
    `Nombre sugerido del archivo: «${bonoPdfFilename(bono)}»`,
  ];
  return lines.filter(Boolean).join("\n");
}

function mailtoHref(bono: BonoPrettyCardData) {
  const to = (bono.clientEmail ?? "").trim();
  const subject = `Tu bono ${bono.uniqueCode} — ${BRAND}`;
  const body = formatEmailShareBodyPlain(bono);
  const prefix = to ? `mailto:${to}` : "mailto:";
  return `${prefix}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function whatsappHref(bono: BonoPrettyCardData) {
  const text = formatBonoShareText(bono);
  const phone = whatsappDialDigits(bono.clientPhone);
  if (phone && phone.length >= 10) {
    return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
  }
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

function triggerMailto(url: string) {
  const a = document.createElement("a");
  a.href = url;
  a.rel = "noopener noreferrer";
  a.target = "_blank";
  a.click();
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function isAbortError(e: unknown) {
  return e && typeof e === "object" && "name" in e && (e as { name?: string }).name === "AbortError";
}

/**
 * Solo se aplica al clon para html2canvas / html-to-image (no cambia cómo ves el modal).
 * Panel opaco + texto blanco para que PDF/JPEG/PNG salgan legibles donde el raster fallaba antes.
 */
function prepareScreenshotClone(clonedRoot: HTMLElement, wmDataUrl: string | null) {
  clonedRoot.style.color = "#ffffff";

  clonedRoot.querySelectorAll("[data-bono-export-ignore]").forEach((el) => {
    el.parentElement?.removeChild(el);
  });
  clonedRoot.querySelectorAll<HTMLElement>("[data-bono-capture-hide]").forEach((el) => {
    el.style.display = "none";
  });

  clonedRoot.querySelectorAll<HTMLElement>("[data-bono-status-pill]").forEach((el) => {
    const cn = `${el.className}`;
    let bg = "#e2e8f0";
    let fg = "#334155";
    if (cn.includes("emerald")) {
      bg = "#d1fae5";
      fg = "#047857";
    } else if (cn.includes("amber")) {
      bg = "#fef3c7";
      fg = "#92400e";
    } else if (cn.includes("rose")) {
      bg = "#ffe4e6";
      fg = "#9f1239";
    }
    el.style.backgroundColor = bg;
    el.style.color = fg;
    el.style.setProperty("-webkit-print-color-adjust", "exact");
    el.style.printColorAdjust = "exact";
  });

  clonedRoot.querySelectorAll<HTMLElement>("[data-bono-capture-readable]").forEach((el) => {
    el.style.backgroundColor = "#0c1525";
    el.style.borderRadius = "11px";
    el.style.boxShadow = "inset 0 1px 0 rgba(255,255,255,0.07)";
    el.style.outline = "1px solid rgba(255,255,255,0.22)";
    el.style.outlineOffset = "0px";
    el.querySelectorAll("p, h3").forEach((n) => {
      if (!(n instanceof HTMLElement)) return;
      if (n.closest("[data-bono-status-pill]")) return;
      n.style.color = "#ffffff";
      n.style.setProperty("-webkit-text-fill-color", "#ffffff");
      n.querySelectorAll("span").forEach((s) => {
        if (s instanceof HTMLElement && !s.closest("[data-bono-status-pill]")) {
          s.style.color = "#ffffff";
          s.style.setProperty("-webkit-text-fill-color", "#ffffff");
        }
      });
    });
  });

  clonedRoot.querySelectorAll<HTMLElement>("[data-bono-watermark]").forEach((el) => {
    el.style.filter = "none";
    el.style.setProperty("-webkit-filter", "none");
    if (wmDataUrl) {
      const safe = wmDataUrl.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
      el.style.backgroundImage = `url("${safe}")`;
    }
    el.style.opacity = "0.08";
    el.style.mixBlendMode = "normal";
  });
}

function canvasLooksUsable(c: HTMLCanvasElement | null): c is HTMLCanvasElement {
  return !!(c && c.width >= 2 && c.height >= 2);
}

/**
 * ¿El raster parece llevar contenido real (pastilla, QR, texto)?
 * Umbral alto (210+) descartaba capturas válidas donde el texto/QR llega más apag tras html-to-image/html2canvas.
 * Un lienzo sólo #0c1525 ronda max(R,G,B)≈37; el outline apenas ~65–85.
 */
function bonoRasterLooksNonEmpty(c: HTMLCanvasElement): boolean {
  const ctx = c.getContext("2d");
  if (!ctx || c.width < 8 || c.height < 8) return false;
  const w = c.width;
  const h = c.height;
  const stepX = Math.max(1, Math.floor(w / 42));
  const stepY = Math.max(1, Math.floor(h / 36));
  let peak = 0;
  let brightGe172 = 0;
  let brightGe195 = 0;
  for (let y = 1; y < h - 1; y += stepY) {
    for (let x = 1; x < w - 1; x += stepX) {
      const d = ctx.getImageData(x, y, 1, 1).data;
      const m = Math.max(d[0], d[1], d[2]);
      peak = Math.max(peak, m);
      if (m >= 172) brightGe172++;
      if (m >= 195) brightGe195++;
    }
  }
  if (peak >= 118) return true;
  return brightGe195 >= 3 || brightGe172 >= 5;
}

/** Tamaño válido + no monocolor tipo “panel muerto”; admite texto raster algo suavizado. */
function acceptBonoCaptureCanvas(c: HTMLCanvasElement | null): c is HTMLCanvasElement {
  return !!(canvasLooksUsable(c) && bonoRasterLooksNonEmpty(c));
}

/**
 * Captura prioritaria con clon **en este documento**: Tailwind/CSS siguen aplicando (html2canvas sobre el
 * artículo en modal suele usar un documento hijo donde `querySelector` en onclone no recibe tus clases igual).
 */
async function captureFullCardToCanvas(articleEl: HTMLElement): Promise<HTMLCanvasElement | null> {
  await document.fonts.ready.catch(() => undefined);

  const wm = await getLightWatermarkDataUrl();
  const pixelRatio = resolveBonoExportPixelRatio();

  const baseH2c = {
    scale: pixelRatio,
    useCORS: true,
    allowTaint: false,
    logging: false,
    backgroundColor: "#0f172a",
    imageTimeout: 25_000,
  } as const;

  /** html2canvas a veces pasa el nodo clonado como 2º arg; hay que usarlo en lugar del `document` iframe. */
  const onPrepareLiveCapture = (doc: Document, maybeRoot?: HTMLElement) => {
    let root: HTMLElement | null = null;
    if (maybeRoot instanceof HTMLElement) {
      root = maybeRoot.matches("[data-bono-capture-root]") ? maybeRoot : maybeRoot.closest("[data-bono-capture-root]");
    }
    if (!root) root = doc.querySelector("[data-bono-capture-root]") as HTMLElement | null;
    if (root) prepareScreenshotClone(root, wm);
  };

  /** Clon pintable bajo la ventana (`opacity`=1 siempre); no encima ni detrás raro del modal. */
  const detachedCloneCapture = async (): Promise<HTMLCanvasElement | null> => {
    const clone = articleEl.cloneNode(true) as HTMLElement;
    const rect = articleEl.getBoundingClientRect();
    const wPx = Math.max(1, Math.round(rect.width || articleEl.offsetWidth));
    const hFromOriginal = Math.max(
      1,
      Math.round(rect.height || articleEl.offsetHeight || articleEl.clientHeight),
    );

    clone.style.boxSizing = "border-box";
    clone.style.position = "fixed";
    clone.style.margin = "0";
    clone.style.width = `${wPx}px`;
    clone.style.height = "auto";
    clone.style.maxHeight = "none";
    clone.style.overflow = "visible";
    clone.style.left = "16px";
    clone.style.top = `${typeof window !== "undefined" ? window.innerHeight + 96 : 0}px`;
    clone.style.zIndex = "2147483646";
    clone.style.opacity = "1";
    clone.style.pointerEvents = "none";
    clone.style.visibility = "visible";
    clone.style.transform = "none";

    document.body.appendChild(clone);
    await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));

    prepareScreenshotClone(clone, wm);
    void clone.offsetHeight;
    const hPx = Math.max(hFromOriginal, Math.round(clone.offsetHeight || hFromOriginal));

    try {
      try {
        const cSvg = await toCanvas(clone, {
          width: wPx,
          height: hPx,
          backgroundColor: "#0f172a",
          pixelRatio,
          cacheBust: true,
        });
        if (acceptBonoCaptureCanvas(cSvg)) return cSvg;
      } catch {
        /* continuar */
      }

      for (const fo of [true, false] as const) {
        let c: HTMLCanvasElement | null = null;
        try {
          c = await html2canvas(clone, { ...baseH2c, foreignObjectRendering: fo });
        } catch {
          c = null;
        }
        if (acceptBonoCaptureCanvas(c)) return c;
      }
    } finally {
      clone.remove();
    }

    return null;
  };

  /** Clon preparado + svg/canvas (html-to-image) suele llevar mejor texto/QR que html2canvas sólo. */
  let canvas = await detachedCloneCapture();
  if (acceptBonoCaptureCanvas(canvas)) return canvas;

  /** Tarjeta visible en el modal (onclone prepara sólo-copy). */
  for (const fo of [true, false] as const) {
    let c: HTMLCanvasElement | null = null;
    try {
      c = await html2canvas(articleEl, {
        ...baseH2c,
        foreignObjectRendering: fo,
        onclone: onPrepareLiveCapture,
      });
    } catch {
      c = null;
    }
    if (acceptBonoCaptureCanvas(c)) return c;
  }

  /** HTML-to-image sobre el mismo nodo que ves (sin clon fuera): a veces pasa filtros donde html2canvas falla la calidad. */
  try {
    const rect = articleEl.getBoundingClientRect();
    const wPx = Math.max(1, Math.round(rect.width || articleEl.offsetWidth));
    const hPx = Math.max(1, Math.round(rect.height || articleEl.offsetHeight));
    const raw = await toCanvas(articleEl, {
      width: wPx,
      height: hPx,
      backgroundColor: "#0f172a",
      pixelRatio,
      cacheBust: true,
    });
    if (acceptBonoCaptureCanvas(raw)) return raw;
  } catch {
    /* continuar */
  }

  return null;
}

async function captureBonoCanvas(articleEl: HTMLElement): Promise<HTMLCanvasElement | null> {
  return captureFullCardToCanvas(articleEl);
}

function bonoPngFilename(bono: BonoPrettyCardData) {
  return bonoPdfFilename(bono).replace(/\.pdf$/i, ".png");
}

function bonoJpegFilename(bono: BonoPrettyCardData) {
  return bonoPdfFilename(bono).replace(/\.pdf$/i, ".jpg");
}

/** Marca de agua clara (mismo SVG que en pantalla) para PDF vectorial de respaldo; resultado cacheado. */
let lightWatermarkDataUrlCache: string | null | undefined;

async function getLightWatermarkDataUrl(): Promise<string | null> {
  if (lightWatermarkDataUrlCache !== undefined) return lightWatermarkDataUrlCache;
  if (typeof window === "undefined") {
    lightWatermarkDataUrlCache = null;
    return null;
  }
  try {
    const src = `${window.location.origin}${CORPORATE_WATERMARK_SRC}`;
    const img = new Image();
    img.crossOrigin = "anonymous";
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("wm"));
      img.src = src;
    });
    const nw = img.naturalWidth || 400;
    const nh = img.naturalHeight || 320;
    const maxSide = 640;
    const sc = Math.min(1, maxSide / Math.max(nw, nh));
    const cw = Math.max(1, Math.round(nw * sc));
    const ch = Math.max(1, Math.round(nh * sc));
    const c = document.createElement("canvas");
    c.width = cw;
    c.height = ch;
    const ctx = c.getContext("2d");
    if (!ctx) {
      lightWatermarkDataUrlCache = null;
      return null;
    }
    ctx.clearRect(0, 0, cw, ch);
    ctx.save();
    ctx.filter = "brightness(0) invert(1)";
    ctx.globalAlpha = 0.15;
    ctx.drawImage(img, 0, 0, cw, ch);
    ctx.restore();
    const dataUrl = c.toDataURL("image/png");
    lightWatermarkDataUrlCache = dataUrl;
    return dataUrl;
  } catch {
    lightWatermarkDataUrlCache = null;
    return null;
  }
}

/**
 * PDF de una sola página: mismas dimensiones en px que el lienzo capturado (1:1 con lo que ves),
 * sin márgenes ni reescalado a A4 (evita que “cambie” respecto a la tarjeta en pantalla).
 *
 * Embebemos **JPEG** (misma recodificación que la descarga .jpg): `addImage` con PNG desde canvas
 * a veces reinterpreta alpha/premultiplicado y los blancos salen **azulados**; el JPEG no.
 */
async function snapshotBonoPdfBlob(articleEl: HTMLElement): Promise<Blob | null> {
  const canvas = await captureBonoCanvas(articleEl);
  if (!canvas) return null;

  const w = canvas.width;
  const h = canvas.height;

  const pdf = new jsPDF({
    unit: "px",
    format: [w, h],
    orientation: w >= h ? "landscape" : "portrait",
    compress: false,
    hotfixes: ["px_scaling"],
  });

  const pw = pdf.internal.pageSize.getWidth();
  const ph = pdf.internal.pageSize.getHeight();

  const jpegQ = 0.93;
  let embedded = false;
  try {
    const jpegData = canvas.toDataURL("image/jpeg", jpegQ);
    if (jpegData.startsWith("data:image/jpeg") && jpegData.length > 200) {
      try {
        pdf.addImage(jpegData, "JPEG", 0, 0, pw, ph, undefined, "NONE");
        embedded = true;
      } catch {
        try {
          pdf.addImage(jpegData, "JPEG", 0, 0, pw, ph, undefined, "SLOW");
          embedded = true;
        } catch {
          /* continuar a PNG */
        }
      }
    }
  } catch {
    /* continuar a PNG */
  }

  if (!embedded) {
    try {
      pdf.addImage(canvas, "PNG", 0, 0, pw, ph, undefined, "NONE");
      embedded = true;
    } catch {
      let imgData: string;
      try {
        imgData = canvas.toDataURL("image/png");
      } catch {
        return null;
      }
      if (!imgData || imgData.length < 200 || imgData === "data:,") return null;
      try {
        pdf.addImage(imgData, "PNG", 0, 0, pw, ph, undefined, "NONE");
        embedded = true;
      } catch {
        try {
          pdf.addImage(imgData, "PNG", 0, 0, pw, ph, undefined, "SLOW");
          embedded = true;
        } catch {
          return null;
        }
      }
    }
  }

  if (!embedded) return null;

  try {
    return pdf.output("blob");
  } catch {
    return null;
  }
}

async function snapshotBonoPngBlob(articleEl: HTMLElement): Promise<Blob | null> {
  const canvas = await captureBonoCanvas(articleEl);
  if (!canvas) return null;
  return new Promise((resolve) => {
    try {
      canvas.toBlob((b) => resolve(b && b.size > 80 ? b : null), "image/png", 0.92);
    } catch {
      resolve(null);
    }
  });
}

/**
 * JPEG desde lienzo de captura. Varios navegadores devuelven `null` en `toBlob('image/jpeg')`;
 * repetimos con `toDataURL` → blob o re-encode desde PNG sobre fondo oscuro.
 */
async function canvasToRobustJpegBlob(canvas: HTMLCanvasElement, quality = 0.9): Promise<Blob | null> {
  const minBytes = 64;

  const fromToBlob = () =>
    new Promise<Blob | null>((resolve) => {
      try {
        canvas.toBlob((b) => resolve(b && b.size >= minBytes ? b : null), "image/jpeg", quality);
      } catch {
        resolve(null);
      }
    });

  const blob = await fromToBlob();
  if (blob) return blob;

  try {
    const dataUrl = canvas.toDataURL("image/jpeg", quality);
    if (dataUrl.startsWith("data:image/jpeg")) {
      const b = await (await fetch(dataUrl)).blob();
      if (b.size >= minBytes) return b;
    }
  } catch {
    /* continuar */
  }

  try {
    const pngUrl = canvas.toDataURL("image/png");
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("img"));
      img.src = pngUrl;
    });
    const c = document.createElement("canvas");
    c.width = img.naturalWidth;
    c.height = img.naturalHeight;
    const ctx = c.getContext("2d");
    if (!ctx) return null;
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.drawImage(img, 0, 0);
    return new Promise((resolve) => {
      try {
        c.toBlob((b) => resolve(b && b.size >= minBytes ? b : null), "image/jpeg", quality);
      } catch {
        resolve(null);
      }
    });
  } catch {
    return null;
  }
}

async function snapshotBonoJpegBlob(articleEl: HTMLElement): Promise<Blob | null> {
  const canvas = await captureBonoCanvas(articleEl);
  if (!canvas) return null;
  return canvasToRobustJpegBlob(canvas, 0.9);
}

/** PNG directo del QR almacenado (si falla la captura de la tarjeta). */
async function pngBlobFromQrDataUrl(dataUrl: string | null): Promise<Blob | null> {
  if (!dataUrl?.startsWith("data:image")) return null;
  try {
    const r = await fetch(dataUrl);
    const b = await r.blob();
    return b.size > 80 ? b : null;
  } catch {
    return null;
  }
}

/** PDF vectorial si html2canvas falla (QR + texto + marca de agua raster). */
async function buildFallbackPdfBlob(bono: BonoPrettyCardData): Promise<Blob | null> {
  try {
    const pdf = new jsPDF({ unit: "mm", format: [210, 118], orientation: "landscape" });
    const W = 210;
    const H = 118;
    const m = 8;
    pdf.setFillColor(24, 40, 72);
    pdf.roundedRect(m, m, W - 2 * m, H - 2 * m, 2.5, 2.5, "F");

    const wm = await getLightWatermarkDataUrl();
    if (wm) {
      const wmW = 148;
      const wmH = 102;
      pdf.addImage(wm, "PNG", (W - wmW) / 2, (H - wmH) / 2 - 4, wmW, wmH, undefined, "FAST");
    }

    pdf.setTextColor(255, 255, 255);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8.5);
    pdf.text("FISIOTERAPIA ROC BLANC · BONO", m + 4, m + 9);

    pdf.setFontSize(15);
    const titleLines = pdf.splitTextToSize(bono.productName, 118);
    pdf.text(titleLines, m + 4, m + 18);
    let y = m + 18 + titleLines.length * 6 + 5;

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(11);
    pdf.text(`Código: ${bono.uniqueCode}`, m + 4, y);
    y += 6.5;
    if (bono.clientName?.trim()) {
      pdf.text(`Cliente: ${bono.clientName.trim()}`, m + 4, y);
      y += 6.5;
    }
    pdf.text(`Sesiones: ${bono.sessionsRemaining} / ${bono.sessionsTotal}`, m + 4, y);
    y += 6.5;
    pdf.text(`Caduca: ${expiresLabel(bono.expiresAt)}`, m + 4, y);

    const qrSz = 36;
    const qrX = W - m - qrSz - 3;
    const qrY = m + 13;
    if (bono.qrDataUrl) {
      const isJpeg =
        /data:image\/jpe?g/i.test(bono.qrDataUrl) || /\.jpe?g/i.test(bono.qrDataUrl.split(";")[0] ?? "");
      const fmt = isJpeg ? "JPEG" : "PNG";
      pdf.addImage(bono.qrDataUrl, fmt, qrX, qrY, qrSz, qrSz);
    } else {
      pdf.setDrawColor(180);
      pdf.setLineWidth(0.15);
      pdf.rect(qrX, qrY, qrSz, qrSz);
      pdf.setFontSize(7);
      pdf.text("Sin QR", qrX + 11, qrY + qrSz / 2 + 2);
    }

    pdf.setFontSize(6.8);
    pdf.setTextColor(190, 220, 255);
    pdf.text("Presenta el código o escanea el QR en recepción.", m + 4, H - m - 5);

    return pdf.output("blob");
  } catch {
    return null;
  }
}

async function snapshotOrFallbackPdf(
  el: HTMLElement,
  bono: BonoPrettyCardData,
): Promise<{ blob: Blob; source: "raster" | "fallback" } | null> {
  const snap = await snapshotBonoPdfBlob(el);
  if (snap) return { blob: snap, source: "raster" };
  const fb = await buildFallbackPdfBlob(bono);
  if (fb && fb.size > 200) return { blob: fb, source: "fallback" };
  return null;
}

function WhatsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden xmlns="http://www.w3.org/2000/svg">
      <path
        fill="currentColor"
        d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.149-.197.297-.767.966-.94 1.164-.173.198-.347.223-.644.074-.297-.149-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.499-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.226 1.36.194 1.871.117.572-.086 1.758-.719 2.006-1.413.247-.694.247-1.289.173-1.413-.074-.124-.272-.197-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.881 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"
      />
    </svg>
  );
}

/** Solo la tarjeta visual (captura PDF/JPEG sin botones). Las acciones van en `BonoPrettyCardActions` / `BonoCardWithToolbar`. */
export const BonoPrettyCard = forwardRef<HTMLElement, { bono: BonoPrettyCardData }>(function BonoPrettyCard(
  { bono },
  ref,
) {
  const status = statusPill(bono.sessionsRemaining, bono.expiresAt);

  return (
    <article
      ref={ref}
      data-bono-capture-root
      className="relative box-border aspect-[856/539] h-auto w-full min-w-0 max-w-[380px] overflow-hidden rounded-[14px] border border-cyan-200/80 bg-gradient-to-br from-slate-900 via-blue-900 to-cyan-700 p-3 text-white antialiased shadow-[0_12px_32px_-18px_rgba(15,23,42,0.85)]"
    >
      <div
        data-bono-watermark
        className="pointer-events-none absolute -inset-[18%] z-0 bg-[length:88%] bg-center bg-no-repeat opacity-[0.13] [transform:rotate(-14deg)] [filter:brightness(0)_invert(1)]"
        style={{ backgroundImage: `url(${CORPORATE_WATERMARK_SRC})` }}
        aria-hidden
      />
      <div
        data-bono-capture-hide
        className="pointer-events-none absolute -right-6 -top-6 z-[1] h-24 w-24 rounded-full bg-white/20 blur-2xl"
        aria-hidden
      />
      <div data-bono-capture-readable className="relative z-[2] flex h-full min-h-0 flex-col justify-between gap-2">
        <div className="flex min-w-0 items-start justify-between gap-2">
          <div className="min-w-0 pr-1">
            <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-cyan-100">Bono</p>
            <h3 className="mt-0.5 line-clamp-2 text-[13px] font-semibold leading-snug">{bono.productName}</h3>
            <p className="mt-0.5 truncate text-[11px] font-bold tabular-nums tracking-wide">{bono.uniqueCode}</p>
          </div>
          <span data-bono-status-pill className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${status.cls}`}>
            {status.text}
          </span>
        </div>
        <div className="grid min-h-0 grid-cols-[1fr_auto] items-end gap-2 border-t border-white/10 pt-2">
          <div className="min-w-0 space-y-0.5 text-[10px] leading-tight text-cyan-50">
            {bono.clientName ? (
              <p className="truncate">
                Cliente: <span className="font-semibold text-white">{bono.clientName}</span>
              </p>
            ) : null}
            <p>
              Sesiones:{" "}
              <span className="font-semibold tabular-nums text-white">
                {bono.sessionsRemaining}/{bono.sessionsTotal}
              </span>
            </p>
            <p>
              Caduca:{" "}
              <span className="font-semibold tabular-nums text-white">
                {new Date(`${bono.expiresAt}T12:00:00`).toLocaleDateString("es-ES")}
              </span>
            </p>
          </div>
          <div className="shrink-0 rounded-lg border border-white/40 bg-white p-1 shadow-sm">
            {bono.qrDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- captura raster usa <img> con data URL
              <img
                src={bono.qrDataUrl}
                alt={`QR ${bono.uniqueCode}`}
                width={88}
                height={88}
                className="h-[76px] w-[76px] object-contain"
              />
            ) : (
              <div className="flex h-[76px] w-[76px] items-center justify-center bg-slate-50 text-[9px] text-slate-500">
                Sin QR
              </div>
            )}
          </div>
        </div>
      </div>
    </article>
  );
});

export function BonoPrettyCardActions({
  bono,
  cardRef,
}: {
  bono: BonoPrettyCardData;
  cardRef: RefObject<HTMLElement | null>;
}) {
  const [busy, setBusy] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const flashHint = (msg: string) => {
    setHint(msg);
    window.setTimeout(() => setHint(null), 4000);
  };

  const runPdfSnapshot = useCallback(async () => {
    const el = cardRef.current;
    if (!el || busy) return;
    setBusy(true);
    try {
      const out = await snapshotOrFallbackPdf(el, bono);
      if (!out) throw new Error("pdf");
      downloadBlob(out.blob, bonoPdfFilename(bono));
      flashHint(
        out.source === "raster"
          ? "PDF descargado: una sola página, mismo píxel que la tarjeta en pantalla (sin redimensionar a A4)."
          : "PDF de respaldo (plantilla): no se pudo capturar la tarjeta tal cual; revisa el navegador o extensiones que bloqueen el canvas.",
      );
    } catch {
      alert(
        "No se pudo generar el PDF. Prueba Chrome/Edge actualizado o desactiva bloqueadores; el QR sigue visible en pantalla.",
      );
    } finally {
      setBusy(false);
    }
  }, [bono, busy, cardRef]);

  const runJpegSnapshot = useCallback(async () => {
    const el = cardRef.current;
    if (!el || busy) return;
    setBusy(true);
    try {
      const blob = await snapshotBonoJpegBlob(el);
      if (!blob || blob.size < 64) throw new Error("jpeg");
      downloadBlob(blob, bonoJpegFilename(bono));
      flashHint("JPEG descargado: captura de la tarjeta completa (como en pantalla), con marca de agua y QR.");
    } catch {
      flashHint(
        "No se pudo capturar la tarjeta en JPEG. Usa «Descargar PDF» (incluye respaldo con la misma información) o «Email con QR».",
      );
    } finally {
      setBusy(false);
    }
  }, [bono, busy, cardRef]);

  const runNativeSharePdf = useCallback(async () => {
    const el = cardRef.current;
    if (!el || busy) return;
    setBusy(true);
    try {
      const out = await snapshotOrFallbackPdf(el, bono);
      if (!out) throw new Error("pdf");
      const file = new File([out.blob], bonoPdfFilename(bono), {
        type: "application/pdf",
      });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `${BRAND} — Bono`,
          text: `${bono.uniqueCode}: ${bono.productName}`,
        });
        return;
      }
      alert("Este dispositivo no permite adjuntar el PDF en «Compartir». Usa «PDF» para descargarlo y súbelo a WhatsApp o al correo a mano.");
    } catch (e: unknown) {
      if (isAbortError(e)) {
        return;
      }
      alert("No se pudo compartir. Descarga el PDF con «PDF» e intenta desde la app correspondiente.");
    } finally {
      setBusy(false);
    }
  }, [bono, busy, cardRef]);

  const runWhatsApp = useCallback(async () => {
    const el = cardRef.current;
    if (!el || busy) return;
    setBusy(true);
    try {
      let png = await snapshotBonoPngBlob(el);
      if (!png) {
        png = await pngBlobFromQrDataUrl(bono.qrDataUrl);
      }
      const caption = formatBonoShareText(bono);

      if (png) {
        const pngName = bonoPngFilename(bono);
        const file = new File([png], pngName, { type: "image/png" });
        if (navigator.canShare?.({ files: [file] })) {
          try {
            await navigator.share({
              files: [file],
              text: caption,
              title: `${BRAND} — ${bono.uniqueCode}`,
            });
            flashHint("Listo: si elegiste WhatsApp en el menú del sistema, el mensaje puede llevar la imagen de la tarjeta.");
            return;
          } catch (e: unknown) {
            if (isAbortError(e)) return;
          }
        }
        downloadBlob(png, pngName);
      }

      window.open(whatsappHref(bono), "_blank", "noopener,noreferrer");

      if (png) {
        flashHint(
          `Imagen «${bonoPngFilename(bono)}» descargada: en WhatsApp Web adjúntala al chat (clip). En móvil suele ofrecerse compartir con imagen.`,
        );
      } else {
        flashHint("Solo se abrió WhatsApp con texto (no hay QR en imagen). Comprueba que el bono tenga QR guardado o usa «Descargar PDF».");
      }
    } catch {
      window.open(whatsappHref(bono), "_blank", "noopener,noreferrer");
    } finally {
      setBusy(false);
    }
  }, [bono, busy, cardRef]);

  const runSendServerEmail = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/admin/bonos/send-card-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          bonoId: bono.id,
          toEmail: (bono.clientEmail ?? "").trim() || undefined,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; message?: string; sentTo?: string; reason?: string };
      if (!res.ok || !data.ok) {
        const msg =
          data.message ??
          (data.reason === "smtp_not_configured"
            ? "Configura SMTP en el servidor (.env) como para otros correos de la clínica."
            : "No se pudo enviar el correo.");
        alert(msg);
        return;
      }
      flashHint(`Correo enviado con imagen QR adjunta a ${data.sentTo ?? "el cliente"}.`);
    } catch {
      alert("Error de red al enviar el correo.");
    } finally {
      setBusy(false);
    }
  }, [bono, busy]);

  const openMailDraft = () => {
    triggerMailto(mailtoHref(bono));
  };

  const copyUniqueCode = async () => {
    try {
      await navigator.clipboard.writeText(bono.uniqueCode);
      setCopied(true);
      flashHint("Copiado al portapapeles: el código largo del bono (BONO-…), para pegarlo donde quieras.");
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      alert("No se pudo copiar. Selecciona el código a mano en la tarjeta.");
    }
  };

  const btnClass = "h-8 w-full justify-start gap-2 text-left text-xs";

  return (
    <aside className="flex w-full min-w-0 flex-col gap-2 sm:w-44 sm:shrink-0" aria-label="Acciones del bono">
      {hint ? (
        <p className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5 text-[10px] leading-snug text-slate-600">{hint}</p>
      ) : null}
      <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => void runPdfSnapshot()} className={btnClass} title="PDF con la tarjeta y marca de agua">
        {busy ? <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" aria-hidden /> : <FileDown className="h-3.5 w-3.5 shrink-0" aria-hidden />}
        Descargar PDF
      </Button>
      <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => void runJpegSnapshot()} className={btnClass} title="JPEG de la tarjeta completa">
        {busy ? <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" aria-hidden /> : <FileImage className="h-3.5 w-3.5 shrink-0" aria-hidden />}
        Descargar JPEG
      </Button>
      <Button
        type="button"
        variant="default"
        size="sm"
        disabled={busy}
        onClick={() => void runSendServerEmail()}
        className={`${btnClass} bg-cyan-700 text-white hover:bg-cyan-800`}
        title={
          (bono.clientEmail ?? "").trim()
            ? `Envía desde la clínica con PNG del QR adjunto a ${(bono.clientEmail ?? "").trim()}`
            : "Necesitas email en la ficha del cliente (o el envío fallará)"
        }
      >
        <Send className="h-3.5 w-3.5 shrink-0" aria-hidden />
        Email con QR
      </Button>
      <Button type="button" variant="outline" size="sm" disabled={busy} onClick={openMailDraft} className={btnClass} title="Borrador en tu programa de correo (sin adjuntos)">
        <Mail className="h-3.5 w-3.5 shrink-0" aria-hidden />
        Borrador correo
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={busy}
        onClick={() => void runWhatsApp()}
        className={`${btnClass} border-emerald-300 bg-emerald-50 text-emerald-900 hover:bg-emerald-100`}
        title="WhatsApp con texto; intenta adjuntar imagen de la tarjeta"
      >
        {busy ? <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" aria-hidden /> : <WhatsIcon className="h-3.5 w-3.5 shrink-0" />}
        WhatsApp
      </Button>
      {"share" in navigator && typeof navigator.share === "function" ? (
        <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => void runNativeSharePdf()} className={btnClass} title="Compartir PDF del sistema">
          <Share2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
          Compartir PDF
        </Button>
      ) : null}
      <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => void copyUniqueCode()} className={btnClass} title="Copiar código BONO-…">
        <Copy className="h-3.5 w-3.5 shrink-0" aria-hidden />
        {copied ? "Copiado" : "Copiar código"}
      </Button>
    </aside>
  );
}

/** Tarjeta a la izquierda y acciones a la derecha; `min-w-0` evita que la fila desborde el modal. */
export function BonoCardWithToolbar({ bono }: { bono: BonoPrettyCardData }) {
  const cardRef = useRef<HTMLElement>(null);
  return (
    <div className="flex w-full min-w-0 max-w-full flex-col gap-3 sm:flex-row sm:items-start sm:gap-3">
      <div className="w-full min-w-0 max-w-[380px] flex-1 self-center sm:self-start">
        <BonoPrettyCard ref={cardRef} bono={bono} />
      </div>
      <BonoPrettyCardActions bono={bono} cardRef={cardRef} />
    </div>
  );
}
