#!/usr/bin/env node
// Túrák importálása a kirandulastippek.hu rovataiból.
// Minden cikket, amihez letölthető GPX tartozik, felvesz:
//   - public/gpx/<slug>.gpx
//   - public/images/<slug>/cover.jpg, 0.jpg, 1.jpg (macOS-en sips-szel újratömörítve)
//   - src/data/imported-tours.json (metaadatok, GPX-ből számolt statisztikák)
// A tours.js-ben kézzel felvett túrák (azonos sourceUrl) kimaradnak.
// Futtatás: node scripts/import-tours.mjs

import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const BASE = 'https://kirandulastippek.hu';
const HEADERS = { 'User-Agent': 'Mozilla/5.0', 'Referer': `${BASE}/` };

// rovat a kirandulastippek.hu-n → régió azonosító az appban
const SECTIONS = {
  'budapest': 'budapest',
  'budapest-kornyeke': 'budapest-kornyeke',
  'szlovak-paradicsom-szepesseg': 'szlovak-paradicsom'
};

const handcrafted = readFileSync(resolve(root, 'src/data/tours.js'), 'utf8');
const knownUrls = new Set([...handcrafted.matchAll(/sourceUrl: '([^']+)'/g)].map(m => m[1]));

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

const ENT = { nbsp: ' ', amp: '&', quot: '"', ndash: '–', mdash: '—', bdquo: '„', rdquo: '”', ldquo: '“', hellip: '…', raquo: '»', laquo: '«',
  aacute: 'á', eacute: 'é', iacute: 'í', oacute: 'ó', ouml: 'ö', uacute: 'ú', uuml: 'ü',
  Aacute: 'Á', Eacute: 'É', Iacute: 'Í', Oacute: 'Ó', Ouml: 'Ö', Uacute: 'Ú', Uuml: 'Ü' };
const decode = s => s
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
  .replace(/&([a-zA-Z]+);/g, (m, n) => ENT[n] ?? m);
const text = h => decode(h.replace(/<br\s*\/?>/g, ' ').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').replace(/\s+([,.:;!?])/g, '$1').trim();

function labeled(content, labels) {
  for (const label of labels) {
    const re = new RegExp(`<(p|h4)>(?:(?!</\\1>)[\\s\\S])*?<strong[^>]*>\\s*${label}\\s*:?\\s*</strong>([\\s\\S]*?)</\\1>(\\s*<p>([\\s\\S]*?)</p>)?`, 'i');
    const m = content.match(re);
    if (!m) continue;
    let v = text(m[2]).replace(/^:\s*/, '');
    if (!v && m[4]) v = text(m[4]);
    if (v) return v;
  }
  return null;
}

function parseArticle(html) {
  const title = text(html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)[1]);
  const tags = [...(html.match(/<ul class="tags">([\s\S]*?)<\/ul>/)?.[1] || '').matchAll(/<li class="([^"]+)"/g)].map(m => m[1]);
  const cover = html.match(/src="(https:\/\/kirandulastippek\.hu\/thumbnail\/\/images\/[^"?]+)/)?.[1];
  const gallery = [...new Set([...html.matchAll(/href="\/images\/news\/article\/zoom\/([^"]+\.jpg)"/g)].map(m => m[1]))];

  const start = html.indexOf('<div class="content">');
  const end = html.indexOf('Látnivalók a környéken', start);
  const content = html.slice(start, end > 0 ? end : undefined);
  const subtitle = text(content.match(/<h2[^>]*>([\s\S]*?)<\/h2>/)?.[1] || '');

  // Bevezető: a tartalom első bekezdései a térkép előtt, ~600 karakterig
  const beforeMap = content.split('id="track"')[0];
  let description = '';
  for (const m of beforeMap.matchAll(/<p>([\s\S]*?)<\/p>/g)) {
    const t = text(m[1]);
    if (!t || /^(Táv|A túra hossza|Időtartam|Szintkülönbség|Útvonal|Kiindul)/.test(t)) continue;
    description += (description ? ' ' : '') + t;
    if (description.length > 450) break;
  }

  return {
    title,
    subtitle,
    description,
    type: tags.some(t => t.startsWith('kerekpar')) ? 'bike' : 'hike',
    route: labeled(content, ['Útvonal']),
    character: labeled(content, ['A túra jellege', 'Jellege']),
    startPoint: labeled(content, ['Kiindulópont', 'Kiindulási pont', 'Rajt']),
    cover,
    gallery
  };
}

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

function difficulty({ distKm, ascM }, type) {
  if (type === 'bike') return distKm > 40 || ascM > 600 ? 'Nehéz' : distKm > 20 ? 'Közepes' : 'Könnyű';
  if (ascM > 800 || distKm > 18) return 'Nehéz';
  if (ascM > 450 || distKm > 13) return 'Közepes-nehéz';
  if (ascM > 250 || distKm > 8) return 'Közepes';
  return 'Könnyű';
}

const tours = [];
for (const [section, region] of Object.entries(SECTIONS)) {
  const slugs = new Set();
  for (let p = 1; p < 60; p++) {
    const html = await fetchText(`${BASE}/${section}?page=${p}`);
    const before = slugs.size;
    for (const m of html.matchAll(new RegExp(`href="(?:${BASE})?/${section}/([a-z0-9-]+)"`, 'g'))) slugs.add(m[1]);
    if (slugs.size === before) break;
  }
  console.log(`\n[${section}] ${slugs.size} cikk`);

  for (const slug of slugs) {
    const url = `${BASE}/${section}/${slug}`;
    if (knownUrls.has(url)) { process.stdout.write('='); continue; }
    const html = await fetchText(url);
    if (!html.includes('download_gpx')) { process.stdout.write('·'); continue; }

    const gpxPath = resolve(root, 'public/gpx', `${slug}.gpx`);
    if (!existsSync(gpxPath)) {
      const xml = await fetchText(`${url}?download_gpx`);
      if (!xml.includes('<trkpt')) { console.log(`\n  ${slug}: üres GPX, kihagyva`); continue; }
      writeFileSync(gpxPath, xml);
    }
    const stats = gpxStats(readFileSync(gpxPath, 'utf8'));
    if (!stats) { console.log(`\n  ${slug}: nincs trackpont, kihagyva`); continue; }

    const a = parseArticle(html);
    const dir = resolve(root, 'public/images', slug);
    mkdirSync(dir, { recursive: true });
    const coverImage = a.cover && await download(`${a.cover}?955,500,crop`, resolve(dir, 'cover.jpg'))
      ? `images/${slug}/cover.jpg` : null;
    const images = [];
    for (const [i, img] of a.gallery.slice(0, 2).entries()) {
      if (await download(`${BASE}/thumbnail/images/news/article/zoom/${img}?800,600,crop`, resolve(dir, `${i}.jpg`)))
        images.push(`images/${slug}/${i}.jpg`);
    }

    // A cím vesszővel elválasztott helynevei látnivalónak (pl. "Nagy-Kevély, Egri vár, Teve-szikla"),
    // a leíró részek ("látványos túra a …", "körtúra Biatorbágy felett") nélkül.
    const titleParts = a.title.split(/,\s*/)
      .filter(p => /^[A-ZÁÉÍÓÖŐÚÜŰ]/.test(p) && p.split(' ').length <= 4 && !/túr|séta/i.test(p));
    tours.push({
      id: slug,
      region,
      type: a.type,
      title: a.title,
      subtitle: a.subtitle,
      difficulty: difficulty(stats, a.type),
      stats,
      parking: { name: 'Kiindulópont', note: a.startPoint || '' },
      description: a.description,
      route: a.route,
      character: a.character,
      highlights: titleParts.length > 1 ? titleParts : [],
      equipment: [],
      gpx: `gpx/${slug}.gpx`,
      sourceUrl: url,
      coverImage,
      images
    });
    process.stdout.write(a.type === 'bike' ? 'B' : 'G');
  }
}

writeFileSync(resolve(root, 'src/data/imported-tours.json'), JSON.stringify(tours, null, 2) + '\n');
console.log(`\n\n${tours.length} túra → src/data/imported-tours.json`);
