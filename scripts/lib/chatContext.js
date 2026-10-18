// Chooses which forum posts the chatbot sees for a conversation, so the prompt
// carries only the most relevant posts instead of the whole forum.
// Pure functions: used by api/chat.js and unit-tested without Firestore.
import { tokenize, isRelatable } from './relatedPosts.js';
import { postPath } from '../../src/utils/postUrl.js';

// The latest question counts double; earlier questions keep follow-ups on topic.
function queryTerms(messages) {
  const userTurns = messages.filter(message => message.role === 'user').map(message => message.content);
  const terms = new Map();
  userTurns.forEach((text, index) => {
    const weight = index === userTurns.length - 1 ? 2 : 1;
    tokenize(text).forEach(term => terms.set(term, (terms.get(term) || 0) + weight));
  });
  return terms;
}

export function formatPostForPrompt(post) {
  const comments = (post.comments || [])
    .filter(comment => !comment.deleted)
    .map(comment => `    [Comment by u/${comment.author}]: ${comment.body}`)
    .join('\n');
  return `POST TITLE: ${post.title}
LINK: ${postPath(post)}
CATEGORY: ${post.category || 'general'}
AUTHOR: u/${post.author}
BODY: ${post.body}
COMMENTS:
${comments || '    (no comments yet)'}`;
}

/**
 * Returns up to `limit` posts ranked by how well they match the conversation,
 * skipping weak matches (below `minRelativeScore` of the best match) and
 * stopping before the formatted posts exceed `maxChars`. Whole posts are kept or
 * dropped; none are cut off midway.
 */
export function selectRelevantPosts(posts, messages, { limit = 5, maxChars = 40000, minRelativeScore = 0.3 } = {}) {
  const query = queryTerms(messages);
  if (!query.size) return [];

  const candidates = posts.filter(isRelatable).map(post => {
    const titleTerms = new Set(tokenize(post.title));
    const commentText = (post.comments || []).filter(comment => !comment.deleted).map(comment => comment.body).join(' ');
    const allTerms = new Set([...titleTerms, ...tokenize(post.body), ...tokenize(post.category), ...tokenize(commentText)]);
    return { post, titleTerms, allTerms };
  });

  const documentFrequency = term => candidates.filter(candidate => candidate.allTerms.has(term)).length;
  const idf = new Map([...query.keys()].map(term => [term, Math.log((1 + candidates.length) / (1 + documentFrequency(term)))]));

  const ranked = candidates
    .map(candidate => {
      let score = 0;
      query.forEach((weight, term) => {
        if (candidate.allTerms.has(term)) score += weight * idf.get(term) * (candidate.titleTerms.has(term) ? 3 : 1);
      });
      return { post: candidate.post, score };
    })
    .filter(match => match.score > 0)
    .sort((a, b) => b.score - a.score);
  const cutoff = (ranked[0]?.score || 0) * minRelativeScore;

  const selected = [];
  let used = 0;
  for (const { post, score } of ranked) {
    if (selected.length >= limit || score < cutoff) break;
    const size = formatPostForPrompt(post).length;
    if (used + size > maxChars) continue;
    selected.push(post);
    used += size;
  }
  return selected;
}

// A short list of every post, so the assistant knows what exists and can point
// readers to posts it wasn't given in full.
export function formatPostIndex(posts) {
  return posts
    .filter(isRelatable)
    .map(post => `- ${post.title} (${post.category || 'general'}) — ${postPath(post)}`)
    .join('\n');
}
