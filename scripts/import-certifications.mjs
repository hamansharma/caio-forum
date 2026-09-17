import { readFile, rm } from 'node:fs/promises';
import { relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const args = process.argv.slice(2);
const valueAfter = flag => {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : undefined;
};
const inputArgument = valueAfter('--input');
const apply = args.includes('--apply');
const deleteInput = args.includes('--delete-input');
const projectRoot = process.cwd();

if (!inputArgument) throw new Error('Provide an input file: --input /absolute/or/project-relative/catalog.json');
if (deleteInput && !apply) throw new Error('--delete-input is allowed only with --apply.');

const inputPath = resolve(projectRoot, inputArgument);
const inputRelative = relative(projectRoot, inputPath);
if (!inputRelative || inputRelative.startsWith('..') || inputRelative.includes('/../')) throw new Error('The input file must be inside this repository.');
if (inputPath === new URL(import.meta.url).pathname) throw new Error('The importer cannot be its own input.');

async function loadEntries(path) {
  if (path.endsWith('.json')) {
    const parsed = JSON.parse(await readFile(path, 'utf8'));
    return Array.isArray(parsed) ? parsed : parsed.certifications;
  }
  const module = await import(`${pathToFileURL(path).href}?cacheBust=${Date.now()}`);
  return module.certifications;
}

const entries = await loadEntries(inputPath);
if (!Array.isArray(entries) || !entries.length) throw new Error('The input must export a non-empty `certifications` array, or be a JSON array/object with a `certifications` array.');
const ids = entries.map(entry => entry?.id);
if (ids.some(id => typeof id !== 'string' || !id) || new Set(ids).size !== ids.length) throw new Error('Every entry must have a unique non-empty id.');

console.info(`Validated ${entries.length} certification records from ${inputRelative}.`);
if (!apply) {
  console.info('Dry run only. Re-run with --apply to write to Firestore.');
  process.exit(0);
}

const { FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL, FIREBASE_ADMIN_PRIVATE_KEY } = process.env;
if (!FIREBASE_ADMIN_PROJECT_ID || !FIREBASE_ADMIN_CLIENT_EMAIL || !FIREBASE_ADMIN_PRIVATE_KEY) {
  throw new Error('FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL, and FIREBASE_ADMIN_PRIVATE_KEY must be present in the environment.');
}
const privateKey = FIREBASE_ADMIN_PRIVATE_KEY.trim().replace(/^['"]|['"]$/g, '').replace(/\\n/g, '\n');
if (!privateKey.startsWith('-----BEGIN PRIVATE KEY-----') || !privateKey.includes('-----END PRIVATE KEY-----')) {
  throw new Error('FIREBASE_ADMIN_PRIVATE_KEY is not a PEM private key. Add the real service-account key to .env.local; do not use a [redacted] placeholder.');
}
const app = getApps()[0] || initializeApp({ credential: cert({ projectId: FIREBASE_ADMIN_PROJECT_ID, clientEmail: FIREBASE_ADMIN_CLIENT_EMAIL, privateKey }) });
const db = getFirestore(app);
const now = new Date().toISOString();
for (let index = 0; index < entries.length; index += 400) {
  const batch = db.batch();
  entries.slice(index, index + 400).forEach(entry => {
    batch.set(db.collection('certifications').doc(entry.id), { ...entry, createdAt: now, updatedAt: now }, { merge: true });
  });
  await batch.commit();
}
console.info(`Uploaded ${entries.length} certification records to Firestore.`);
if (deleteInput) {
  await rm(inputPath);
  console.info(`Deleted local input file: ${inputRelative}`);
}
