// Post URLs come in two shapes:
//   new posts  → /post/<slug>            (slug stored on the post, never changes)
//   older posts → /post/<id>/<title-slug> (Firestore ID; title part is cosmetic)
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
