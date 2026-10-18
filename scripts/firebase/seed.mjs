import { readFile } from 'node:fs/promises';
import { initializeApp, applicationDefault, getApps, getFirestore, Timestamp } from './admin.mjs';

export async function seed(project, update = false) {
  if (!project) throw Error('Firebase proje kimliği gerekli');
  if (!getApps().length) initializeApp({ projectId: project, credential: applicationDefault() });
  const db = getFirestore(),
    data = JSON.parse(await readFile(new URL('../../functions/data.json', import.meta.url)));
  const writer = db.bulkWriter();
  let count = 0;
  for (const [name, rows] of Object.entries(data))
    for (const row of rows) {
      const key = row.id ?? row.anahtar ?? row.slug,
        ref = db.collection(name).doc(String(key));
      if (!update && (await ref.get()).exists) continue;
      if (name === 'yazilar') row._publish = Timestamp.fromDate(new Date(row.yayin));
      writer.set(ref, row);
      count++;
    }
  await writer.close();
  for (const name of ['kategoriler', 'donanimlar', 'markalar', 'modeller', 'bannerlar'])
    await db.runTransaction(async (tx) => {
      const ref = db.collection('_sayaclar').doc(name),
        old = (await tx.get(ref)).data();
      const n = Math.max(0, ...data[name].map((r) => Number(r.id) || 0));
      if (!old || old.n < n) tx.set(ref, { n });
    });
  console.log(`${count} başlangıç kaydı işlendi.`);
}
if (process.argv[1]?.endsWith('/seed.mjs'))
  await seed(process.argv[2] || process.env.GCLOUD_PROJECT, process.argv.includes('--update'));
