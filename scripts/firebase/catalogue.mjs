import { readFile, writeFile, rename } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { client } from './client.mjs';

const project = process.argv[2];
if (!project) throw Error('Firebase proje kimliği gerekli');
const api = await client(project, 'https://firestore.googleapis.com');
const root = `projects/${project}/databases/(default)/documents`;
const file = new URL('../../.seed-state.json', import.meta.url);
let cache = {};
try {
  cache = JSON.parse(await readFile(file, 'utf8'));
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}
let checkpoint = Promise.resolve();
function saveCache() {
  const body = JSON.stringify(cache),
    temp = new URL('../../.seed-state.json.tmp', import.meta.url);
  checkpoint = checkpoint.then(async () => {
    await writeFile(temp, body);
    await rename(temp, file);
  });
  return checkpoint;
}
async function source(path) {
  if (cache[path]) return cache[path];
  if (process.argv.includes('--cached-only')) throw Error('Kaynak kaydı yok');
  for (let i = 0; i < 5; i++) {
    try {
      const response = await fetch(`https://vpic.nhtsa.dot.gov/api/vehicles/${path}?format=json`, {
        signal: AbortSignal.timeout(30000),
      });
      if (!response.ok)
        throw Object.assign(Error(`vPIC ${response.status}`), { status: response.status });
      const body = await response.json();
      if (!Array.isArray(body.Results)) throw Error('vPIC yanıtı geçersiz');
      cache[path] = body.Results;
      return cache[path];
    } catch (error) {
      if (i === 4 || [401, 403].includes(error.status)) throw error;
      await new Promise((r) => setTimeout(r, 1000 * (i + 1)));
    }
  }
}
const key = (s) =>
  String(s)
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
const aliases = {
  mercedesbenz: 'Mercedes-Benz',
  bmw: 'BMW',
  vw: 'Volkswagen',
  volkswagen: 'Volkswagen',
  skoda: 'Škoda',
  citroen: 'Citroën',
  gmc: 'GMC',
  byd: 'BYD',
  mg: 'MG',
  ktm: 'KTM',
  sym: 'SYM',
  cfmoto: 'CFMoto',
  jcb: 'JCB',
  man: 'MAN',
  daf: 'DAF',
  mini: 'MINI',
  ram: 'RAM',
};
const name = (s) =>
  aliases[key(s)] ||
  s
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .replace(/(^|[\s-])\p{L}/gu, (c) => c.toUpperCase());
const data = new Map();
function add(type, make, model) {
  const k = type + ':' + key(name(make));
  if (!data.has(k)) data.set(k, { type, make: name(make), models: new Map() });
  if (model?.trim()) data.get(k).models.set(key(model), model.trim().replace(/\s+/g, ' '));
}
const sources = [
  ['car', 'otomobil'],
  ['Multipurpose Passenger Vehicle (MPV)', 'suv'],
  ['truck', 'ticari'],
  ['bus', 'ticari'],
  ['motorcycle', 'motosiklet'],
];
const tasks = [];
for (const [type, target] of sources) {
  const rows = await source('GetMakesForVehicleType/' + encodeURIComponent(type));
  for (const row of rows) tasks.push({ type, target, make: row });
}
await saveCache();
console.log(`${tasks.length} marka/tür kaydı inceleniyor.`);
let next = 0,
  done = 0;
const failures = [];
await Promise.all(
  Array.from({ length: 4 }, async () => {
    while (next < tasks.length) {
      const task = tasks[next++];
      const { type, target, make } = task;
      add(target, make.MakeName);
      try {
        const rows = await source(
          `GetModelsForMakeIdYear/makeId/${make.MakeId}/vehicleType/${encodeURIComponent(type)}`,
        );
        add(target, make.MakeName);
        for (const row of rows) {
          const model = row.Model_Name;
          let segment = target;
          if (
            target === 'suv' &&
            /sienna|odyssey|sedona|carnival|quest|pacifica|town.*country|caravan|eurovan|routan|venture|uplander|montana|silhouette|trans sport|previa|mpv|mazda5|mazda 5|rondo|entourage/i.test(
              model,
            )
          )
            segment = 'minivan';
          if (
            target === 'ticari' &&
            /^(ranger|hilux|navara|l200|d.max|amarok|tacoma|tundra|frontier|colorado|canyon|f-?150|1500|silverado|sierra|gladiator|ridgeline|maverick|dakota|titan|baja|bt.?50|cybertruck)/i.test(
              model,
            )
          )
            segment = 'suv';
          add(segment, make.MakeName, model);
        }
      } catch (error) {
        failures.push([make.MakeName, error.message]);
      }
      done++;
      if (done % 100 === 0) {
        console.log(`${done}/${tasks.length}`);
        await saveCache();
      }
    }
  }),
);
await saveCache();
if (failures.length) {
  console.log(`${failures.length} kaynak isteği alınamadı.`);
  if (!process.argv.includes('--cached-only'))
    throw Error('Eksik kaynak istekleri var; aynı komutu yeniden çalıştırın');
}
for (const [type, make, models] of JSON.parse(
  await readFile(new URL('./regional.json', import.meta.url)),
))
  for (const model of models) add(type, make, model);
const decode = (v) =>
  v.nullValue !== undefined
    ? null
    : v.integerValue !== undefined
      ? Number(v.integerValue)
      : (v.doubleValue ?? v.stringValue ?? v.booleanValue);
async function collection(name) {
  const rows = [];
  let pageToken;
  do {
    const result = await api.get('/' + root + '/' + name, {
      queryParams: { pageSize: 1000, ...(pageToken ? { pageToken } : {}) },
    });
    rows.push(
      ...(result.body.documents || []).map((d) => ({
        ref: d,
        ...Object.fromEntries(Object.entries(d.fields || {}).map(([k, v]) => [k, decode(v)])),
      })),
    );
    pageToken = result.body.nextPageToken;
  } while (pageToken);
  return rows;
}
const [makes, models] = await Promise.all([collection('markalar'), collection('modeller')]);
let makeId = Math.max(0, ...makes.map((r) => r.id)),
  modelId = Math.max(0, ...models.map((r) => r.id));
const brandMap = new Map(makes.map((r) => [r.tip + ':' + key(r.ad), r]));
const modelMap = new Map(models.map((r) => [r.marka_id + ':' + key(r.ad), r]));
const added = [];
for (const [k, group] of data) {
  let brand = brandMap.get(k);
  if (!brand) {
    brand = { id: ++makeId, ad: group.make, tip: group.type, anahtar: key(group.make) };
    makes.push(brand);
    brandMap.set(k, brand);
    added.push(['markalar', brand]);
  }
  for (const [normalized, model] of group.models) {
    const k = brand.id + ':' + normalized;
    if (modelMap.has(k)) continue;
    const row = {
      id: ++modelId,
      marka_id: brand.id,
      ad: model,
      anahtar: normalized,
      bas_yil: null,
      bit_yil: null,
    };
    models.push(row);
    modelMap.set(k, row);
    added.push(['modeller', row]);
  }
}
const value = (v) =>
  v === null
    ? { nullValue: null }
    : Array.isArray(v)
      ? { arrayValue: { values: v.map(value) } }
      : typeof v === 'number'
        ? { integerValue: String(v) }
        : typeof v === 'boolean'
          ? { booleanValue: v }
          : { stringValue: String(v) };
const fields = (row) =>
  Object.fromEntries(
    Object.entries(row)
      .filter(([k]) => k !== 'ref')
      .map(([k, v]) => [k, value(v)]),
  );
const commit = (writes) => api.post('/' + root + ':commit', { writes });
const counters = await Promise.all(
  ['markalar', 'modeller'].map((n) => api.get('/' + root + '/_sayaclar/' + n)),
);
await commit(
  counters.map((r, i) => ({
    update: {
      name: root + '/_sayaclar/' + ['markalar', 'modeller'][i],
      fields: {
        n: value(Math.max(Number(r.body.fields?.n?.integerValue) || 0, [makeId, modelId][i])),
      },
    },
    currentDocument: { updateTime: r.body.updateTime },
  })),
);
for (let offset = 0; offset < added.length; offset += 400) {
  await commit(
    added.slice(offset, offset + 400).map(([table, row]) => ({
      update: { name: root + '/' + table + '/' + row.id, fields: fields(row) },
      currentDocument: { exists: false },
    })),
  );
  console.log(`${Math.min(offset + 400, added.length)}/${added.length} yeni kayıt aktarıldı.`);
}
const lex = {
  markalar: makes.map((m) => [m.id, m.ad, m.tip]),
  modeller: models.map((m) => [m.id, m.marka_id, m.ad, m.bas_yil ?? null, m.bit_yil ?? null]),
};
const version = createHash('sha256').update(JSON.stringify(lex)).digest('hex').slice(0, 16);
const chunks = [];
for (const [name, rows] of Object.entries(lex))
  for (let offset = 0; offset < rows.length; offset += 1500) {
    const id = version + '_' + name + '_' + offset;
    await commit([
      {
        update: {
          name: root + '/_katalog/' + id,
          fields: fields({ tur: name, veri: JSON.stringify(rows.slice(offset, offset + 1500)) }),
        },
      },
    ]);
    chunks.push(id);
  }
await commit([
  {
    update: {
      name: root + '/_katalog/aktif',
      fields: fields({
        aktif: true,
        surum: version,
        parcalar: chunks,
        guncelleme: new Date().toISOString(),
        eksik_kaynak: failures.length,
      }),
    },
  },
]);
console.log(
  JSON.stringify({
    marka: makes.length,
    model: models.length,
    yeni: added.length,
    eksik_kaynak: failures.length,
    surum: version,
    turler: Object.fromEntries(
      [...new Set(makes.map((m) => m.tip))]
        .sort()
        .map((t) => [t, makes.filter((m) => m.tip === t).length]),
    ),
  }),
);
