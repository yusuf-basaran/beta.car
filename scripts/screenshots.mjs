import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { setTimeout } from 'node:timers/promises';
import { setup, id } from '../tests/fixtures/setup.js';

const server = spawn(process.execPath, ['scripts/serve.mjs'], {
  env: { ...process.env, PORT: '4174' },
  stdio: 'ignore',
});
let browser;
try {
  let ready = false;
  for (let n = 0; n < 30; n++) {
    try {
      ready = (await fetch('http://127.0.0.1:4174')).ok;
    } catch {}
    if (ready) break;
    await setTimeout(100);
  }
  if (!ready) throw Error('Yerel sunucuya bağlanılamadı');
  browser = await chromium.launch(
    process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {},
  );
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await setup(page);
  await mkdir(new URL('../docs/img/', import.meta.url), { recursive: true });
  for (const [name, url, ready] of [
    ['ana-sayfa', '/', '.listing'],
    ['ilan-listesi', '/ilanlar.html', '#results .listing'],
    ['ilan-detayi', '/ilan.html?id=' + id, '.body-part'],
    ['yonetim-paneli', '/admin.html', '#admin-content .stats'],
  ]) {
    await page.goto('http://127.0.0.1:4174' + url);
    await page.locator(ready).first().waitFor();
    await page.screenshot({
      path: new URL('../docs/img/' + name + '.png', import.meta.url).pathname,
    });
  }
} finally {
  await browser?.close();
  server.kill();
}
