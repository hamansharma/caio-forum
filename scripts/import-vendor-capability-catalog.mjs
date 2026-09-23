import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { vendorCapabilityCatalogSeed } from './vendorCapabilityCatalogSeed.mjs';

const apply = process.argv.includes('--apply');
const publish = process.argv.includes('--publish');
const keyFor = value => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const entries = vendorCapabilityCatalogSeed.map(profile => ({
  id: keyFor(profile.name),
  name: profile.name,
  vendor: profile.name,
  websiteUrl: profile.websiteUrl,
  searchName: profile.name.toLowerCase(),
  category: profile.category,
  summary: profile.summary,
  capabilities: profile.capabilities,
  primaryJobs: profile.capabilities,
  adjacentCapabilities: [],
  typicalTeams: [],
  confidence: 'Medium',
  caveat: 'Generic capability profile. Confirm the product edition and your organization’s implementation.',
  sourceType: 'CAIO curated V0',
  sourceUrl: profile.websiteUrl || '',
  sourceLicense: 'internal curated generic product knowledge',
  provenance: 'CAIO curated V0; official-source verification pending',
}));

if (new Set(entries.map(entry => entry.id)).size !== entries.length) throw new Error('Catalog seed contains duplicate normalized product IDs.');

console.info(`Validated ${entries.length} generic capability profiles.`);
if (!apply) {
  console.info('Dry run only. Re-run with --apply to write draft catalog entries. Add --publish only after reviewing every entry.');
  process.exit(0);
}

const { FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL, FIREBASE_ADMIN_PRIVATE_KEY } = process.env;
if (!FIREBASE_ADMIN_PROJECT_ID || !FIREBASE_ADMIN_CLIENT_EMAIL || !FIREBASE_ADMIN_PRIVATE_KEY) throw new Error('FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL, and FIREBASE_ADMIN_PRIVATE_KEY are required.');
const privateKey = FIREBASE_ADMIN_PRIVATE_KEY.trim().replace(/^['"]|['"]$/g, '').replace(/\\n/g, '\n');
if (!privateKey.startsWith('-----BEGIN PRIVATE KEY-----') || !privateKey.includes('-----END PRIVATE KEY-----')) throw new Error('FIREBASE_ADMIN_PRIVATE_KEY must be a PEM service-account key.');
const app = getApps()[0] || initializeApp({ credential: cert({ projectId: FIREBASE_ADMIN_PROJECT_ID, clientEmail: FIREBASE_ADMIN_CLIENT_EMAIL, privateKey }) });
const db = getFirestore(app);
const now = new Date().toISOString();
for (let index = 0; index < entries.length; index += 400) {
  const batch = db.batch();
  entries.slice(index, index + 400).forEach(entry => batch.set(db.collection('vendorCapabilityCatalog').doc(entry.id), { ...entry, status: publish ? 'published' : 'draft', lastReviewed: now.slice(0, 10), updatedAt: now, createdAt: now }, { merge: true }));
  await batch.commit();
}
console.info(`Uploaded ${entries.length} ${publish ? 'published' : 'draft'} capability profiles to vendorCapabilityCatalog.`);
