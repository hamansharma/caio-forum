import { adminDb, requireUser } from './_lib/firebaseAdmin';
import { submitToIndexNow } from './_lib/indexNow';
import { SITE_ORIGIN } from '../src/data/site';
import { postPath } from '../src/utils/postUrl';

// Called by the app right after a member publishes a post, so IndexNow search
// engines (Bing and others) crawl it within hours instead of waiting for the
// sitemap. Only the post's author can announce it, and only while it's new.
const NEW_FOR_MS = 15 * 60 * 1000;

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' });
  try {
    const user = await requireUser(req);
    const postId = req.body?.postId;
    if (typeof postId !== 'string' || !postId || postId.includes('/')) return res.status(400).json({ error: 'A post is required.' });
    const snapshot = await adminDb.collection('posts').doc(postId).get();
    const post = snapshot.data();
    if (!post || post.deleted || post.authorUid !== user.uid) return res.status(404).json({ error: 'Post not found.' });
    const created = post.createdAt?.toMillis?.() || 0;
    if (Date.now() - created > NEW_FOR_MS) return res.status(200).json({ ok: true, submitted: false });
    const result = await submitToIndexNow([`${SITE_ORIGIN}${postPath({ id: snapshot.id, ...post })}`]);
    return res.status(200).json({ ok: true, submitted: result.ok });
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
    console.error('IndexNow announce failed:', error);
    return res.status(500).json({ error: 'Unable to announce the post.' });
  }
}
