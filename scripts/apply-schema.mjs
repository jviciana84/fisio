/**
 * Aplica supabase/schema.sql y la migración de email usando DATABASE_URL (Postgres directo).
 * La API de Supabase no permite ejecutar DDL; hace falta la URI de la base de datos.
 *
 * Uso: DATABASE_URL="postgresql://..." node scripts/apply-schema.mjs
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

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error(
    "Falta DATABASE_URL (cadena URI de Postgres en Supabase → Settings → Database).",
  );
  process.exit(1);
}

const schemaPath = resolve(process.cwd(), "supabase/schema.sql");
const migrationPath = resolve(
  process.cwd(),
  "supabase/migrations/001_add_email_to_staff_access.sql",
);

const schemaSql = readFileSync(schemaPath, "utf8");
const migrationSql = readFileSync(migrationPath, "utf8");

const client = new Client({
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false },
});

try {
  await client.connect();
  await client.query(schemaSql);
  await client.query(migrationSql);
  console.log("OK: esquema aplicado en la base de datos.");
} catch (err) {
  console.error("Error al aplicar SQL:", err.message);
  process.exit(1);
} finally {
  await client.end().catch(() => {});
}
