import { spawnSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';

const cli = new URL('../../node_modules/firebase-tools/lib/bin/firebase.js', import.meta.url);
function run(args, json = false) {
  const r = spawnSync(process.execPath, [cli.pathname, ...args, ...(json ? ['--json'] : [])], {
    encoding: 'utf8',
    stdio: json ? 'pipe' : 'inherit',
  });
  if (r.status !== 0)
    throw Error(
      json
        ? 'Firebase işlemi tamamlanamadı; oturumu ve proje yetkilerini kontrol edin.'
        : 'Firebase işlemi tamamlanamadı',
    );
  if (!json) return;
  const output = JSON.parse(r.stdout);
  if (output.status !== 'success') throw Error(output.error || 'Firebase işlemi tamamlanamadı');
  return output.result;
}
function script(file, ...args) {
  if (spawnSync(process.execPath, [file, ...args], { stdio: 'inherit' }).status !== 0)
    throw Error('Kurulum tamamlanamadı: ' + file);
}
let project = process.argv[2] || process.env.FIREBASE_PROJECT;
if (!project) {
  try {
    project = JSON.parse(await readFile(new URL('../../.firebaserc', import.meta.url))).projects
      .default;
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
}
const projects = run(['projects:list'], true);
if (!project) {
  project = 'kontak-' + randomBytes(4).toString('hex');
  run(['projects:create', project, '--display-name', 'KONTAK']);
} else if (!projects.some((p) => p.projectId === project))
  throw Error('Proje hesabınızda görünmüyor');
if (!/^[a-z][a-z0-9-]{4,29}$/.test(project)) throw Error('Proje kimliği geçersiz');
await writeFile(
  new URL('../../.firebaserc', import.meta.url),
  JSON.stringify({ projects: { default: project } }, null, 2) + '\n',
);
let apps = run(['apps:list', 'WEB', '--project', project], true);
if (!apps.length) {
  run(['apps:create', 'WEB', 'KONTAK', '--project', project, '--non-interactive']);
  apps = run(['apps:list', 'WEB', '--project', project], true);
}
run(['deploy', '--project', project, '--only', 'auth,firestore', '--non-interactive']);
script('scripts/firebase/domains.mjs', project);
run([
  'firestore:databases:update',
  '(default)',
  '--delete-protection',
  'ENABLED',
  '--project',
  project,
  '--non-interactive',
]);
script('scripts/firebase/initial.mjs', project);
const raw = run(['apps:sdkconfig', 'WEB', apps[0].appId, '--project', project], true).sdkConfig;
const config = Object.fromEntries(
  [
    'apiKey',
    'authDomain',
    'projectId',
    'storageBucket',
    'messagingSenderId',
    'appId',
    'measurementId',
  ]
    .filter((k) => typeof raw[k] === 'string')
    .map((k) => [k, raw[k]]),
);
if (process.env.INITIAL_ADMIN_EMAIL) {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(process.env.INITIAL_ADMIN_EMAIL))
    throw Error('Yönetici e-postası geçersiz');
  const file = new URL('../../functions/.env.' + project, import.meta.url);
  let content = '';
  try {
    content = await readFile(file, 'utf8');
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  if (!/^INITIAL_ADMIN_EMAIL=/m.test(content))
    await writeFile(
      file,
      content + '\nINITIAL_ADMIN_EMAIL=' + process.env.INITIAL_ADMIN_EMAIL + '\n',
    );
}
if (
  spawnSync(process.execPath, ['scripts/build.mjs', '--firebase'], {
    stdio: 'inherit',
    env: { ...process.env, FIREBASE_WEB_CONFIG: JSON.stringify(config) },
  }).status !== 0
)
  throw Error('Yayın dosyaları hazırlanamadı');
script('scripts/firebase/storage.mjs', project);
run(['deploy', '--project', project, '--only', 'storage,functions,hosting', '--non-interactive']);
console.log(`Yayın adresi: https://${project}.web.app`);
