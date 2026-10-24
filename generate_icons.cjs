const fs = require('fs');
const zlib = require('zlib');
const path = require('path');

// 1. Create vector SVG icons
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <!-- Material You Ambient Drop Shadow -->
    <filter id="dropShadow" x="-10%" y="-10%" width="130%" height="130%">
      <feDropShadow dx="0" dy="16" stdDeviation="20" flood-color="#452a15" flood-opacity="0.14" />
      <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#452a15" flood-opacity="0.08" />
    </filter>

    <!-- Tally Stroke Soft Ambient Shadow -->
    <filter id="tallyShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="3" stdDeviation="3.5" flood-color="#3d2310" flood-opacity="0.18" />
    </filter>

    <!-- Warm Material You Sand / Cardboard Gradient -->
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fdf9f4" />
      <stop offset="45%" stop-color="#f5ebe0" />
      <stop offset="100%" stop-color="#e8d7c2" />
    </linearGradient>

    <!-- iOS Liquid Glass Specular Sheen -->
    <linearGradient id="liquidSheen" x1="10%" y1="0%" x2="90%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.65" />
      <stop offset="35%" stop-color="#ffffff" stop-opacity="0.16" />
      <stop offset="70%" stop-color="#ffffff" stop-opacity="0.02" />
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0.12" />
    </linearGradient>

    <!-- Glass Specular Rim Border -->
    <linearGradient id="glassBorder" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.85" />
      <stop offset="50%" stop-color="#eddcc9" stop-opacity="0.45" />
      <stop offset="100%" stop-color="#baa389" stop-opacity="0.3" />
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
      <stop offset="100%" stop-color="#19110b" />
    </linearGradient>
  </defs>

  <!-- Base Squircle with Shadow (Material You shape) -->
  <rect x="32" y="32" width="448" height="448" rx="106" ry="106" fill="url(#bgGrad)" filter="url(#dropShadow)" />

  <!-- Liquid Glass Overlay / Reflection -->
  <rect x="32" y="32" width="448" height="448" rx="106" ry="106" fill="url(#liquidSheen)" />
  <rect x="32" y="32" width="448" height="448" rx="106" ry="106" fill="none" stroke="url(#glassBorder)" stroke-width="2.5" />

  <!-- Glass Light Reflection Arc -->
  <path d="M 46,138 C 46,85 85,46 138,46 L 374,46 C 427,46 466,85 466,138 C 360,182 152,182 46,138 Z" fill="url(#liquidSheen)" opacity="0.35" />

  <!-- 5 Tally Marks Group -->
  <g filter="url(#tallyShadow)">
    <!-- 4 Vertical Minimalist Tally Strokes -->
    <line x1="188" y1="168" x2="188" y2="344" stroke="url(#inkGrad)" stroke-width="22" stroke-linecap="round" />
    <line x1="234" y1="166" x2="234" y2="346" stroke="url(#inkGrad)" stroke-width="22" stroke-linecap="round" />
    <line x1="280" y1="166" x2="280" y2="346" stroke="url(#inkGrad)" stroke-width="22" stroke-linecap="round" />
    <line x1="326" y1="168" x2="326" y2="344" stroke="url(#inkGrad)" stroke-width="22" stroke-linecap="round" />

    <!-- 5th Diagonal Crossing Slash (KSA Red) -->
    <line x1="152" y1="322" x2="362" y2="190" stroke="url(#redSlashGrad)" stroke-width="24" stroke-linecap="round" />
  </g>

  <!-- Liquid Glass Specular Reflection on the Red Slash -->
  <line x1="154" y1="321" x2="360" y2="191" stroke="#ffffff" stroke-width="3" stroke-linecap="round" opacity="0.4" />
</svg>`;

// Write icon.svg and favicon.svg
fs.writeFileSync('icon.svg', svgContent, 'utf-8');
fs.writeFileSync('favicon.svg', svgContent, 'utf-8');
console.log('✓ icon.svg & favicon.svg saved');

// 2. High-performance Anti-Aliased PNG Generator using Pure Node.js
function distToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const l2 = dx * dx + dy * dy;
  if (l2 === 0) return Math.hypot(px - ax, py - ay);
  let t = ((px - ax) * dx + (py - ay) * dy) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

function roundedRectSDF(px, py, rx, ry, rw, rh, rad) {
  // Center coordinates relative to box center
  const cx = rx + rw / 2;
  const cy = ry + rh / 2;
  const qx = Math.abs(px - cx) - rw / 2 + rad;
  const qy = Math.abs(py - cy) - rh / 2 + rad;
  const outside = Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) - rad;
  const inside = Math.min(Math.max(qx, qy), 0) - rad;
  return qx > 0 || qy > 0 ? outside : inside;
}

function renderIconPng(size) {
  const scale = size / 512;
  const rowSize = size * 4 + 1;
  const raw = Buffer.alloc(rowSize * size);

  // Pre-scaled geometry
  const boxX = 32 * scale;
  const boxY = 32 * scale;
  const boxW = 448 * scale;
  const boxH = 448 * scale;
  const boxRad = 106 * scale;

  const strokes = [
    { x1: 188 * scale, y1: 168 * scale, x2: 188 * scale, y2: 344 * scale, w: 22 * scale, r: 35, g: 26, b: 18 },
    { x1: 234 * scale, y1: 166 * scale, x2: 234 * scale, y2: 346 * scale, w: 22 * scale, r: 35, g: 26, b: 18 },
    { x1: 280 * scale, y1: 166 * scale, x2: 280 * scale, y2: 346 * scale, w: 22 * scale, r: 35, g: 26, b: 18 },
    { x1: 326 * scale, y1: 168 * scale, x2: 326 * scale, y2: 344 * scale, w: 22 * scale, r: 35, g: 26, b: 18 },
  ];
  const redSlash = { x1: 152 * scale, y1: 322 * scale, x2: 362 * scale, y2: 190 * scale, w: 24 * scale, r: 220, g: 38, b: 38 };

  // Supersampling factor
  const subSamples = size <= 64 ? 4 : (size <= 192 ? 2 : 2);
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

          // Check squircle distance
          const dBox = roundedRectSDF(px, py, boxX, boxY, boxW, boxH, boxRad);

          // Soft drop shadow outside squircle
          if (dBox > 0) {
            const shadowDist = Math.hypot(px - (boxX + boxW / 2), py - (boxY + boxH / 2 + 8 * scale)) - (boxW / 2);
            if (shadowDist < 20 * scale && dBox < 24 * scale) {
              const shadowAlpha = Math.max(0, (1 - dBox / (22 * scale)) * 0.18);
              accR += 60 * shadowAlpha;
              accG += 40 * shadowAlpha;
              accB += 20 * shadowAlpha;
              accA += shadowAlpha * 255;
            }
            continue;
          }

          // Inside squircle: Background color gradient
          const tDiag = ((px - boxX) / boxW + (py - boxY) / boxH) * 0.5;
          // Interpolate #fdf9f4 to #e8d7c2
          let curR = 253 - tDiag * (253 - 232);
          let curG = 249 - tDiag * (249 - 215);
          let curB = 244 - tDiag * (244 - 194);
          let curA = 1.0;

          // Liquid Glass Sheen: Specular light gradient
          const sheenT = Math.max(0, 1 - (px / boxW * 0.7 + py / boxH * 0.9));
          const sheen = Math.pow(sheenT, 1.4) * 0.45;
          curR = curR * (1 - sheen) + 255 * sheen;
          curG = curG * (1 - sheen) + 255 * sheen;
          curB = curB * (1 - sheen) + 255 * sheen;

          // Glass rim border
          if (dBox > -2.5 * scale) {
            const rimAlpha = Math.max(0, (2.5 * scale + dBox) / (2.5 * scale)) * 0.6;
            const rimColor = py < boxY + boxH * 0.5 ? 255 : 200;
            curR = curR * (1 - rimAlpha) + rimColor * rimAlpha;
            curG = curG * (1 - rimAlpha) + rimColor * rimAlpha;
            curB = curB * (1 - rimAlpha) + rimColor * rimAlpha;
          }

          // 4 Vertical Strokes
          for (let i = 0; i < strokes.length; i++) {
            const s = strokes[i];
            const d = distToSegment(px, py, s.x1, s.y1, s.x2, s.y2) - s.w / 2;
            if (d < 0) {
              curR = s.r;
              curG = s.g;
              curB = s.b;
            } else if (d < 1.2 * scale) {
              const edgeAlpha = 1 - d / (1.2 * scale);
              curR = curR * (1 - edgeAlpha) + s.r * edgeAlpha;
              curG = curG * (1 - edgeAlpha) + s.g * edgeAlpha;
              curB = curB * (1 - edgeAlpha) + s.b * edgeAlpha;
            }
          }

          // 5th Red Diagonal Slash
          const dRed = distToSegment(px, py, redSlash.x1, redSlash.y1, redSlash.x2, redSlash.y2) - redSlash.w / 2;
          if (dRed < 0) {
            // Subtle liquid glass highlight on the red stroke
            const redT = (px - redSlash.x1) / (redSlash.x2 - redSlash.x1);
            let rr = 220, rg = 38, rb = 38;
            if (py < (redSlash.y1 + redSlash.y2) / 2) {
              rr = Math.min(255, rr + 30);
            }
            curR = rr;
            curG = rg;
            curB = rb;
          } else if (dRed < 1.4 * scale) {
            const edgeAlpha = 1 - dRed / (1.4 * scale);
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
console.log('Generating PNG icons...');
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
