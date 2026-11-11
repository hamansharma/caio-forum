import { adminDb } from './_lib/firebaseAdmin';
import { memberEntries, postEntries, urlsetXml } from '../scripts/lib/sitemaps';

// Live sitemaps built from the posts in Firestore (see scripts/lib/sitemaps.js):
//   /sitemap-posts.xml    every post                      (this function)
//   /sitemap-members.xml  every member page (?type=members)
// Both are rewrites in vercel.json and listed in public/sitemap.xml.
export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') return res.status(405).end();
  try {
    const snapshot = await adminDb.collection('posts').limit(5000).get();
    const posts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const entries = req.query.type === 'members' ? memberEntries(posts) : postEntries(posts);
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    return res.status(200).send(urlsetXml(entries));
  } catch (error) {
    console.error('Sitemap failed:', error.message);
    return res.status(500).send('Unable to generate sitemap.');
  }
}
