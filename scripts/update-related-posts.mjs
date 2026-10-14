// Computes "Related discussions" for every forum post and stores them on the post
// documents, so post pages can show them without any extra reads or AI calls.
//
//   npm run update:related                      # dry run: print matches, write nothing
//   npm run update:related -- --apply           # write changes to Firestore
//   npm run update:related -- --limit 3 --min-score 0.08
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { findRelatedPosts } from './lib/relatedPosts.mjs';

const args = process.argv.slice(2);
const valueAfter = flag => {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : undefined;
};
const apply = args.includes('--apply');
const limit = Number(valueAfter('--limit') ?? 5);
const minScore = Number(valueAfter('--min-score') ?? 0.08);
if (!Number.isInteger(limit) || limit < 1 || limit > 10) throw new Error('--limit must be a whole number from 1 to 10.');
if (!Number.isFinite(minScore) || minScore < 0 || minScore >= 1) throw new Error('--min-score must be a number from 0 to just under 1.');

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

const snapshot = await db.collection('posts').get();
const posts = snapshot.docs.map(document => ({ id: document.id, ...document.data() }));
const related = findRelatedPosts(posts, { limit, minScore });

// What gets stored on each post: just enough to render links (no scores).
const stored = list => list.map(({ id, slug, title }) => ({ id, ...(slug ? { slug } : {}), title }));
const sameList = (a = [], b = []) => JSON.stringify(a) === JSON.stringify(b);

const updates = [];
let withoutMatches = 0;
posts.forEach(post => {
  const matches = related.get(post.id);
  // Deleted or hidden posts aren't matched; clear any list they had before.
  const next = matches ? stored(matches) : [];
  if (matches && !matches.length) withoutMatches += 1;
  if (matches) {
    console.info(`\n${post.title}`);
    if (!matches.length) console.info('   (no matches above the minimum score)');
    matches.forEach(match => console.info(`   ${match.score.toFixed(3)}  ${match.title}`));
  }
  if (!sameList(post.related, next)) updates.push({ id: post.id, related: next });
});

console.info(`\n${related.size} posts matched, ${withoutMatches} with no related posts, ${updates.length} need updating.`);
if (!apply) {
  console.info('Dry run only. Re-run with --apply to write to Firestore.');
  process.exit(0);
}

const now = new Date().toISOString();
for (let index = 0; index < updates.length; index += 400) {
  const batch = db.batch();
  updates.slice(index, index + 400).forEach(update => {
    batch.update(db.collection('posts').doc(update.id), { related: update.related, relatedMethod: 'keywords', relatedUpdatedAt: now });
  });
  await batch.commit();
}
console.info(`Updated related discussions on ${updates.length} posts.`);
