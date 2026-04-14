/**
 * Crea o actualiza un usuario en staff_access con el mismo hash de PIN que la API.
 * Uso: node scripts/seed-admin.mjs "<nombre>" <email> <pin4> [admin|staff|caja]
 *
 * Carga variables desde .env.local (no imprime secretos).
 */
import { createHash, randomBytes } from "node:crypto";
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

function hashPin(pin, salt) {
  return createHash("sha256").update(`${salt}:${pin}`).digest("hex");
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

const args = process.argv.slice(2);
if (args.length < 3) {
  console.error(
    'Uso: node scripts/seed-admin.mjs "<nombre completo>" <email> <pin4> [admin|staff|caja]',
  );
  process.exit(1);
}

const fullName = args[0];
const email = args[1].trim().toLowerCase();
const pin = args[2];
const role = (args[3] ?? "admin").toLowerCase();

if (!/^\d{4}$/.test(pin)) {
  console.error("El PIN debe ser exactamente 4 dígitos.");
  process.exit(1);
}

if (!["admin", "staff", "caja"].includes(role)) {
  console.error("Rol inválido. Usa: admin, staff o caja.");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const pinSalt = randomBytes(16).toString("hex");
const pinHash = hashPin(pin, pinSalt);

const row = {
  full_name: fullName,
  email,
  role,
  pin_hash: pinHash,
  pin_salt: pinSalt,
  requires_2fa: false,
  totp_secret: null,
  is_active: true,
};

const { data: existing, error: findError } = await supabase
  .from("staff_access")
  .select("id")
  .eq("email", email)
  .maybeSingle();

if (findError) {
  console.error("Error al buscar por email:", findError.message);
  if (findError.message?.includes("column") || findError.code === "42703") {
    console.error(
      "Ejecuta en Supabase SQL Editor: supabase/migrations/001_add_email_to_staff_access.sql",
    );
  }
  process.exit(1);
}

if (existing?.id) {
  const { data, error } = await supabase
    .from("staff_access")
    .update({
      full_name: row.full_name,
      role: row.role,
      pin_hash: row.pin_hash,
      pin_salt: row.pin_salt,
      requires_2fa: row.requires_2fa,
      totp_secret: row.totp_secret,
      is_active: row.is_active,
    })
    .eq("id", existing.id)
    .select("id")
    .single();

  if (error) {
    console.error("Error al actualizar:", error.message);
    process.exit(1);
  }
  console.log("OK: usuario actualizado.");
  console.log("id:", data.id);
  console.log("rol:", role);
  console.log("email:", email);
  process.exit(0);
}

const { data, error } = await supabase
  .from("staff_access")
  .insert(row)
  .select("id")
  .single();

if (error) {
  console.error("Error al insertar:", error.message);
  if (error.message?.includes("column") || error.code === "42703") {
    console.error(
      "Ejecuta en Supabase: supabase/migrations/001_add_email_to_staff_access.sql",
    );
  }
  process.exit(1);
}

console.log("OK: usuario admin creado.");
console.log("id:", data.id);
console.log("rol:", role);
console.log("email:", email);
