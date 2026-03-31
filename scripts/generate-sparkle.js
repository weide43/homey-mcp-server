'use strict';

// Generate App Store images with cosmic purple sparkle aesthetic
// Matches the purple swirling light-arms + star sparkles style

const zlib = require('zlib');
const fs   = require('fs');
const path = require('path');

// ─── PNG utils ────────────────────────────────────────────────────────────────
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
function chunk(type, data) {
  const tb = Buffer.from(type, 'ascii');
  const lb = Buffer.allocUnsafe(4); lb.writeUInt32BE(data.length, 0);
  const cb = Buffer.allocUnsafe(4); cb.writeUInt32BE(crc32(Buffer.concat([tb, data])), 0);
  return Buffer.concat([lb, tb, data, cb]);
}
function writePNG(W, H, pixels) {
  const sig  = Buffer.from([137,80,78,71,13,10,26,10]);
  const ihdr = Buffer.allocUnsafe(13);
  ihdr.writeUInt32BE(W,0); ihdr.writeUInt32BE(H,4);
  ihdr[8]=8; ihdr[9]=6; ihdr[10]=ihdr[11]=ihdr[12]=0;
  const rowSize = 1 + W*4;
  const raw = Buffer.allocUnsafe(H * rowSize);
  for (let y = 0; y < H; y++) {
    raw[y*rowSize] = 0;
    pixels.copy(raw, y*rowSize+1, y*W*4, (y+1)*W*4);
  }
  return Buffer.concat([sig, chunk('IHDR',ihdr), chunk('IDAT',zlib.deflateSync(raw,{level:9})), chunk('IEND',Buffer.alloc(0))]);
}

// ─── Math helpers ─────────────────────────────────────────────────────────────
function clamp(v, lo=0, hi=255) { return Math.max(lo, Math.min(hi, v)); }
function lerp(a, b, t) { return a + (b - a) * t; }
// Deterministic pseudo-random (seeded)
function seededRand(seed) {
  let s = seed;
  return () => { s = (s * 1664525 + 1013904223) & 0xffffffff; return (s >>> 0) / 0xffffffff; };
}

// ─── Render one image ─────────────────────────────────────────────────────────
function render(W, H) {
  const pixels = Buffer.alloc(W * H * 4);
  const cx = W / 2, cy = H / 2;
  const maxR = Math.sqrt(cx*cx + cy*cy);

  // ── Background: deep purple radial gradient ──
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const dx = x - cx, dy = y - cy;
      const r = Math.sqrt(dx*dx + dy*dy) / maxR;
      // Center: mid-purple, edge: very dark purple
      const R = clamp(lerp(110, 40, r));
      const G = clamp(lerp(30, 8,  r));
      const B = clamp(lerp(180, 60, r));
      const o = (y*W+x)*4;
      pixels[o]=R; pixels[o+1]=G; pixels[o+2]=B; pixels[o+3]=255;
    }
  }

  // ── Swirling light arms ──
  // Each arm: a curved beam from center, fading with distance
  const NUM_ARMS = 6;
  const ARM_WIDTH = 0.18;  // radians half-width at distance 1
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const dx = x - cx, dy = y - cy;
      const dist = Math.sqrt(dx*dx + dy*dy);
      const ndist = dist / maxR;
      if (ndist > 1.0) continue;
      let angle = Math.atan2(dy, dx);

      // Swirl: rotate angle based on distance (spiral effect)
      const swirl = ndist * 1.8;
      const swirlAngle = angle - swirl;

      // Check each arm
      let armBrightness = 0;
      for (let a = 0; a < NUM_ARMS; a++) {
        const armAngle = (a / NUM_ARMS) * Math.PI * 2;
        let diff = ((swirlAngle - armAngle) % (Math.PI * 2) + Math.PI * 3) % (Math.PI * 2) - Math.PI;
        const halfW = ARM_WIDTH * (1 + ndist * 0.5);
        if (Math.abs(diff) < halfW) {
          const t = 1 - Math.abs(diff) / halfW;
          const fade = Math.pow(1 - ndist, 0.8) * t * t;
          armBrightness = Math.max(armBrightness, fade);
        }
      }

      if (armBrightness > 0) {
        const o = (y*W+x)*4;
        // Light purple/white arm color
        const boost = armBrightness * 200;
        pixels[o]   = clamp(pixels[o]   + boost * 0.85);
        pixels[o+1] = clamp(pixels[o+1] + boost * 0.55);
        pixels[o+2] = clamp(pixels[o+2] + boost * 1.0);
      }
    }
  }

  // ── Central glow ──
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const dx = x - cx, dy = y - cy;
      const dist = Math.sqrt(dx*dx + dy*dy);
      const glowR = maxR * 0.22;
      if (dist < glowR) {
        const t = 1 - dist / glowR;
        const bright = Math.pow(t, 1.5);
        const o = (y*W+x)*4;
        pixels[o]   = clamp(pixels[o]   + bright * 255 * 0.95);
        pixels[o+1] = clamp(pixels[o+1] + bright * 255 * 0.80);
        pixels[o+2] = clamp(pixels[o+2] + bright * 255 * 1.00);
      }
    }
  }

  // ── Bright core (pure white) ──
  const coreR = maxR * 0.05;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const dx = x - cx, dy = y - cy;
      const dist = Math.sqrt(dx*dx + dy*dy);
      if (dist < coreR) {
        const t = 1 - dist / coreR;
        const o = (y*W+x)*4;
        pixels[o]   = clamp(pixels[o]   + t * 255);
        pixels[o+1] = clamp(pixels[o+1] + t * 255);
        pixels[o+2] = clamp(pixels[o+2] + t * 255);
      }
    }
  }

  // ── Star sparkles ──
  const rand = seededRand(42);
  const NUM_STARS = Math.round((W * H) / 1800);
  for (let i = 0; i < NUM_STARS; i++) {
    const sx = rand() * W;
    const sy = rand() * H;
    const size = rand() < 0.15 ? (rand() * 3 + 2) : (rand() * 1.5 + 0.5);
    const brightness = rand() * 180 + 75;
    const armLen = size * 3.5;

    // Draw 4-pointed cross sparkle
    for (let d = -armLen; d <= armLen; d += 0.5) {
      const fade = Math.pow(1 - Math.abs(d) / armLen, 2);
      const b = Math.round(brightness * fade);
      // Horizontal arm
      const hx = Math.round(sx + d), hy = Math.round(sy);
      if (hx >= 0 && hx < W && hy >= 0 && hy < H) {
        const o = (hy*W+hx)*4;
        pixels[o]   = clamp(pixels[o]   + b);
        pixels[o+1] = clamp(pixels[o+1] + b * 0.85);
        pixels[o+2] = clamp(pixels[o+2] + b);
      }
      // Vertical arm
      const vx = Math.round(sx), vy = Math.round(sy + d);
      if (vx >= 0 && vx < W && vy >= 0 && vy < H) {
        const o = (vy*W+vx)*4;
        pixels[o]   = clamp(pixels[o]   + b);
        pixels[o+1] = clamp(pixels[o+1] + b * 0.85);
        pixels[o+2] = clamp(pixels[o+2] + b);
      }
    }
  }

  return pixels;
}

// ─── Output ───────────────────────────────────────────────────────────────────
const outDir = path.join(__dirname, '..', 'assets', 'images');
fs.mkdirSync(outDir, { recursive: true });

for (const [name, W, H] of [['small',250,175], ['large',500,350], ['xlarge',1000,700]]) {
  const pixels = render(W, H);
  const buf = writePNG(W, H, pixels);
  fs.writeFileSync(path.join(outDir, `${name}.png`), buf);
  console.log(`  ${name}.png (${W}×${H}) written`);
}
