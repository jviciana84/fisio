/**
 * Ejecuta un archivo .sql contra Postgres de Supabase usando .env.local:
 * PASS_SUPABASE_POSTGRES + NEXT_PUBLIC_SUPABASE_URL (project ref).
 *
 * Uso: node scripts/run-migration.mjs supabase/migrations/013_online_bookings.sql
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import pg from "pg";

const { Client } = pg;

function loadEnvLocal() {
  const p = resolve(process.cwd(), ".env.local");
  if (!existsSync(p)) return;
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
    if (process.env[key] === undefined) process.env[key] = val;
  }
}

loadEnvLocal();

const relPath = process.argv[2];
if (!relPath) {
  console.error("Uso: node scripts/run-migration.mjs <ruta-al.sql>");
  process.exit(1);
}

const pass = process.env.PASS_SUPABASE_POSTGRES;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
if (!pass || !supabaseUrl) {
  console.error("Falta PASS_SUPABASE_POSTGRES o NEXT_PUBLIC_SUPABASE_URL en .env.local");
  process.exit(1);
}

const refMatch = supabaseUrl.match(/^https:\/\/([a-z0-9-]+)\.supabase\.co/i);
if (!refMatch?.[1]) {
  console.error("NEXT_PUBLIC_SUPABASE_URL no tiene el formato esperado (https://<ref>.supabase.co)");
  process.exit(1);
}
const ref = refMatch[1];

/**
 * Región del pooler (debe coincidir con el proyecto en Supabase → Settings → General).
 * Si falla "Tenant or user not found", prueba otra: eu-west-1, eu-central-1, etc.
 */
const region =
  process.env.SUPABASE_POOLER_REGION ||
  process.env.SUPABASE_DB_REGION ||
  "eu-west-1";
const poolerUser = `postgres.${ref}`;
const poolerHost = `aws-0-${region}.pooler.supabase.com`;
/** Puerto 5432 = modo sesión (adecuado para DDL); 6543 es transaccional. */
const databaseUrl = `postgresql://${encodeURIComponent(poolerUser)}:${encodeURIComponent(pass)}@${poolerHost}:5432/postgres`;

const sqlPath = resolve(process.cwd(), relPath);
const sql = readFileSync(sqlPath, "utf8");

const client = new Client({
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false },
});

try {
  await client.connect();
  await client.query(sql);
  console.log("OK: migración aplicada:", relPath);
} catch (err) {
  console.error("Error SQL:", err.message);
  process.exit(1);
} finally {
  await client.end().catch(() => {});
}
