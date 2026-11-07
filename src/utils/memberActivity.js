// A member's public activity, from the posts list: their posts and comments,
// newest first. Shared by the member page (src/pages/MemberPage.jsx) and the
// server-rendered HTML for it (api/post-page.js), so both list the same things.
// Names match case-insensitively; `name` is the spelling used on their content.
import { SORTS, toMillis, visibleComments } from './postDisplay';

const same = (a, b) => String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase();

export function memberActivity(posts, username) {
  const live = posts.filter(post => !post.deleted && post.title);
  const memberPosts = live.filter(post => same(post.author, username)).sort(SORTS.new);
  const comments = live
    .flatMap(post => visibleComments(post).filter(comment => same(comment.author, username)).map(comment => ({ post, comment })))
    .sort((a, b) => toMillis(b.comment.createdAt) - toMillis(a.comment.createdAt));
  const name = memberPosts[0]?.author || comments[0]?.comment.author || null;
  const dates = [...memberPosts.map(post => toMillis(post.createdAt)), ...comments.map(item => toMillis(item.comment.createdAt))].filter(Boolean);
  return { name, posts: memberPosts, comments, firstActive: dates.length ? Math.min(...dates) : 0 };
}
