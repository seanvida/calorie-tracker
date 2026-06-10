// Generate PWA icons (no dependencies) — a matcha tile with a cream "plate".
// Outputs into ./public: icon-192, icon-512, icon-maskable-512, apple-touch-icon(180).
import { writeFileSync } from "node:fs";
import { deflateSync } from "node:zlib";

const MATCHA = [62, 111, 72];   // #3E6F48
const CREAM = [251, 248, 242];  // #FBF8F2

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}
function chunk(type, data) {
  const t = Buffer.from(type);
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([t, data])), 0);
  return Buffer.concat([len, t, data, crc]);
}
function png(size, { maskable }) {
  const raw = Buffer.alloc(size * (1 + size * 4));
  const cx = size / 2, cy = size / 2;
  const round = maskable ? 0 : size * 0.22;     // corner radius (0 = full bleed)
  const plateR = size * (maskable ? 0.30 : 0.32);
  const innerR = plateR * 0.6;
  for (let y = 0; y < size; y++) {
    let o = y * (1 + size * 4);
    raw[o++] = 0; // filter
    for (let x = 0; x < size; x++) {
      let r, g, b, a = 255;
      // rounded-corner mask
      const inCorner =
        (x < round && y < round && (x - round) ** 2 + (y - round) ** 2 > round * round) ||
        (x > size - round && y < round && (x - (size - round)) ** 2 + (y - round) ** 2 > round * round) ||
        (x < round && y > size - round && (x - round) ** 2 + (y - (size - round)) ** 2 > round * round) ||
        (x > size - round && y > size - round && (x - (size - round)) ** 2 + (y - (size - round)) ** 2 > round * round);
      const d = Math.hypot(x - cx, y - cy);
      if (inCorner) { r = g = b = 0; a = 0; }
      else if (d < innerR) [r, g, b] = MATCHA;     // inner well
      else if (d < plateR) [r, g, b] = CREAM;      // plate ring
      else [r, g, b] = MATCHA;                      // tile
      raw[o++] = r; raw[o++] = g; raw[o++] = b; raw[o++] = a;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6; // 8-bit RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const out = new URL("../public/", import.meta.url);
writeFileSync(new URL("icon-192.png", out), png(192, { maskable: false }));
writeFileSync(new URL("icon-512.png", out), png(512, { maskable: false }));
writeFileSync(new URL("icon-maskable-512.png", out), png(512, { maskable: true }));
writeFileSync(new URL("apple-touch-icon.png", out), png(180, { maskable: true }));
console.log("icons written to public/");
