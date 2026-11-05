// Shared helpers for listing posts: dates, sorting, previews and counts.

// Post dates are Firestore Timestamps (posts) or ISO strings (comments, older
// data); `new Date(timestamp)` on a Timestamp is invalid, so always go through this.
export const toMillis = value => {
  const date = value?.toDate ? value.toDate() : value ? new Date(value) : null;
  const time = date ? date.getTime() : NaN;
  return Number.isFinite(time) ? time : 0;
};

export const visibleComments = post => (post.comments || []).filter(comment => !comment.deleted);

// Markdown to readable plain text: drops code blocks, images, link targets,
// table separator rows and formatting characters.
export const markdownToPlainText = markdown => String(markdown || '')
  .replace(/```[\s\S]*?```/g, ' ')
  .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
  .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
  .replace(/^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)*\|?\s*$/gm, ' ')
  .replace(/^\s*-{3,}\s*$/gm, ' ')
  .replace(/[#*_`>|~]/g, ' ')
  .replace(/\s+/g, ' ')
  .replace(/ ([.,;:!?)])/g, '$1') // "**point**." leaves "point ."
  .trim();

// A preview of a post body, cut at a word boundary.
export function excerpt(markdown, maxLength = 180) {
  const text = markdownToPlainText(markdown);
  if (text.length <= maxLength) return text;
  const cut = text.slice(0, maxLength);
  return `${cut.slice(0, cut.lastIndexOf(' ') > maxLength * 0.6 ? cut.lastIndexOf(' ') : maxLength).replace(/[\s,.;:—-]+$/, '')}…`;
}

// "Hot": engagement that decays with age, so active recent posts rise and
// old posts gradually drop (similar to Hacker News ranking).
export function hotScore(post, now = Date.now()) {
  const hours = Math.max(0, (now - toMillis(post.createdAt)) / 3600000);
  const engagement = Math.max(0, Number(post.votes) || 0) + 2 * visibleComments(post).length;
  return (engagement + 1) / (hours + 2) ** 1.5;
}

export const SORTS = {
  new: (a, b) => toMillis(b.createdAt) - toMillis(a.createdAt),
  hot: (a, b) => hotScore(b) - hotScore(a),
  top: (a, b) => (Number(b.votes) || 0) - (Number(a.votes) || 0) || toMillis(b.createdAt) - toMillis(a.createdAt),
};

export const plural = (count, word) => `${count} ${word}${count === 1 ? '' : 's'}`;

// Search/social title and description for a post page, shared by the post page
// and scripts/prerender.mjs so the static HTML and the app say the same thing.
// Google shows about 60–65 characters of a title, so long titles are shortened
// for search: drop the site name, then keep a clean phrase (before a colon,
// dash or comma), then cut at a word. The page and social previews keep the
// full title.
const SEARCH_TITLE_MAX = 65;
const SITE_SUFFIX = ' | CAIO Forum';
export function postMetaTitle(post) {
  const title = String(post.title || '').trim();
  const fit = text => (text.length + SITE_SUFFIX.length <= SEARCH_TITLE_MAX ? text + SITE_SUFFIX : text);
  if (title.length + SITE_SUFFIX.length <= SEARCH_TITLE_MAX) return title + SITE_SUFFIX;
  if (title.length <= SEARCH_TITLE_MAX) return title;
  const lead = title.split(/:\s|\s[–—-]\s/)[0].trim();
  if (lead.length >= 18 && lead.length <= SEARCH_TITLE_MAX) return fit(lead);
  const clause = title.slice(0, SEARCH_TITLE_MAX + 1).split(', ').slice(0, -1).join(', ');
  if (clause.length >= 25) return fit(clause);
  const cut = title.slice(0, SEARCH_TITLE_MAX - 1);
  return `${cut.slice(0, cut.lastIndexOf(' ')).replace(/[\s,;:–—-]+$/, '')}…`;
}
export const postMetaDescription = post => excerpt(post.body, 155);
