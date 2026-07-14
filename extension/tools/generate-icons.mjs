/**
 * generate-icons.mjs — emits placeholder Weavn hexagon-mark PNGs into ../icons.
 *
 * Pure Node (zlib only), no deps. A pointy-top hexagon in brand purple #9D8CFF on a
 * transparent field, supersampled 3× for clean edges at 16px. Re-run with:
 *   node extension/tools/generate-icons.mjs
 * Drop your own icon-16/32/48/128.png in ../icons to replace these — the manifest
 * just references the paths.
 */
import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "icons");
mkdirSync(OUT, { recursive: true });

// Brand purple accent.
const FG = [157, 140, 255]; // #9D8CFF

// ── minimal PNG (RGBA, 8-bit, colortype 6) ────────────────────────────────────
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const t = Buffer.from(type, "ascii");
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([t, data])), 0);
  return Buffer.concat([len, t, data, crc]);
}
function encodePng(width, height, rgba) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;   // bit depth
  ihdr[9] = 6;   // color type RGBA
  // 10,11,12 = compression, filter, interlace = 0
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0; // filter: none
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  return Buffer.concat([
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ── pointy-top hexagon coverage (3× supersample) ──────────────────────────────
function hexVertices(cx, cy, r) {
  const v = [];
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 180) * (60 * i - 90); // -90° puts a vertex at top
    v.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
  }
  return v;
}
function inPoly(px, py, verts) {
  let inside = false;
  for (let i = 0, j = verts.length - 1; i < verts.length; j = i++) {
    const [xi, yi] = verts[i];
    const [xj, yj] = verts[j];
    const hit = yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi;
    if (hit) inside = !inside;
  }
  return inside;
}
function render(size) {
  const cx = size / 2;
  const cy = size / 2;
  const verts = hexVertices(cx, cy, size * 0.46);
  const rgba = Buffer.alloc(size * size * 4);
  const SS = 3;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let hits = 0;
      for (let sy = 0; sy < SS; sy++)
        for (let sx = 0; sx < SS; sx++) {
          const px = x + (sx + 0.5) / SS;
          const py = y + (sy + 0.5) / SS;
          if (inPoly(px, py, verts)) hits++;
        }
      const a = Math.round((hits / (SS * SS)) * 255);
      const o = (y * size + x) * 4;
      rgba[o] = FG[0];
      rgba[o + 1] = FG[1];
      rgba[o + 2] = FG[2];
      rgba[o + 3] = a;
    }
  }
  return encodePng(size, size, rgba);
}

for (const size of [16, 32, 48, 128]) {
  writeFileSync(join(OUT, `icon-${size}.png`), render(size));
  console.log(`wrote icons/icon-${size}.png`);
}
