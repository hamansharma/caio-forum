// Writes a static HTML file for each indexable page after `npm run build`, so
// crawlers and link previews that don't run JavaScript still get the right
// title, description, canonical URL, social tags, structured data and content.
// The React app loads on top as usual and takes over the page.
//
// Runs automatically as `postbuild`. Posts need Firebase Admin credentials
// (FIREBASE_ADMIN_* from the environment or .env.local); without them only the
// static pages are written. Files are written as <path>.html and served at
// <path> by "cleanUrls" in vercel.json.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { PAGE_META } from '../src/data/pageMeta.js';
import { FORUM_CATEGORIES, forumCategory, categoryPath } from '../src/data/forumCategories.js';
import { DATASETS, dataAtlasPath } from '../src/data/dataAtlas.js';
import { postPath } from '../src/utils/postUrl.js';
import { SORTS, excerpt, postMetaTitle, postMetaDescription, toMillis, visibleComments } from '../src/utils/postDisplay.js';
import { postStructuredData } from '../src/utils/structuredData.js';

const ORIGIN = 'https://caioleadership.com';
const BUILD = new URL('../build/', import.meta.url).pathname;
const template = readFileSync(join(BUILD, 'index.html'), 'utf8');
// Markers in public/index.html (tags, not comments, because the build strips comments).
const META_BLOCK = /(<meta name="page-meta" content="start"\s*\/?>)[\s\S]*?(<meta name="page-meta" content="end"\s*\/?>)/;
// The slot is empty in a fresh build; after a run it ends with an end marker, so re-running works too.
const CONTENT_SLOT = /<div id="page-content">(?:[\s\S]*?<span id="page-content-end"><\/span>)?<\/div>/;
if (!META_BLOCK.test(template) || !CONTENT_SLOT.test(template)) throw new Error('build/index.html is missing the page-meta markers or the page-content slot');

const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const jsonForScript = data => JSON.stringify(data).replace(/</g, '\\u003c');
const markdownHtml = markdown => renderToStaticMarkup(createElement(ReactMarkdown, { remarkPlugins: [remarkGfm] }, String(markdown || '')));
const isoDate = value => (toMillis(value) ? new Date(toMillis(value)).toISOString() : '');

function headTags({ title, description, path, type = 'website', jsonLd, published, canonical = true }) {
  const url = `${ORIGIN}${path}`;
  return [
    `<title>${esc(title)}</title>`,
    `<meta name="description" content="${esc(description)}" />`,
    canonical && `<link rel="canonical" href="${esc(url)}" />`,
    `<meta property="og:type" content="${type}" />`,
    canonical && `<meta property="og:url" content="${esc(url)}" />`,
    `<meta property="og:title" content="${esc(title)}" />`,
    `<meta property="og:description" content="${esc(description)}" />`,
    `<meta name="twitter:title" content="${esc(title)}" />`,
    `<meta name="twitter:description" content="${esc(description)}" />`,
    published && `<meta property="article:published_time" content="${esc(published)}" />`,
    jsonLd && `<script type="application/ld+json" id="page-jsonld">${jsonForScript(jsonLd)}</script>`,
  ].filter(Boolean).join('');
}

const postList = posts => (posts.length ? `<ul>${posts.map(post => `<li><a href="${esc(postPath(post))}">${esc(post.title)}</a> — ${esc(excerpt(post.body, 160))}</li>`).join('')}</ul>` : '');

function render(meta, contentHtml) {
  return template
    .replace(META_BLOCK, (match, start, end) => `${start}${headTags(meta)}${end}`)
    .replace(CONTENT_SLOT, () => `<div id="page-content">${contentHtml}<span id="page-content-end"></span></div>`);
}

// "/" is the shell every other URL falls back to, so it is rewritten in place
// and keeps no canonical URL (other pages would inherit it). The rest become
// <path>.html files.
const written = [];
function write(path, meta, contentHtml) {
  const file = path === '/' ? join(BUILD, 'index.html') : join(BUILD, `${path.replace(/^\//, '')}.html`);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, render({ ...meta, path, canonical: path !== '/' && meta.canonical !== false }, contentHtml));
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
for (const meta of Object.values(PAGE_META)) {
  const list = meta.path === '/' ? postList(forumPosts.slice(0, 40)) : '';
  write(meta.path, meta, `<h1>${esc(meta.heading)}</h1><p>${esc(meta.intro)}</p>${list}`);
}

for (const category of FORUM_CATEGORIES) {
  const inCategory = forumPosts.filter(post => post.category === category.id);
  write(categoryPath(category.id), { title: `${category.label} Discussions | CAIO Forum`, description: category.description },
    `<h1>${esc(category.heading)}</h1><p>${esc(category.description)}</p>${postList(inCategory)}`);
}

for (const dataset of DATASETS) {
  const sources = dataset.sources.map(source => `<a href="${esc(source.url)}">${esc(source.name)}</a>`).join(', ');
  write(dataAtlasPath(dataset.id), { title: `${dataset.title} Map | Data Atlas | CAIO Forum`, description: dataset.summary },
    `<h1>${esc(dataset.title)}</h1><p>${esc(dataset.summary)}</p><p>Sources: ${sources}.</p>`);
}

for (const post of posts) {
  const path = postPath(post);
  const category = !post.playground && forumCategory(post.category);
  const comments = visibleComments(post);
  const related = (post.related || []).map(item => `<li><a href="${esc(postPath(item))}">${esc(item.title)}</a></li>`).join('');
  const published = isoDate(post.createdAt);
  write(path, { title: postMetaTitle(post), description: postMetaDescription(post), type: 'article', published, jsonLd: postStructuredData(post) }, [
    `<article><h1>${esc(post.title)}</h1>`,
    `<p>By u/${esc(post.author)}${published ? ` · <time datetime="${published}">${published.slice(0, 10)}</time>` : ''}${category ? ` · <a href="${esc(categoryPath(category.id))}">${esc(category.label)}</a>` : ''}</p>`,
    markdownHtml(post.body),
    '</article>',
    comments.length ? `<section><h2>${comments.length} comment${comments.length === 1 ? '' : 's'}</h2>${comments.map(comment => `<div><p><strong>u/${esc(comment.author)}</strong></p>${markdownHtml(comment.body)}</div>`).join('')}</section>` : '',
    related ? `<section><h2>Related posts</h2><ul>${related}</ul></section>` : '',
  ].join(''));
}

console.log(`prerender: wrote ${written.length} pages (${posts.length} posts).`);
