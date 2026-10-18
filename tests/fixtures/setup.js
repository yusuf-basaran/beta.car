import { readFileSync } from 'node:fs';

export const data = JSON.parse(readFileSync(new URL('./data.json', import.meta.url)));
const sdk = readFileSync(new URL('./client.js', import.meta.url), 'utf8');
export const id = data.tables.ilanlar[0].id;

export async function setup(page, change = () => {}) {
  const fixture = structuredClone(data);
  change(fixture);
  await page.addInitScript(() => localStorage.setItem('bc-consent', JSON.stringify('essential')));
  await page.route('**/js/config.js', (route) =>
    route.fulfill({
      contentType: 'text/javascript',
      body: "export const cfg={url:'',anon:'',firebase:{projectId:'demo-beta-car'},api:'/api'};",
    }),
  );
  await page.route('**/js/firebase.js', (route) =>
    route.fulfill({
      contentType: 'text/javascript',
      body: `globalThis.fixture=${JSON.stringify(fixture)};\n${sdk}`,
    }),
  );
  await page.route('https://tile.openstreetmap.org/**', (route) => route.abort());
  await page.route('https://test.invalid/**', (route) => route.abort());
}
