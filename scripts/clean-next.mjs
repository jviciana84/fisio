import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const nextDir = path.join(root, ".next");
try {
  if (fs.existsSync(nextDir)) {
    fs.rmSync(nextDir, {
      recursive: true,
      force: true,
      maxRetries: 5,
      retryDelay: 200,
    });
  }
  console.log("OK: carpeta .next eliminada (caché de Next / Turbopack).");
} catch (e) {
  console.error("No se pudo borrar .next. Cierra `npm run dev` y vuelve a intentar, o borra .next a mano.");
  console.error(e);
  process.exit(1);
}
