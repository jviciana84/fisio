import type { jsPDF } from "jspdf";

/**
 * Genera y descarga un PDF desde un elemento HTML (cliente, navegador).
 * Usa html2canvas + jsPDF directamente (sin html2pdf.js).
 *
 * Motivo: html2pdf mete el clon en un contenedor del **ancho interior** (~190 mm)
 * con márgenes, mientras la factura está maquetada a **210 mm**; eso deforma la
 * captura y parte la paginación. Capturamos el propio `#invoice-pdf-root` y
 * escalamos la imagen al ancho útil del A4 en jsPDF.
 *
 * Colores `lab()` / `oklch()`: html2canvas 1.x falla al parsearlos en el
 * render clásico. Saneamos el clon en `onclone` (CSS global fuera del bloque
 * factura, fondos rgb en html/body, estilos computados inlinados + coerción a
 * rgb). Los `<style>` **dentro** de `#invoice-pdf-root` se conservan para no
 * desalinear el árbol respecto al DOM real al copiar estilos hijo a hijo.
 *
 * `foreignObjectRendering` desactivado: en SVG el layout con `mm` queda
 * comprimido; el canvas clásico respeta el ancho real de la factura.
 */

function cssValueUsesUnsupportedColorSpace(value: string): boolean {
  const v = value.toLowerCase();
  return v.includes("lab(") || v.includes("oklch(") || v.includes("lch(");
}

/** Colores de un solo token que se pueden forzar a rgb vía canvas. */
const COLOR_LIKE_PROPS = new Set([
  "color",
  "accent-color",
  "background-color",
  "border-top-color",
  "border-right-color",
  "border-bottom-color",
  "border-left-color",
  "outline-color",
  "text-decoration-color",
  "text-emphasis-color",
  "caret-color",
  "column-rule-color",
  "fill",
  "stroke",
  "flood-color",
  "lighting-color",
  "stop-color",
]);

/** `border-top`, `background`, etc. pueden llevar `lab()` en el valor; html2canvas no lo parsea. */
function propertyDroppedIfValueUsesModernColor(name: string): boolean {
  if (name.includes("shadow")) return true;
  if (name === "filter" || name === "backdrop-filter") return true;
  if (name === "background-image" || name === "background") return true;
  if (name === "outline" || name === "outline-offset") return true;
  return (
    name === "border" ||
    name === "border-top" ||
    name === "border-right" ||
    name === "border-bottom" ||
    name === "border-left" ||
    name === "border-block" ||
    name === "border-inline" ||
    name === "border-block-start" ||
    name === "border-block-end" ||
    name === "border-inline-start" ||
    name === "border-inline-end"
  );
}

const SKIP_COMPUTED_PROPS = new Set([
  "transition",
  "transition-property",
  "transition-duration",
  "transition-timing-function",
  "transition-delay",
  "animation",
  "animation-name",
  "animation-duration",
  "cursor",
  "pointer-events",
  "resize",
  "scroll-behavior",
  "view-transition-name",
]);

function coerceCssColorToRgb(doc: Document, raw: string): string | null {
  const v = raw.trim();
  if (!v || v === "none" || v === "transparent") return v || null;
  if (!cssValueUsesUnsupportedColorSpace(v)) return v;
  try {
    const c = doc.createElement("canvas");
    c.width = 1;
    c.height = 1;
    const ctx = c.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;
    ctx.fillStyle = "#000000";
    ctx.fillStyle = raw;
    ctx.fillRect(0, 0, 1, 1);
    const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
    if (a < 255) {
      const alpha = Math.round((a / 255) * 1000) / 1000;
      return `rgba(${r},${g},${b},${alpha})`;
    }
    return `rgb(${r},${g},${b})`;
  } catch {
    return null;
  }
}

function sanitizePropertyValue(doc: Document, name: string, val: string): string | null {
  if (!val) return null;
  if (!cssValueUsesUnsupportedColorSpace(val)) return val;

  if (propertyDroppedIfValueUsesModernColor(name)) {
    return null;
  }

  if (COLOR_LIKE_PROPS.has(name) || name.endsWith("-color")) {
    return coerceCssColorToRgb(doc, val);
  }

  return null;
}

function copyComputedStyleInline(resolverDoc: Document, original: Element, clone: Element): void {
  if (!("style" in clone) || !("style" in original)) {
    const n = Math.min(original.children.length, clone.children.length);
    for (let j = 0; j < n; j++) {
      copyComputedStyleInline(resolverDoc, original.children[j]!, clone.children[j]!);
    }
    return;
  }

  const target = clone as HTMLElement | SVGElement;
  const source = original as HTMLElement | SVGElement;
  const cs = window.getComputedStyle(source);

  for (let i = 0; i < cs.length; i++) {
    const name = cs[i];
    if (!name || SKIP_COMPUTED_PROPS.has(name)) continue;
    let val = cs.getPropertyValue(name);
    if (!val) continue;

    const sanitized = sanitizePropertyValue(resolverDoc, name, val);
    if (sanitized === null && cssValueUsesUnsupportedColorSpace(val)) {
      continue;
    }
    if (sanitized !== null) {
      val = sanitized;
    }

    try {
      target.style.setProperty(name, val, cs.getPropertyPriority(name));
    } catch {
      /* propiedad no aplicable al nodo */
    }
  }

  const n = Math.min(original.children.length, clone.children.length);
  for (let j = 0; j < n; j++) {
    copyComputedStyleInline(resolverDoc, original.children[j]!, clone.children[j]!);
  }
}

/**
 * Quita CSS global del clon (Tailwind, etc.).
 * No elimina `<style>` **dentro** del nodo capturado: el bloque factura incluye un
 * `<style>` hijo (React); borrarlo desalinea índices con el DOM real y
 * `copyComputedStyleInline` acopla mal hijo con hijo (layout roto, estrellas en
 * columna, cabecera al fondo, etc.).
 */
function removeAuthorStylesheetsFromClone(clonedDoc: Document, keepStylesInside: Element): void {
  clonedDoc.querySelectorAll('link[rel="stylesheet"]').forEach((node) => node.remove());
  clonedDoc.querySelectorAll('link[rel="preload"][as="style"]').forEach((node) => node.remove());
  clonedDoc.querySelectorAll("style").forEach((node) => {
    if (!keepStylesInside.contains(node)) {
      node.remove();
    }
  });
}

/** Tailwind v4 / runtime puede inyectar CSS por `adoptedStyleSheets`. */
function stripAdoptedStyleSheets(doc: Document): void {
  const clear = (target: Document | Element | null | undefined) => {
    if (!target || !("adoptedStyleSheets" in target)) return;
    try {
      (target as Document & { adoptedStyleSheets: CSSStyleSheet[] }).adoptedStyleSheets = [];
    } catch {
      /* noop */
    }
  };
  clear(doc);
  clear(doc.documentElement);
  clear(doc.body);
}

function sanitizeInlineStyleDeclaration(doc: Document, style: CSSStyleDeclaration): void {
  const names: string[] = [];
  for (let i = 0; i < style.length; i++) {
    const n = style[i];
    if (n) names.push(n);
  }
  for (const name of names) {
    const val = style.getPropertyValue(name);
    if (!val || !cssValueUsesUnsupportedColorSpace(val)) continue;

    const sanitized = sanitizePropertyValue(doc, name, val);
    if (sanitized !== null) {
      style.setProperty(name, sanitized, style.getPropertyPriority(name));
    } else {
      style.removeProperty(name);
    }
  }
}

/** Segunda pasada: pseudo-nodos de html2canvas y cualquier `lab()` residual en `style`. */
function sanitizeSubtreeStyles(doc: Document, root: Element): void {
  const nodes: Element[] = [root];
  root.querySelectorAll("*").forEach((n) => nodes.push(n));

  for (const node of nodes) {
    if (node instanceof HTMLElement || node instanceof SVGElement) {
      if ("style" in node && node.style) {
        sanitizeInlineStyleDeclaration(doc, node.style);
      }
    }
    if (node instanceof SVGElement) {
      for (const attr of ["fill", "stroke"]) {
        const v = node.getAttribute(attr);
        if (v && cssValueUsesUnsupportedColorSpace(v)) {
          const coerced = coerceCssColorToRgb(doc, v);
          if (coerced) node.setAttribute(attr, coerced);
          else node.removeAttribute(attr);
        }
      }
    }
  }
}

function forceOpaqueRgbDocumentBackgrounds(clonedDoc: Document): void {
  const html = clonedDoc.documentElement;
  const body = clonedDoc.body;
  if (html) {
    html.style.setProperty("background-color", "rgb(255, 255, 255)", "important");
  }
  if (body) {
    body.style.setProperty("background-color", "rgb(255, 255, 255)", "important");
  }
}

/** Ancho/alto en px del elemento en pantalla (post-reflow), para clon y html2canvas. */
function capturePixelBox(source: HTMLElement): { width: number; height: number } {
  const width = Math.max(1, Math.ceil(source.offsetWidth || source.getBoundingClientRect().width));
  const height = Math.max(1, Math.ceil(source.scrollHeight));
  return { width, height };
}

function applyClonePixelBox(clone: HTMLElement, width: number, height: number): void {
  clone.style.boxSizing = "border-box";
  clone.style.width = `${width}px`;
  clone.style.minWidth = `${width}px`;
  clone.style.maxWidth = `${width}px`;
  clone.style.height = `${height}px`;
  clone.style.minHeight = `${height}px`;
  clone.style.maxHeight = "none";
}

/** Misma lógica de rebanado vertical que html2pdf (ancho = área útil, alto proporcional). */
function addCanvasToPdf(
  pdf: jsPDF,
  canvas: HTMLCanvasElement,
  marginMm: number,
  imageMime: "image/jpeg" | "image/png",
  imageQuality: number,
): void {
  const pageW = pdf.internal.pageSize.getWidth();
  const innerW = pageW - 2 * marginMm;
  const innerH = pdf.internal.pageSize.getHeight() - 2 * marginMm;
  const innerRatio = innerH / innerW;

  const pxFullHeight = canvas.height;
  const pxPageHeight = Math.floor(canvas.width * innerRatio);
  const nPages = Math.max(1, Math.ceil(pxFullHeight / pxPageHeight));

  const pageCanvas = document.createElement("canvas");
  pageCanvas.width = canvas.width;
  const pageCtx = pageCanvas.getContext("2d");
  if (!pageCtx) {
    throw new Error("No se pudo crear el contexto 2D para paginar el PDF");
  }

  const format = imageMime === "image/jpeg" ? "JPEG" : "PNG";

  for (let page = 0; page < nPages; page++) {
    let slicePx = pxPageHeight;
    if (page === nPages - 1 && pxFullHeight % pxPageHeight !== 0) {
      slicePx = pxFullHeight % pxPageHeight;
    }

    pageCanvas.height = slicePx;
    pageCtx.fillStyle = "#ffffff";
    pageCtx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
    pageCtx.drawImage(canvas, 0, page * pxPageHeight, pageCanvas.width, slicePx, 0, 0, pageCanvas.width, slicePx);

    const imgData = pageCanvas.toDataURL(imageMime, imageQuality);
    const sliceMmH = (slicePx * innerW) / canvas.width;

    if (page > 0) pdf.addPage();
    pdf.addImage(imgData, format, marginMm, marginMm, innerW, sliceMmH);
  }
}

export function safeInvoicePdfFilename(invoiceNumber: string): string {
  return `Factura-${invoiceNumber.replace(/[\\/:*?"<>|]+/g, "-")}.pdf`;
}

export async function downloadInvoiceElementPdf(
  elementId: string,
  filename: string,
): Promise<void> {
  if (typeof document === "undefined") {
    throw new Error("Solo disponible en el navegador");
  }
  const el = document.getElementById(elementId);
  if (!el || !(el instanceof HTMLElement)) {
    throw new Error("No se encontró el bloque de la factura");
  }

  const CAPTURE_CLASS = "invoice-pdf-capture-expand";
  el.classList.add(CAPTURE_CLASS);

  const marginMm = 10;
  const imageMime = "image/jpeg";
  const imageQuality = 0.92;

  try {
    const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
      import("html2canvas"),
      import("jspdf"),
    ]);

    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => resolve());
    });
    const { width: capW, height: capH } = capturePixelBox(el);

    const canvas = await html2canvas(el, {
      scale: 2,
      useCORS: true,
      logging: false,
      foreignObjectRendering: false,
      backgroundColor: "#ffffff",
      width: capW,
      height: capH,
      windowWidth: capW,
      windowHeight: capH,
      onclone: (clonedDoc, clonedEl) => {
        stripAdoptedStyleSheets(clonedDoc);
        removeAuthorStylesheetsFromClone(clonedDoc, clonedEl);
        forceOpaqueRgbDocumentBackgrounds(clonedDoc);
        if (clonedEl instanceof HTMLElement) {
          copyComputedStyleInline(document, el, clonedEl);
          applyClonePixelBox(clonedEl, capW, capH);
          sanitizeSubtreeStyles(document, clonedEl);
        }
      },
    });

    const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
    addCanvasToPdf(pdf, canvas, marginMm, imageMime, imageQuality);
    pdf.save(filename);
  } finally {
    el.classList.remove(CAPTURE_CLASS);
  }
}
