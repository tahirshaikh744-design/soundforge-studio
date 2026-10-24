/* Generates build/icon.ico (multi-size, no dependencies) */
const fs = require('fs');
const path = require('path');

function renderIcon(size) {
  const px = new Uint8Array(size * size * 4);
  const S = size;
  const cx = S / 2, cy = S / 2;

  const R = (s) => Math.max(1, s * 0.20);           // rounded corner radius
  const corner = R(S);

  // Equalizer bar geometry (normalized)
  const bars = [0.30, 0.52, 0.78, 0.58, 0.92, 0.66, 0.40, 0.55];
  const nBars = bars.length;
  const barW = 0.075;
  const span = 0.74;                                  // total width of bar group
  const gap = (span - nBars * barW) / (nBars - 1);
  const x0 = (1 - span) / 2;
  const barBottom = 0.78, barTopMargin = 0.16;

  function distRoundRect(x, y) {
    // distance from point (x,y) inside unit square to rounded-rect edge (negative inside)
    const dx = Math.max(corner - x, x - (S - 1 - corner), 0);
    const dy = Math.max(corner - y, y - (S - 1 - corner), 0);
    return Math.sqrt(dx * dx + dy * dy) - corner;
  }

  function capsuleDist(px_, py_, x1, y1, x2, y2, r) {
    const pax = px_ - x1, pay = py_ - y1;
    const bax = x2 - x1, bay = y2 - y1;
    let h = Math.min(1, Math.max(0, (pax * bax + pay * bay) / (bax * bax + bay * bay)));
    const dx = pax - bax * h, dy = pay - bay * h;
    return Math.sqrt(dx * dx + dy * dy) - r;
  }

  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const i = (y * S + x) * 4;

      // background rounded rect + subtle vertical gradient
      const d = distRoundRect(x + 0.5, y + 0.5);
      let a = d <= 0 ? 1 : Math.max(0, Math.min(1, -d));
      if (a <= 0) { px[i + 3] = 0; continue; }

      const gy = y / (S - 1);
      let r = 11 + (19 - 11) * gy;   // #0b0d13 -> #131722-ish
      let g = 13 + (23 - 13) * gy;
      let b = 19 + (34 - 19) * gy;

      // thin border glow
      if (d > -Math.max(1, S * 0.012)) {
        r = 42; g = 50; b = 70; // #2a3246
      }

      // equalizer bars (cyan->indigo gradient)
      for (let k = 0; k < nBars; k++) {
        const bx = (x0 + k * (barW + gap)) * S;
        const bw = barW * S;
        const hFrac = bars[(k + Math.floor(size / 16)) % nBars];
        const topY = (barTopMargin + (1 - barTopMargin - (1 - barBottom)) * (1 - hFrac)) * S;
        const botY = barBottom * S;
        const half = bw / 2;
        const bd = capsuleDist(x + 0.5, y + 0.5, bx + half, topY + half, bx + half, botY - half, half * 0.98);
        let ba = bd <= 0 ? 1 : Math.max(0, Math.min(1, -bd + 0.5));
        if (ba > 0) {
          const t = 1 - (y / (S - 1)); // vertical color blend
          const cr = 6 + (79 - 6) * t;
          const cg = 182 + (70 - 182) * t;
          const cb = 212 + (229 - 212) * t;
          r = r * (1 - ba) + cr * ba;
          g = g * (1 - ba) + cg * ba;
          b = b * (1 - ba) + cb * ba;
          a = Math.max(a, ba);
        }
      }

      px[i] = Math.round(Math.max(0, Math.min(255, r)));
      px[i + 1] = Math.round(Math.max(0, Math.min(255, g)));
      px[i + 2] = Math.round(Math.max(0, Math.min(255, b)));
      px[i + 3] = Math.round(a * 255);
    }
  }
  return px;
}

function rgbaToIcoBmp(rgba, size) {
  const headerSize = 40;
  const xorSize = size * size * 4;
  const andRowBytes = Math.ceil(size / 32) * 4;
  const andSize = andRowBytes * size;
  const buf = Buffer.alloc(headerSize + xorSize + andSize);

  buf.writeUInt32LE(40, 0);
  buf.writeInt32LE(size, 4);
  buf.writeInt32LE(size * 2, 8);
  buf.writeUInt16LE(1, 12);
  buf.writeUInt16LE(32, 14);
  buf.writeUInt32LE(0, 16);
  buf.writeUInt32LE(xorSize, 20);
  buf.writeInt32LE(0, 24);
  buf.writeInt32LE(0, 28);
  buf.writeUInt32LE(0, 32);
  buf.writeUInt32LE(0, 36);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const src = ((size - 1 - y) * size + x) * 4;
      const dst = headerSize + (y * size + x) * 4;
      buf[dst] = rgba[src + 2];
      buf[dst + 1] = rgba[src + 1];
      buf[dst + 2] = rgba[src];
      buf[dst + 3] = rgba[src + 3];
    }
  }
  return buf;
}

function buildIco(sizes) {
  const entries = sizes.map((s) => ({ size: s, buf: rgbaToIcoBmp(renderIcon(s), s) }));
  const count = entries.length;
  const offset = 6 + count * 16;
  const total = offset + entries.reduce((a, e) => a + e.buf.length, 0);
  const ico = Buffer.alloc(total);
  ico.writeUInt16LE(0, 0);
  ico.writeUInt16LE(1, 2);
  ico.writeUInt16LE(count, 4);
  let off = offset;
  entries.forEach((e, i) => {
    const d = 6 + i * 16;
    ico.writeUInt8(e.size >= 256 ? 0 : e.size, d);
    ico.writeUInt8(e.size >= 256 ? 0 : e.size, d + 1);
    ico.writeUInt8(0, d + 2);
    ico.writeUInt8(0, d + 3);
    ico.writeUInt16LE(1, d + 4);
    ico.writeUInt16LE(32, d + 6);
    ico.writeUInt32LE(e.buf.length, d + 8);
    ico.writeUInt32LE(off, d + 12);
    e.buf.copy(ico, off);
    off += e.buf.length;
  });
  return ico;
}

const outPath = path.join(__dirname, 'icon.ico');
fs.writeFileSync(outPath, buildIco([16, 24, 32, 48, 64, 128, 256]));
console.log('Wrote', outPath, fs.statSync(outPath).size, 'bytes');
