"use strict";

const SIZE = 32; // logical pixel grid (32x32, matching the reference art)

class Canvas {
  constructor(size = SIZE) {
    this.size = size;
    this.data = new Array(size * size).fill(null); // hex strings or null
  }

  inb(x, y) {
    return x >= 0 && y >= 0 && x < this.size && y < this.size;
  }

  set(x, y, color) {
    if (!color) return;
    if (!this.inb(x, y)) return;
    this.data[y * this.size + x] = color;
  }

  get(x, y) {
    if (!this.inb(x, y)) return null;
    return this.data[y * this.size + x];
  }

  // Paint (x,y) and its mirror across the vertical center axis.
  setSym(x, y, color) {
    this.set(x, y, color);
    this.set(this.size - 1 - x, y, color);
  }

  rect(x0, y0, x1, y1, color) {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) this.set(x, y, color);
  }

  rectSym(x0, y0, x1, y1, color) {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) this.setSym(x, y, color);
  }

  // Draw a layer given as an array of equal-length strings.
  // `map` maps each character to a color (or null to skip). '.' is always skipped.
  stamp(rows, map, ox = 0, oy = 0) {
    for (let j = 0; j < rows.length; j++) {
      const row = rows[j];
      for (let i = 0; i < row.length; i++) {
        const ch = row[i];
        if (ch === "." || ch === " ") continue;
        const color = map[ch];
        if (color) this.set(ox + i, oy + j, color);
      }
    }
  }

  fillBackground(color) {
    for (let i = 0; i < this.data.length; i++) if (this.data[i] === null) this.data[i] = color;
  }

  // Produce an RGBA buffer (Uint8) for the logical grid.
  toRGBA() {
    const buf = Buffer.alloc(this.size * this.size * 4);
    for (let i = 0; i < this.data.length; i++) {
      const c = this.data[i] || "#00000000";
      const { r, g, b, a } = hexToRgba(c);
      buf[i * 4] = r;
      buf[i * 4 + 1] = g;
      buf[i * 4 + 2] = b;
      buf[i * 4 + 3] = a;
    }
    return buf;
  }
}

function hexToRgba(hex) {
  let h = hex.replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const a = h.length >= 8 ? parseInt(h.slice(6, 8), 16) : 255;
  return { r, g, b, a };
}

// Deterministic PRNG (mulberry32) seeded from a 32-bit integer.
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// FNV-1a hash of a string -> 32-bit int (for seeding).
function hashSeed(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

module.exports = { Canvas, SIZE, mulberry32, hashSeed };
