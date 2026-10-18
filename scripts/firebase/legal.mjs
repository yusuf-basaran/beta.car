import { readFile } from 'node:fs/promises';
import { initializeApp, applicationDefault, getFirestore } from './admin.mjs';
const [project, file] = process.argv.slice(2);
if (!project || !file || !process.argv.includes('--onayli'))
  throw Error('Proje, incelenmiş JSON dosyası ve --onayli gerekli');
const rows = JSON.parse(await readFile(file, 'utf8'));
if (!Array.isArray(rows) || !rows.length || rows.length > 100)
  throw Error('Sayfa listesi geçersiz');
for (const row of rows) {
  if (
    !/^[a-z0-9-]+$/.test(row.slug) ||
    !['baslik', 'baslik_en', 'icerik', 'icerik_en'].every(
      (k) => typeof row[k] === 'string' && row[k].trim(),
    ) ||
    /\[(İŞLETMECİ UNVANI|ADRES|TELEFON|E-POSTA|VERGİ NO)\]/.test(JSON.stringify(row))
  )
    throw Error('Alanlar veya işletmeci bilgileri eksik');
}
initializeApp({ projectId: project, credential: applicationDefault() });
const db = getFirestore(),
  batch = db.batch();
rows.forEach((row) => batch.set(db.collection('sayfalar').doc(row.slug), row));
await batch.commit();
console.log(`${rows.length} onaylı sayfa kaydedildi.`);
