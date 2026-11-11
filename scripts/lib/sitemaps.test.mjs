import { test } from 'node:test';
import assert from 'node:assert/strict';
import { memberEntries, pageEntries, postEntries, postLastModified, urlsetXml } from './sitemaps.js';
import { PAGE_META } from '../../src/data/pageMeta.js';
import { memberPath } from '../../src/utils/postUrl.js';
import { memberActivity } from '../../src/utils/memberActivity.js';

const posts = [
  { id: 'a', slug: 'first', title: 'First', category: 'strategy', author: 'Neo Smith', createdAt: '2026-10-01T00:00:00.000Z',
    comments: [{ id: 'c1', author: 'trinity', body: 'Yes', createdAt: '2026-10-05T00:00:00.000Z' }, { id: 'c2', author: 'ghost', deleted: true, createdAt: '2026-12-01T00:00:00.000Z' }] },
  { id: 'b', slug: 'second', title: 'Second', category: 'ethics', author: 'neo smith', createdAt: '2026-10-02T00:00:00.000Z', editedAt: '2026-10-09T00:00:00.000Z' },
  { id: 'c', slug: 'gone', title: 'Gone', category: 'ethics', author: '[deleted]', deleted: true, createdAt: '2026-11-01T00:00:00.000Z' },
];

test('a post is last modified by its newest edit or visible comment', () => {
  assert.equal(new Date(postLastModified(posts[0])).toISOString(), '2026-10-05T00:00:00.000Z', 'deleted comments ignored');
  assert.equal(new Date(postLastModified(posts[1])).toISOString(), '2026-10-09T00:00:00.000Z');
});

test('posts sitemap skips deleted posts', () => {
  assert.deepEqual(postEntries(posts).map(entry => entry.path), ['/post/first', '/post/second']);
});

test('members sitemap lists each member once, without placeholder authors', () => {
  // Same address as the member page's canonical: the spelling on their newest post.
  const neo = memberPath(memberActivity(posts, 'Neo Smith').name);
  assert.equal(neo, '/u/neo%20smith');
  assert.deepEqual(memberEntries(posts).map(entry => entry.path).sort(), [neo, '/u/trinity'].sort());
  assert.ok(!memberEntries(posts).some(entry => entry.path.includes('ghost') || entry.path.includes('deleted')));
});

test('pages sitemap covers every page in pageMeta plus categories and datasets', () => {
  const paths = pageEntries(posts).map(entry => entry.path);
  for (const meta of Object.values(PAGE_META)) assert.ok(paths.includes(meta.path), meta.path);
  assert.ok(paths.includes('/category/strategy') && paths.includes('/playground/data-atlas/us-public-schools'));
  assert.equal(new Set(paths).size, paths.length, 'no duplicates');
  assert.equal(pageEntries(posts).find(entry => entry.path === '/category/ethics').lastmod, '2026-10-09T00:00:00.000Z');
});

test('sitemap XML escapes URLs', () => {
  assert.match(urlsetXml([{ path: '/u/a&b' }]), /<loc>https:\/\/caioleadership.com\/u\/a&amp;b<\/loc>/);
});
