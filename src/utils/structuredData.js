// schema.org data for post pages, so search engines can recognise forum
// discussions (https://developers.google.com/search/docs/appearance/structured-data/discussion-forum).
import { postPath } from './postUrl';
import { publicOrigin } from '../hooks/usePageMeta';
import { forumCategory, categoryPath } from '../data/forumCategories';

const toIso = value => {
  const date = value?.toDate ? value.toDate() : value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date.toISOString() : undefined;
};

export const markdownToPlainText = markdown => String(markdown || '')
  .replace(/```[\s\S]*?```/g, ' ')
  .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
  .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
  .replace(/[#*_`>|~]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const person = name => ({ '@type': 'Person', name: String(name || 'anonymous') });

// Replies nest under their parent; a reply whose parent was deleted moves to the top level.
function commentTree(comments) {
  const visible = comments.filter(comment => !comment.deleted && comment.body);
  const ids = new Set(visible.map(comment => comment.id));
  const toSchema = comment => {
    const replies = visible.filter(reply => reply.parentId === comment.id).map(toSchema);
    return {
      '@type': 'Comment',
      text: markdownToPlainText(comment.body),
      author: person(comment.author),
      datePublished: toIso(comment.createdAt),
      ...(replies.length ? { comment: replies } : {}),
    };
  };
  return visible.filter(comment => !comment.parentId || !ids.has(comment.parentId)).map(toSchema);
}

function breadcrumb(post, url) {
  const category = !post.playground && forumCategory(post.category);
  const trail = [
    { name: 'CAIO Forum', url: `${publicOrigin}/` },
    post.playground
      ? { name: 'AI Playground Community', url: `${publicOrigin}/playground/community` }
      : category && { name: category.label, url: `${publicOrigin}${categoryPath(category.id)}` },
    { name: post.title, url },
  ].filter(Boolean);
  return {
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((item, index) => ({ '@type': 'ListItem', position: index + 1, name: item.name, item: item.url })),
  };
}

export function postStructuredData(post) {
  const url = `${publicOrigin}${postPath(post)}`;
  const comments = commentTree(post.comments || []);
  const commentCount = (post.comments || []).filter(comment => !comment.deleted && comment.body).length;
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'DiscussionForumPosting',
        '@id': url,
        url,
        mainEntityOfPage: url,
        headline: post.title,
        text: markdownToPlainText(post.body),
        author: person(post.author),
        datePublished: toIso(post.createdAt),
        ...(post.editedAt ? { dateModified: toIso(post.editedAt) } : {}),
        interactionStatistic: [
          { '@type': 'InteractionCounter', interactionType: 'https://schema.org/LikeAction', userInteractionCount: Math.max(0, Number(post.votes) || 0) },
          { '@type': 'InteractionCounter', interactionType: 'https://schema.org/CommentAction', userInteractionCount: commentCount },
        ],
        ...(comments.length ? { comment: comments } : {}),
      },
      breadcrumb(post, url),
    ],
  };
}
