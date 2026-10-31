// Copies the site's users and Firestore data from the current Firebase project
// (FIREBASE_ADMIN_* in .env.local) to a new one, for moving the whole backend.
// User IDs are kept, so every post, comment and profile stays linked to its owner.
// Email/password users keep their passwords and Google users keep signing in
// with Google. Safe to re-run: users are matched by ID and documents are
// overwritten with the source copy.
//
//   npm run migrate:firebase -- --target-key ~/keys/new-project.json            # dry run: counts only
//   npm run migrate:firebase -- --target-key ~/keys/new-project.json --apply    # copy users and data
//
// Password users need the source project's hash parameters (Firebase Console →
// Authentication → Users → ⋮ → Password hash parameters) in the environment:
// SOURCE_HASH_KEY, SOURCE_HASH_SALT_SEPARATOR, SOURCE_HASH_ROUNDS, SOURCE_HASH_MEMORY_COST.
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { cert, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { DocumentReference, getFirestore } from 'firebase-admin/firestore';

const args = process.argv.slice(2);
const valueAfter = flag => {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : undefined;
};
const apply = args.includes('--apply');
const targetKeyPath = valueAfter('--target-key')?.replace(/^~(?=\/)/, homedir());
if (!targetKeyPath) throw new Error('Pass --target-key with the path to the new project\'s service-account JSON file.');

const { FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL, FIREBASE_ADMIN_PRIVATE_KEY } = process.env;
if (!FIREBASE_ADMIN_PROJECT_ID || !FIREBASE_ADMIN_CLIENT_EMAIL || !FIREBASE_ADMIN_PRIVATE_KEY) {
  throw new Error('FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL, and FIREBASE_ADMIN_PRIVATE_KEY (the current project) must be present in the environment.');
}
const sourcePrivateKey = FIREBASE_ADMIN_PRIVATE_KEY.trim().replace(/^['"]|['"]$/g, '').replace(/\\n/g, '\n');
const targetKey = JSON.parse(readFileSync(targetKeyPath, 'utf8'));
if (targetKey.project_id === FIREBASE_ADMIN_PROJECT_ID) throw new Error('The target key is for the source project; pass the new project\'s key.');

const source = initializeApp({ credential: cert({ projectId: FIREBASE_ADMIN_PROJECT_ID, clientEmail: FIREBASE_ADMIN_CLIENT_EMAIL, privateKey: sourcePrivateKey }) }, 'source');
const target = initializeApp({ credential: cert(targetKey) }, 'target');
const sourceDb = getFirestore(source);
const targetDb = getFirestore(target);
console.log(`${apply ? 'Copying' : 'Dry run'}: ${FIREBASE_ADMIN_PROJECT_ID} → ${targetKey.project_id}`);

// ---- Users ----
async function listAllUsers(auth) {
  const users = [];
  let pageToken;
  do {
    const page = await auth.listUsers(1000, pageToken);
    users.push(...page.users);
    pageToken = page.pageToken;
  } while (pageToken);
  return users;
}

const users = await listAllUsers(getAuth(source));
const withPassword = users.filter(user => user.passwordHash);
console.log(`Users: ${users.length} (${withPassword.length} with a password, ${users.filter(user => user.providerData.some(p => p.providerId === 'google.com')).length} with Google)`);

let hash;
if (withPassword.length) {
  const { SOURCE_HASH_KEY, SOURCE_HASH_SALT_SEPARATOR, SOURCE_HASH_ROUNDS, SOURCE_HASH_MEMORY_COST } = process.env;
  if (!SOURCE_HASH_KEY || !SOURCE_HASH_SALT_SEPARATOR || !SOURCE_HASH_ROUNDS || !SOURCE_HASH_MEMORY_COST) {
    throw new Error('Some users have passwords: set SOURCE_HASH_KEY, SOURCE_HASH_SALT_SEPARATOR, SOURCE_HASH_ROUNDS and SOURCE_HASH_MEMORY_COST from the source project\'s password hash parameters.');
  }
  hash = {
    algorithm: 'SCRYPT',
    key: Buffer.from(SOURCE_HASH_KEY, 'base64'),
    saltSeparator: Buffer.from(SOURCE_HASH_SALT_SEPARATOR, 'base64'),
    rounds: Number(SOURCE_HASH_ROUNDS),
    memoryCost: Number(SOURCE_HASH_MEMORY_COST),
  };
}

const importRecord = user => ({
  uid: user.uid,
  email: user.email,
  emailVerified: user.emailVerified,
  displayName: user.displayName,
  photoURL: user.photoURL,
  phoneNumber: user.phoneNumber,
  disabled: user.disabled,
  customClaims: user.customClaims,
  metadata: { creationTime: user.metadata.creationTime, lastSignInTime: user.metadata.lastSignInTime },
  providerData: user.providerData
    .filter(provider => provider.providerId !== 'password')
    .map(({ uid, providerId, email, displayName, photoURL }) => ({ uid, providerId, email, displayName, photoURL })),
  ...(user.passwordHash && { passwordHash: Buffer.from(user.passwordHash, 'base64'), passwordSalt: Buffer.from(user.passwordSalt, 'base64') }),
});

if (apply) {
  for (let start = 0; start < users.length; start += 1000) {
    const batch = users.slice(start, start + 1000).map(importRecord);
    const result = await getAuth(target).importUsers(batch, hash ? { hash } : undefined);
    result.errors.forEach(({ index, error }) => console.error(`  user ${batch[index].uid}: ${error.message}`));
    console.log(`  imported ${result.successCount} users, ${result.failureCount} failed`);
  }
}

// ---- Firestore ----
// References inside documents point at the source database; rewrite them to the target.
const retarget = value => {
  if (value instanceof DocumentReference) return targetDb.doc(value.path);
  if (Array.isArray(value)) return value.map(retarget);
  if (value && value.constructor === Object) return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, retarget(item)]));
  return value;
};

const writer = apply ? targetDb.bulkWriter() : null;
let failures = 0;
writer?.onWriteError(error => {
  if (error.failedAttempts < 5) return true;
  failures += 1;
  console.error(`  ${error.documentRef.path}: ${error.message}`);
  return false;
});

// Walks every collection and subcollection, including documents that only exist as parents of subcollections.
async function copyCollection(collection, counts, top) {
  for (const ref of await collection.listDocuments()) {
    const snapshot = await ref.get();
    if (snapshot.exists) {
      counts[top] = (counts[top] || 0) + 1;
      writer?.set(targetDb.doc(ref.path), retarget(snapshot.data()));
    }
    for (const sub of await ref.listCollections()) await copyCollection(sub, counts, top);
  }
}

const counts = {};
for (const collection of await sourceDb.listCollections()) await copyCollection(collection, counts, collection.id);
await writer?.close();
const total = Object.values(counts).reduce((sum, count) => sum + count, 0);
console.log(`Documents: ${total}`);
Object.entries(counts).sort(([a], [b]) => a.localeCompare(b)).forEach(([name, count]) => console.log(`  ${name}: ${count} (with subcollections)`));
if (failures) console.error(`${failures} documents failed to copy; re-run to retry.`);
if (!apply) console.log('Nothing was written. Re-run with --apply to copy.');
