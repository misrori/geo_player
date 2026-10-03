// Túrák metaadatai (Szlovák Paradicsom, Budai-hegység).
// A parkoló koordinátája és az útvonal statisztikái a GPX fájlból származnak.
// A képek lokálisan, a public/images/<tour-id>/ alatt (lásd scripts/download-images.mjs).

import images from './images.json';

const withImgs = (id, meta) => ({
  ...meta,
  coverImage: images[id]?.cover || null,
  images: images[id]?.images || []
});

export const tours = [
  withImgs('sucha-bela', {
    id: 'sucha-bela',
    title: 'Suchá Belá szurdok',
    subtitle: 'A Szlovák Paradicsom legnépszerűbb szurdoka',
    difficulty: 'Közepes',
    stats: { distKm: 9.1, ascM: 489, descM: 488, elevMin: 542, elevMax: 959 },
    parking: {
      name: 'Podlesok / Hrabušice közeli parkoló',
      feeEur: 3,
      note: 'Nagy fizetős parkoló. 14:00 után 1,50 €. Belépő 1,50 €/fő.'
    },
    description: 'A Szlovák Paradicsom legismertebb és leglátogatottabb szurdoka. Kihívó körtúra vaslétrákkal, doronglétrahidakkal, fémtálcákkal és láncos biztosított szakaszokkal. Három vízesés (Tálacska, Kisablak, Teknő), a legszűkebb szakasz a Szakadék. Hétvégén zsúfolt – a szűk szakaszokon csak felfelé haladhatsz.',
    highlights: ['Tálacska-vízesés', 'Kisablak-vízesés', 'Teknő-vízesés', 'Szakadék (legszűkebb rész)', 'Vaslétrák, doronglétrák'],
    equipment: ['Bakancs kötelező', 'Rétegesen öltözés', 'Víz min. 1,5 l', 'Készpénz a parkoláshoz és belépőhöz'],
    gpx: 'gpx/sucha-bela.gpx',
    sourceUrl: 'https://kirandulastippek.hu/szlovak-paradicsom-szepesseg/sucha-bela-a-szlovak-paradicsom-legnepszerubb-szurdoka'
  }),
  withImgs('hernad-tamasfalvi-kolostor', {
    id: 'hernad-tamasfalvi-kolostor',
    title: 'Hernád-áttörés, Tamásfalvi-kilátó, Kolostor-szakadék',
    subtitle: 'A Szlovák Paradicsom legváltozatosabb körtúrája',
    difficulty: 'Nehéz',
    stats: { distKm: 14.7, ascM: 901, descM: 901, elevMin: 502, elevMax: 841 },
    parking: {
      name: 'Čingov parkoló',
      feeEur: 5,
      note: 'Fizetős parkoló Iglótól néhány km-re. Belépő fizetendő.'
    },
    description: 'A Szlovák Paradicsom legváltozatosabb körtúrája. Érinti a Tamásfalvi-kilátót (666 m), a látványos Hernád-áttörést via ferrata-jellegű láncos és létrás szakaszokkal, a Kolostor-szakadékot vízesésekkel, a karthauzi kolostor romjait és az Ördögfej-gerincet.',
    highlights: ['Tamásfalvi-kilátó (666 m)', 'Hernád-áttörés láncos szakaszok', 'Kolostor-szakadék vízesései', 'Karthauzi kolostor romjai', 'Ördögfej-gerinc (822 m)'],
    equipment: ['Bakancs kötelező', 'Túrabot ajánlott', 'Min. 2 l víz', 'Elemózsia', 'Esőkabát'],
    gpx: 'gpx/hernad-tamasfalvi-kolostor.gpx',
    sourceUrl: 'https://kirandulastippek.hu/szlovak-paradicsom-szepesseg/hernad-attores-tamasfalvi-kilato-kolostor-szakadek'
  }),
  withImgs('zejmar-geravy', {
    id: 'zejmar-geravy',
    title: 'Zejmár-szakadék, Geravy-fennsík',
    subtitle: 'A legrövidebb szurdok és egy alpesi fennsík',
    difficulty: 'Közepes',
    stats: { distKm: 10.6, ascM: 536, descM: 536, elevMin: 786, elevMax: 1060 },
    parking: {
      name: 'Dedinky fizetős parkoló',
      feeEur: 5,
      note: 'A Gölnic-víztározó mellett. 5 €/nap.'
    },
    description: 'Látványos körtúra, amely összeköti a Szlovák Paradicsom legrövidebb szurdokát az alpesi hangulatú Geravy-fennsíkkal. Láncos és létrás szakaszok a szurdokban, legelésző lovak a fennsíkon, majd a Kis-Zajfy-völgyön át vissza a Gölnic-víztározóhoz.',
    highlights: ['Zejmár-szakadék vízesése', 'Láncos, létrás szakaszok', 'Geravy-fennsík legelő lovakkal', 'Gölnic-víztározó (fjord)', 'Sztracenai vasúti alagút'],
    equipment: ['Bakancs', 'Víz 1,5 l', 'Elemlámpa az alagúthoz'],
    gpx: 'gpx/zejmar-geravy.gpx',
    sourceUrl: 'https://kirandulastippek.hu/szlovak-paradicsom-szepesseg/zejmar-szakadek-geravy-fennsik'
  }),
  withImgs('voroskolostor-klastorska', {
    id: 'voroskolostor-klastorska',
    title: 'Hernád-áttörés nyugati része, Kláštorská roklina',
    subtitle: 'Hernád-torok, függőhíd, Vöröskolostor-szakadék',
    difficulty: 'Nehéz',
    stats: { distKm: 10.1, ascM: 523, descM: 523, elevMin: 534, elevMax: 786 },
    parking: {
      name: 'Podlesok / Hrabušice közeli parkoló',
      feeEur: 3,
      note: 'Nagy parkoló. 14:00 után 1,50 €. Belépő 1,50 €/fő.'
    },
    description: 'A Szlovák Paradicsom összes szépségét felvonultató, látványos gyalogtúra. Hernád-torok sziklakapu, láncos vaspárkányok a folyó felett, függőhíd, Vöröskolostor-szakadék vízesésekkel, a karthauzi kolostor romjai a Magas-Tátra panorámájával.',
    highlights: ['Hernád-torok sziklakapu', 'Láncos vaspárkányok', 'Függőhíd', 'Kláštorská roklina vízesései', 'Karthauzi kolostor romjai'],
    equipment: ['Bakancs kötelező', 'Túrabot', 'Min. 2 l víz'],
    gpx: 'gpx/voroskolostor-klastorska.gpx',
    sourceUrl: 'https://kirandulastippek.hu/szlovak-paradicsom-szepesseg/a-hernad-attores-nyugati-resze-voroskolostor-szakadek-szurdoka-klatorska-roklina'
  }),
  withImgs('velky-kysel', {
    id: 'velky-kysel',
    title: 'Veľký Kyseľ szurdok',
    subtitle: 'Vad szurdoktúra Podlesokból',
    difficulty: 'Nehéz',
    stats: { distKm: 15.9, ascM: 1147, descM: 1148, elevMin: 527, elevMax: 1015 },
    parking: {
      name: 'Podlesok / Hrabušice közeli parkoló',
      feeEur: 3,
      note: 'Nagy parkoló. Belépő 2 €.'
    },
    description: 'Kihívó szurdoktúra Podlesokból a Kláštoriskón át az újranyitott vad Kyseľ szurdokba, majd a közepesen technikás Veľký Kyseľ völgybe. Vaslétrák, láncok, fa hidak, vízesések. Az 1976-os tűzvész után újra járható.',
    highlights: ['Kláštorisko', 'Vad Kyseľ szurdok', 'Pawlas-vízesés', 'Természetvédők vízesése', 'Glac fennsík'],
    equipment: ['Bakancs kötelező', 'Túrabot', 'Min. 2,5 l víz', 'Első segély'],
    gpx: 'gpx/velky-kysel.gpx',
    sourceUrl: 'https://kirandulastippek.hu/szlovak-paradicsom-szepesseg/velky-kysel-szurdok'
  }),
  withImgs('piecky', {
    id: 'piecky',
    title: 'Piecky szurdok',
    subtitle: 'A legnagyobb függőleges létrával',
    difficulty: 'Közepes-nehéz',
    stats: { distKm: 14.1, ascM: 426, descM: 426, elevMin: 550, elevMax: 954 },
    parking: {
      name: 'Podlesok / Hrabušice közeli parkoló',
      feeEur: 3,
      note: 'Nagy parkoló. Belépő 3 €, gyerek 2 € (csak készpénz).'
    },
    description: 'Csendes, kevésbé látogatott szurdok a Szlovák Paradicsom legnagyobb függőleges létrájával. Doronglétrahidak, fém kapaszkodók, vízesések. Az útvonal száraz medreket követ keskeny kanyonokban.',
    highlights: ['Nagy-vízesés 20 m-es létrával', 'Teraszos-vízesés ferde létrával', 'Kaszkád-vízesés', 'Tesnina szurdok láncos hidakkal', 'Üst-kő formációk'],
    equipment: ['Bakancs kötelező', 'Túrabot', 'Víz 2 l'],
    gpx: 'gpx/piecky.gpx',
    sourceUrl: 'https://kirandulastippek.hu/szlovak-paradicsom-szepesseg/piecky-csendes-szurdok-a-szlovak-paradicsom-legnagyobb-fuggoleges-letrajaval'
  }),
  withImgs('hhh-arpad-kilato', {
    id: 'hhh-arpad-kilato',
    title: 'Árpád-kilátó, Hármashatár-hegy',
    subtitle: 'Könnyű körtúra a Budai-hegység legrégebbi turistaútjain',
    difficulty: 'Könnyű',
    stats: { distKm: 10.7, ascM: 358, descM: 361, elevMin: 292, elevMax: 433 },
    parking: {
      name: 'Fenyőgyöngye étterem előtti parkoló',
      feeEur: 0,
      note: 'Ingyenes parkoló a Szépvölgyi úton. Busszal: 65-ös busz végállomása (Kolosy térről).'
    },
    description: 'Panorámában gazdag kirándulás a Szép-völgyből a Látó-hegyre, a székely stílusú Árpád-kilátóhoz, majd a Glück Frigyes úton a Határnyeregbe. Egy rövid, igen meredek kaptató után fel az Újlaki-hegy kopár csúcsára, végül a Guckler Károly úton (Lent és Fent tanösvény) vissza a Fenyőgyöngyéhez. Könnyített változat: a Határnyeregből a sárga gyöngyök jelzésen kikerülhető az Újlaki-hegy.',
    highlights: ['Árpád-kilátó (Látó-hegy, 1929)', 'Oroszlán-szikla', 'Homok-hegy kilátás (kitérő)', 'Újlaki-hegy (448 m) panoráma', 'Guckler Károly út – Lent és Fent tanösvény'],
    equipment: ['Kényelmes túracipő', 'Túrabot a meredek szakaszra', 'Víz (forráshiányos terület)'],
    gpx: 'gpx/hhh-arpad-kilato.gpx',
    sourceUrl: 'https://kirandulastippek.hu/budapest/arpad-kilato-harmashatar-hegy'
  })
];

export function getTourById(id) {
  return tours.find(t => t.id === id);
}
