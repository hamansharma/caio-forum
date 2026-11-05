// Gives every post that still uses an old-style URL (/post/<id>/<title>) a clean
// slug, so all posts live at /post/<slug>. Old URLs keep working: api/post-page.js
// redirects them (301) to the new address. Safe to re-run: posts that already
// have a slug are left alone.
//
//   npm run migrate:slugs             # dry run: list the new URLs
//   npm run migrate:slugs -- --apply  # save the slugs
//
// Afterwards, run `npm run update:related -- --apply` so related-post links use
// the new URLs, and redeploy so the pages are pre-rendered at their new paths.
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { looksLikePostId, slugify } from '../src/utils/postUrl.js';

const apply = process.argv.includes('--apply');
const { FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL, FIREBASE_ADMIN_PRIVATE_KEY } = process.env;
if (!FIREBASE_ADMIN_PROJECT_ID || !FIREBASE_ADMIN_CLIENT_EMAIL || !FIREBASE_ADMIN_PRIVATE_KEY) {
  throw new Error('FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL, and FIREBASE_ADMIN_PRIVATE_KEY must be present in the environment.');
}
const privateKey = FIREBASE_ADMIN_PRIVATE_KEY.trim().replace(/^['"]|['"]$/g, '').replace(/\\n/g, '\n');
const app = getApps()[0] || initializeApp({ credential: cert({ projectId: FIREBASE_ADMIN_PROJECT_ID, clientEmail: FIREBASE_ADMIN_CLIENT_EMAIL, privateKey }) });
const db = getFirestore(app);

const posts = (await db.collection('posts').get()).docs.map(document => ({ id: document.id, ...document.data() }));
const taken = new Set(posts.map(post => post.slug).filter(Boolean));
// Oldest first, so if two titles collide the older post keeps the plain slug.
const toMs = value => value?.toMillis?.() || new Date(value || 0).getTime() || 0;
const pending = posts.filter(post => !post.slug && !post.deleted && post.title).sort((a, b) => toMs(a.createdAt) - toMs(b.createdAt));

const changes = pending.map(post => {
  const base = slugify(post.title) || 'discussion';
  let slug = base;
  for (let n = 2; taken.has(slug) || looksLikePostId(slug); n += 1) slug = `${base}-${n}`;
  taken.add(slug);
  return { id: post.id, slug, from: `/post/${post.id}/${slugify(post.title)}`, to: `/post/${slug}` };
});

changes.forEach(change => console.log(`${change.from}\n  -> ${change.to}`));
console.log(`\n${changes.length} posts need a clean URL; ${posts.length - pending.length} already have one or are deleted.`);
if (!apply) {
  console.log('Dry run; nothing saved. Re-run with --apply.');
  process.exit(0);
}
for (let start = 0; start < changes.length; start += 400) {
  const batch = db.batch();
  changes.slice(start, start + 400).forEach(change => batch.update(db.collection('posts').doc(change.id), { slug: change.slug }));
  await batch.commit();
}
console.log(`Saved ${changes.length} slugs.`);
