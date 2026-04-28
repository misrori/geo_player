#!/usr/bin/env node
// Generál közelítő GPX track-eket a túrákhoz.
// A track-ek a parkolótól induló és oda visszatérő hurkok. Közelítőek,
// később lecserélhetők valódi GPS rögzítésű fájlokra ugyanazon a néven.

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(__dirname, '..', 'public', 'gpx');
mkdirSync(outDir, { recursive: true });

function buildGpx(name, description, points) {
  const trkpts = points.map(([lat, lon, ele]) =>
    `      <trkpt lat="${lat.toFixed(6)}" lon="${lon.toFixed(6)}"><ele>${ele}</ele></trkpt>`
  ).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="GeoPlayer (approximate)" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata>
    <name>${escapeXml(name)}</name>
    <desc>${escapeXml(description)}</desc>
  </metadata>
  <trk>
    <name>${escapeXml(name)}</name>
    <trkseg>
${trkpts}
    </trkseg>
  </trk>
</gpx>
`;
}

function escapeXml(s) {
  return s.replace(/[<>&'"]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c]));
}

// Sűrít pontok közé interpoláltakat
function densify(points, stepM = 50) {
  const out = [];
  for (let i = 0; i < points.length - 1; i++) {
    const [la1, lo1, el1] = points[i];
    const [la2, lo2, el2] = points[i + 1];
    const dist = haversine(la1, lo1, la2, lo2);
    const steps = Math.max(1, Math.round(dist / stepM));
    for (let s = 0; s < steps; s++) {
      const t = s / steps;
      out.push([la1 + (la2 - la1) * t, lo1 + (lo2 - lo1) * t, el1 + (el2 - el1) * t]);
    }
  }
  out.push(points[points.length - 1]);
  return out;
}

function haversine(la1, lo1, la2, lo2) {
  const R = 6371000, rad = Math.PI / 180;
  const dLa = (la2 - la1) * rad, dLo = (lo2 - lo1) * rad;
  const a = Math.sin(dLa / 2) ** 2 + Math.cos(la1 * rad) * Math.cos(la2 * rad) * Math.sin(dLo / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

// Közelítő útvonalak (publikusan ismert fő pontok alapján)
const routes = [
  {
    file: 'sucha-bela.gpx',
    name: 'Suchá Belá szurdok (közelítő)',
    desc: 'Podlesok → Suchá Belá szurdok → Pod Vtáčím hrbom → piros jelzés vissza Podlesokhoz',
    waypoints: [
      [48.97446, 20.37576, 550], // Podlesok
      [48.97520, 20.37780, 580],
      [48.97600, 20.38100, 640],
      [48.97650, 20.38450, 720], // Tálacska-vízesés környéke
      [48.97700, 20.38800, 800], // Kisablak-vízesés
      [48.97800, 20.39200, 870], // Teknő-vízesés
      [48.97900, 20.39500, 920], // Fennsík
      [48.97700, 20.39300, 900],
      [48.97500, 20.38700, 820],
      [48.97300, 20.38100, 730],
      [48.97100, 20.37600, 640],
      [48.97200, 20.37500, 600],
      [48.97446, 20.37576, 550]  // Vissza Podlesok
    ]
  },
  {
    file: 'hernad-tamasfalvi-kolostor.gpx',
    name: 'Hernád-áttörés, Tamásfalvi-kilátó, Kolostor-szakadék (közelítő)',
    desc: 'Čingov → Tamásfalvi-kilátó → Hernád-áttörés → Kláštorisko → Kolostor-szakadék → Čingov',
    waypoints: [
      [48.93436, 20.52468, 480], // Čingov
      [48.94000, 20.52200, 540],
      [48.94800, 20.51600, 620],
      [48.95500, 20.50800, 666], // Tamásfalvi-kilátó
      [48.96000, 20.50200, 640],
      [48.96700, 20.49000, 560],
      [48.97200, 20.47500, 520], // Hernád mellett
      [48.97500, 20.45800, 500],
      [48.97400, 20.44200, 490], // Letánfalvi-malom
      [48.96500, 20.43800, 700],
      [48.95800, 20.43500, 820], // Kláštorisko
      [48.95300, 20.44200, 780],
      [48.94800, 20.45500, 700], // Kolostor-szakadék
      [48.94500, 20.47000, 650],
      [48.94200, 20.48500, 600],
      [48.93900, 20.50000, 560],
      [48.93436, 20.52468, 480]
    ]
  },
  {
    file: 'zejmar-geravy.gpx',
    name: 'Zejmár-szakadék, Geravy-fennsík (közelítő)',
    desc: 'Dedinky → Zejmár-szakadék → Geravy-fennsík → Kis-Zajfy-völgy → Dedinky',
    waypoints: [
      [48.86111, 20.38167, 620], // Dedinky
      [48.86400, 20.37800, 680],
      [48.86800, 20.37500, 750], // Zejmár-szakadék alja
      [48.87100, 20.37200, 850],
      [48.87400, 20.36800, 950], // Zejmár tetején
      [48.87800, 20.36500, 1010], // Geravy-fennsík
      [48.88200, 20.36800, 1030],
      [48.88500, 20.37400, 1020],
      [48.88200, 20.38200, 950],
      [48.87700, 20.38800, 850], // Kis-Zajfy-völgy
      [48.87200, 20.39200, 750],
      [48.86700, 20.39000, 680],
      [48.86300, 20.38600, 640],
      [48.86111, 20.38167, 620]
    ]
  },
  {
    file: 'voroskolostor-klastorska.gpx',
    name: 'Hernád-áttörés nyugati, Kláštorská roklina (közelítő)',
    desc: 'Podlesok → Hernád-torok → Függőhíd → Kláštorská roklina → Kláštorisko → Podlesok',
    waypoints: [
      [48.97446, 20.37576, 550], // Podlesok
      [48.97700, 20.38000, 540],
      [48.97800, 20.39000, 520], // Hernád-torok
      [48.97600, 20.40200, 500],
      [48.97200, 20.41500, 490], // Függőhíd
      [48.96800, 20.42600, 510],
      [48.96300, 20.43400, 600], // Kláštorská roklina alja
      [48.95800, 20.43500, 700],
      [48.95500, 20.43700, 800], // Kláštorisko
      [48.95700, 20.42500, 780],
      [48.96100, 20.41000, 700],
      [48.96500, 20.39500, 640],
      [48.96900, 20.38400, 600],
      [48.97200, 20.37800, 570],
      [48.97446, 20.37576, 550]
    ]
  },
  {
    file: 'velky-kysel.gpx',
    name: 'Veľký Kyseľ (közelítő)',
    desc: 'Podlesok → Kláštorisko → Malý Kyseľ → Veľký Kyseľ → Glac → Podlesok',
    waypoints: [
      [48.97446, 20.37576, 550], // Podlesok
      [48.97200, 20.38500, 560],
      [48.96800, 20.40000, 600],
      [48.96200, 20.41500, 700],
      [48.95700, 20.42500, 800], // Kláštorisko
      [48.95200, 20.43500, 850],
      [48.94700, 20.43000, 900], // Malý Kyseľ
      [48.94200, 20.42000, 950], // Veľký Kyseľ
      [48.94000, 20.40500, 1000],
      [48.94300, 20.39000, 1050], // Glac
      [48.94800, 20.37800, 1020],
      [48.95300, 20.37000, 900],
      [48.95900, 20.36800, 800],
      [48.96500, 20.36900, 700],
      [48.97000, 20.37100, 620],
      [48.97446, 20.37576, 550]
    ]
  },
  {
    file: 'piecky.gpx',
    name: 'Piecky szurdok (közelítő)',
    desc: 'Podlesok → Piecky szurdok → Glac → Tesnina → Podlesok',
    waypoints: [
      [48.97446, 20.37576, 550], // Podlesok
      [48.97000, 20.37200, 560],
      [48.96400, 20.36800, 620],
      [48.95800, 20.36500, 700], // Piecky alja
      [48.95300, 20.36800, 800], // Nagy-vízesés (13 m létra)
      [48.94900, 20.37200, 870], // Teraszos-vízesés
      [48.94500, 20.37600, 930], // Kaszkád
      [48.94200, 20.38200, 980],
      [48.94100, 20.39000, 1020], // Glac
      [48.94400, 20.39800, 1000],
      [48.94800, 20.40200, 940], // Tesnina szurdok
      [48.95300, 20.40000, 860],
      [48.95800, 20.39400, 760],
      [48.96300, 20.38600, 680],
      [48.96800, 20.37900, 610],
      [48.97446, 20.37576, 550]
    ]
  }
];

for (const r of routes) {
  const dense = densify(r.waypoints, 40);
  const gpx = buildGpx(r.name, r.desc, dense);
  writeFileSync(resolve(outDir, r.file), gpx, 'utf8');
  console.log(`wrote ${r.file} (${dense.length} points)`);
}
