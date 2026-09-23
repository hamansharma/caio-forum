import { adminDb } from './_lib/firebaseAdmin';

const siteUrl = (process.env.SITE_URL || 'https://caioleadership.com').replace(/\/$/, '');
const xmlEscape = value => String(value).replace(/[<>&'\"]/g, character => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[character]));
const toIsoDate = value => {
  const date = value?.toDate ? value.toDate() : value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date.toISOString() : '';
};

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  try {
    const snapshot = await adminDb.collection('posts').orderBy('createdAt', 'desc').limit(5000).get();
    const urls = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(post => !post.deleted)
      .map(post => `<url><loc>${xmlEscape(`${siteUrl}/post/${post.id}`)}</loc>${toIsoDate(post.updatedAt || post.createdAt) ? `<lastmod>${toIsoDate(post.updatedAt || post.createdAt)}</lastmod>` : ''}</url>`);
    const body = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.join('')}</urlset>`;
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    return res.status(200).send(body);
  } catch (error) {
    console.error('Post sitemap failed:', error.message);
    return res.status(500).send('Unable to generate sitemap.');
  }
}
