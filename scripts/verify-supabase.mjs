/**
 * Verifica conexión a Supabase usando variables de .env.local.
 * No imprime claves ni URLs completas.
 */
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

const host = (() => {
  try {
    return new URL(url).hostname;
  } catch {
    return "(URL inválida)";
  }
})();

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { error } = await supabase.from("staff_access").select("id").limit(1);

if (error) {
  const missingTable =
    error.message?.includes("staff_access") ||
    error.message?.includes("schema cache") ||
    error.code === "PGRST116";

  if (missingTable) {
    console.log("OK: credenciales y API de Supabase responden.");
    console.log("Proyecto (host):", host);
    console.log(
      "Pendiente: crea la tabla ejecutando supabase/schema.sql en el SQL Editor de Supabase.",
    );
    process.exit(0);
  }

  console.error("Error de Supabase:", error.message);
  process.exit(1);
}

console.log("OK: conexión a Supabase correcta.");
console.log("Proyecto (host):", host);
console.log("Tabla staff_access: consulta de prueba correcta.");
