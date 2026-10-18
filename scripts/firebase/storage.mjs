import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { requireAuth } = require('firebase-tools/lib/requireAuth.js');
const { ensure } = require('firebase-tools/lib/ensureApiEnabled.js');
const { Client } = require('firebase-tools/lib/apiv2.js');
const project = process.argv[2];
if (!/^[a-z][a-z0-9-]{4,29}$/.test(project || '')) throw Error('Proje kimliği geçersiz');
await requireAuth({ project, nonInteractive: true });
await ensure(project, 'firestore.googleapis.com', 'firestore', false);
await ensure(project, 'firebasestorage.googleapis.com', 'storage', false);
const client = new Client({
  urlPrefix: 'https://firebasestorage.googleapis.com',
  apiVersion: 'v1alpha',
});
try {
  await client.get(`/projects/${project}/defaultBucket`);
} catch (error) {
  if (error.status !== 404) throw error;
  await client.post(`/projects/${project}/defaultBucket`, {
    location: 'EUROPE-WEST1',
    storageClass: 'STANDARD',
  });
}
console.log('Storage alanı hazır.');
