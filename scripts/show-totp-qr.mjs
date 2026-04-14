/**
 * Regenera el HTML con el QR usando el secreto ya guardado en BD (no rota el TOTP).
 * Uso: node scripts/show-totp-qr.mjs <email>
 */
import { generateURI } from "otplib";
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { writeTotpSetupHtml, openHtmlInBrowser } from "./totp-qr-html.mjs";

function loadEnvLocal() {
  const p = resolve(process.cwd(), ".env.local");
  if (!existsSync(p)) {
    console.error("No existe .env.local en la raíz del proyecto.");
    process.exit(1);
  }
  const raw = readFileSync(p, "utf8");
  for (const line of raw.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i === -1) continue;
    const key = t.slice(0, i).trim();
    let val = t.slice(i + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    process.env[key] = val;
  }
}

loadEnvLocal();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error(
    "Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local",
  );
  process.exit(1);
}

const email = (process.argv[2] ?? "").trim().toLowerCase();
if (!email || !email.includes("@")) {
  console.error('Uso: node scripts/show-totp-qr.mjs <email>');
  process.exit(1);
}

const issuer = process.env.TOTP_ISSUER ?? "Fisioterapia Roc Blanc";

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data: row, error } = await supabase
  .from("staff_access")
  .select("full_name, email, totp_secret")
  .eq("email", email)
  .maybeSingle();

if (error || !row) {
  console.error("No se encontró el usuario:", error?.message);
  process.exit(1);
}

if (!row.totp_secret) {
  console.error(
    "Este usuario no tiene TOTP en la base de datos. Ejecuta primero: npm run totp:enable --",
    email,
  );
  process.exit(1);
}

const label = row.full_name || row.email;
const otpauthUri = generateURI({
  issuer,
  label,
  secret: row.totp_secret,
});

const htmlPath = await writeTotpSetupHtml({
  email: row.email,
  otpauthUri,
  issuer,
});

console.log("");
console.log("Archivo generado (ábrelo con doble clic o se abrirá solo en Windows):");
console.log(htmlPath);
console.log("");

openHtmlInBrowser(htmlPath);
