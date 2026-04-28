// Egyszerű PNG ikongenerátor (zlib-bel). Nincs külső függőség.
// Zöld háttér fehér nyíl-logóval. 192x192 és 512x512 méretben.

import { writeFileSync, mkdirSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const out = resolve(__dirname, '..', 'public', 'icons');
mkdirSync(out, { recursive: true });

function crc32(buf) {
  let c, table = [];
  for (let n = 0; n < 256; n++) {
    c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  let crc = 0xffffffff;
  for (const b of buf) crc = table[(crc ^ b) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

function makePng(size) {
  // Raszter: zöld háttér (#1b5e20), fehér „nyíl" a közepén.
  const bg = [27, 94, 32];      // #1b5e20
  const fg = [255, 255, 255];

  const w = size, h = size;
  const raster = Buffer.alloc(h * (w * 3 + 1));
  for (let y = 0; y < h; y++) {
    raster[y * (w * 3 + 1)] = 0; // filter: None
    for (let x = 0; x < w; x++) {
      const i = y * (w * 3 + 1) + 1 + x * 3;
      // Egyszerű háromszög alakú nyíl a közepén (felfelé mutató)
      const cx = w / 2, cy = h / 2;
      const dx = (x - cx) / (w * 0.22);
      const dy = (y - cy) / (h * 0.28);
      const inTriangle = dy >= -1 && dy <= 1.4 && Math.abs(dx) <= (1.1 - dy * 0.55);
      const innerDot = Math.hypot(x - cx, y - (cy - h * 0.04)) < w * 0.07;
      let c = bg;
      if (inTriangle) c = fg;
      if (innerDot) c = bg;
      raster[i] = c[0];
      raster[i + 1] = c[1];
      raster[i + 2] = c[2];
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;       // bit depth
  ihdr[9] = 2;       // color type: RGB
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

  const idat = deflateSync(raster);

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

for (const s of [192, 512]) {
  const png = makePng(s);
  writeFileSync(resolve(out, `icon-${s}.png`), png);
  console.log(`wrote icon-${s}.png (${png.length} bytes)`);
}
