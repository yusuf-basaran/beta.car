import { readFile } from 'node:fs/promises';
import { client } from './client.mjs';

const project = process.argv[2];
const config = JSON.parse(await readFile(new URL('../../firebase.json', import.meta.url)));
const domains = config.auth?.authorizedDomains || [];
if (!domains.length) process.exit(0);
if (domains.some((domain) => typeof domain !== 'string' || !/^[a-z0-9.-]+$/.test(domain)))
  throw Error('Yetkili alan adı geçersiz');
const api = await client(project, 'https://identitytoolkit.googleapis.com', 'v2');
const path = `/projects/${project}/config`;
const current = (await api.get(path)).body.authorizedDomains || [];
const authorizedDomains = [...new Set([...current, ...domains])];
if (authorizedDomains.length !== current.length)
  await api.patch(
    path,
    { authorizedDomains },
    { queryParams: { updateMask: 'authorizedDomains' } },
  );
console.log('Auth alan adları: ' + authorizedDomains.join(', '));
