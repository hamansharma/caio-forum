// Posts live at /post/<slug> (the slug is stored on the post and never changes).
// Posts without a slug fall back to /post/<id>/<title-slug>; every post has had a
// slug since scripts/migrate-post-slugs.mjs, and old addresses redirect (301)
// to the slug URL (api/post-page.js).
// Keep this file dependency-free: api/sitemap-posts.js imports it too.

const SLUG_MAX_LENGTH = 80;

export function slugify(text) {
  const slug = String(text || '')
    .normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  if (slug.length <= SLUG_MAX_LENGTH) return slug;
  const cut = slug.slice(0, SLUG_MAX_LENGTH);
  const lastBreak = cut.lastIndexOf('-');
  return (lastBreak > SLUG_MAX_LENGTH / 2 ? cut.slice(0, lastBreak) : cut).replace(/-+$/, '');
}

// Firestore auto-generated document IDs are 20 alphanumeric characters.
export const looksLikePostId = key => /^[A-Za-z0-9]{20}$/.test(key);

export function postPath(post) {
  if (post.slug) return `/post/${post.slug}`;
  const titleSlug = slugify(post.title);
  return titleSlug ? `/post/${post.id}/${titleSlug}` : `/post/${post.id}`;
}

// A member's public page, /u/<username>. Placeholder authors (deleted or
// moderated content, anonymous) have none, so this returns null for them.
const NO_MEMBER_PAGE = new Set(['', 'anonymous', '[deleted]', '[moderated]']);
export function memberPath(username) {
  const name = String(username || '').trim();
  return NO_MEMBER_PAGE.has(name.toLowerCase()) ? null : `/u/${encodeURIComponent(name)}`;
}
