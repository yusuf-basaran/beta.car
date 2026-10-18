import { createRequire } from 'node:module';
const require = createRequire(new URL('../../functions/package.json', import.meta.url));
export const { initializeApp, applicationDefault, getApps } = require('firebase-admin/app');
export const { getFirestore, Timestamp } = require('firebase-admin/firestore');
export const { getAuth } = require('firebase-admin/auth');
export const { getStorage } = require('firebase-admin/storage');
