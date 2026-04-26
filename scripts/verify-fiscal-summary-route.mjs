/**
 * Evita perder 1h con un route.ts viejos: const activeY: number; if (...) { activeY = ... }
 * Válido en .ts a veces en checkers, pero el parser SWC de Next falla. Ver resolveActiveFiscalPeriod en lib/fiscal/fiscalHelper.ts
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const route = path.join(here, "../app/api/admin/fiscal/summary/route.ts");
const s = fs.readFileSync(route, "utf8");
if (
  /^\s*const activeY:\s*number\s*;\s*$/m.test(s) ||
  /^\s*const activeQ:\s*1 \| 2 \| 3 \| 4;\s*$/m.test(s)
) {
  console.error(
    "\n[verify-fiscal-summary-route] app/api/admin/fiscal/summary/route.ts tiene un patrón const sin inicializar.\n" +
      "Haz: git pull, o asegúrate de usar resolveActiveFiscalPeriod({...}) en fiscalHelper.\n",
  );
  process.exit(1);
}
if (!s.includes("resolveActiveFiscalPeriod")) {
  console.error(
    "\n[verify-fiscal-summary-route] Falta import/uso de resolveActiveFiscalPeriod. git pull o revisa el repo.\n",
  );
  process.exit(1);
}
console.log("verify-fiscal-summary-route: ok");
