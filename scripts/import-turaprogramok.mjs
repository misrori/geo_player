#!/usr/bin/env node
// Szlovákiai túrák importálása a turaprogramok.hu-ról.
// Az ország-oldal (/orszag/szlovakia/) 26 túrakártyájából dolgozik:
//   - public/gpx/tp-<slug>.gpx          (a cikk JSON-LD-jéből linkelt GPX)
//   - public/images/tp-<slug>/cover.jpg, 0.jpg, 1.jpg (macOS-en sips-szel tömörítve)
//   - src/data/turaprogramok-tours.json (metaadatok, GPX-ből számolt statisztikák)
// Az id-k 'tp-' előtagot kapnak, hogy ne ütközzenek a kirandulastippek.hu-s slugokkal.
// A kártyákról jön a nehézség, a típus (Túra / Via ferrata) és a tájegység,
// a cikkoldalról a cím, a leírás, a borítókép, a galéria és a GPX URL.
// Futtatás: node scripts/import-turaprogramok.mjs

import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const BASE = 'https://turaprogramok.hu';
const LISTING = `${BASE}/orszag/szlovakia/`;
const REGION = 'turaprogramok-szlovakia';
const HEADERS = { 'User-Agent': 'Mozilla/5.0', 'Referer': `${BASE}/` };

const fetchText = async url => {
  const r = await fetch(url, { headers: HEADERS });
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return r.text();
};

async function download(url, dest) {
  if (existsSync(dest)) return true;
  const r = await fetch(url, { headers: HEADERS });
  if (!r.ok) return false;
  writeFileSync(dest, Buffer.from(await r.arrayBuffer()));
  try { execFileSync('sips', ['-s', 'format', 'jpeg', '-s', 'formatOptions', '72', dest, '--out', dest], { stdio: 'ignore' }); }
  catch { /* sips nincs (nem macOS) – marad az eredeti */ }
  return true;
}

const ENT = { nbsp: ' ', amp: '&', quot: '"', apos: "'", ndash: '–', mdash: '—', bdquo: '„', rdquo: '”', ldquo: '“', hellip: '…', raquo: '»', laquo: '«' };
const decode = s => s
  .replace(/&#x([0-9a-fA-F]+);/g, (_, n) => String.fromCodePoint(parseInt(n, 16)))
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
  .replace(/&([a-zA-Z]+);/g, (m, n) => ENT[n] ?? m);
const text = h => decode(h.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();

// A cím borítóján lévő emojikat (🥾 … 🇸🇰) és a vezető/záró szóközöket levágjuk.
const stripEmoji = s => s
  .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}️‍]/gu, '')
  .replace(/\s+/g, ' ').trim();

// og:title → cím + alcím a " – " / " - " (szóköz-kötőjel-szóköz) mentén.
function splitTitle(t) {
  const i = t.search(/\s[–-]\s/);
  if (i < 0) return { title: t, subtitle: '' };
  return { title: t.slice(0, i).trim(), subtitle: t.slice(i).replace(/^\s[–-]\s/, '').trim() };
}

const DIFF = { 'Könnyű': 'Könnyű', 'Középnehéz': 'Közepes-nehéz', 'Nehéz': 'Nehéz' };

function gpxStats(xml) {
  const pts = [...xml.matchAll(/<trkpt\s+lat="([\-\d.]+)"\s+lon="([\-\d.]+)"[^>]*>([\s\S]*?)<\/trkpt>/g)]
    .map(m => ({ lat: +m[1], lon: +m[2], ele: +(/<ele>([\-\d.]+)<\/ele>/.exec(m[3])?.[1] ?? NaN) }));
  if (pts.length < 2) return null;
  const rad = Math.PI / 180;
  let dist = 0, asc = 0, desc = 0, min = Infinity, max = -Infinity;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i];
    const s = Math.sin((b.lat - a.lat) * rad / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin((b.lon - a.lon) * rad / 2) ** 2;
    dist += 2 * 6371000 * Math.asin(Math.sqrt(s));
    if (!isNaN(a.ele) && !isNaN(b.ele)) {
      const d = b.ele - a.ele;
      if (d > 0) asc += d; else desc -= d;
      min = Math.min(min, b.ele); max = Math.max(max, b.ele);
    }
  }
  return {
    distKm: Math.round(dist / 100) / 10, ascM: Math.round(asc), descM: Math.round(desc),
    elevMin: min === Infinity ? null : Math.round(min), elevMax: max === -Infinity ? null : Math.round(max)
  };
}

// A listaoldal 26 túrakártyájának kiolvasása.
function parseCards(html) {
  return [...html.matchAll(/<article\b[\s\S]*?<\/article>/g)].map(m => {
    const c = m[0];
    const slug = /\/tura\/([a-z0-9-]+)\//.exec(c)?.[1];
    const diff = text(/tpfx-card-badge\s+\w+">[\s\S]*?<\/svg>([^<]*)</.exec(c)?.[1] || '');
    const typeLabel = text(/tpfx-type-label">([^<]*)</.exec(c)?.[1] || '');
    const chip = text(/tpfx-mini-chip">([^<]*)</.exec(c)?.[1] || '');
    const area = chip.split('·').pop().trim();  // "🇸🇰 Szlovákia · Kis-Fátra" → "Kis-Fátra"
    return { slug, diff, typeLabel, area };
  }).filter(c => c.slug);
}

const listing = await fetchText(LISTING);
const cards = parseCards(listing);
console.log(`${cards.length} túrakártya a listaoldalon`);

const tours = [];
for (const card of cards) {
  const { slug } = card;
  const id = `tp-${slug}`;
  const url = `${BASE}/tura/${slug}/`;
  const html = await fetchText(url);

  const gpxUrl = /"contentUrl":"([^"]+\.gpx)"/.exec(html)?.[1]
    || /href="([^"]+\.gpx)"\s+download/.exec(html)?.[1];
  if (!gpxUrl) { console.log(`\n  ${slug}: nincs GPX, kihagyva`); continue; }

  const gpxPath = resolve(root, 'public/gpx', `${id}.gpx`);
  if (!existsSync(gpxPath)) {
    const xml = await fetchText(gpxUrl);
    if (!xml.includes('<trkpt')) { console.log(`\n  ${slug}: üres GPX, kihagyva`); continue; }
    writeFileSync(gpxPath, xml);
  }
  const stats = gpxStats(readFileSync(gpxPath, 'utf8'));
  if (!stats) { console.log(`\n  ${slug}: nincs trackpont, kihagyva`); continue; }

  const ogTitle = decode(/og:title" content="([^"]*)"/.exec(html)?.[1] || slug);
  const ogDesc = stripEmoji(decode(/og:description" content="([^"]*)"/.exec(html)?.[1] || ''));
  const cover = /og:image" content="([^"]*)"/.exec(html)?.[1];
  const { title, subtitle } = splitTitle(ogTitle);
  const viaFerrata = card.typeLabel.toLowerCase().includes('ferrata');

  // Galéria: a cikk saját fotói forrás-sorrendben (ezek a cikktörzsben, a promó-
  // bannerek és QR-kódok előtt szerepelnek). A borítót, QR-t, méretváltozatokat és a
  // jobb oldali reklámsávot (jobb_matrica, _felvono, _gpx, _waze, _mapy) kiszűrjük.
  const JUNK = /(_index|qr|jobb_|matrica|felvono|_gpx|_waze|_mapy|-\d+x\d+|logo|icon|favicon)/i;
  const gallery = [...new Set([...html.matchAll(/https:\/\/turaprogramok\.hu\/wp-content\/uploads\/[^"'\s]+?\.(?:jpg|jpeg|png)/gi)].map(x => x[0]))]
    .filter(u => !JUNK.test(u));

  const dir = resolve(root, 'public/images', id);
  mkdirSync(dir, { recursive: true });
  const coverImage = cover && await download(cover, resolve(dir, 'cover.jpg')) ? `images/${id}/cover.jpg` : null;
  const images = [];
  for (const [i, img] of gallery.slice(0, 2).entries()) {
    if (await download(img, resolve(dir, `${i}.jpg`))) images.push(`images/${id}/${i}.jpg`);
  }

  tours.push({
    id,
    region: REGION,
    type: 'hike',
    viaFerrata,
    title,
    subtitle: subtitle || `🇸🇰 ${card.area}`,
    difficulty: DIFF[card.diff] || card.diff || 'Közepes',
    stats,
    parking: { name: 'Kiindulópont', note: card.area ? `Tájegység: ${card.area}` : '' },
    description: ogDesc,
    route: null,
    character: null,
    highlights: [],
    equipment: [],
    gpx: `gpx/${id}.gpx`,
    sourceUrl: url,
    coverImage,
    images
  });
  process.stdout.write(viaFerrata ? 'F' : 'G');
}

writeFileSync(resolve(root, 'src/data/turaprogramok-tours.json'), JSON.stringify(tours, null, 2) + '\n');
console.log(`\n\n${tours.length} túra → src/data/turaprogramok-tours.json`);
