// Egyszerű GPX parser és útvonal-statisztika számító.
// A trkpt-eket olvassa ki regex-szel (a struktúra egyszerű, DOMParser is menne,
// de ez gyorsabb és nem függ böngészőtől).

export function parseGpx(xml) {
  const points = [];
  const re = /<trkpt\s+lat="([\-\d.]+)"\s+lon="([\-\d.]+)"[^>]*>([\s\S]*?)<\/trkpt>/g;
  let m;
  while ((m = re.exec(xml))) {
    const lat = parseFloat(m[1]);
    const lon = parseFloat(m[2]);
    const eleMatch = /<ele>([\-\d.]+)<\/ele>/.exec(m[3]);
    const ele = eleMatch ? parseFloat(eleMatch[1]) : null;
    points.push({ lat, lon, ele });
  }
  let name = null;
  const nm = /<name>([^<]+)<\/name>/.exec(xml);
  if (nm) name = nm[1].trim();
  return { name, points };
}

export function haversine(a, b) {
  const R = 6371000, rad = Math.PI / 180;
  const dLa = (b.lat - a.lat) * rad, dLo = (b.lon - a.lon) * rad;
  const s = Math.sin(dLa / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLo / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

export function trackStats(points) {
  let dist = 0, asc = 0, desc = 0;
  let minEle = Infinity, maxEle = -Infinity;
  for (let i = 1; i < points.length; i++) {
    dist += haversine(points[i - 1], points[i]);
    const a = points[i - 1].ele, b = points[i].ele;
    if (a != null && b != null) {
      if (b > a) asc += b - a; else desc += a - b;
    }
    if (points[i].ele != null) {
      if (points[i].ele < minEle) minEle = points[i].ele;
      if (points[i].ele > maxEle) maxEle = points[i].ele;
    }
  }
  return {
    distM: dist,
    distKm: dist / 1000,
    ascM: Math.round(asc),
    descM: Math.round(desc),
    elevMin: minEle === Infinity ? null : Math.round(minEle),
    elevMax: maxEle === -Infinity ? null : Math.round(maxEle)
  };
}

// Legközelebbi trackpont indexe egy adott pozícióhoz. Bruteforce – néhány ezer pontnál OK.
export function nearestIndex(points, lat, lon) {
  let best = 0, bestD = Infinity;
  const p = { lat, lon };
  for (let i = 0; i < points.length; i++) {
    const d = haversine(points[i], p);
    if (d < bestD) { bestD = d; best = i; }
  }
  return { index: best, distanceM: bestD };
}

// Hátralevő táv (közelítő): az aktuális indextől a végpontig.
export function remainingDistance(points, fromIndex) {
  let dist = 0;
  for (let i = fromIndex + 1; i < points.length; i++) {
    dist += haversine(points[i - 1], points[i]);
  }
  return dist;
}

// Csapágy (bearing) egyik pontból a másikba, 0..360 fok (0 = É).
export function bearing(from, to) {
  const rad = Math.PI / 180;
  const lat1 = from.lat * rad, lat2 = to.lat * rad;
  const dLon = (to.lon - from.lon) * rad;
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}

export function formatDistance(m) {
  if (m < 1000) return `${Math.round(m)} m`;
  return `${(m / 1000).toFixed(2)} km`;
}

export async function fetchGpx(url) {
  // Abszolút URL-lé alakítjuk a document baseURI-ja alapján, hogy a HashRouter
  // path-ja ne keverje össze a relatív feloldást.
  const absolute = new URL(url, document.baseURI).href;
  let res;
  try {
    res = await fetch(absolute, { cache: 'no-store' });
  } catch (e) {
    throw new Error(`Nem érhető el a GPX: ${absolute} (${e.message})`);
  }
  if (!res.ok) throw new Error(`GPX letöltés hiba (${res.status}): ${absolute}`);
  const xml = await res.text();
  return parseGpx(xml);
}
