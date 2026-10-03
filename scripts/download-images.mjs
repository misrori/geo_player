// Letölti minden túra képeit a forrás oldalról lokálba.
// Kimenet: public/images/{tour-id}/cover.jpg, 0.jpg, 1.jpg, ...
// Egy manifest fájlt is ír: src/data/images.json

import { mkdirSync, writeFileSync, createWriteStream, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import https from 'node:https';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const imagesDir = resolve(root, 'public', 'images');
mkdirSync(imagesDir, { recursive: true });

const tours = [
  { id: 'sucha-bela', slug: 'sucha-bela-a-szlovak-paradicsom-legnepszerubb-szurdoka', limit: 36 },
  { id: 'hernad-tamasfalvi-kolostor', slug: 'hernad-attores-tamasfalvi-kilato-kolostor-szakadek', limit: 40 },
  { id: 'zejmar-geravy', slug: 'zejmar-szakadek-geravy-fennsik', limit: 30 },
  { id: 'voroskolostor-klastorska', slug: 'a-hernad-attores-nyugati-resze-voroskolostor-szakadek-szurdoka-klatorska-roklina', limit: 30 },
  { id: 'velky-kysel', slug: 'velky-kysel-szurdok', limit: 20 },
  { id: 'piecky', slug: 'piecky-csendes-szurdok-a-szlovak-paradicsom-legnagyobb-fuggoleges-letrajaval', limit: 30 },
  { id: 'hhh-arpad-kilato', section: 'budapest', slug: 'arpad-kilato-harmashatar-hegy', limit: 2 }
];

function fetchText(url) {
  return new Promise((resolveP, rejectP) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, res => {
      if (res.statusCode !== 200) { rejectP(new Error(`${res.statusCode} ${url}`)); return; }
      let data = '';
      res.setEncoding('utf8');
      res.on('data', c => data += c);
      res.on('end', () => resolveP(data));
    }).on('error', rejectP);
  });
}

function downloadBinary(url, dest) {
  return new Promise((resolveP, rejectP) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': 'https://kirandulastippek.hu/' } }, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        downloadBinary(res.headers.location, dest).then(resolveP, rejectP);
        return;
      }
      if (res.statusCode !== 200) { rejectP(new Error(`${res.statusCode} ${url}`)); return; }
      const f = createWriteStream(dest);
      res.pipe(f);
      f.on('finish', () => f.close(() => resolveP()));
      f.on('error', rejectP);
    }).on('error', rejectP);
  });
}

function extractImages(html) {
  // cover: first <img ... thumbnail//images/..width>
  const coverMatch = html.match(/src="(https:\/\/kirandulastippek\.hu\/thumbnail\/\/images\/[^"]+)"/);
  const cover = coverMatch ? coverMatch[1] : null;

  // gallery: hrefs to /images/news/article/zoom/XXX.jpg
  const hrefs = [...html.matchAll(/href="(\/images\/news\/article\/zoom\/[^"]+\.jpg)"/g)]
    .map(m => `https://kirandulastippek.hu${m[1]}`);
  return { cover, gallery: [...new Set(hrefs)] };
}

const manifest = {};

for (const tour of tours) {
  const pageUrl = `https://kirandulastippek.hu/${tour.section || 'szlovak-paradicsom-szepesseg'}/${tour.slug}`;
  console.log(`\n[${tour.id}] fetching ${pageUrl}`);
  const html = await fetchText(pageUrl);
  const { cover, gallery } = extractImages(html);
  console.log(`  cover: ${cover ? 'yes' : 'no'}, gallery: ${gallery.length} images`);

  const dir = resolve(imagesDir, tour.id);
  mkdirSync(dir, { recursive: true });

  const localImages = [];
  let coverLocal = null;

  if (cover) {
    const localName = 'cover.jpg';
    const dest = resolve(dir, localName);
    if (!existsSync(dest)) {
      try { await downloadBinary(cover, dest); process.stdout.write('C'); }
      catch (e) { console.log(`\n  cover FAIL: ${e.message}`); }
    } else process.stdout.write('.');
    coverLocal = `images/${tour.id}/${localName}`;
  }

  const picks = gallery.slice(0, tour.limit);
  for (let i = 0; i < picks.length; i++) {
    const url = picks[i];
    const localName = `${i}.jpg`;
    const dest = resolve(dir, localName);
    if (!existsSync(dest)) {
      try { await downloadBinary(url, dest); process.stdout.write('.'); }
      catch (e) {
        console.log(`\n  ${i} FAIL (${url}): ${e.message}`);
        continue;
      }
    } else process.stdout.write('-');
    localImages.push(`images/${tour.id}/${localName}`);
  }

  manifest[tour.id] = { cover: coverLocal, images: localImages };
  console.log(`\n  done: ${localImages.length} local images`);
}

writeFileSync(resolve(root, 'src', 'data', 'images.json'), JSON.stringify(manifest, null, 2));
console.log('\nWrote src/data/images.json');
