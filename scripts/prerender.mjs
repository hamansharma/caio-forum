// Writes a static HTML file for each indexable page after `npm run build`, so
// crawlers and link previews that don't run JavaScript still get the right
// title, description, canonical URL, social tags, structured data and content.
// The React app loads on top as usual and takes over the page.
//
// Runs automatically as `postbuild`. Posts need Firebase Admin credentials
// (FIREBASE_ADMIN_* from the environment or .env.local); without them only the
// static pages are written. Files are written as <path>.html and served at
// <path> by "cleanUrls" in vercel.json. Posts published after the build are
// rendered on request by api/post-page.js, with the same HTML (scripts/lib/pageHtml.js).
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { PAGE_META } from '../src/data/pageMeta.js';
import { FORUM_CATEGORIES, categoryPath } from '../src/data/forumCategories.js';
import { DATASETS, dataAtlasPath } from '../src/data/dataAtlas.js';
import { postPath } from '../src/utils/postUrl.js';
import { SORTS, excerpt } from '../src/utils/postDisplay.js';
import { esc, guideHtml, hasPageSlots, postPage, postPreview, renderPage } from './lib/pageHtml.js';

const BUILD = new URL('../build/', import.meta.url).pathname;
const template = readFileSync(join(BUILD, 'index.html'), 'utf8');
if (!hasPageSlots(template)) throw new Error('build/index.html is missing the page-meta markers or the page-content slot');

const markdownHtml = markdown => renderToStaticMarkup(createElement(ReactMarkdown, { remarkPlugins: [remarkGfm] }, String(markdown || '')));

const postList = posts => (posts.length ? `<ul>${posts.map(post => `<li><a href="${esc(postPath(post))}">${esc(post.title)}</a> — ${esc(excerpt(post.body, 160))}</li>`).join('')}</ul>` : '');

// "/" is the shell every other URL falls back to, so it is rewritten in place
// and keeps no canonical URL (other pages would inherit it). The rest become
// <path>.html files.
const written = [];
function write(path, meta, contentHtml, data = null) {
  const file = path === '/' ? join(BUILD, 'index.html') : join(BUILD, `${path.replace(/^\//, '')}.html`);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, renderPage(template, { ...meta, path, canonical: path !== '/' && meta.canonical !== false }, contentHtml, path, data));
  written.push(path);
}

async function loadPosts() {
  try { if (existsSync('.env.local')) process.loadEnvFile('.env.local'); } catch { /* optional locally */ }
  const { FIREBASE_ADMIN_PROJECT_ID: projectId, FIREBASE_ADMIN_CLIENT_EMAIL: clientEmail, FIREBASE_ADMIN_PRIVATE_KEY: key } = process.env;
  if (!projectId || !clientEmail || !key) {
    console.warn('prerender: no Firebase Admin credentials, so post pages are skipped (static pages only).');
    return [];
  }
  try {
    const { cert, getApps, initializeApp } = await import('firebase-admin/app');
    const { getFirestore } = await import('firebase-admin/firestore');
    const privateKey = key.trim().replace(/^['"]|['"]$/g, '').replace(/\\n/g, '\n');
    const app = getApps()[0] || initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
    const snapshot = await getFirestore(app).collection('posts').get();
    return snapshot.docs.map(document => ({ id: document.id, ...document.data() })).filter(post => !post.deleted && post.title);
  } catch (error) {
    console.warn(`prerender: could not load posts (${error.message}); post pages are skipped.`);
    return [];
  }
}

const posts = await loadPosts();
const forumPosts = posts.filter(post => !post.playground).sort(SORTS.new);

// Static pages from src/data/pageMeta.js; the home page also lists the latest posts.
for (const [key, meta] of Object.entries(PAGE_META)) {
  const list = meta.path === '/' ? postList(forumPosts.slice(0, 40)) : '';
  // The home page also ships previews of every forum post, so its list draws immediately.
  const data = meta.path === '/' ? { posts: forumPosts.map(postPreview) } : null;
  write(meta.path, meta, `<h1>${esc(meta.heading)}</h1><p>${esc(meta.intro)}</p>${list}${guideHtml(key)}`, data);
}

for (const category of FORUM_CATEGORIES) {
  const inCategory = forumPosts.filter(post => post.category === category.id);
  write(categoryPath(category.id), { title: `${category.label} Discussions | CAIO Forum`, description: category.description },
    `<h1>${esc(category.heading)}</h1><p>${esc(category.description)}</p>${postList(inCategory)}`);
}

for (const dataset of DATASETS) {
  const sources = dataset.sources.map(source => `<a href="${esc(source.url)}">${esc(source.name)}</a>`).join(', ');
  write(dataAtlasPath(dataset.id), { title: `${dataset.title} Map | Data Atlas | CAIO Forum`, description: dataset.summary },
    `<h1>${esc(dataset.title)}</h1><p>${esc(dataset.summary)}</p><p>Sources: ${sources}.</p>${guideHtml(dataset.id)}`);
}

for (const post of posts) {
  const { meta, contentHtml, data } = postPage(post, markdownHtml);
  write(meta.path, meta, contentHtml, data);
}

console.log(`prerender: wrote ${written.length} pages (${posts.length} posts).`);
