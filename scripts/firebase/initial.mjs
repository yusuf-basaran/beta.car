import { readFile } from 'node:fs/promises';
import { client } from './client.mjs';
const project = process.argv[2],
  api = await client(project, 'https://firestore.googleapis.com');
const root = `projects/${project}/databases/(default)/documents/`;
const data = JSON.parse(await readFile(new URL('../../functions/data.json', import.meta.url)));
const rows = Object.entries(data).flatMap(([name, list]) =>
  list.map((row) => [name + '/' + (row.id ?? row.anahtar ?? row.slug), row]),
);
for (const name of ['kategoriler', 'donanimlar', 'markalar', 'modeller', 'bannerlar'])
  rows.push(['_sayaclar/' + name, { n: Math.max(0, ...data[name].map((r) => Number(r.id) || 0)) }]);
rows.push(['_kurulum/veriler', { tarih: new Date().toISOString(), surum: 1 }]);
const response = await api.post('/' + root.slice(0, -1) + ':batchGet', {
  documents: rows.map(([key]) => root + key),
});
const existing = new Map(response.body.filter((r) => r.found).map((r) => [r.found.name, r.found]));
if (existing.has(root + '_kurulum/veriler')) console.log('Başlangıç kayıtları mevcut.');
else {
  const value = (v) =>
    v === null
      ? { nullValue: null }
      : Array.isArray(v)
        ? { arrayValue: { values: v.map(value) } }
        : typeof v === 'object'
          ? { mapValue: { fields: fields(v) } }
          : typeof v === 'number'
            ? Number.isInteger(v)
              ? { integerValue: String(v) }
              : { doubleValue: v }
            : typeof v === 'boolean'
              ? { booleanValue: v }
              : { stringValue: v };
  const fields = (row) => Object.fromEntries(Object.entries(row).map(([k, v]) => [k, value(v)]));
  const writes = [];
  for (const [key, row] of rows) {
    const name = root + key,
      old = existing.get(name);
    if (old && (!key.startsWith('_sayaclar/') || Number(old.fields?.n?.integerValue) >= row.n))
      continue;
    const content = fields(row);
    if (key.startsWith('yazilar/')) content._publish = { timestampValue: row.yayin };
    writes.push({
      update: { name, fields: content },
      currentDocument: old ? { updateTime: old.updateTime } : { exists: false },
    });
  }
  await api.post('/' + root.slice(0, -1) + ':commit', { writes });
  console.log(`${writes.length} başlangıç kaydı işlendi.`);
}
