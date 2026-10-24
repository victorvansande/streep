const fs = require('fs');
const zlib = require('zlib');
const path = require('path');

// 1. Create clean, full-bleed Vector SVG icons (NO inner frame / NO kader in kader!)
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <!-- Tally Stroke Soft Ambient Depth -->
    <filter id="tallyShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="5" stdDeviation="5" flood-color="#3d2310" flood-opacity="0.18" />
      <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#3d2310" flood-opacity="0.08" />
    </filter>

    <!-- Warm Full-Bleed Sand / Cardboard Gradient -->
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fdf9f4" />
      <stop offset="45%" stop-color="#f5ebe0" />
      <stop offset="100%" stop-color="#e8d7c2" />
    </linearGradient>

    <!-- iOS Liquid Glass Specular Surface Sheen -->
    <linearGradient id="liquidSheen" x1="15%" y1="0%" x2="85%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.45" />
      <stop offset="40%" stop-color="#ffffff" stop-opacity="0.10" />
      <stop offset="70%" stop-color="#ffffff" stop-opacity="0.0" />
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0.08" />
    </linearGradient>

    <!-- KSA Dynamic Red Diagonal Gradient -->
    <linearGradient id="redSlashGrad" x1="0%" y1="100%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#b91c1c" />
      <stop offset="50%" stop-color="#dc2626" />
      <stop offset="100%" stop-color="#ef4444" />
    </linearGradient>

    <!-- Espresso Charcoal Ink Gradient -->
    <linearGradient id="inkGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#2a1f16" />
      <stop offset="100%" stop-color="#160f09" />
    </linearGradient>
  </defs>

  <!-- Full Bleed Edge-to-Edge Canvas Background (No floating frame!) -->
  <rect width="512" height="512" fill="url(#bgGrad)" />

  <!-- Liquid Glass Surface Sheen across full icon -->
  <rect width="512" height="512" fill="url(#liquidSheen)" />

  <!-- 5 Tally Marks Group (Centered, Clean & Minimalist) -->
  <g filter="url(#tallyShadow)">
    <!-- 4 Vertical Minimalist Tally Strokes -->
    <line x1="176" y1="138" x2="176" y2="374" stroke="url(#inkGrad)" stroke-width="26" stroke-linecap="round" />
    <line x1="228" y1="134" x2="228" y2="378" stroke="url(#inkGrad)" stroke-width="26" stroke-linecap="round" />
    <line x1="280" y1="134" x2="280" y2="378" stroke="url(#inkGrad)" stroke-width="26" stroke-linecap="round" />
    <line x1="332" y1="138" x2="332" y2="374" stroke="url(#inkGrad)" stroke-width="26" stroke-linecap="round" />

    <!-- 5th Diagonal Crossing Slash (KSA Red) -->
    <line x1="136" y1="350" x2="376" y2="160" stroke="url(#redSlashGrad)" stroke-width="30" stroke-linecap="round" />
  </g>

  <!-- Liquid Glass Specular Reflection on the Red Slash -->
  <line x1="138" y1="349" x2="374" y2="161" stroke="#ffffff" stroke-width="4" stroke-linecap="round" opacity="0.45" />
</svg>`;

// Write icon.svg and favicon.svg
fs.writeFileSync('icon.svg', svgContent, 'utf-8');
fs.writeFileSync('favicon.svg', svgContent, 'utf-8');
console.log('✓ icon.svg & favicon.svg saved (clean full-bleed)');

// 2. High-performance Anti-Aliased PNG Generator
function distToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const l2 = dx * dx + dy * dy;
  if (l2 === 0) return Math.hypot(px - ax, py - ay);
  let t = ((px - ax) * dx + (py - ay) * dy) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

function renderIconPng(size) {
  const scale = size / 512;
  const rowSize = size * 4 + 1;
  const raw = Buffer.alloc(rowSize * size);

  // Scaled geometry for 5 tally strokes
  const strokes = [
    { x1: 176 * scale, y1: 138 * scale, x2: 176 * scale, y2: 374 * scale, w: 26 * scale, r: 35, g: 26, b: 18 },
    { x1: 228 * scale, y1: 134 * scale, x2: 228 * scale, y2: 378 * scale, w: 26 * scale, r: 35, g: 26, b: 18 },
    { x1: 280 * scale, y1: 134 * scale, x2: 280 * scale, y2: 378 * scale, w: 26 * scale, r: 35, g: 26, b: 18 },
    { x1: 332 * scale, y1: 138 * scale, x2: 332 * scale, y2: 374 * scale, w: 26 * scale, r: 35, g: 26, b: 18 },
  ];
  const redSlash = { x1: 136 * scale, y1: 350 * scale, x2: 376 * scale, y2: 160 * scale, w: 30 * scale, r: 220, g: 38, b: 38 };

  // Supersampling factor
  const subSamples = size <= 64 ? 4 : 2;
  const subStep = 1 / subSamples;

  for (let y = 0; y < size; y++) {
    const rowOffset = y * rowSize;
    raw[rowOffset] = 0; // Filter 0

    for (let x = 0; x < size; x++) {
      let accR = 0, accG = 0, accB = 0, accA = 0;

      for (let sy = 0; sy < subSamples; sy++) {
        for (let sx = 0; sx < subSamples; sx++) {
          const px = x + (sx + 0.5) * subStep;
          const py = y + (sy + 0.5) * subStep;

          // Full-bleed background color gradient (Edge to edge, NO inner frame!)
          const tDiag = (px / size + py / size) * 0.5;
          let curR = 253 - tDiag * (253 - 232);
          let curG = 249 - tDiag * (249 - 215);
          let curB = 244 - tDiag * (244 - 194);

          // Liquid Glass Sheen: Specular light across the surface
          const sheenT = Math.max(0, 1 - (px / size * 0.7 + py / size * 0.85));
          const sheen = Math.pow(sheenT, 1.5) * 0.35;
          curR = curR * (1 - sheen) + 255 * sheen;
          curG = curG * (1 - sheen) + 255 * sheen;
          curB = curB * (1 - sheen) + 255 * sheen;

          // Soft Ambient Shadow under the strokes
          let minTallyDist = 999;
          for (let i = 0; i < strokes.length; i++) {
            const s = strokes[i];
            const d = distToSegment(px, py - 4 * scale, s.x1, s.y1, s.x2, s.y2) - s.w / 2;
            if (d < minTallyDist) minTallyDist = d;
          }
          const dRedShadow = distToSegment(px, py - 4 * scale, redSlash.x1, redSlash.y1, redSlash.x2, redSlash.y2) - redSlash.w / 2;
          if (dRedShadow < minTallyDist) minTallyDist = dRedShadow;

          if (minTallyDist < 12 * scale && minTallyDist > 0) {
            const shadowAlpha = (1 - minTallyDist / (12 * scale)) * 0.16;
            curR = curR * (1 - shadowAlpha) + 60 * shadowAlpha;
            curG = curG * (1 - shadowAlpha) + 38 * shadowAlpha;
            curB = curB * (1 - shadowAlpha) + 20 * shadowAlpha;
          }

          // 4 Vertical Strokes
          for (let i = 0; i < strokes.length; i++) {
            const s = strokes[i];
            const d = distToSegment(px, py, s.x1, s.y1, s.x2, s.y2) - s.w / 2;
            if (d < 0) {
              curR = s.r;
              curG = s.g;
              curB = s.b;
            } else if (d < 1.4 * scale) {
              const edgeAlpha = 1 - d / (1.4 * scale);
              curR = curR * (1 - edgeAlpha) + s.r * edgeAlpha;
              curG = curG * (1 - edgeAlpha) + s.g * edgeAlpha;
              curB = curB * (1 - edgeAlpha) + s.b * edgeAlpha;
            }
          }

          // 5th Red Diagonal Slash
          const dRed = distToSegment(px, py, redSlash.x1, redSlash.y1, redSlash.x2, redSlash.y2) - redSlash.w / 2;
          if (dRed < 0) {
            let rr = 220, rg = 38, rb = 38;
            // Specular glass highlight reflection along upper edge of red stroke
            const distToUpperEdge = Math.abs(dRed + redSlash.w * 0.35);
            if (distToUpperEdge < 3 * scale) {
              const glassHighlight = (1 - distToUpperEdge / (3 * scale)) * 0.38;
              rr = rr * (1 - glassHighlight) + 255 * glassHighlight;
              rg = rg * (1 - glassHighlight) + 255 * glassHighlight;
              rb = rb * (1 - glassHighlight) + 255 * glassHighlight;
            }
            curR = rr;
            curG = rg;
            curB = rb;
          } else if (dRed < 1.6 * scale) {
            const edgeAlpha = 1 - dRed / (1.6 * scale);
            curR = curR * (1 - edgeAlpha) + redSlash.r * edgeAlpha;
            curG = curG * (1 - edgeAlpha) + redSlash.g * edgeAlpha;
            curB = curB * (1 - edgeAlpha) + redSlash.b * edgeAlpha;
          }

          accR += curR;
          accG += curG;
          accB += curB;
          accA += 255;
        }
      }

      const totalSamples = subSamples * subSamples;
      const pxOffset = rowOffset + 1 + x * 4;
      raw[pxOffset] = Math.round(accR / totalSamples);
      raw[pxOffset + 1] = Math.round(accG / totalSamples);
      raw[pxOffset + 2] = Math.round(accB / totalSamples);
      raw[pxOffset + 3] = Math.round(accA / totalSamples);
    }
  }

  // PNG Encoding
  function crc32(buf) {
    let crc = -1;
    for (let i = 0; i < buf.length; i++) {
      crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff];
    }
    return (crc ^ -1) >>> 0;
  }
  const table = new Int32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    table[i] = c;
  }

  function makeChunk(type, data) {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, 'ascii');
    const crcBuf = Buffer.alloc(4);
    crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
    return Buffer.concat([len, typeBuf, data, crcBuf]);
  }

  const header = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([header, makeChunk('IHDR', ihdr), makeChunk('IDAT', idat), makeChunk('IEND', Buffer.alloc(0))]);
}

// Generate all standard target sizes
console.log('Generating full-bleed PNG icons...');
const icon180 = renderIconPng(180);
fs.writeFileSync('apple-touch-icon.png', icon180);
console.log('✓ apple-touch-icon.png (180x180) generated');

const icon192 = renderIconPng(192);
fs.writeFileSync('icon-192.png', icon192);
console.log('✓ icon-192.png (192x192) generated');

const icon512 = renderIconPng(512);
fs.writeFileSync('icon-512.png', icon512);
console.log('✓ icon-512.png (512x512) generated');

const favicon32 = renderIconPng(32);
fs.writeFileSync('favicon.png', favicon32);
console.log('✓ favicon.png (32x32) generated');
