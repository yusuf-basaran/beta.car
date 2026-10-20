import {
  client,
  ensure,
  checkBillingEnabled,
  getProjectNumber,
  serviceAccountHasRoles,
  addServiceAccountToRoles,
} from './client.mjs';
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
const number = await getProjectNumber({ project }),
  account = `service-${number}@gcp-sa-firebasestorage.iam.gserviceaccount.com`,
  roles = ['roles/firebaserules.firestoreServiceAgent'];
if (!(await serviceAccountHasRoles(project, account, roles, true)))
  await addServiceAccountToRoles(project, account, roles, true);
console.log('Storage alanı hazır.');
