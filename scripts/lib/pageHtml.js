// Turns the app's index.html into a page-specific HTML document: the page's own
// title, description, canonical URL, social tags and structured data in <head>,
// and its readable content in the <noscript> slot for crawlers and link
// previews that don't run JavaScript. The React app loads on top as usual.
//
// Used at build time by scripts/prerender.mjs and at request time by
// api/post-page.js (posts published since the last deploy).
import { SITE_ORIGIN } from '../../src/data/site';
import { forumCategory, categoryPath } from '../../src/data/forumCategories';
import { postPath } from '../../src/utils/postUrl';
import { postMetaTitle, postMetaDescription, toMillis, visibleComments, markdownToPlainText } from '../../src/utils/postDisplay';
import { postStructuredData } from '../../src/utils/structuredData';

// Markers in public/index.html (tags, not comments, because the build strips comments).
export const META_BLOCK = /(<meta name="page-meta" content="start"\s*\/?>)[\s\S]*?(<meta name="page-meta" content="end"\s*\/?>)/;
// The slot is empty in a fresh build; once filled it ends with an end marker, so filling it again works too.
export const CONTENT_SLOT = /<div id="page-content">(?:[\s\S]*?<span id="page-content-end"><\/span>)?<\/div>/;

export const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const jsonForScript = data => JSON.stringify(data).replace(/</g, '\\u003c');
export const isoDate = value => (toMillis(value) ? new Date(toMillis(value)).toISOString() : '');

// Plain paragraphs from markdown, for when a full markdown renderer isn't available.
export const plainParagraphs = markdown => String(markdown || '').split(/\n\s*\n/)
  .map(markdownToPlainText).filter(Boolean).map(text => `<p>${esc(text)}</p>`).join('');

export const hasPageSlots = template => META_BLOCK.test(template) && CONTENT_SLOT.test(template);

function headTags({ title, description, path, type = 'website', jsonLd, published, canonical = true, noIndex = false }) {
  const url = `${SITE_ORIGIN}${path}`;
  return [
    `<title>${esc(title)}</title>`,
    `<meta name="description" content="${esc(description)}" />`,
    noIndex && '<meta name="robots" content="noindex" />',
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

export function renderPage(template, meta, contentHtml) {
  return template
    .replace(META_BLOCK, (match, start, end) => `${start}${headTags(meta)}${end}`)
    .replace(CONTENT_SLOT, () => `<div id="page-content">${contentHtml}<span id="page-content-end"></span></div>`);
}

// A post's meta and readable content. `markdownHtml` renders a post or comment
// body; the build passes a full markdown renderer, the server plainParagraphs.
export function postPage(post, markdownHtml = plainParagraphs) {
  const category = !post.playground && forumCategory(post.category);
  const comments = visibleComments(post);
  const related = (post.related || []).map(item => `<li><a href="${esc(postPath(item))}">${esc(item.title)}</a></li>`).join('');
  const published = isoDate(post.createdAt);
  const meta = { title: postMetaTitle(post), description: postMetaDescription(post), path: postPath(post), type: 'article', published, jsonLd: postStructuredData(post) };
  const contentHtml = [
    `<article><h1>${esc(post.title)}</h1>`,
    `<p>By u/${esc(post.author)}${published ? ` · <time datetime="${published}">${published.slice(0, 10)}</time>` : ''}${category ? ` · <a href="${esc(categoryPath(category.id))}">${esc(category.label)}</a>` : ''}</p>`,
    markdownHtml(post.body),
    '</article>',
    comments.length ? `<section><h2>${comments.length} comment${comments.length === 1 ? '' : 's'}</h2>${comments.map(comment => `<div><p><strong>u/${esc(comment.author)}</strong></p>${markdownHtml(comment.body)}</div>`).join('')}</section>` : '',
    related ? `<section><h2>Related posts</h2><ul>${related}</ul></section>` : '',
  ].join('');
  return { meta, contentHtml };
}
