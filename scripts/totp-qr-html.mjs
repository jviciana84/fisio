/**
 * Genera un HTML local con el QR embebido para abrir en el navegador (doble clic).
 */
import QRCode from "qrcode";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawn } from "node:child_process";

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * @param {{ email: string; otpauthUri: string; issuer: string }} opts
 * @returns {Promise<string>} ruta absoluta del .html
 */
export async function writeTotpSetupHtml(opts) {
  const { email, otpauthUri, issuer } = opts;

  const dataUrl = await QRCode.toDataURL(otpauthUri, {
    width: 320,
    margin: 2,
    errorCorrectionLevel: "M",
  });

  const dir = resolve(process.cwd(), "temp");
  mkdirSync(dir, { recursive: true });
  const safe = email.replace(/@/g, "_at_").replace(/[^a-z0-9._-]/gi, "_");
  const filePath = resolve(dir, `totp-qr-${safe}.html`);

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>QR – Google Authenticator</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 440px; margin: 2rem auto; padding: 0 1rem; text-align: center; color: #0f172a; }
    h1 { font-size: 1.25rem; }
    img { max-width: 100%; height: auto; border-radius: 8px; }
    .box { background: #f1f5f9; border-radius: 12px; padding: 1rem; margin-top: 1.25rem; text-align: left; font-size: 14px; line-height: 1.5; }
    code { font-size: 12px; word-break: break-all; }
  </style>
</head>
<body>
  <h1>Escanear con Google Authenticator</h1>
  <p>En el móvil: <strong>Añadir cuenta</strong> → <strong>Escanear un código QR</strong> y apunta a esta pantalla.</p>
  <p><img src="${dataUrl}" alt="Código QR TOTP" width="320" height="320"/></p>
  <div class="box">
    <p><strong>Emisor:</strong> ${escapeHtml(issuer)}</p>
    <p><strong>Cuenta:</strong> ${escapeHtml(email)}</p>
    <p>Cuando veas la cuenta en la app, puedes cerrar esta ventana y borrar la carpeta <code>temp/</code> si quieres.</p>
  </div>
</body>
</html>`;

  writeFileSync(filePath, html, "utf8");
  return filePath;
}

/** Abre el archivo HTML en el navegador por defecto. */
export function openHtmlInBrowser(filePath) {
  if (process.platform === "win32") {
    spawn("cmd", ["/c", "start", "", filePath], {
      detached: true,
      stdio: "ignore",
    }).unref();
  } else if (process.platform === "darwin") {
    spawn("open", [filePath], { detached: true, stdio: "ignore" }).unref();
  } else {
    spawn("xdg-open", [filePath], { detached: true, stdio: "ignore" }).unref();
  }
}
