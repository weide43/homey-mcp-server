'use strict';

const zlib = require('zlib');
const fs   = require('fs');
const path = require('path');

// ─── PNG encoder ──────────────────────────────────────────────────────────────
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    t[i] = c;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function pngChunk(type, data) {
  const tb = Buffer.from(type, 'ascii');
  const lb = Buffer.allocUnsafe(4); lb.writeUInt32BE(data.length, 0);
  const cb = Buffer.allocUnsafe(4); cb.writeUInt32BE(crc32(Buffer.concat([tb, data])), 0);
  return Buffer.concat([lb, tb, data, cb]);
}
function encodePNG(W, H, img) {
  const sig  = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.allocUnsafe(13);
  ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = ihdr[11] = ihdr[12] = 0;
  const rowSize = 1 + W * 4;
  const raw = Buffer.allocUnsafe(H * rowSize);
  for (let y = 0; y < H; y++) {
    raw[y * rowSize] = 0;
    for (let x = 0; x < W; x++) {
      const p = img[y * W + x], o = y * rowSize + 1 + x * 4;
      raw[o] = p[0]; raw[o+1] = p[1]; raw[o+2] = p[2]; raw[o+3] = p[3];
    }
  }
  return Buffer.concat([sig,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    pngChunk('IEND', Buffer.alloc(0))]);
}

// ─── Math helpers ─────────────────────────────────────────────────────────────
const dist  = (x1, y1, x2, y2) => Math.sqrt((x1-x2)**2 + (y1-y2)**2);
const lerp  = (a, b, t) => a + (b - a) * t;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// Blend src RGBA onto dst pixel (additive for glow effects)
function blendAdd(dst, r, g, b, a) {
  const fa = a / 255;
  dst[0] = Math.min(255, dst[0] + Math.round(r * fa));
  dst[1] = Math.min(255, dst[1] + Math.round(g * fa));
  dst[2] = Math.min(255, dst[2] + Math.round(b * fa));
  dst[3] = Math.min(255, dst[3] + Math.round(255 * fa));
}
function blendAlpha(dst, r, g, b, a) {
  const fa = a / 255, ba = 1 - fa;
  dst[0] = Math.round(dst[0] * ba + r * fa);
  dst[1] = Math.round(dst[1] * ba + g * fa);
  dst[2] = Math.round(dst[2] * ba + b * fa);
  dst[3] = Math.min(255, dst[3] + Math.round(a * fa));
}

// ─── Seeded pseudo-random (deterministic) ────────────────────────────────────
function makeRng(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 0xffffffff; };
}

// ─── Draw a soft glowing point ───────────────────────────────────────────────
function drawGlow(img, W, H, cx, cy, radius, r, g, b, intensity) {
  const x0 = Math.max(0, Math.floor(cx - radius));
  const x1 = Math.min(W - 1, Math.ceil(cx + radius));
  const y0 = Math.max(0, Math.floor(cy - radius));
  const y1 = Math.min(H - 1, Math.ceil(cy + radius));
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const d = dist(x, y, cx, cy);
      if (d >= radius) continue;
      const t = 1 - d / radius;
      const a = Math.round(t * t * intensity * 255);
      if (a > 0) blendAdd(img[y * W + x], r, g, b, a);
    }
  }
}

// ─── Draw a 4-pointed star spike ─────────────────────────────────────────────
function drawStarSpike(img, W, H, cx, cy, r, sharpness, r_, g_, b_, alpha) {
  const x0 = Math.max(0, Math.floor(cx - r));
  const x1 = Math.min(W - 1, Math.ceil(cx + r));
  const y0 = Math.max(0, Math.floor(cy - r));
  const y1 = Math.min(H - 1, Math.ceil(cy + r));
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const dx = x - cx, dy = y - cy;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d > r + 1) continue;
      const angle = Math.atan2(dy, dx);
      const spike = Math.pow(Math.abs(Math.cos(2 * angle)), sharpness);
      const arm   = spike * Math.max(0, 1 - d / r);
      const core  = clamp(1 - d / (r * 0.08), 0, 1);
      const aa    = clamp((r + 1 - d) / 1.5, 0, 1);
      const v     = Math.max(core, arm) * aa;
      if (v > 0) blendAdd(img[y * W + x], r_, g_, b_, Math.round(v * alpha));
    }
  }
}

// ─── Draw a swirling arm segment ─────────────────────────────────────────────
// Parametric: t ∈ [0,1], spirals outward with curvature
function drawSwirlArm(img, W, H, cx, cy, maxR, startAngle, twist, armWidth, r, g, b, alpha, steps = 400) {
  for (let i = 0; i <= steps; i++) {
    const t    = i / steps;
    const rad  = t * maxR;
    const a    = startAngle + t * twist + t * t * twist * 0.4;
    const px   = cx + Math.cos(a) * rad;
    const py   = cy + Math.sin(a) * rad;
    const fade = Math.max(0, 1 - t) * (1 - t * 0.6);
    const gw   = armWidth * (1 - t * 0.7) + 0.5;
    const ia   = Math.round(fade * alpha);
    if (ia <= 0) continue;
    drawGlow(img, W, H, px, py, gw, r, g, b, ia / 255);
  }
}

// ─── Draw a thin straight ray ─────────────────────────────────────────────────
function drawRay(img, W, H, cx, cy, angle, length, width, r, g, b, alpha) {
  const steps = Math.ceil(length * 2);
  for (let i = 0; i <= steps; i++) {
    const t  = i / steps;
    const d  = t * length;
    const px = cx + Math.cos(angle) * d;
    const py = cy + Math.sin(angle) * d;
    const fade = Math.max(0, 1 - t);
    const gw = width * (1 - t * 0.85) + 0.3;
    drawGlow(img, W, H, px, py, gw, r, g, b, fade * alpha / 255);
  }
}

// ─── Main image creator ───────────────────────────────────────────────────────
function createImage(W, H) {
  const img = Array.from({ length: W * H }, () => [0, 0, 0, 255]);
  const cx = W / 2, cy = H / 2;
  const minD = Math.min(W, H);
  const rng  = makeRng(42);

  // ── 1. Deep purple background with radial vignette ─────────────────────────
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const d = dist(x, y, cx, cy) / (minD * 0.75);
      const t = clamp(d, 0, 1);
      img[y * W + x] = [
        Math.round(lerp(60,  18, t)),   // R: mid-purple → very dark
        Math.round(lerp(10,   4, t)),   // G
        Math.round(lerp(115, 40, t)),   // B
        255
      ];
    }
  }

  // ── 2. Subtle noise / star field ───────────────────────────────────────────
  const starCount = Math.round(W * H * 0.0008);
  for (let i = 0; i < starCount; i++) {
    const sx = Math.floor(rng() * W);
    const sy = Math.floor(rng() * H);
    const br = Math.round(60 + rng() * 120);
    const sz = rng() * 1.2;
    drawGlow(img, W, H, sx, sy, sz + 0.5, br, br, Math.min(255, br + 40), 0.7);
  }

  // ── 3. Four galaxy arms (swirling) ─────────────────────────────────────────
  const armR    = minD * 0.52;
  const armW    = minD * 0.022;
  const armTwist = Math.PI * 1.1;

  for (let arm = 0; arm < 4; arm++) {
    const baseAngle = (arm / 4) * Math.PI * 2 - Math.PI * 0.15;
    // main arm
    drawSwirlArm(img, W, H, cx, cy, armR, baseAngle, armTwist,
      armW, 210, 160, 255, 160, 350);
    // secondary (reverse curl)
    drawSwirlArm(img, W, H, cx, cy, armR * 0.65, baseAngle + Math.PI * 0.18, armTwist * 0.7,
      armW * 0.55, 200, 140, 255, 80, 250);
    // faint outer curl
    drawSwirlArm(img, W, H, cx, cy, armR * 0.85, baseAngle - Math.PI * 0.08, armTwist * 1.3,
      armW * 0.3, 180, 120, 255, 50, 200);
  }

  // ── 4. Thin straight rays from centre ──────────────────────────────────────
  const rayCount = 12;
  for (let i = 0; i < rayCount; i++) {
    const angle  = (i / rayCount) * Math.PI * 2;
    const length = minD * (0.25 + (i % 3 === 0 ? 0.20 : 0.08));
    const width  = minD * (i % 3 === 0 ? 0.012 : 0.006);
    const ia     = i % 3 === 0 ? 220 : 110;
    drawRay(img, W, H, cx, cy, angle, length, width, 240, 210, 255, ia);
  }

  // ── 5. Scattered sparkle stars ─────────────────────────────────────────────
  const sparklePositions = [
    [0.18, 0.22], [0.82, 0.18], [0.12, 0.75], [0.86, 0.78],
    [0.35, 0.12], [0.68, 0.88], [0.05, 0.50], [0.95, 0.44],
    [0.25, 0.85], [0.75, 0.14], [0.42, 0.95], [0.60, 0.07],
  ];
  for (const [fx, fy] of sparklePositions) {
    const sx = fx * W, sy = fy * H;
    const sr = minD * (0.018 + rng() * 0.022);
    const bright = 160 + Math.round(rng() * 80);
    drawStarSpike(img, W, H, sx, sy, sr, 7, bright, bright, 255, 200);
    drawGlow(img, W, H, sx, sy, sr * 1.8, 200, 160, 255, 0.25);
  }

  // ── 6. Central glow (large soft halo) ──────────────────────────────────────
  drawGlow(img, W, H, cx, cy, minD * 0.45, 140, 60, 255, 0.35);
  drawGlow(img, W, H, cx, cy, minD * 0.25, 180, 100, 255, 0.45);
  drawGlow(img, W, H, cx, cy, minD * 0.12, 220, 160, 255, 0.65);
  drawGlow(img, W, H, cx, cy, minD * 0.05, 255, 230, 255, 0.90);

  // ── 7. Central bright star burst ───────────────────────────────────────────
  const starR = minD * 0.18;
  drawStarSpike(img, W, H, cx, cy, starR,       9, 255, 250, 255, 240);
  drawStarSpike(img, W, H, cx, cy, starR * 1.3, 6, 240, 200, 255, 140);

  // ── 8. Bright white core ───────────────────────────────────────────────────
  drawGlow(img, W, H, cx, cy, minD * 0.028, 255, 255, 255, 1.0);
  drawGlow(img, W, H, cx, cy, minD * 0.012, 255, 255, 255, 1.0);

  return encodePNG(W, H, img);
}

// ─── Icon: transparent background, sparkle only ──────────────────────────────
function createIconPNG(S) {
  const img = Array.from({ length: S * S }, () => [0, 0, 0, 0]);
  const cx = S / 2, cy = S / 2;

  // Outer glow halo (semi-transparent purple)
  drawGlow(img, S, S, cx, cy, S * 0.48, 140, 60, 255, 0.30);
  drawGlow(img, S, S, cx, cy, S * 0.30, 180, 100, 255, 0.50);
  drawGlow(img, S, S, cx, cy, S * 0.18, 220, 160, 255, 0.70);

  // 4-pointed star
  drawStarSpike(img, S, S, cx, cy, S * 0.42, 9, 255, 250, 255, 240);
  drawStarSpike(img, S, S, cx, cy, S * 0.55, 6, 240, 200, 255, 130);

  // Bright core
  drawGlow(img, S, S, cx, cy, S * 0.06, 255, 255, 255, 1.0);
  drawGlow(img, S, S, cx, cy, S * 0.025, 255, 255, 255, 1.0);

  return encodePNG(S, S, img);
}

// ─── Generate all files ───────────────────────────────────────────────────────
const outDir = path.join(__dirname, '..', 'assets', 'images');
fs.mkdirSync(outDir, { recursive: true });

console.log('Generating images...\n');

// App Store landscape images: 250×175, 500×350, 1000×700
for (const [name, W, H] of [['small', 250, 175], ['large', 500, 350], ['xlarge', 1000, 700]]) {
  process.stdout.write(`  ${name}.png  (${W}×${H})... `);
  const t0 = Date.now();
  fs.writeFileSync(path.join(outDir, `${name}.png`), createImage(W, H));
  console.log(`${((Date.now() - t0) / 1000).toFixed(1)}s`);
}

// Icon PNG (square, transparent BG) — optional, SVG is primary
process.stdout.write('  icon_preview.png  (512×512)... ');
const t2 = Date.now();
fs.writeFileSync(path.join(outDir, 'icon_preview.png'), createIconPNG(512));
console.log(`${((Date.now() - t2) / 1000).toFixed(1)}s`);

console.log('\nDone! Files in assets/images/');
