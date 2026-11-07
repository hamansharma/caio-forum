import { adminDb } from './_lib/firebaseAdmin';
import { hasPageSlots, memberPage, postPage, renderPage } from '../scripts/lib/pageHtml';
import { looksLikePostId } from '../src/utils/postUrl';
import { memberActivity } from '../src/utils/memberActivity';

// Serves /post/... URLs that have no pre-rendered page: posts published since
// the last deploy (pre-rendered ones are static files and never reach here; see
// the rewrite in vercel.json). Returns the same HTML the build would have
// written, so search engines, link previews (LinkedIn, Slack, …) and AI
// crawlers see the post's real title, description and content immediately.
// Old addresses (/post/<id>/<title>, /post/<id>) redirect permanently (301) to
// the post's current one. Unknown or deleted posts get the app shell with a 404
// status; the app shows its not-found page.
//
// Also serves member pages, /u/<name> (?member=<name>): always rendered here,
// from the posts they wrote and commented on, so they stay current.

const CACHE = 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400';
let templatePromise;

// The app's index.html, fetched once per function instance from the deployed site.
function loadTemplate(origin) {
  if (!templatePromise) {
    templatePromise = fetch(`${origin}/`, { signal: AbortSignal.timeout(5000) })
      .then(response => (response.ok ? response.text() : Promise.reject(new Error(`index.html returned ${response.status}`))))
      .then(html => (hasPageSlots(html) ? html : Promise.reject(new Error('index.html is missing the page-meta markers'))))
      .catch(error => { templatePromise = undefined; throw error; });
  }
  return templatePromise;
}

// "/post/<slug>", "/post/<id>" or "/post/<id>/<title-slug>" → the post, or null.
async function findPost(key) {
  if (!key) return null;
  const byId = async () => {
    const snapshot = await adminDb.collection('posts').doc(key).get();
    return snapshot.exists ? { id: snapshot.id, ...snapshot.data() } : null;
  };
  if (looksLikePostId(key)) {
    const post = await byId();
    if (post) return post;
  }
  const bySlug = await adminDb.collection('posts').where('slug', '==', key).limit(1).get();
  if (!bySlug.empty) return { id: bySlug.docs[0].id, ...bySlug.docs[0].data() };
  return null;
}

async function sendMemberPage(req, res, template) {
  const requested = String(req.query.member || '').trim();
  const snapshot = await adminDb.collection('posts').get();
  const activity = memberActivity(snapshot.docs.map(document => ({ id: document.id, ...document.data() })), requested);
  if (!activity.name) {
    res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=300');
    return res.status(404).send(template);
  }
  const { meta, contentHtml } = memberPage(activity);
  res.setHeader('Cache-Control', CACHE);
  if (requested !== activity.name) return res.redirect(301, meta.path); // /u/haman%20sharma → /u/Haman%20Sharma
  return res.status(200).send(renderPage(template, meta, contentHtml));
}

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') return res.status(405).end();
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const origin = `${host?.startsWith('localhost') ? 'http' : 'https'}://${host}`;
  if (req.query.member !== undefined) {
    try {
      const template = await loadTemplate(origin);
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return await sendMemberPage(req, res, template);
    } catch (error) {
      console.error('Member page failed:', error.message);
      return res.status(503).setHeader('Retry-After', '10').send('Temporarily unavailable. Please refresh.');
    }
  }
  const key = String(req.query.path || '').split('/')[0];
  try {
    const [template, post] = await Promise.all([loadTemplate(origin), findPost(key)]);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    if (!post || post.deleted || !post.title) {
      res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=300');
      return res.status(404).send(template);
    }
    const { meta, contentHtml, data } = postPage(post);
    res.setHeader('Cache-Control', CACHE);
    const requested = `/post/${String(req.query.path || '').replace(/\/+$/, '')}`;
    if (requested !== meta.path) return res.redirect(301, meta.path);
    return res.status(200).send(renderPage(template, meta, contentHtml, requested, data));
  } catch (error) {
    console.error('Post page failed:', error.message);
    return res.status(503).setHeader('Retry-After', '10').send('Temporarily unavailable. Please refresh.');
  }
}
