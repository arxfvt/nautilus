// Generates solid-color PNG icons for the PWA manifest.
// Uses only Node.js built-ins — no dependencies needed.
import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

function uint32BE(n) {
  const buf = Buffer.allocUnsafe(4);
  buf.writeUInt32BE(n, 0);
  return buf;
}

function crc32(buf) {
  let crc = 0xffffffff;
  for (const byte of buf) {
    crc ^= byte;
    for (let i = 0; i < 8; i++) {
      crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBytes = Buffer.from(type, "ascii");
  const body = Buffer.concat([typeBytes, data]);
  return Buffer.concat([uint32BE(data.length), typeBytes, data, uint32BE(crc32(body))]);
}

function makePNG(size, bgR, bgG, bgB, fgR, fgG, fgB) {
  // IHDR
  const ihdr = Buffer.allocUnsafe(13);
  ihdr.writeUInt32BE(size, 0);   // width
  ihdr.writeUInt32BE(size, 4);   // height
  ihdr[8] = 8;   // bit depth
  ihdr[9] = 2;   // color type: RGB
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

  // Build raw image data — each row: filter byte (0) + RGB pixels
  // Draw a simple "N" shape in the center using fgR/fgG/fgB
  const rows = [];
  const margin = Math.floor(size * 0.2);
  const stemW = Math.max(1, Math.floor(size * 0.09));

  for (let y = 0; y < size; y++) {
    const row = Buffer.allocUnsafe(1 + size * 3);
    row[0] = 0; // filter none
    for (let x = 0; x < size; x++) {
      // Determine if this pixel is part of the "N"
      const inLeftStem = x >= margin && x < margin + stemW && y >= margin && y < size - margin;
      const inRightStem = x >= size - margin - stemW && x < size - margin && y >= margin && y < size - margin;
      // Diagonal: from top-left stem to bottom-right stem
      const diagProgress = (y - margin) / (size - 2 * margin);
      const diagX = margin + stemW + Math.round(diagProgress * (size - 2 * margin - 2 * stemW));
      const inDiag = x >= diagX && x < diagX + stemW && y >= margin && y < size - margin;
      const isFg = inLeftStem || inRightStem || inDiag;

      const offset = 1 + x * 3;
      row[offset] = isFg ? fgR : bgR;
      row[offset + 1] = isFg ? fgG : bgG;
      row[offset + 2] = isFg ? fgB : bgB;
    }
    rows.push(row);
  }

  const raw = Buffer.concat(rows);
  const compressed = deflateSync(raw, { level: 9 });

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([
    signature,
    chunk("IHDR", ihdr),
    chunk("IDAT", compressed),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const outDir = join(__dirname, "../public/icons");
mkdirSync(outDir, { recursive: true });

// Background: #0F1320  Foreground: #4F8EF8
const bg = [0x0F, 0x13, 0x20];
const fg = [0x4F, 0x8E, 0xF8];

for (const size of [192, 512]) {
  const png = makePNG(size, ...bg, ...fg);
  const out = join(outDir, `icon-${size}.png`);
  writeFileSync(out, png);
  console.log(`Written ${out} (${png.length} bytes)`);
}
