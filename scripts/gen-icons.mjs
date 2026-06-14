/**
 * gen-icons.mjs — derive the app icons from the single-source favicon SVG.
 *
 * Source of truth: public/weavn-favicon.svg (transparent, white core + faint rings).
 * The transparent/white-core mark vanishes on light browser tabs and light iOS home
 * screens, so every rasterized icon is composited onto the site's near-black tile
 * (#050810). Run:  node scripts/gen-icons.mjs
 *
 * Outputs (App Router file convention):
 *   app/icon.svg        favicon SVG + dark background rect (legible in light chrome)
 *   app/favicon.ico     16/32/48 PNG-in-ICO, dark tile
 *   app/apple-icon.png  180x180, dark tile (iOS rounds the corners)
 */
import sharp from 'sharp'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const SRC = resolve(root, 'public/weavn-favicon.svg')
const DARK = { r: 5, g: 8, b: 16, alpha: 1 } // #050810 — site near-black surface
const svg = readFileSync(SRC)

// 1. Rasterize the mark at high resolution on a transparent canvas, then trim the
//    transparent padding to a tight bbox so we control the margin ourselves.
const raw = await sharp(svg, { density: 300 }).png().toBuffer()
const trimmed = await sharp(raw).trim({ threshold: 8 }).png().toBuffer()

/** Mark centered on a dark square tile of `px`, occupying `innerRatio` of it. */
async function tile(px, innerRatio) {
  const inner = Math.round(px * innerRatio)
  const mark = await sharp(trimmed)
    .resize(inner, inner, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer()
  return sharp({ create: { width: px, height: px, channels: 4, background: DARK } })
    .composite([{ input: mark, gravity: 'center' }])
    .png()
    .toBuffer()
}

/** Assemble PNG buffers into a PNG-in-ICO container (valid for all modern browsers). */
function buildIco(images) {
  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0) // reserved
  header.writeUInt16LE(1, 2) // type: 1 = icon
  header.writeUInt16LE(images.length, 4)
  const dir = Buffer.alloc(16 * images.length)
  let offset = 6 + 16 * images.length
  images.forEach(({ size, buf }, i) => {
    const e = dir.subarray(i * 16, i * 16 + 16)
    e.writeUInt8(size >= 256 ? 0 : size, 0) // width  (0 means 256)
    e.writeUInt8(size >= 256 ? 0 : size, 1) // height
    e.writeUInt8(0, 2) // palette count
    e.writeUInt8(0, 3) // reserved
    e.writeUInt16LE(1, 4) // color planes
    e.writeUInt16LE(32, 6) // bits per pixel
    e.writeUInt32LE(buf.length, 8) // image byte size
    e.writeUInt32LE(offset, 12) // offset from file start
    offset += buf.length
  })
  return Buffer.concat([header, dir, ...images.map((p) => p.buf)])
}

// 2. apple-icon.png — 180x180, dark tile (extra margin: iOS rounds the corners).
writeFileSync(resolve(root, 'app/apple-icon.png'), await tile(180, 0.72))

// 3. favicon.ico — 16/32/48 on dark tiles (slightly fuller for small-size legibility).
const ico = []
for (const s of [16, 32, 48]) ico.push({ size: s, buf: await tile(s, 0.82) })
writeFileSync(resolve(root, 'app/favicon.ico'), buildIco(ico))

// 4. app/icon.svg — the favicon SVG with a dark background rect behind the mark so it
//    reads against light browser chrome. viewBox is "62 168 76 68".
const darkRect = '<rect x="62" y="168" width="76" height="68" fill="#050810"/>'
const iconSvg = svg.toString().replace('</defs>', `</defs>\n  ${darkRect}`)
writeFileSync(resolve(root, 'app/icon.svg'), iconSvg)

console.log('icons generated: app/icon.svg, app/favicon.ico, app/apple-icon.png')
