import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tokenize, findRelatedPosts } from './relatedPosts.js';

const posts = [
  { id: 'gov1', title: 'AI governance frameworks for the board', body: 'How boards set governance policies and oversight for AI risk.', category: 'strategy' },
  { id: 'gov2', title: 'Building an AI governance policy', body: 'Policies, oversight committees and risk reviews.', category: 'strategy' },
  { id: 'roi', title: 'Measuring ROI of AI projects', body: 'Cost savings, revenue impact and payback period.', category: 'concepts' },
  { id: 'roi2', title: 'AI project ROI benchmarks', body: 'Revenue impact and cost savings from AI projects.', category: 'concepts' },
  { id: 'gone', title: '[deleted]', body: '[deleted]', deleted: true },
  { id: 'new', slug: 'ai-governance-checklist', title: 'AI governance checklist', body: 'Oversight and policy steps.', category: 'strategy' },
];

test('tokenize drops stopwords, URLs and markdown link targets, and stems plurals', () => {
  assert.deepEqual(tokenize('The [policies](https://x.com/a) for models at https://example.com'), ['policy', 'model']);
});

test('matches posts on the same topic, best first', () => {
  const related = findRelatedPosts(posts);
  assert.deepEqual(related.get('gov1').map(match => match.id).slice(0, 2).sort(), ['gov2', 'new']);
  assert.equal(related.get('roi').at(0).id, 'roi2');
});

test('never relates a post to itself or to deleted posts', () => {
  const related = findRelatedPosts(posts);
  related.forEach((matches, id) => {
    assert.ok(matches.every(match => match.id !== id && match.id !== 'gone'));
  });
  assert.equal(related.has('gone'), false);
});

test('keeps slugs and categories so links and tags render correctly', () => {
  const match = findRelatedPosts(posts).get('gov2').find(item => item.id === 'new');
  assert.equal(match.slug, 'ai-governance-checklist');
  assert.equal(match.category, 'strategy');
});

test('respects limit and minimum score', () => {
  const related = findRelatedPosts(posts, { limit: 1, minScore: 0.99 });
  related.forEach(matches => assert.ok(matches.length <= 1));
  assert.equal(related.get('roi').length, 0);
});
