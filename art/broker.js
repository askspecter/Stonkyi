"use strict";
// StonkInu — flat full-body pixel broker (head + suit + hanging tie + briefcase),
// in the classic blocky NFT-broker style. 28x28 grid, flat clean colors.

const fs = require("fs");
const path = require("path");
const sharp = require("sharp");
const { Canvas, mulberry32, hashSeed } = require("./lib/canvas");

const N = 28;
const OUT_PX = 560; // 20x
const OUTLINE = "#0e0e12";
const SHIRT = "#EDEDED";
const GLOBAL_SEED = "stonkinu-B1";

// ── Palettes ─────────────────────────────────────────────────────────────────
const BG = [
  ["Charcoal", 16, "#20242B"], ["Ink", 14, "#15181E"], ["Forest", 12, "#1E3A2A"],
  ["Grape", 11, "#2E2340"], ["Navy", 11, "#1B2740"], ["Maroon", 9, "#3A1E24"],
  ["Slate", 10, "#38414C"], ["Teal", 8, "#123536"], ["Sky", 5, "#5E7A98"], ["Acid", 4, "#6E8A2E"],
];
const FUR = [
  ["Gray", 18, { base: "#9AA3AC", shadow: "#6E767F", muzzle: "#E9ECEF" }],
  ["Cream", 15, { base: "#E7CFA6", shadow: "#C29E6E", muzzle: "#F7EEDD" }],
  ["Ash", 13, { base: "#6E7681", shadow: "#4C525B", muzzle: "#CFD4DA" }],
  ["Red Sesame", 13, { base: "#D9803B", shadow: "#AC5F26", muzzle: "#F1D2AC" }],
  ["Kuro", 11, { base: "#2C2E36", shadow: "#191A20", muzzle: "#B9A47C" }],
  ["Tan", 10, { base: "#C08A4E", shadow: "#946734", muzzle: "#EBD6B4" }],
  ["White", 8, { base: "#E9E9E9", shadow: "#BFBFBF", muzzle: "#FFFFFF" }],
  ["Zombie", 4, { base: "#7FB36B", shadow: "#537F3F", muzzle: "#CFE3BC" }],
  ["Frost", 3, { base: "#6D8FD6", shadow: "#47619C", muzzle: "#C3D2F0" }],
];
const SUIT = [
  ["Black", 20, "#181A20"], ["Charcoal", 16, "#2A2D34"], ["Navy", 14, "#232E4A"],
  ["Forest", 12, "#22402C"], ["Grape", 10, "#3A2B54"], ["Slate", 9, "#454E59"],
  ["Teal", 8, "#1E4E4C"], ["Maroon", 7, "#4A2028"], ["Rainbow", 4, "__rainbow__"],
];
const TIE = [
  ["Gold", 16, "#E8B84B"], ["Red", 15, "#D53E36"], ["Acid", 12, "#8FE04B"],
  ["Blue", 13, "#3E86D6"], ["Green", 11, "#39A65A"], ["Grape", 9, "#8A5BD0"],
  ["Pink", 8, "#E876B0"], ["Orange", 8, "#E8822E"], ["Silver", 5, "#C7CDD4"], ["Rainbow", 3, "__rainbow__"],
];
const EYES = [
  ["Sunglasses", 30, "sunglasses"], ["Normal", 20, "normal"], ["Angry", 14, "angry"],
  ["3D", 10, "threeD"], ["Stonk", 9, "stonk"], ["Wide", 8, "wide"], ["Laser", 5, "laser"], ["Visor", 4, "visor"],
];
const HAT = [
  ["None", 30, "none"], ["Cap", 16, "cap"], ["Fedora", 12, "fedora"], ["Beanie", 11, "beanie"],
  ["Spikes", 10, "spikes"], ["Top Hat", 8, "tophat"], ["Crown", 5, "crown"], ["Halo", 4, "halo"],
];
const BRIEF = [
  ["None", 44, null], ["Gold", 16, "#E8B84B"], ["Green", 14, "#39A65A"], ["Red", 12, "#D53E36"],
  ["Blue", 9, "#3E86D6"], ["Silver", 5, "#C7CDD4"],
];
const RAINBOW = ["#e23b3b", "#e8822e", "#e8c84b", "#3e9e57", "#3b6fb0", "#7e4fa8"];

function pick(table, rng) {
  const total = table.reduce((s, e) => s + e[1], 0);
  let r = rng() * total;
  for (const e of table) { r -= e[1]; if (r <= 0) return e; }
  return table[table.length - 1];
}

// Outline: any painted pixel touching empty space gets a dark border pixel.
function outlineRegion(c) {
  const pts = [];
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    if (!c.get(x, y)) continue;
    for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]])
      if (!c.get(x + dx, y + dy)) pts.push([x + dx, y + dy]);
  }
  for (const [x, y] of pts) if (!c.get(x, y)) c.set(x, y, OUTLINE);
}

// ── Head (rows 0-15) — Shiba Inu: big triangular ears, wide cream muzzle ──────
function drawHead(c, fur) {
  const F = fur.base, S = fur.shadow, M = fur.muzzle;
  // Big pointed Shiba ears (triangles) with cream inner.
  // Left ear
  c.set(8, 0, F);
  c.rect(7, 1, 9, 1, F);
  c.rect(6, 2, 10, 4, F);
  c.rect(8, 2, 9, 3, M); // inner ear
  c.set(8, 3, S);
  // Right ear (mirror)
  c.set(19, 0, F);
  c.rect(18, 1, 20, 1, F);
  c.rect(17, 2, 21, 4, F);
  c.rect(18, 2, 19, 3, M);
  c.set(19, 3, S);
  // Head (rounded block)
  c.rect(9, 4, 18, 4, F);
  c.rect(8, 5, 19, 9, F);
  c.rect(9, 10, 18, 13, F);
  c.rect(18, 5, 18, 8, S); // right cheek shadow
  // Cream eyebrow dots (classic Shiba markings)
  c.rect(9, 6, 10, 6, M);
  c.rect(17, 6, 18, 6, M);
  // Wide cream muzzle that flares out to the cheeks
  c.rect(10, 9, 17, 14, M);
  c.rect(9, 10, 18, 13, M);
  c.rect(8, 11, 8, 13, M); c.rect(19, 11, 19, 13, M); // cheek flare
  c.set(7, 12, M); c.set(20, 12, M);
  outlineRegion(c);
}

const EYE = {
  normal(c) { for (const ex of [9, 16]) { c.rect(ex, 7, ex + 2, 8, "#fff"); c.rect(ex + 1, 7, ex + 2, 8, OUTLINE); } },
  angry(c) { for (const ex of [9, 16]) { c.rect(ex, 8, ex + 2, 8, "#fff"); c.set(ex + 2, 8, OUTLINE); c.rect(ex, 7, ex + 2, 7, OUTLINE); } },
  wide(c) { for (const ex of [9, 16]) { c.rect(ex, 6, ex + 2, 8, "#fff"); c.rect(ex + 1, 7, ex + 1, 8, OUTLINE); } },
  stonk(c) { for (const ex of [9, 16]) { c.rect(ex, 7, ex + 2, 7, "#7dff4d"); c.set(ex + 1, 6, "#7dff4d"); c.set(ex + 1, 8, "#7dff4d"); } },
  laser(c) { for (const ex of [9, 16]) { c.rect(ex, 7, ex + 2, 8, "#ff4d4d"); c.set(ex, 7, "#ffd0d0"); } },
  sunglasses(c) {
    c.rect(8, 7, 11, 9, OUTLINE); c.rect(16, 7, 19, 9, OUTLINE); c.rect(12, 7, 15, 7, OUTLINE);
    for (const [x, y] of [[9, 8], [10, 8], [9, 7]]) c.set(x, y, "#E8B84B");
    for (const [x, y] of [[17, 8], [18, 8], [18, 7]]) c.set(x, y, "#E8B84B");
  },
  threeD(c) { c.rect(8, 7, 11, 9, "#ff2a2acc"); c.rect(16, 7, 19, 9, "#2a6bffcc"); c.rect(8, 7, 19, 7, OUTLINE); c.rect(12, 7, 15, 7, OUTLINE); },
  visor(c) { c.rect(7, 7, 20, 8, "#1fd0c0"); c.rect(7, 7, 20, 7, "#0e6f66"); c.rect(7, 9, 20, 9, "#14514b"); },
};

function drawNoseMouth(c) {
  c.rect(13, 10, 14, 11, OUTLINE); // nose
  c.rect(13, 12, 14, 12, OUTLINE); // philtrum
  // Shiba smile — two curves drooping from the philtrum
  c.set(12, 13, OUTLINE); c.set(11, 12, OUTLINE);
  c.set(15, 13, OUTLINE); c.set(16, 12, OUTLINE);
}

// ── Body (rows 14-27): jacket + shirt + wide tie + cuffs ─────────────────────
function drawBody(c, suit, tie) {
  const col = (x) => (suit.rainbow ? RAINBOW[Math.floor((x - 3) / 4) % 6] : suit.color);
  for (let x = 3; x <= 24; x++) {
    const top = x <= 5 || x >= 22 ? 19 : x <= 8 || x >= 19 ? 17 : 15;
    for (let y = top; y <= 27; y++) c.set(x, y, col(x));
  }
  outlineRegion(c);
  // White shirt collar V
  c.rect(11, 15, 16, 16, SHIRT);
  c.set(10, 16, SHIRT); c.set(17, 16, SHIRT);
  c.rect(12, 17, 15, 17, SHIRT);
  // Lapel outline
  c.set(10, 17, OUTLINE); c.set(17, 17, OUTLINE);
  c.set(9, 18, OUTLINE); c.set(18, 18, OUTLINE);
  c.set(10, 18, OUTLINE); c.set(17, 18, OUTLINE);
  // Tie (4 wide, symmetric cols 12-15)
  const tcol = (y) => (tie.rainbow ? RAINBOW[y % 6] : tie.color);
  c.rect(12, 17, 15, 18, tcol(0)); // knot
  for (let y = 19; y <= 24; y++) c.rect(12, y, 15, y, tcol(y));
  c.rect(13, 25, 14, 26, tcol(9)); // taper
  // Cuffs
  c.rect(5, 25, 7, 27, SHIRT); c.rect(20, 25, 22, 27, SHIRT);
  c.rect(5, 25, 7, 25, "#cfcfcf"); c.rect(20, 25, 22, 25, "#cfcfcf");
}

function drawBriefcase(c, color) {
  if (!color) return;
  c.rect(1, 23, 7, 27, color);
  c.rect(1, 23, 7, 23, OUTLINE);
  c.rect(1, 23, 1, 27, OUTLINE);
  c.set(7, 24, OUTLINE); c.set(7, 26, OUTLINE);
  c.rect(3, 21, 5, 22, OUTLINE); c.set(3, 22, color); c.set(4, 22, color); c.set(5, 22, color);
  c.rect(3, 25, 4, 25, OUTLINE); // latch
}

const HATS = {
  none() {},
  cap(c) { c.rect(8, 2, 19, 4, "#D53E36"); c.rect(7, 4, 20, 4, "#D53E36"); c.rect(8, 2, 19, 2, "#e0574a"); c.rect(3, 4, 9, 5, "#a12b22"); c.set(13, 2, "#fff"); c.set(14, 2, "#fff"); },
  fedora(c) { c.rect(9, 1, 18, 3, "#4A4E57"); c.rect(5, 4, 22, 5, "#3A3E46"); c.rect(9, 3, 18, 3, "#c99b3a"); },
  beanie(c) { c.rect(8, 2, 19, 4, "#2f6e43"); c.rect(7, 4, 20, 5, "#245536"); c.rect(13, 0, 14, 1, "#eee"); },
  spikes(c) { for (const x of [8, 11, 13, 15, 18]) { c.set(x, 1, "#D53E36"); c.rect(x, 2, x, 3, "#D53E36"); } },
  tophat(c) { c.rect(9, 0, 18, 3, "#141418"); c.rect(9, 2, 18, 3, "#D53E36"); c.rect(5, 4, 22, 4, "#141418"); },
  crown(c) { c.rect(9, 2, 18, 4, "#E8B84B"); for (const x of [9, 12, 15, 18]) c.set(x, 1, "#E8B84B"); c.set(13, 3, "#D53E36"); c.set(14, 3, "#3b6fb0"); },
  halo(c) { c.rect(10, 0, 17, 0, "#ffe98a"); c.set(9, 1, "#ffe98a"); c.set(18, 1, "#ffe98a"); },
};

function buildTraits(id, salt = 0) {
  const rng = mulberry32(hashSeed(`${GLOBAL_SEED}:${id}:${salt}`));
  return {
    bg: pick(BG, rng), fur: pick(FUR, rng), eyes: pick(EYES, rng), suit: pick(SUIT, rng),
    tie: pick(TIE, rng), hat: pick(HAT, rng), brief: pick(BRIEF, rng),
  };
}
const keyOf = (t) => [t.bg[0], t.fur[0], t.eyes[0], t.suit[0], t.tie[0], t.hat[0], t.brief[0]].join("|");

function draw(t) {
  const c = new Canvas(N);
  drawHead(c, t.fur[2]);
  drawNoseMouth(c);
  EYE[t.eyes[2]](c);
  drawBody(c, { color: t.suit[2], rainbow: t.suit[2] === "__rainbow__" }, { color: t.tie[2], rainbow: t.tie[2] === "__rainbow__" });
  drawBriefcase(c, t.brief[2]);
  HATS[t.hat[2]](c);
  c.fillBackground(t.bg[2]);
  return c;
}

async function renderPNG(canvas, out) {
  await sharp(canvas.toRGBA(), { raw: { width: N, height: N, channels: 4 } })
    .resize(OUT_PX, OUT_PX, { kernel: "nearest" }).png().toFile(out);
}

async function contactSheet(files, out, cols = 5) {
  const cell = 150, rows = Math.ceil(files.length / cols), comp = [];
  for (let i = 0; i < files.length; i++) {
    const buf = await sharp(files[i]).resize(cell, cell, { kernel: "nearest" }).toBuffer();
    comp.push({ input: buf, left: (i % cols) * cell, top: Math.floor(i / cols) * cell });
  }
  await sharp({ create: { width: cols * cell, height: rows * cell, channels: 4, background: "#0a0e0a" } }).composite(comp).png().toFile(out);
}

async function main() {
  const all = process.argv.includes("--all");
  if (all) return generateAll();
  const dir = path.join(__dirname, "samples");
  fs.mkdirSync(dir, { recursive: true });
  const list = [1, 2, 3, 7, 12, 23, 42, 88, 168, 420, 555, 777, 888, 900, 999];
  for (const id of list) { const t = buildTraits(id); await renderPNG(draw(t), path.join(dir, `${id}.png`)); console.log(`#${id}: ${keyOf(t)}`); }
  await contactSheet(list.map((id) => path.join(dir, `${id}.png`)), path.join(dir, "_sheet.png"));
  console.log("wrote sheet");
}

async function generateAll() {
  const SUPPLY = 999;
  const imgDir = path.join(__dirname, "..", "web", "public", "nft", "images");
  const metaDir = path.join(__dirname, "..", "web", "data", "nft-metadata");
  fs.mkdirSync(imgDir, { recursive: true });
  fs.mkdirSync(metaDir, { recursive: true });
  const seen = new Set(); const rarity = {};
  for (let id = 1; id <= SUPPLY; id++) {
    let salt = 0; let t = buildTraits(id, 0);
    while (seen.has(keyOf(t)) && salt < 80) { salt++; t = buildTraits(id, salt); }
    seen.add(keyOf(t));
    await renderPNG(draw(t), path.join(imgDir, `${id}.png`));
    const meta = {
      name: `StonkInu Broker #${id}`,
      description: "StonkInu Broker — one of 999 broker NFTs. Each carries its own ERC-6551 wallet and earns tokenized stock from every mint.",
      image: `/nft/images/${id}.png`,
      attributes: [
        { trait_type: "Background", value: t.bg[0] }, { trait_type: "Fur", value: t.fur[0] },
        { trait_type: "Eyes", value: t.eyes[0] }, { trait_type: "Suit", value: t.suit[0] },
        { trait_type: "Tie", value: t.tie[0] }, { trait_type: "Hat", value: t.hat[0] },
        { trait_type: "Briefcase", value: t.brief[0] },
      ],
    };
    fs.writeFileSync(path.join(metaDir, `${id}`), JSON.stringify(meta, null, 2));
    for (const a of meta.attributes) { rarity[a.trait_type] = rarity[a.trait_type] || {}; rarity[a.trait_type][a.value] = (rarity[a.trait_type][a.value] || 0) + 1; }
    if (id % 100 === 0) console.log(`rendered ${id}/${SUPPLY}`);
  }
  fs.writeFileSync(path.join(__dirname, "rarity.json"), JSON.stringify(rarity, null, 2));
  console.log(`Done: ${SUPPLY} images + metadata`);
}

main().catch((e) => { console.error(e); process.exit(1); });
