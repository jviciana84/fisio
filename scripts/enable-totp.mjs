/**
 * Activa TOTP (Google Authenticator / compatible) para un usuario en staff_access.
 * Uso: node scripts/enable-totp.mjs <email>
 *
 * Genera un secreto nuevo, pone requires_2fa=true y muestra la URI otpauth:// para QR.
 * Si ya tenía TOTP, lo sustituye (los códigos antiguos dejan de valer).
 */
import { generateSecret, generateURI } from "otplib";
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

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
  console.error('Uso: node scripts/enable-totp.mjs <email>');
  process.exit(1);
}

const issuer = process.env.TOTP_ISSUER ?? "Fisioterapia Roc Blanc";

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data: row, error: findError } = await supabase
  .from("staff_access")
  .select("id, full_name, email")
  .eq("email", email)
  .maybeSingle();

if (findError || !row) {
  console.error("No se encontró un usuario con ese email:", findError?.message);
  process.exit(1);
}

const secret = generateSecret();
const label = row.full_name || row.email;

const otpauthUri = generateURI({
  issuer,
  label,
  secret,
});

const { error: upError } = await supabase
  .from("staff_access")
  .update({
    totp_secret: secret,
    requires_2fa: true,
  })
  .eq("id", row.id);

if (upError) {
  console.error("Error al guardar TOTP:", upError.message);
  process.exit(1);
}

console.log("");
console.log("TOTP activado para:", email);
console.log("Emisor (issuer):", issuer);
console.log("");
console.log("1) Abre Google Authenticator → Añadir cuenta → Escanear código QR");
console.log("   (genera el QR con esta URI en cualquier generador de QR desde el texto siguiente)");
console.log("");
console.log("URI otpauth (copia en generador de QR):");
console.log(otpauthUri);
console.log("");
console.log("2) O entrada manual en la app → Secreto en Base32:");
console.log(secret);
console.log("");
console.log("Tras guardar en el móvil, el login será: PIN → código de 6 dígitos.");
console.log("");
