import { spawnSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';

const cli = new URL('../../node_modules/firebase-tools/lib/bin/firebase.js', import.meta.url);
function run(args, json = false) {
  const result = spawnSync(process.execPath, [cli.pathname, ...args, ...(json ? ['--json'] : [])], {
    encoding: 'utf8',
    stdio: json ? 'pipe' : 'inherit',
  });
  if (result.status !== 0)
    throw Error(
      json
        ? 'Firebase işlemi tamamlanamadı; oturumu ve proje yetkilerini kontrol edin.'
        : 'Firebase işlemi tamamlanamadı',
    );
  if (!json) return;
  const output = JSON.parse(result.stdout);
  if (output.status !== 'success') throw Error(output.error || 'Firebase işlemi tamamlanamadı');
  return output.result;
}
let project = process.argv[2] || process.env.FIREBASE_PROJECT;
if (!project) {
  try {
    project = JSON.parse(await readFile(new URL('../../.firebaserc', import.meta.url))).projects
      .default;
  } catch (e) {
    if (e.code !== 'ENOENT') throw e;
  }
}
const projects = run(['projects:list'], true);
if (!project) {
  project = 'beta-car-' + randomBytes(4).toString('hex');
  run(['projects:create', project, '--display-name', 'BETA.CAR']);
} else if (!projects.some((p) => p.projectId === project))
  throw Error('Proje hesabınızda görünmüyor');
if (!/^[a-z][a-z0-9-]{4,29}$/.test(project)) throw Error('Proje kimliği geçersiz');
await writeFile(
  new URL('../../.firebaserc', import.meta.url),
  JSON.stringify({ projects: { default: project } }, null, 2) + '\n',
);
const apps = run(['apps:list', 'WEB', '--project', project], true);
if (!apps.length)
  run(['apps:create', 'WEB', 'BETA.CAR', '--project', project, '--non-interactive']);
const dbs = run(['firestore:databases:list', '--project', project], true);
const databases = Array.isArray(dbs) ? dbs : dbs.databases || [];
if (!databases.some((d) => d.name.endsWith('/(default)')))
  run([
    'firestore:databases:create',
    '(default)',
    '--project',
    project,
    '--location',
    'europe-west1',
    '--edition',
    'standard',
    '--delete-protection',
    'ENABLED',
  ]);
const storage = spawnSync(process.execPath, ['scripts/firebase/storage.mjs', project], {
  stdio: 'inherit',
});
if (storage.status !== 0)
  throw Error('Storage kurulumu tamamlanamadı; proje yetkisini ve faturalandırmayı kontrol edin');
const webApps = apps.length ? apps : run(['apps:list', 'WEB', '--project', project], true);
const config = run(
  ['apps:sdkconfig', 'WEB', webApps[0].appId, '--project', project],
  true,
).sdkConfig;
if (process.env.INITIAL_ADMIN_EMAIL) {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(process.env.INITIAL_ADMIN_EMAIL))
    throw Error('Yönetici e-postası geçersiz');
  const file = new URL('../../functions/.env.' + project, import.meta.url);
  let content = '';
  try {
    content = await readFile(file, 'utf8');
  } catch (e) {
    if (e.code !== 'ENOENT') throw e;
  }
  if (!/^INITIAL_ADMIN_EMAIL=/m.test(content))
    await writeFile(
      file,
      content + '\nINITIAL_ADMIN_EMAIL=' + process.env.INITIAL_ADMIN_EMAIL + '\n',
    );
}
const build = spawnSync(process.execPath, ['scripts/build.mjs'], {
  stdio: 'inherit',
  env: { ...process.env, FIREBASE_WEB_CONFIG: JSON.stringify(config) },
});
if (build.status !== 0) throw Error('Yayın dosyaları hazırlanamadı');
run(['deploy', '--project', project, '--only', 'auth,firestore,storage,functions,hosting']);
console.log(`Yayın adresi: https://${project}.web.app`);
