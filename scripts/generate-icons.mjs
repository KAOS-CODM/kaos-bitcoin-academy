/**
 * Generate the KAOS Bitcoin Academy application icons.
 *
 * The icons are drawn from scratch with a tiny built-in rasteriser and encoded as PNG, so the
 * project keeps its zero-dependency, zero-budget guarantee: no image tool, no font, and no
 * npm package is required to reproduce them.
 *
 * Run with:
 *   node scripts/generate-icons.mjs
 *
 * The output is written to `client/public/icons/`.
 */

import { deflateSync } from 'node:zlib'
import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const OUT_DIR = path.join(ROOT, 'client/public/icons')

const INK = [0x17, 0x14, 0x0f, 0xff]
const AMBER = [0xf5, 0xb9, 0x42, 0xff]
const TRANSPARENT = [0, 0, 0, 0]

const SUPERSAMPLE = 4

/** A simple RGBA canvas. */
class Canvas {
  constructor(width, height) {
    this.width = width
    this.height = height
    this.data = new Uint8Array(width * height * 4)
  }

  set(x, y, colour) {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return
    const offset = (y * this.width + x) * 4
    this.data[offset] = colour[0]
    this.data[offset + 1] = colour[1]
    this.data[offset + 2] = colour[2]
    this.data[offset + 3] = colour[3]
  }

  /** Fill a rounded rectangle with a given corner radius. */
  fillRoundedRect(x0, y0, x1, y1, radius, colour) {
    for (let y = y0; y < y1; y += 1) {
      for (let x = x0; x < x1; x += 1) {
        const dx = Math.max(x0 + radius - x, x - (x1 - 1 - radius), 0)
        const dy = Math.max(y0 + radius - y, y - (y1 - 1 - radius), 0)
        if (dx * dx + dy * dy <= radius * radius) this.set(x, y, colour)
      }
    }
  }

  /** Draw a thick line segment. */
  strokeLine(x0, y0, x1, y1, thickness, colour) {
    const dx = x1 - x0
    const dy = y1 - y0
    const lengthSquared = dx * dx + dy * dy
    const steps = Math.max(1, Math.ceil(Math.sqrt(lengthSquared)))
    const half = thickness / 2

    for (let step = 0; step <= steps; step += 1) {
      const t = step / steps
      const px = x0 + dx * t
      const py = y0 + dy * t
      for (let oy = -half; oy <= half; oy += 0.5) {
        for (let ox = -half; ox <= half; ox += 0.5) {
          if (ox * ox + oy * oy > half * half) continue
          this.set(Math.round(px + ox), Math.round(py + oy), colour)
        }
      }
    }
  }

  /** Average every SUPERSAMPLE x SUPERSAMPLE block down to one pixel. */
  downsample(factor) {
    const width = Math.floor(this.width / factor)
    const height = Math.floor(this.height / factor)
    const out = new Uint8Array(width * height * 4)

    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        let r = 0
        let g = 0
        let b = 0
        let a = 0
        for (let sy = 0; sy < factor; sy += 1) {
          for (let sx = 0; sx < factor; sx += 1) {
            const offset = ((y * factor + sy) * this.width + (x * factor + sx)) * 4
            r += this.data[offset]
            g += this.data[offset + 1]
            b += this.data[offset + 2]
            a += this.data[offset + 3]
          }
        }
        const samples = factor * factor
        const target = (y * width + x) * 4
        out[target] = Math.round(r / samples)
        out[target + 1] = Math.round(g / samples)
        out[target + 2] = Math.round(b / samples)
        out[target + 3] = Math.round(a / samples)
      }
    }

    return { width, height, data: out }
  }
}

/** Draw the KAOS "K" mark. */
function drawMark(canvas, size, glyph, background, inset) {
  canvas.fillRoundedRect(0, 0, size, size, size * 0.22, background)

  const unit = size / 100
  const left = inset * unit
  const right = (100 - inset) * unit
  const top = inset * unit
  const bottom = (100 - inset) * unit
  const stemWidth = (right - left) * 0.2
  const thickness = (right - left) * 0.17

  // Vertical stem.
  canvas.strokeLine(left + stemWidth / 2, top, left + stemWidth / 2, bottom, thickness, glyph)

  // Upper and lower diagonals.
  const jointX = left + stemWidth
  const jointY = (top + bottom) / 2
  canvas.strokeLine(jointX, jointY, right, top, thickness, glyph)
  canvas.strokeLine(jointX, jointY, right, bottom, thickness, glyph)
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n += 1) {
    let c = n
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    }
    table[n] = c >>> 0
  }
  return table
})()

function crc32(buffer) {
  let crc = 0xffffffff
  for (const byte of buffer) {
    crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8)
  }
  return (crc ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length, 0)
  const typeAndData = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(typeAndData), 0)
  return Buffer.concat([length, typeAndData, crc])
}

/** Encode raw RGBA pixels as a PNG buffer. */
function encodePng({ width, height, data }) {
  const stride = width * 4
  const raw = Buffer.alloc((stride + 1) * height)

  for (let y = 0; y < height; y += 1) {
    raw[y * (stride + 1)] = 0 // filter: none
    Buffer.from(data.buffer, y * stride, stride).copy(raw, y * (stride + 1) + 1)
  }

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // colour type: RGBA
  ihdr[10] = 0
  ihdr[11] = 0
  ihdr[12] = 0

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

function renderIcon(size, { maskable }) {
  const canvas = new Canvas(size * SUPERSAMPLE, size * SUPERSAMPLE)
  const scale = size * SUPERSAMPLE

  if (maskable) {
    // A maskable icon fills the whole square, because the platform may crop it to any
    // shape. The mark stays inside the central safe zone.
    canvas.fillRoundedRect(0, 0, scale, scale, 0, AMBER)
    drawMark(canvas, scale, INK, AMBER, 22)
  } else {
    drawMark(canvas, scale, AMBER, INK, 16)
  }

  return encodePng(canvas.downsample(SUPERSAMPLE))
}

const FAVICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" role="img" aria-label="KAOS Bitcoin Academy">
  <rect width="100" height="100" rx="22" fill="#17140f" />
  <g stroke="#f5b942" stroke-width="17" stroke-linecap="round" fill="none">
    <path d="M28 18 V82" />
    <path d="M32 50 L74 18" />
    <path d="M32 50 L74 82" />
  </g>
</svg>
`

mkdirSync(OUT_DIR, { recursive: true })

const outputs = [
  ['icon-192.png', renderIcon(192, { maskable: false })],
  ['icon-512.png', renderIcon(512, { maskable: false })],
  ['icon-maskable-512.png', renderIcon(512, { maskable: true })],
  ['favicon.svg', Buffer.from(FAVICON_SVG, 'utf8')],
]

for (const [name, buffer] of outputs) {
  writeFileSync(path.join(OUT_DIR, name), buffer)
  console.log(`wrote ${path.relative(ROOT, path.join(OUT_DIR, name))} (${buffer.length} bytes)`)
}
