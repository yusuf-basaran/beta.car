import { spawnSync } from 'node:child_process';
const env = {
  ...process.env,
  FIREBASE_EMULATORS: 'true',
  FIREBASE_WEB_CONFIG: JSON.stringify({
    apiKey: 'demo-key',
    projectId: 'demo-beta-car',
    authDomain: 'localhost',
    storageBucket: 'demo-beta-car.appspot.com',
    appId: 'demo-beta-car-web',
  }),
};
const build = spawnSync(process.execPath, ['scripts/build.mjs'], { env, stdio: 'inherit' });
if (build.status !== 0) process.exit(build.status || 1);
const result = spawnSync(
  process.execPath,
  [
    'node_modules/firebase-tools/lib/bin/firebase.js',
    'emulators:start',
    '--project',
    'demo-beta-car',
  ],
  { env, stdio: 'inherit' },
);
process.exitCode = result.status || 0;
