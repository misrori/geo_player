#!/usr/bin/env node
// Elemzi a public/gpx mappában található GPX fájlokat, kinyeri a kezdőpontot
// (parkoló), hosszat, szintet, és kiírja a tours.js-be frissítésre alkalmas formátumban.

import { readFileSync, readdirSync } from 'node:fs';
import { resolve, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const gpxDir = resolve(__dirname, '..', 'public', 'gpx');

function parseGpx(xml) {
  const pts = [];
  const re = /<trkpt\s+lat="([\-\d.]+)"\s+lon="([\-\d.]+)"[^>]*>([\s\S]*?)<\/trkpt>/g;
  let m;
  while ((m = re.exec(xml))) {
    const lat = parseFloat(m[1]);
    const lon = parseFloat(m[2]);
    const ele = /<ele>([\-\d.]+)<\/ele>/.exec(m[3]);
    pts.push({ lat, lon, ele: ele ? parseFloat(ele[1]) : null });
  }
  return pts;
}

function haversine(a, b) {
  const R = 6371000, rad = Math.PI / 180;
  const dLa = (b.lat - a.lat) * rad, dLo = (b.lon - a.lon) * rad;
  const s = Math.sin(dLa / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLo / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

function stats(pts) {
  let dist = 0, asc = 0, desc = 0;
  let minEle = Infinity, maxEle = -Infinity;
  for (let i = 1; i < pts.length; i++) {
    dist += haversine(pts[i - 1], pts[i]);
    if (pts[i].ele != null && pts[i - 1].ele != null) {
      const d = pts[i].ele - pts[i - 1].ele;
      if (d > 0) asc += d; else desc -= d;
      minEle = Math.min(minEle, pts[i].ele);
      maxEle = Math.max(maxEle, pts[i].ele);
    }
  }
  return { distKm: dist / 1000, asc, desc, minEle, maxEle, count: pts.length };
}

const files = readdirSync(gpxDir).filter(f => f.endsWith('.gpx'));
const results = {};

for (const f of files) {
  const xml = readFileSync(resolve(gpxDir, f), 'utf8');
  const pts = parseGpx(xml);
  if (pts.length === 0) {
    console.log(`${f}: no points`);
    continue;
  }
  const s = stats(pts);
  const start = pts[0];
  const end = pts[pts.length - 1];
  const id = basename(f, '.gpx');
  results[id] = {
    start: { lat: start.lat, lon: start.lon, ele: start.ele },
    end: { lat: end.lat, lon: end.lon, ele: end.ele },
    distKm: +s.distKm.toFixed(2),
    ascM: Math.round(s.asc),
    descM: Math.round(s.desc),
    elevMin: s.minEle === Infinity ? null : Math.round(s.minEle),
    elevMax: s.maxEle === -Infinity ? null : Math.round(s.maxEle),
    points: s.count
  };
  console.log(`${f}:`);
  console.log(`  start: ${start.lat.toFixed(5)}, ${start.lon.toFixed(5)}  (ele ${start.ele})`);
  console.log(`  end:   ${end.lat.toFixed(5)}, ${end.lon.toFixed(5)}`);
  console.log(`  dist:  ${s.distKm.toFixed(2)} km,  asc ${Math.round(s.asc)} m / desc ${Math.round(s.desc)} m`);
  console.log(`  elev:  ${Math.round(s.minEle)}–${Math.round(s.maxEle)} m,  ${pts.length} points`);
}

console.log('\n--- JSON for tours.js ---');
console.log(JSON.stringify(results, null, 2));
