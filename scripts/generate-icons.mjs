/**
 * Renders public/icon.svg into all PWA + iOS apple-touch sizes.
 * Run: node scripts/generate-icons.mjs
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const svgPath = path.join(root, "public/icon.svg");
const outDir = path.join(root, "public/icons");
const appDir = path.join(root, "src/app");

/** Standard PWA + favicon sizes */
const pwaSizes = [16, 32, 48, 72, 96, 128, 144, 192, 256, 384, 512];

/**
 * Apple touch icon sizes historically used across iPhone / iPad generations.
 * Modern iOS mainly wants 180×180; the rest keep older devices sharp.
 */
const appleSizes = [57, 60, 72, 76, 114, 120, 144, 152, 167, 180];

/** Maskable icons need extra safe padding (safe zone ~80%). */
const maskableSizes = [192, 512];

async function renderPng(svg, size, { padded = false } = {}) {
  if (!padded) {
    return sharp(svg, { density: 384 })
      .resize(size, size, { fit: "fill" })
      .png({ compressionLevel: 9 })
      .toBuffer();
  }

  // Draw icon into 80% centered safe zone for maskable purpose
  const inner = Math.round(size * 0.8);
  const icon = await sharp(svg, { density: 384 })
    .resize(inner, inner, { fit: "fill" })
    .png()
    .toBuffer();

  return sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 22, g: 24, b: 38, alpha: 1 }, // #161826
    },
  })
    .composite([{ input: icon, gravity: "centre" }])
    .png({ compressionLevel: 9 })
    .toBuffer();
}

async function main() {
  const svg = await readFile(svgPath);
  await mkdir(outDir, { recursive: true });

  for (const size of pwaSizes) {
    const buf = await renderPng(svg, size);
    await writeFile(path.join(outDir, `icon-${size}.png`), buf);
  }

  for (const size of appleSizes) {
    const buf = await renderPng(svg, size);
    await writeFile(path.join(outDir, `apple-touch-icon-${size}.png`), buf);
  }

  // Canonical apple-touch-icon (180) + Next.js file convention
  const apple180 = await renderPng(svg, 180);
  await writeFile(path.join(outDir, "apple-touch-icon.png"), apple180);
  await writeFile(path.join(appDir, "apple-icon.png"), apple180);

  // High-res source / App Store style
  const hi = await renderPng(svg, 1024);
  await writeFile(path.join(outDir, "icon-1024.png"), hi);

  for (const size of maskableSizes) {
    const buf = await renderPng(svg, size, { padded: true });
    await writeFile(path.join(outDir, `maskable-${size}.png`), buf);
  }

  // favicon.ico — multi-resolution via PNG pack (browsers accept PNG-in-ICO poorly,
  // so we also emit classic 32px favicon.png and a real multi-size ICO manually).
  const fav32 = await renderPng(svg, 32);
  const fav16 = await renderPng(svg, 16);
  await writeFile(path.join(outDir, "favicon-32.png"), fav32);
  await writeFile(path.join(outDir, "favicon-16.png"), fav16);
  await writeFile(path.join(appDir, "icon.png"), await renderPng(svg, 32));

  // Minimal ICO: embed 16 + 32 PNG images (PNG-compressed ICO, widely supported)
  const ico = buildPngIco([
    { size: 16, png: fav16 },
    { size: 32, png: fav32 },
  ]);
  await writeFile(path.join(appDir, "favicon.ico"), ico);
  await writeFile(path.join(root, "public/favicon.ico"), ico);

  console.log("Icons generated in public/icons/ + src/app/{favicon.ico,icon.png,apple-icon.png}");
}

/** Build an ICO container with PNG-compressed images (Vista+). */
function buildPngIco(images) {
  const count = images.length;
  const headerSize = 6 + count * 16;
  const buffers = [];
  let offset = headerSize;

  const header = Buffer.alloc(headerSize);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type = icon
  header.writeUInt16LE(count, 4);

  for (let i = 0; i < count; i++) {
    const { size, png } = images[i];
    const entry = 6 + i * 16;
    header.writeUInt8(size >= 256 ? 0 : size, entry);
    header.writeUInt8(size >= 256 ? 0 : size, entry + 1);
    header.writeUInt8(0, entry + 2);
    header.writeUInt8(0, entry + 3);
    header.writeUInt16LE(1, entry + 4);
    header.writeUInt16LE(32, entry + 6);
    header.writeUInt32LE(png.length, entry + 8);
    header.writeUInt32LE(offset, entry + 12);
    buffers.push(png);
    offset += png.length;
  }

  return Buffer.concat([header, ...buffers]);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
