// Sitemap entries for the site's three sitemaps (listed in public/sitemap.xml):
//   sitemap-pages.xml    written at build time by scripts/prerender.mjs
//   sitemap-posts.xml    served live by api/sitemap-posts.js
//   sitemap-members.xml  served live by api/sitemap-posts.js (?type=members)
// lastmod is the last time a page's content really changed (a post, an edit
// or a comment), and is left out where there's no reliable date.
import { SITE_ORIGIN } from '../../src/data/site';
import { PAGE_META } from '../../src/data/pageMeta';
import { FORUM_CATEGORIES, categoryPath } from '../../src/data/forumCategories';
import { DATASETS, dataAtlasPath } from '../../src/data/dataAtlas';
import { memberPath, postPath } from '../../src/utils/postUrl';
import { toMillis, visibleComments } from '../../src/utils/postDisplay';
import { memberActivity } from '../../src/utils/memberActivity';

const xmlEscape = value => String(value).replace(/[<>&'"]/g, character => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[character]));
const iso = ms => (ms ? new Date(ms).toISOString() : null);
const latest = values => Math.max(0, ...values.filter(Boolean));

// The last time anything on a post's page changed: written, edited or commented on.
export const postLastModified = post => latest([
  toMillis(post.createdAt), toMillis(post.editedAt),
  ...visibleComments(post).flatMap(comment => [toMillis(comment.createdAt), toMillis(comment.editedAt)]),
]);

export function urlsetXml(entries) {
  const urls = entries.map(({ path, lastmod }) => `<url><loc>${xmlEscape(`${SITE_ORIGIN}${path}`)}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}</url>`);
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;
}

const livePosts = posts => posts.filter(post => !post.deleted && post.title);

export const postEntries = posts => livePosts(posts)
  .map(post => ({ path: postPath(post), lastmod: iso(postLastModified(post)) }));

// One entry per member who has written a visible post or comment.
export function memberEntries(posts) {
  const names = new Map();
  for (const post of livePosts(posts)) {
    for (const name of [post.author, ...visibleComments(post).map(comment => comment.author)]) {
      if (memberPath(name)) names.set(String(name).trim().toLowerCase(), name);
    }
  }
  return [...names.values()].map(name => {
    const activity = memberActivity(posts, name);
    const lastmod = latest([...activity.posts.map(postLastModified), ...activity.comments.map(({ comment }) => toMillis(comment.createdAt))]);
    return activity.name ? { path: memberPath(activity.name), lastmod: iso(lastmod) } : null;
  }).filter(Boolean).sort((a, b) => a.path.localeCompare(b.path));
}

// Every pre-rendered, indexable page that isn't a post: the pages in
// src/data/pageMeta.js, the forum categories and the Data Atlas datasets.
// Pages that list posts (home, categories) carry the date of their newest activity.
export function pageEntries(posts) {
  const forum = livePosts(posts).filter(post => !post.playground);
  const newest = list => iso(latest(list.map(postLastModified)));
  return [
    ...Object.values(PAGE_META).map(meta => ({ path: meta.path, lastmod: meta.path === '/' ? newest(forum) : null })),
    ...FORUM_CATEGORIES.map(category => ({ path: categoryPath(category.id), lastmod: newest(forum.filter(post => post.category === category.id)) })),
    ...DATASETS.map(dataset => ({ path: dataAtlasPath(dataset.id), lastmod: null })),
  ];
}
