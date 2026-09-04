// Build a mosaic banner: all 999 broker NFTs as tiny tiles, "StonkInu" centered.
const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

const IMG_DIR = path.join(__dirname, "..", "public", "nft", "images");
const OUT_DIR = path.join(__dirname, "..", "public");

async function build({ W, H, tile, out, title, showTag }) {
  const cols = Math.ceil(W / tile);
  const rows = Math.ceil(H / tile);
  const canvasW = cols * tile;
  const canvasH = rows * tile;
  const total = cols * rows;

  // Order: cycle through 1..999 so every character appears; shuffle a bit for variety.
  const ids = [];
  for (let i = 0; i < total; i++) ids.push((i % 999) + 1);
  // light deterministic shuffle
  let seed = 1337;
  const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }

  // Resize each tile once (cache by id).
  const cache = new Map();
  async function tileBuf(id) {
    if (cache.has(id)) return cache.get(id);
    const buf = await sharp(path.join(IMG_DIR, `${id}.png`))
      .resize(tile, tile, { kernel: "nearest" })
      .toBuffer();
    cache.set(id, buf);
    return buf;
  }

  const composites = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const id = ids[r * cols + c];
      composites.push({ input: await tileBuf(id), left: c * tile, top: r * tile });
    }
  }

  const base = sharp({
    create: { width: canvasW, height: canvasH, channels: 4, background: { r: 7, g: 9, b: 10, alpha: 1 } },
  });

  const mosaic = await base.composite(composites).png().toBuffer();

  // Overlay: dark scrim for legibility + centered wordmark + acid underline.
  const cx = canvasW / 2;
  const cy = canvasH / 2;
  const titleSize = Math.round(canvasH * 0.17);
  const tagSize = Math.round(canvasH * 0.032);
  const svg = `
  <svg width="${canvasW}" height="${canvasH}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="scrim" cx="50%" cy="50%" r="62%">
        <stop offset="0%" stop-color="#04070a" stop-opacity="0.92"/>
        <stop offset="45%" stop-color="#04070a" stop-opacity="0.78"/>
        <stop offset="100%" stop-color="#04070a" stop-opacity="0.30"/>
      </radialGradient>
      <linearGradient id="vig" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#04070a" stop-opacity="0.55"/>
        <stop offset="18%" stop-color="#04070a" stop-opacity="0"/>
        <stop offset="82%" stop-color="#04070a" stop-opacity="0"/>
        <stop offset="100%" stop-color="#04070a" stop-opacity="0.55"/>
      </linearGradient>
    </defs>
    <rect width="100%" height="100%" fill="url(#scrim)"/>
    <rect width="100%" height="100%" fill="url(#vig)"/>
    <text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="middle"
      font-family="Georgia, 'Times New Roman', serif" font-weight="700"
      font-size="${titleSize}" fill="#f2f7ee" letter-spacing="1">${title}</text>
    <rect x="${cx - titleSize * 1.2}" y="${cy + titleSize * 0.42}" width="${titleSize * 2.4}" height="4" rx="2" fill="#c8f24e"/>
    ${
      showTag
        ? `<text x="${cx}" y="${cy + titleSize * 0.78}" text-anchor="middle" dominant-baseline="middle"
      font-family="monospace" font-size="${tagSize}" fill="#9aa6a2" letter-spacing="6">999 BROKERS · ROBINHOOD CHAIN</text>`
        : ""
    }
  </svg>`;

  await sharp(mosaic)
    .composite([{ input: Buffer.from(svg), left: 0, top: 0 }])
    .png()
    .toFile(path.join(OUT_DIR, out));
  console.log("wrote", out, `${canvasW}x${canvasH}`);
}

(async () => {
  // Square-ish social card (X post / article header)
  await build({ W: 1600, H: 900, tile: 40, out: "banner-card.png", title: "StonkInu", showTag: true });
  // Wide X profile header
  await build({ W: 1500, H: 500, tile: 34, out: "banner-header.png", title: "StonkInu", showTag: true });
})();
