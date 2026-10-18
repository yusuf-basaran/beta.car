import { client, ensure, checkBillingEnabled } from './client.mjs';
const project = process.argv[2],
  api = await client(project, 'https://firebasestorage.googleapis.com', 'v1alpha');
if (!(await checkBillingEnabled(project)))
  throw Error(
    `Sunucu ve dosya hizmetleri için Blaze planı gerekli: https://console.firebase.google.com/project/${project}/usage/details`,
  );
await ensure(project, 'firebasestorage.googleapis.com', 'storage', false);
try {
  await api.get(`/projects/${project}/defaultBucket`);
} catch (error) {
  if (![403, 404].includes(error.status)) throw error;
  await api.post(`/projects/${project}/defaultBucket`, {
    location: 'EUROPE-WEST1',
    storageClass: 'STANDARD',
  });
}
console.log('Storage alanı hazır.');
