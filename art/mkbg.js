// Plain 1080x1080 mosaic (no text) for the video background.
const sharp = require("sharp");
const path = require("path");
const IMG_DIR = path.join(__dirname, "..", "public", "nft", "images");
const OUT = "/tmp/mocks/video/bg.png";

(async () => {
  const tile = 36, cols = 30, rows = 30; // 900 tiles
  const W = cols * tile, H = rows * tile;
  const ids = [];
  for (let i = 0; i < cols * rows; i++) ids.push((i % 999) + 1);
  let seed = 99;
  const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  for (let i = ids.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [ids[i], ids[j]] = [ids[j], ids[i]]; }
  const cache = new Map();
  const buf = async (id) => {
    if (cache.has(id)) return cache.get(id);
    const b = await sharp(path.join(IMG_DIR, `${id}.png`)).resize(tile, tile, { kernel: "nearest" }).toBuffer();
    cache.set(id, b); return b;
  };
  const comps = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++)
    comps.push({ input: await buf(ids[r * cols + c]), left: c * tile, top: r * tile });
  await sharp({ create: { width: W, height: H, channels: 4, background: { r: 7, g: 9, b: 10, alpha: 1 } } })
    .composite(comps).png().toFile(OUT);
  console.log("wrote", OUT, `${W}x${H}`);
})();
