/**
 * Genera favicons, iconos PWA y la imagen Open Graph desde el logo oficial (logo FRB3.svg).
 * Ejecutar tras cambiar el SVG: npm run generate:icons
 */
import sharp from "sharp";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const svgPath = path.join(root, "public", "images", "logo FRB3.svg");

function rasterize() {
  const buf = fs.readFileSync(svgPath);
  return sharp(buf, { density: 400 });
}

async function main() {
  const bg = { r: 255, g: 255, b: 255, alpha: 1 };
  const ogBg = { r: 241, g: 245, b: 249, alpha: 1 };

  await rasterize()
    .resize(180, 180, { fit: "contain", background: bg })
    .png()
    .toFile(path.join(root, "public", "apple-icon.png"));

  await rasterize()
    .resize(32, 32, { fit: "contain", background: bg })
    .png()
    .toFile(path.join(root, "public", "favicon-32x32.png"));

  await rasterize()
    .resize(192, 192, { fit: "contain", background: bg })
    .png()
    .toFile(path.join(root, "public", "icon-192.png"));

  await rasterize()
    .resize(512, 512, { fit: "contain", background: bg })
    .png()
    .toFile(path.join(root, "public", "icon-512.png"));

  await rasterize()
    .resize(1200, 630, { fit: "contain", background: ogBg })
    .jpeg({ quality: 88, mozjpeg: true })
    .toFile(path.join(root, "public", "og-social.jpg"));

  fs.copyFileSync(svgPath, path.join(root, "public", "icon.svg"));

  console.log("OK: apple-icon.png, favicon-32x32.png, icon-192.png, icon-512.png, og-social.jpg, icon.svg");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
