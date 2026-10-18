import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { Command } = require('firebase-tools/lib/command.js');
const { requireAuth } = require('firebase-tools/lib/requireAuth.js');
const { Client } = require('firebase-tools/lib/apiv2.js');
export const { ensure } = require('firebase-tools/lib/ensureApiEnabled.js');
export const { checkBillingEnabled } = require('firebase-tools/lib/gcp/cloudbilling.js');
export async function client(project, origin, version = 'v1') {
  if (!/^[a-z][a-z0-9-]{4,29}$/.test(project || '')) throw Error('Proje kimliği geçersiz');
  const options = { project, nonInteractive: true };
  await new Command('kurulum').prepare(options);
  await requireAuth(options);
  return new Client({ urlPrefix: origin, apiVersion: version });
}
