'use strict';

// Scale and convert the source logo PNG to the required App Store sizes
// Handles 1-bit paletted PNGs

const zlib = require('zlib');
const fs   = require('fs');
const path = require('path');

// ─── PNG encoder (RGBA output) ────────────────────────────────────────────────
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
function encodePNG(W, H, pixels) {
  // pixels: Uint8Array of W*H*4 bytes (RGBA)
  const sig  = Buffer.from([137,80,78,71,13,10,26,10]);
  const ihdr = Buffer.allocUnsafe(13);
  ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4);
  ihdr[8]=8; ihdr[9]=6; ihdr[10]=ihdr[11]=ihdr[12]=0;
  const rowLen = 1 + W*4;
  const raw = Buffer.allocUnsafe(H * rowLen);
  for (let y = 0; y < H; y++) {
    raw[y*rowLen] = 0;
    pixels.copy(raw, y*rowLen+1, y*W*4, (y+1)*W*4);
  }
  return Buffer.concat([sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0))]);
}

// ─── PNG decoder (handles 1-bit paletted PNGs) ────────────────────────────────
function decodePNG(buf) {
  // Parse chunks
  const chunks = {};
  let i = 8;
  while (i < buf.length) {
    const len  = buf.readUInt32BE(i);
    const type = buf.slice(i+4, i+8).toString('ascii');
    const data = buf.slice(i+8, i+8+len);
    if (!chunks[type]) chunks[type] = [];
    chunks[type].push(data);
    i += 12 + len;
  }

  const ihdr     = chunks['IHDR'][0];
  const W        = ihdr.readUInt32BE(0);
  const H        = ihdr.readUInt32BE(4);
  const bitDepth = ihdr[8];
  const colorType = ihdr[9];

  // Build IDAT
  const idatBuf = Buffer.concat(chunks['IDAT']);
  const raw     = zlib.inflateSync(idatBuf);

  // Build palette for color type 3
  let palette = null;
  if (colorType === 3 && chunks['PLTE']) {
    palette = chunks['PLTE'][0]; // R,G,B triples
  }

  // Decode to RGBA
  const pixels = Buffer.alloc(W * H * 4);
  const samplesPerByte = 8 / bitDepth;
  const bytesPerRow = colorType === 3
    ? Math.ceil(W * bitDepth / 8) + 1 // +1 for filter byte
    : W * 4 + 1;

  let prev = Buffer.alloc(bytesPerRow - 1);
  let rawPos = 0;

  for (let y = 0; y < H; y++) {
    const filter  = raw[rawPos++];
    const rowBytes = Math.ceil(W * bitDepth / 8);
    const scanline = Buffer.alloc(rowBytes);
    raw.copy(scanline, 0, rawPos, rawPos + rowBytes);
    rawPos += rowBytes;

    // Apply PNG filter
    const bpp = Math.max(1, Math.ceil(bitDepth / 8));
    if (filter === 0) {
      // None
    } else if (filter === 1) {
      for (let x = bpp; x < rowBytes; x++) scanline[x] = (scanline[x] + scanline[x-bpp]) & 0xff;
    } else if (filter === 2) {
      for (let x = 0; x < rowBytes; x++) scanline[x] = (scanline[x] + prev[x]) & 0xff;
    } else if (filter === 3) {
      for (let x = 0; x < rowBytes; x++) {
        const a = x >= bpp ? scanline[x-bpp] : 0;
        scanline[x] = (scanline[x] + Math.floor((a + prev[x]) / 2)) & 0xff;
      }
    } else if (filter === 4) {
      for (let x = 0; x < rowBytes; x++) {
        const a = x >= bpp ? scanline[x-bpp] : 0;
        const b = prev[x];
        const c = x >= bpp ? prev[x-bpp] : 0;
        const p = a + b - c;
        const pa = Math.abs(p-a), pb = Math.abs(p-b), pc = Math.abs(p-c);
        scanline[x] = (scanline[x] + (pa<=pb && pa<=pc ? a : pb<=pc ? b : c)) & 0xff;
      }
    }
    prev = Buffer.from(scanline);

    // Expand bits to RGBA
    for (let x = 0; x < W; x++) {
      let r=0, g=0, b=0, a=255;
      if (colorType === 3) {
        // Paletted
        const byteIdx = Math.floor(x * bitDepth / 8);
        const bitShift = 8 - bitDepth - (x * bitDepth % 8);
        const mask = (1 << bitDepth) - 1;
        const idx  = (scanline[byteIdx] >> bitShift) & mask;
        r = palette[idx*3]; g = palette[idx*3+1]; b = palette[idx*3+2];
      }
      const o = (y * W + x) * 4;
      pixels[o]=r; pixels[o+1]=g; pixels[o+2]=b; pixels[o+3]=a;
    }
  }
  return { W, H, pixels };
}

// ─── Bilinear scale ───────────────────────────────────────────────────────────
function scaleImage(src, srcW, srcH, dstW, dstH) {
  const dst = Buffer.alloc(dstW * dstH * 4);
  const xr  = srcW / dstW;
  const yr  = srcH / dstH;
  for (let dy = 0; dy < dstH; dy++) {
    const sy  = dy * yr;
    const sy0 = Math.min(Math.floor(sy), srcH-1);
    const sy1 = Math.min(sy0+1, srcH-1);
    const fy  = sy - sy0;
    for (let dx = 0; dx < dstW; dx++) {
      const sx  = dx * xr;
      const sx0 = Math.min(Math.floor(sx), srcW-1);
      const sx1 = Math.min(sx0+1, srcW-1);
      const fx  = sx - sx0;
      for (let c = 0; c < 4; c++) {
        const tl = src[(sy0*srcW+sx0)*4+c];
        const tr = src[(sy0*srcW+sx1)*4+c];
        const bl = src[(sy1*srcW+sx0)*4+c];
        const br = src[(sy1*srcW+sx1)*4+c];
        dst[(dy*dstW+dx)*4+c] = Math.round(
          tl*(1-fx)*(1-fy) + tr*fx*(1-fy) + bl*(1-fx)*fy + br*fx*fy
        );
      }
    }
  }
  return dst;
}

// ─── Main ─────────────────────────────────────────────────────────────────────
const src  = fs.readFileSync(path.join(__dirname, '..', 'assets', 'source-logo.jpg'));
const {W: srcW, H: srcH, pixels: srcPx} = decodePNG(src);
console.log(`Source: ${srcW}×${srcH}`);

const outDir = path.join(__dirname, '..', 'assets', 'images');
fs.mkdirSync(outDir, { recursive: true });

for (const [name, dstW, dstH] of [['small',250,175],['large',500,350],['xlarge',1000,700]]) {
  const scaled = scaleImage(srcPx, srcW, srcH, dstW, dstH);
  const buf = encodePNG2(dstW, dstH, scaled);
  fs.writeFileSync(path.join(outDir, `${name}.png`), buf);
  console.log(`  ${name}.png (${dstW}×${dstH}) written`);
}

function encodePNG2(W, H, pixels) {
  // pixels: flat Buffer of W*H*4 RGBA bytes
  const sig = Buffer.from([137,80,78,71,13,10,26,10]);
  const ihdr = Buffer.allocUnsafe(13);
  ihdr.writeUInt32BE(W,0); ihdr.writeUInt32BE(H,4);
  ihdr[8]=8; ihdr[9]=6; ihdr[10]=ihdr[11]=ihdr[12]=0;
  const rowSize = 1+W*4;
  const raw = Buffer.allocUnsafe(H*rowSize);
  for (let y=0;y<H;y++) {
    raw[y*rowSize]=0;
    pixels.copy(raw, y*rowSize+1, y*W*4, (y+1)*W*4);
  }
  return Buffer.concat([sig,chunk('IHDR',ihdr),chunk('IDAT',zlib.deflateSync(raw,{level:9})),chunk('IEND',Buffer.alloc(0))]);
}
