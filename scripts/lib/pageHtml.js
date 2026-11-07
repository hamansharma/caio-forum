// Turns the app's index.html into a page-specific HTML document: the page's own
// title, description, canonical URL, social tags and structured data in <head>,
// and its readable content in the <noscript> slot for crawlers and link
// previews that don't run JavaScript. The React app loads on top as usual.
//
// Used at build time by scripts/prerender.mjs and at request time by
// api/post-page.js (posts published since the last deploy).
import { SITE_ORIGIN } from '../../src/data/site';
import { forumCategory, categoryPath } from '../../src/data/forumCategories';
import { memberPath, postPath } from '../../src/utils/postUrl';
import { excerpt, plural, postMetaTitle, postMetaDescription, toMillis, visibleComments, markdownToPlainText } from '../../src/utils/postDisplay';
import { memberStructuredData, postStructuredData } from '../../src/utils/structuredData';
import { PAGE_GUIDES } from '../../src/data/pageGuides';

// Markers in public/index.html (tags, not comments, because the build strips comments).
export const META_BLOCK = /(<meta name="page-meta" content="start"\s*\/?>)[\s\S]*?(<meta name="page-meta" content="end"\s*\/?>)/;
// The slot is empty in a fresh build; once filled it ends with an end marker, so filling it again works too.
export const CONTENT_SLOT = /<div id="page-content"[^>]*>(?:[\s\S]*?<span id="page-content-end"><\/span>)?<\/div>/;

export const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const jsonForScript = data => JSON.stringify(data).replace(/</g, '\\u003c');
export const isoDate = value => (toMillis(value) ? new Date(toMillis(value)).toISOString() : '');

// Plain paragraphs from markdown, for when a full markdown renderer isn't available.
export const plainParagraphs = markdown => String(markdown || '').split(/\n\s*\n/)
  .map(markdownToPlainText).filter(Boolean).map(text => `<p>${esc(text)}</p>`).join('');

// The "About this tool" guide for a page (see src/components/PageGuide.jsx), or ''.
export function guideHtml(id) {
  const guide = PAGE_GUIDES[id];
  if (!guide) return '';
  return `<section><h2>${esc(guide.title)}</h2>${guide.paragraphs.map(text => `<p>${esc(text)}</p>`).join('')}`
    + `<h3>Common questions</h3><dl>${guide.faqs.map(({ q, a }) => `<dt>${esc(q)}</dt><dd>${esc(a)}</dd>`).join('')}</dl></section>`;
}

export const hasPageSlots = template => META_BLOCK.test(template) && CONTENT_SLOT.test(template);

// `socialTitle` (default: title) is what LinkedIn, X and Slack show; it can be
// longer than the search title.
function headTags({ title, socialTitle = title, description, path, type = 'website', jsonLd, published, canonical = true, noIndex = false }) {
  const url = `${SITE_ORIGIN}${path}`;
  return [
    `<title>${esc(title)}</title>`,
    `<meta name="description" content="${esc(description)}" />`,
    noIndex && '<meta name="robots" content="noindex" />',
    canonical && `<link rel="canonical" href="${esc(url)}" />`,
    `<meta property="og:type" content="${type}" />`,
    canonical && `<meta property="og:url" content="${esc(url)}" />`,
    `<meta property="og:title" content="${esc(socialTitle)}" />`,
    `<meta property="og:description" content="${esc(description)}" />`,
    `<meta name="twitter:title" content="${esc(socialTitle)}" />`,
    `<meta name="twitter:description" content="${esc(description)}" />`,
    published && `<meta property="article:published_time" content="${esc(published)}" />`,
    jsonLd && `<script type="application/ld+json" id="page-jsonld">${jsonForScript(jsonLd)}</script>`,
  ].filter(Boolean).join('');
}

// Firestore values (Timestamps) as plain JSON the app can read back.
export const toPlain = value => {
  if (value?.toDate) return value.toDate().toISOString();
  if (Array.isArray(value)) return value.map(toPlain);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, toPlain(item)]));
  return value;
};

// A short preview of a post for lists (the home page): enough for a post card.
export const postPreview = post => toPlain({
  id: post.id, slug: post.slug, title: post.title, body: String(post.body || '').slice(0, 600), category: post.category,
  author: post.author, createdAt: post.createdAt, votes: post.votes, playground: post.playground, playgroundTool: post.playgroundTool,
  comments: visibleComments(post).map(comment => ({ id: comment.id, parentId: comment.parentId || null })), partial: true,
});

// `servedPath` is the URL path this HTML is served at (default: the page's own
// path). The text shows only on that path; public/index.html removes it on any
// other. `data` is handed to the app (src/utils/pageData.js) so it can draw the
// page before Firestore answers.
export function renderPage(template, meta, contentHtml, servedPath = meta.path, data = null) {
  const dataScript = data ? `<script type="application/json" id="page-data">${jsonForScript(data)}</script>` : '';
  return template
    .replace(META_BLOCK, (match, start, end) => `${start}${headTags(meta)}${end}`)
    .replace(CONTENT_SLOT, () => `<div id="page-content" data-path="${esc(servedPath)}">${contentHtml}${dataScript}<span id="page-content-end"></span></div>`);
}

// A post's meta and readable content. `markdownHtml` renders a post or comment
// body; the build passes a full markdown renderer, the server plainParagraphs.
export function postPage(post, markdownHtml = plainParagraphs) {
  const category = !post.playground && forumCategory(post.category);
  const comments = visibleComments(post);
  const related = (post.related || []).map(item => `<li><a href="${esc(postPath(item))}">${esc(item.title)}</a></li>`).join('');
  const published = isoDate(post.createdAt);
  const meta = { title: postMetaTitle(post), socialTitle: post.title, description: postMetaDescription(post), path: postPath(post), type: 'article', published, jsonLd: postStructuredData(post) };
  const contentHtml = [
    `<article><h1>${esc(post.title)}</h1>`,
    `<p>By u/${esc(post.author)}${published ? ` · <time datetime="${published}">${published.slice(0, 10)}</time>` : ''}${category ? ` · <a href="${esc(categoryPath(category.id))}">${esc(category.label)}</a>` : ''}</p>`,
    markdownHtml(post.body),
    '</article>',
    comments.length ? `<section><h2>${comments.length} comment${comments.length === 1 ? '' : 's'}</h2>${comments.map(comment => `<div><p><strong>u/${esc(comment.author)}</strong></p>${markdownHtml(comment.body)}</div>`).join('')}</section>` : '',
    related ? `<section><h2>Related posts</h2><ul>${related}</ul></section>` : '',
  ].join('');
  return { meta, contentHtml, data: { post: toPlain(post) } };
}

// A member's public page (/u/<name>) from their activity (src/utils/memberActivity.js).
export function memberPage(activity) {
  const { name, posts, comments } = activity;
  const meta = {
    title: `u/${name} | CAIO Forum Member`,
    description: `Posts and comments by u/${name} on CAIO Forum, the community for AI leaders: ${plural(posts.length, 'post')} and ${plural(comments.length, 'comment')}.`,
    path: memberPath(name), type: 'profile', jsonLd: memberStructuredData(activity),
  };
  const list = items => `<ul>${items.join('')}</ul>`;
  const contentHtml = [
    `<h1>u/${esc(name)}</h1><p>${plural(posts.length, 'post')} · ${plural(comments.length, 'comment')}</p>`,
    posts.length ? `<h2>Posts</h2>${list(posts.map(post => `<li><a href="${esc(postPath(post))}">${esc(post.title)}</a>: ${esc(excerpt(post.body, 160))}</li>`))}` : '',
    comments.length ? `<h2>Comments</h2>${list(comments.map(({ post, comment }) => `<li>${esc(excerpt(comment.body, 160))} (on <a href="${esc(postPath(post))}">${esc(post.title)}</a>)</li>`))}` : '',
  ].join('');
  return { meta, contentHtml };
}
