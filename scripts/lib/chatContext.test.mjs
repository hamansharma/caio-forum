import { test } from 'node:test';
import assert from 'node:assert/strict';
import { selectRelevantPosts, formatPostIndex, formatPostForPrompt } from './chatContext.mjs';

const posts = [
  { id: 'aaaaaaaaaaaaaaaaaaaa', title: 'Measuring ROI of AI projects', body: 'Payback period and cost savings.', category: 'strategy', author: 'a' },
  { id: 'bbbbbbbbbbbbbbbbbbbb', title: 'AI governance committees', body: 'Oversight and policy for model risk.', category: 'ethics', author: 'b' },
  { id: 'cccccccccccccccccccc', slug: 'synthetic-data-basics', title: 'Synthetic data basics', body: 'Generating training data safely.', category: 'concepts', author: 'c',
    comments: [{ author: 'd', body: 'Great for privacy and governance.' }] },
  { id: 'dddddddddddddddddddd', title: '[deleted]', body: '[deleted]', deleted: true },
];
const ask = (...questions) => questions.map(content => ({ role: 'user', content }));

test('ranks posts by relevance to the latest question', () => {
  const selected = selectRelevantPosts(posts, ask('How do we measure ROI and payback?'));
  assert.equal(selected[0].id, 'aaaaaaaaaaaaaaaaaaaa');
});

test('matches on comments too, but title matches rank higher', () => {
  const selected = selectRelevantPosts(posts, ask('governance'));
  assert.deepEqual(selected.map(post => post.id), ['bbbbbbbbbbbbbbbbbbbb', 'cccccccccccccccccccc']);
});

test('earlier questions keep a vague follow-up on topic', () => {
  const selected = selectRelevantPosts(posts, [
    { role: 'user', content: 'Tell me about synthetic data' },
    { role: 'assistant', content: 'Sure.' },
    { role: 'user', content: 'What are the risks?' },
  ]);
  assert.equal(selected[0].id, 'cccccccccccccccccccc');
});

test('returns nothing for questions with no matching words, and never deleted posts', () => {
  assert.deepEqual(selectRelevantPosts(posts, ask('hello there')), []);
  assert.ok(selectRelevantPosts(posts, ask('deleted')).every(post => !post.deleted));
});

test('skips weak matches far below the best one', () => {
  const selected = selectRelevantPosts(posts, ask('governance'), { minRelativeScore: 0.9 });
  assert.deepEqual(selected.map(post => post.id), ['bbbbbbbbbbbbbbbbbbbb']);
});

test('drops whole posts rather than exceeding the size budget', () => {
  const tight = formatPostForPrompt(posts[1]).length + 10;
  const selected = selectRelevantPosts(posts, ask('governance'), { maxChars: tight });
  assert.deepEqual(selected.map(post => post.id), ['bbbbbbbbbbbbbbbbbbbb']);
});

test('the post index lists links using each post\'s current URL', () => {
  const index = formatPostIndex(posts);
  assert.match(index, /\/post\/synthetic-data-basics/);
  assert.match(index, /\/post\/aaaaaaaaaaaaaaaaaaaa\/measuring-roi-of-ai-projects/);
  assert.doesNotMatch(index, /deleted/);
});
